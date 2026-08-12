import { createHash } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import next from "next";
import { jwtVerify } from "jose";
import { subscribe } from "./lib/events";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

function cookie(header: string | undefined, name: string) {
  return header
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function frame(value: string) {
  const data = Buffer.from(value);
  const head = data.length < 126
    ? Buffer.from([0x81, data.length])
    : Buffer.from([0x81, 126, data.length >> 8, data.length & 255]);
  return Buffer.concat([head, data]);
}

app.prepare().then(() => {
  const server = createServer(handler);
  server.on("upgrade", async (req: IncomingMessage, socket: Socket) => {
    if (req.url?.split("?")[0] !== "/ws") return socket.destroy();
    try {
      const token = cookie(req.headers.cookie, "singlerents_session");
      const { payload } = await jwtVerify(token!, new TextEncoder().encode(process.env.JWT_SECRET));
      const accept = createHash("sha1")
        .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64");
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      const off = await subscribe(payload.sub!, (event, data) => socket.write(frame(JSON.stringify({ event, data }))));
      socket.on("close", off);
      socket.on("error", off);
      socket.write(frame(JSON.stringify({ event: "connected", data: {} })));
    } catch {
      socket.destroy();
    }
  });
  server.listen(process.env.PORT || 3000, () => console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`));
});

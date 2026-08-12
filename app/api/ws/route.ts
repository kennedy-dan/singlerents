import { experimental_upgradeWebSocket } from "@vercel/functions";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { subscribe } from "../../../lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required.");
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("singlerents_session")?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (!payload.sub) throw new Error("Session has no user ID.");
    userId = payload.sub;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return experimental_upgradeWebSocket(async (socket) => {
    const unsubscribe = await subscribe(userId, (event, data) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ event, data }));
    });
    const close = () => unsubscribe();
    socket.once("close", close);
    socket.once("error", close);
    socket.send(JSON.stringify({ event: "connected", data: {} }));
  });
}

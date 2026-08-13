import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export async function issue(user) {
  return new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}
export async function current() {
  const token = (await cookies()).get("singlerents_session")?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, key())).payload;
  } catch {
    return null;
  }
}
export async function requireUser() {
  const user = await current();
  if (!user) throw new Error("UNAUTHORIZED");
  const account = await db.user.findUnique({
    where: { id: user.sub },
    select: { isActive: true },
  });
  if (!account?.isActive) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const account = await db.user.findUnique({
    where: { id: user.sub },
    select: { role: true },
  });
  console.log("requireAdmin account:", account);
  if (account?.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

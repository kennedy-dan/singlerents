import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
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
  return user;
}

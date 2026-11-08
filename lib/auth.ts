import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const SESSION_COOKIE = "blog_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

export type SessionInfo = { id: string; expiresAt: Date };

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerList = await headers();
  const ip = await getClientIp();
  const userAgent = headerList.get("user-agent")?.slice(0, 255) ?? null;

  await prisma.session.create({
    data: { tokenHash: hashToken(token), ip, userAgent, expiresAt },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSession(): Promise<SessionInfo | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  jar.delete(SESSION_COOKIE);
}

let dummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await bcrypt.hash("placeholder-not-a-real-password", 12);
  return dummyHash;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) {
    // 账号不存在也走一次哈希比对，避免用响应时间判断账号是否存在
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }
  return bcrypt.compare(password, user.passwordHash);
}

/** 页面层守卫：未登录直接跳登录页，并带上原路径 */
export async function requireAdmin(returnTo?: string): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) {
    const target = returnTo ? `/admin/login?from=${encodeURIComponent(returnTo)}` : "/admin/login";
    redirect(target);
  }
  return session;
}

import { prisma } from "./db";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

/** 同一 IP 10 分钟内失败 5 次则锁定 */
export async function isLoginLocked(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  if (success) {
    await prisma.loginAttempt.deleteMany({ where: { ip, success: false } }).catch(() => undefined);
    return;
  }
  await prisma.loginAttempt.create({ data: { ip, success } });
}

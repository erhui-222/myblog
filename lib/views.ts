import { createHash } from "node:crypto";
import { prisma } from "./db";
import { env } from "./env";

const BUCKET_MS = 30 * 60 * 1000;

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${env.ipSalt}`).digest("hex");
}

export function currentBucket(at: number = Date.now()): number {
  return Math.floor(at / BUCKET_MS);
}

/**
 * 记一次阅读：同一 IP + 同一文章 30 分钟内只计一次。
 * 靠 PostViewLog 的唯一约束 (postId, ipHash, bucket) 实现去重，无需定时任务。
 */
export async function recordView(postId: string, ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;

  const ipHash = hashIp(ip);
  const bucket = currentBucket();

  try {
    await prisma.$transaction([
      prisma.postViewLog.create({ data: { postId, ipHash, bucket } }),
      prisma.post.update({ where: { id: postId }, data: { views: { increment: 1 } } }),
    ]);
  } catch {
    // P2002 唯一约束冲突 = 30 分钟内重复访问，静默忽略
  }
}

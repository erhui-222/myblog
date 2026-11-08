import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { hashToken } from "./auth";

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;

export async function issuePreviewToken(postId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);

  await prisma.post.update({
    where: { id: postId },
    data: { previewTokenHash: hashToken(token), previewTokenExpiresAt: expiresAt },
  });

  return { token, expiresAt };
}

export type PreviewCheck = "ok" | "expired" | "invalid";

export function checkPreviewToken(
  post: { previewTokenHash: string | null; previewTokenExpiresAt: Date | null },
  token: string | undefined,
): PreviewCheck {
  if (!token || !post.previewTokenHash || !post.previewTokenExpiresAt) return "invalid";
  if (post.previewTokenExpiresAt.getTime() <= Date.now()) return "expired";

  const provided = Buffer.from(hashToken(token));
  const expected = Buffer.from(post.previewTokenHash);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return "invalid";

  return "ok";
}

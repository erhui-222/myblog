import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { purgeExpiredTrash } from "@/lib/services/posts";

// 定时任务不能走缓存
export const dynamic = "force-dynamic";

/**
 * 回收站自动清理：彻底删除 deletedAt 超过 30 天的文章。
 *
 * 触发方式：vercel.json 里的 crons 配置每天调用一次，
 * Vercel 会自动带上 `Authorization: Bearer ${CRON_SECRET}`。
 * 未配置 CRON_SECRET 时一律拒绝，避免这个端点变成公开的删除入口。
 */
export async function GET(request: NextRequest) {
  const secret = env.cronSecret;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const removed = await purgeExpiredTrash(30);
    return NextResponse.json({
      ok: true,
      removed,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/cron/purge]", error);
    return NextResponse.json({ ok: false, error: "purge_failed" }, { status: 500 });
  }
}

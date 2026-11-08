import type { NextRequest } from "next/server";
import { internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";

const MAX_PREVIEW_CHARS = 200_000;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = (await request.json().catch(() => null)) as { content?: string } | null;
    const content = (body?.content ?? "").slice(0, MAX_PREVIEW_CHARS);
    const { html } = await renderMarkdown(content);
    return ok({ html });
  } catch (error) {
    console.error("[api/admin/markdown]", error);
    return internal("预览渲染失败");
  }
}

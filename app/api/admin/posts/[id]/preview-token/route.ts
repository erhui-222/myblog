import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { issuePreviewToken } from "@/lib/preview-token";
import { adminGetById } from "@/lib/services/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const post = await adminGetById(id);
    if (!post) return fail("NOT_FOUND", "文章不存在或已删除");

    const { token, expiresAt } = await issuePreviewToken(id);

    return ok({
      url: `/preview/${post.slug}?t=${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[api/admin/posts/:id/preview-token]", error);
    return internal();
  }
}

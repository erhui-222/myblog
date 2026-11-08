import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { restorePost } from "@/lib/services/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const result = await restorePost(id);

    if (!result.ok) return fail("NOT_FOUND", "回收站里没有这篇文章");

    return ok({ id, slug: result.post.slug, slugChanged: result.slugChanged });
  } catch (error) {
    console.error("[api/admin/posts/:id/restore]", error);
    return internal();
  }
}

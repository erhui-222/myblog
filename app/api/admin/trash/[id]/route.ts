import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hardDeletePost } from "@/lib/services/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { confirmTitle?: string } | null;

    const post = await prisma.post.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { title: true },
    });

    if (!post) return fail("NOT_FOUND", "回收站里没有这篇文章");

    if ((body?.confirmTitle ?? "").trim() !== post.title) {
      return fail("VALIDATION_FAILED", "输入的标题与文章标题不一致", {
        confirmTitle: "请完整输入文章标题",
      });
    }

    await hardDeletePost(id);
    return ok({ id });
  } catch (error) {
    console.error("[api/admin/trash/:id:DELETE]", error);
    return internal();
  }
}

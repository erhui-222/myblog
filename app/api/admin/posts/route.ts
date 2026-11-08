import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminList, createPost } from "@/lib/services/posts";
import { listQuerySchema, postInputSchema, toFieldErrors } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "查询参数不合法", toFieldErrors(parsed.error));
    }

    const result = await adminList(parsed.data);
    return ok(result);
  } catch (error) {
    console.error("[api/admin/posts:GET]", error);
    return internal();
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = (await request.json().catch(() => null)) as
      | (Record<string, unknown> & { confirmDuplicate?: boolean })
      | null;

    const parsed = postInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "请检查填写内容", toFieldErrors(parsed.error));
    }

    if (!body?.confirmDuplicate) {
      const duplicate = await prisma.post.findFirst({
        where: { title: parsed.data.title, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return fail("SLUG_CONFLICT", "已存在同名文章，确认继续创建吗？");
      }
    }

    const post = await createPost(parsed.data);
    return ok({ id: post.id, slug: post.slug }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/posts:POST]", error);
    return internal();
  }
}

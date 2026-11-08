import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { adminGetById, softDeletePost, updatePost } from "@/lib/services/posts";
import { postInputSchema, toFieldErrors } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const post = await adminGetById(id);
    if (!post) return fail("NOT_FOUND", "文章不存在");
    return ok(post);
  } catch (error) {
    console.error("[api/admin/posts/:id:GET]", error);
    return internal();
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = postInputSchema.safeParse(body);

    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "请检查填写内容", toFieldErrors(parsed.error));
    }

    const updated = await updatePost(id, parsed.data);
    if (!updated) return fail("NOT_FOUND", "文章不存在或已删除");

    return ok({ id: updated.id, slug: updated.slug });
  } catch (error) {
    console.error("[api/admin/posts/:id:PATCH]", error);
    return internal();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const deleted = await softDeletePost(id);
    if (!deleted) return fail("NOT_FOUND", "文章不存在或已删除");
    return ok({ id });
  } catch (error) {
    console.error("[api/admin/posts/:id:DELETE]", error);
    return internal();
  }
}

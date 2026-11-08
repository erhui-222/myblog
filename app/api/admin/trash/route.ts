import { internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listTrash } from "@/lib/services/posts";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const rows = await listTrash();
    return ok({ rows });
  } catch (error) {
    console.error("[api/admin/trash:GET]", error);
    return internal();
  }
}

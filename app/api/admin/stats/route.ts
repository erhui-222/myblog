import { internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/stats";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const stats = await getDashboardStats();
    return ok(stats);
  } catch (error) {
    console.error("[api/admin/stats]", error);
    return internal();
  }
}

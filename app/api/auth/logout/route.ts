import { internal, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (error) {
    console.error("[api/auth/logout]", error);
    return internal();
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { ensureAdminUser } = await import("./lib/services/admin");
    await ensureAdminUser();
  } catch (error) {
    console.error("[instrumentation] 管理员初始化失败", error);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { ensureAdminUser } = await import("./lib/services/admin");
    await ensureAdminUser();
  } catch (error) {
    // Serverless 冷启动是多实例并发的：两个实例可能同时发现「管理员不存在」并各自 create，
    // 其中一个会撞唯一约束。这属于正常竞态，不该刷错误日志。
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: string }).code === "P2002") return;
    }
    console.error("[instrumentation] 管理员初始化失败", error);
  }
}

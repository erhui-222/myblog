import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { env } from "../env";

const BCRYPT_COST = 12;

/**
 * 启动时同步管理员账号：
 * - 不存在 → 按环境变量创建
 * - 存在但密码不匹配 → 视为重置（改密码 = 改环境变量 + 重启）
 * 逻辑幂等，容器每次重启都会跑。
 */
export async function ensureAdminUser(): Promise<void> {
  const username = env.adminUsername;
  const password = env.adminPassword;

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.adminUser.create({
      data: { username, passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
    });
    return;
  }

  const matched = await bcrypt.compare(password, existing.passwordHash);
  if (!matched) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
    });
  }
}

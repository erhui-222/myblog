import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL 未配置"),
  SITE_URL: z.string().optional(),
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME 未配置"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD 至少 8 位"),
  IP_SALT: z.string().min(8, "IP_SALT 至少 8 位"),
  // Vercel 函数请求体上限 4.5MB，这里必须低于它，否则超限请求会被平台直接拒绝（413）
  UPLOAD_MAX_MB: z.coerce.number().int().positive().max(4).default(4),
  // 保护 /api/cron/* 端点；Vercel Cron 触发时会带上 Authorization: Bearer <CRON_SECRET>
  CRON_SECRET: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function parse(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`环境变量校验失败 → ${detail}`);
  }
  return result.data;
}

function get(): Env {
  if (!cached) cached = parse();
  return cached;
}

// 用 getter 做惰性求值：避免 next build 阶段因缺少运行时变量而失败
export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? get().DATABASE_URL;
  },
  get siteUrl() {
    return process.env.SITE_URL ?? "http://localhost:3000";
  },
  get adminUsername() {
    return get().ADMIN_USERNAME;
  },
  get adminPassword() {
    return get().ADMIN_PASSWORD;
  },
  get ipSalt() {
    return get().IP_SALT;
  },
  get uploadMaxMb() {
    return get().UPLOAD_MAX_MB;
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? get().CRON_SECRET ?? "";
  },
};

import { z } from "zod";
import { SLUG_PATTERN } from "./slug";

export const postStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "标题至少 2 个字")
    .max(100, "标题最多 100 个字"),
  slug: z
    .string()
    .trim()
    .max(80, "URL 标识最多 80 个字符")
    .regex(SLUG_PATTERN, "只能用小写字母、数字和连字符")
    .optional(),
  summary: z.string().trim().max(200, "摘要最多 200 个字").optional(),
  content: z.string().trim().min(1, "正文不能为空"),
  coverUrl: z.string().trim().max(500).optional(),
  status: postStatusSchema.default("DRAFT"),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const listQuerySchema = z.object({
  keyword: z.string().trim().max(100).default(""),
  status: z.enum(["ALL", "DRAFT", "PUBLISHED"]).default("ALL"),
  sort: z.enum(["updated", "created", "views"]).default("updated"),
  order: z.enum(["desc", "asc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入账号").max(64, "账号过长"),
  password: z.string().min(1, "请输入密码").max(128, "密码过长"),
});

export const idParamSchema = z.string().min(1).max(64);

/** 把 zod 错误转成「字段 → 提示」的映射，供表单逐字段展示 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

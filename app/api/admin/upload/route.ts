import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/**
 * 图片存 Vercel Blob（对象存储）。
 * Serverless 环境没有可持久化的本地磁盘，public/ 在部署后是只读静态产物。
 *
 * 认证方式：Vercel 上部署时 SDK 自动用 OIDC（BLOB_STORE_ID + VERCEL_OIDC_TOKEN）；
 * 本地开发需要 BLOB_READ_WRITE_TOKEN，用 `npx vercel env pull` 拉取。
 * 注意 store 的 access 必须是 public，否则返回的 URL 需要签名才能访问。
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // 本地开发常见问题：忘了拉 Blob 变量，这里给明确提示而不是笼统的「上传失败」
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return fail(
      "VALIDATION_FAILED",
      "未配置 Blob 存储：本地开发请执行 npx vercel env pull .env.local",
    );
  }

  try {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return fail("VALIDATION_FAILED", "没有收到文件");
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return fail("VALIDATION_FAILED", "只支持 jpg / png / webp 格式");
    }

    const maxBytes = env.uploadMaxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return fail("VALIDATION_FAILED", `图片不能超过 ${env.uploadMaxMb}MB`);
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    // 文件名自带 uuid，不需要 SDK 再加随机后缀
    const pathname = `uploads/${year}/${month}/${randomUUID()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return ok({ url: blob.url });
  } catch (error) {
    console.error("[api/admin/upload]", error);
    return internal("上传失败，请稍后重试");
  }
}

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { fail, internal, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

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
    const dir = path.join(process.cwd(), "public", "uploads", year, month);

    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    return ok({ url: `/uploads/${year}/${month}/${filename}` });
  } catch (error) {
    console.error("[api/admin/upload]", error);
    return internal("上传失败，请稍后重试");
  }
}

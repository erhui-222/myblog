import type { NextRequest } from "next/server";
import { fail, internal, ok } from "@/lib/api";
import { createSession, getClientIp, verifyCredentials } from "@/lib/auth";
import { isLoginLocked, recordLoginAttempt } from "@/lib/rate-limit";
import { loginSchema, toFieldErrors } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "请检查输入内容", toFieldErrors(parsed.error));
    }

    const ip = await getClientIp();

    if (await isLoginLocked(ip)) {
      return fail("RATE_LIMITED", "尝试次数过多，请 10 分钟后再试");
    }

    const valid = await verifyCredentials(parsed.data.username, parsed.data.password);
    await recordLoginAttempt(ip, valid);

    if (!valid) {
      return fail("UNAUTHORIZED", "账号或密码错误");
    }

    await createSession();
    return ok({ username: parsed.data.username });
  } catch (error) {
    console.error("[api/auth/login]", error);
    return internal();
  }
}

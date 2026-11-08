"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { redirectTo: string };

export function LoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setErrors({});
    setMessage("");

    if (!username.trim()) {
      setErrors({ username: "请输入账号" });
      return;
    }
    if (!password) {
      setErrors({ password: "请输入密码" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const code = payload?.error?.code;
        setErrors(payload?.error?.fields ?? {});
        setMessage(
          code === "RATE_LIMITED"
            ? "尝试次数过多，请 10 分钟后再试"
            : (payload?.error?.message ?? "登录失败，请重试"),
        );
        setPassword("");
        document.querySelector<HTMLInputElement>('input[name="password"]')?.focus();
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setMessage("网络异常，请检查连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message ? (
        <p
          role="alert"
          className="rounded-lg border border-[#e8c4bd] bg-[#fdf2f0] px-3 py-2 text-sm text-danger"
        >
          {message}
        </p>
      ) : null}

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm text-muted">
          账号
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={Boolean(errors.username)}
          className={`h-11 w-full rounded-lg border bg-surface px-3 text-sm outline-none transition-colors focus:border-[#c9c2b4] ${
            errors.username ? "border-danger" : "border-line"
          }`}
        />
        {errors.username ? <p className="mt-1 text-xs text-danger">{errors.username}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-muted">
          密码
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            className={`h-11 w-full rounded-lg border bg-surface px-3 pr-16 text-sm outline-none transition-colors focus:border-[#c9c2b4] ${
              errors.password ? "border-danger" : "border-line"
            }`}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-1 top-1 h-9 rounded-md px-2 text-xs text-muted transition-colors hover:text-ink"
          >
            {visible ? "隐藏" : "显示"}
          </button>
        </div>
        {errors.password ? <p className="mt-1 text-xs text-danger">{errors.password}</p> : null}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "登录中…" : "登录"}
      </button>
    </form>
  );
}

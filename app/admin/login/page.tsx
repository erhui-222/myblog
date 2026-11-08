import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSession } from "@/lib/auth";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { from } = await searchParams;
  const redirectTo = from && from.startsWith("/admin") ? from : "/admin";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f7f5f0] px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-base font-semibold text-accent">
            {siteConfig.name.slice(0, 1)}
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">{siteConfig.name} · 后台</h1>
          <p className="mt-1.5 text-sm text-muted">仅博主本人可登录</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          <Link href="/" className="transition-colors hover:text-ink">
            ← 返回站点
          </Link>
        </p>
      </div>
    </div>
  );
}

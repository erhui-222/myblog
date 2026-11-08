import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">404</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            文章不存在或已被移除
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            你访问的页面可能已被删除、改过链接，或者从来没存在过。
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
            >
              返回首页
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

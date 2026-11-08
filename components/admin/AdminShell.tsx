"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { key: "dashboard", label: "仪表盘", href: "/admin", exact: true },
  { key: "posts", label: "文章管理", href: "/admin/posts", exact: false },
  { key: "trash", label: "回收站", href: "/admin/trash", exact: false },
];

export function AdminShell({
  children,
  username,
  trashCount,
}: {
  children: React.ReactNode;
  username: string;
  trashCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`flex min-h-10 items-center justify-between rounded-lg px-3 text-sm transition-colors ${
            isActive(item)
              ? "bg-ink text-paper"
              : "text-muted hover:bg-[#f4f1ea] hover:text-ink"
          }`}
        >
          <span>{item.label}</span>
          {item.key === "trash" && trashCount > 0 ? (
            <span
              className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                isActive(item) ? "bg-paper/20 text-paper" : "bg-[#efeae1] text-muted"
              }`}
            >
              {trashCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#f7f5f0]">
      <header className="sticky top-0 z-30 border-b border-line bg-[#f7f5f0]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="切换菜单"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink md:hidden"
            >
              <span className="block h-[1.5px] w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" />
            </button>
            <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              博客后台
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden text-xs text-muted transition-colors hover:text-ink sm:block"
            >
              查看站点 ↗
            </Link>
            <span className="hidden text-xs text-faint sm:block">{username}</span>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="h-8 rounded-lg border border-line px-3 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              {loggingOut ? "退出中…" : "退出"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-20">{nav}</div>
        </aside>

        {open ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="关闭菜单"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/25"
            />
            <div className="absolute left-0 top-0 h-full w-60 border-r border-line bg-[#f7f5f0] p-4">
              <p className="mb-3 px-3 text-xs text-faint">导航</p>
              {nav}
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}

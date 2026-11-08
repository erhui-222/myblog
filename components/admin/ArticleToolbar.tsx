"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "ALL", label: "全部" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "DRAFT", label: "草稿" },
];

const SORT_OPTIONS = [
  { value: "updated-desc", label: "最近更新" },
  { value: "created-desc", label: "最新创建" },
  { value: "views-desc", label: "阅读最多" },
  { value: "updated-asc", label: "最早更新" },
];

export function ArticleToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "ALL";
  const currentSort = `${searchParams.get("sort") ?? "updated"}-${searchParams.get("order") ?? "desc"}`;
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  useEffect(() => {
    setKeyword(searchParams.get("keyword") ?? "");
  }, [searchParams]);

  const push = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (keyword === (searchParams.get("keyword") ?? "")) return;
      push({ keyword: keyword.trim() || null });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题或摘要"
            aria-label="搜索文章"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-3 pr-8 text-sm outline-none transition-colors focus:border-[#c9c2b4]"
          />
          {keyword ? (
            <button
              type="button"
              onClick={() => setKeyword("")}
              aria-label="清空搜索"
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:text-ink"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => push({ status: option.value === "ALL" ? null : option.value })}
                className={`h-8 rounded-md px-2.5 text-xs transition-colors ${
                  currentStatus === option.value
                    ? "bg-ink text-paper"
                    : "text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={currentSort}
            onChange={(event) => {
              const [sort, order] = event.target.value.split("-");
              push({ sort, order });
            }}
            aria-label="排序方式"
            className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-muted outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Link
        href="/admin/posts/new"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
      >
        新增文章
      </Link>
    </div>
  );
}

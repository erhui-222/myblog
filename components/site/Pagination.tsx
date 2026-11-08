import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

function buildHref(basePath: string, page: number, searchParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ page, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="分页">
      {page > 1 ? (
        <Link
          href={buildHref(basePath, page - 1, searchParams)}
          className="flex h-9 items-center rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:border-[#d8d2c6] hover:text-ink"
        >
          上一页
        </Link>
      ) : null}

      {pages.map((item, index) => {
        const previous = pages[index - 1];
        const showGap = previous && item - previous > 1;
        return (
          <span key={item} className="flex items-center gap-1.5">
            {showGap ? <span className="px-1 text-sm text-faint">…</span> : null}
            <Link
              href={buildHref(basePath, item, searchParams)}
              aria-current={item === page ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
                item === page
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-muted hover:border-[#d8d2c6] hover:text-ink"
              }`}
            >
              {item}
            </Link>
          </span>
        );
      })}

      {page < totalPages ? (
        <Link
          href={buildHref(basePath, page + 1, searchParams)}
          className="flex h-9 items-center rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:border-[#d8d2c6] hover:text-ink"
        >
          下一页
        </Link>
      ) : null}
    </nav>
  );
}

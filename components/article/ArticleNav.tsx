import Link from "next/link";

type Adjacent = { slug: string; title: string } | null;

export function ArticleNav({ prev, next }: { prev: Adjacent; next: Adjacent }) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2" aria-label="相邻文章">
      {prev ? (
        <Link
          href={`/posts/${prev.slug}`}
          className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-[#d8d2c6]"
        >
          <span className="text-xs text-faint">← 上一篇</span>
          <p className="mt-1.5 line-clamp-1 text-sm text-ink transition-colors group-hover:text-accent">
            {prev.title}
          </p>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          className="group rounded-xl border border-line bg-surface p-4 text-right transition-colors hover:border-[#d8d2c6] sm:col-start-2"
        >
          <span className="text-xs text-faint">下一篇 →</span>
          <p className="mt-1.5 line-clamp-1 text-sm text-ink transition-colors group-hover:text-accent">
            {next.title}
          </p>
        </Link>
      ) : null}
    </nav>
  );
}

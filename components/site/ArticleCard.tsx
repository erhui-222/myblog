import Link from "next/link";

export type ArticleCardData = {
  slug: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  publishedAt: Date | null;
  readingMinutes: number;
};

function formatDate(date: Date | null): string {
  if (!date) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(date)
    .replace(/\//g, "-");
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <Link
      href={`/posts/${article.slug}`}
      className="group block rounded-xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-[#d8d2c6] hover:shadow-[0_10px_30px_-18px_rgba(28,27,25,0.45)] sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <time className="font-mono text-xs tracking-wide text-faint">
          {formatDate(article.publishedAt)}
        </time>
        <span className="text-xs text-faint">{article.readingMinutes} 分钟</span>
      </div>

      <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
        {article.title}
      </h3>

      {article.summary ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{article.summary}</p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1 text-xs text-faint transition-colors group-hover:text-accent">
        阅读全文
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

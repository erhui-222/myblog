import { ArticleCard } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/EmptyState";
import { HeroSection } from "@/components/site/HeroSection";
import { Pagination } from "@/components/site/Pagination";
import { listPublished } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const { rows, totalPages, page: currentPage } = await listPublished(
    Number.isFinite(requestedPage) ? requestedPage : 1,
  );

  return (
    <>
      <HeroSection />

      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-sm font-medium tracking-wide text-muted">最新文章</h2>
          <span className="font-mono text-xs text-faint">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : "0"}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="还没有发布文章"
            description="文章发布后会出现在这里。现在先去后台写第一篇吧。"
            actionText="进入后台"
            actionHref="/admin"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {rows.map((post) => (
                <ArticleCard
                  key={post.id}
                  article={{
                    slug: post.slug,
                    title: post.title,
                    summary: post.summary,
                    coverUrl: post.coverUrl,
                    publishedAt: post.publishedAt,
                    readingMinutes: post.readingMinutes,
                  }}
                />
              ))}
            </div>

            <Pagination page={currentPage} totalPages={totalPages} basePath="/" />
          </>
        )}
      </section>
    </>
  );
}

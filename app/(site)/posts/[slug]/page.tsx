import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleNav } from "@/components/article/ArticleNav";
import { MarkdownRenderer } from "@/components/article/MarkdownRenderer";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { TocSidebar } from "@/components/article/TocSidebar";
import { getClientIp } from "@/lib/auth";
import { daysBetween, formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { getAdjacentPosts, getPublishedBySlug } from "@/lib/services/posts";
import { recordView } from "@/lib/views";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug);

  if (!post) {
    return { title: "文章不存在", robots: { index: false, follow: false } };
  }

  return {
    title: post.title,
    description: post.summary ?? undefined,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary ?? undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug);

  if (!post) notFound();

  const [{ html, headings }, { prev, next }, ip] = await Promise.all([
    renderMarkdown(post.content),
    getAdjacentPosts(post),
    getClientIp(),
  ]);

  await recordView(post.id, ip);

  const showUpdated =
    post.publishedAt && daysBetween(post.updatedAt, post.publishedAt) > 1;

  return (
    <>
      <ReadingProgress />

      <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink">
            首页
          </Link>
          <span className="text-faint">/</span>
          <span className="line-clamp-1 text-faint">{post.title}</span>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-14">
          <div className="min-w-0 max-w-[42rem]">
            <header className="border-b border-line pb-7">
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[2rem]">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-faint">
                <time dateTime={post.publishedAt?.toISOString()}>
                  {formatDate(post.publishedAt)}
                </time>
                <span>{post.readingMinutes} 分钟阅读</span>
                {showUpdated ? <span>更新于 {formatDate(post.updatedAt)}</span> : null}
              </div>
            </header>

            <div className="mt-8">
              <MarkdownRenderer html={html} />
            </div>

            <ArticleNav prev={prev} next={next} />

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
              >
                ← 返回文章列表
              </Link>
            </div>
          </div>

          <aside className="hidden lg:block">
            <TocSidebar headings={headings} />
          </aside>
        </div>
      </article>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleNav } from "@/components/article/ArticleNav";
import { MarkdownRenderer } from "@/components/article/MarkdownRenderer";
import { TocSidebar } from "@/components/article/TocSidebar";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { checkPreviewToken } from "@/lib/preview-token";
import { getPostBySlugAnyStatus } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "文章预览",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function PreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t } = await searchParams;

  const post = await getPostBySlugAnyStatus(slug);
  if (!post) notFound();

  if (post.status === "PUBLISHED") {
    redirect(`/posts/${post.slug}`);
  }

  const check = checkPreviewToken(post, t);

  if (check !== "ok") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">
          {check === "expired" ? "expired" : "invalid"}
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-ink">预览链接已失效</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          预览链接有效期为 2 小时。请回到后台重新点击「预览」获取新链接。
        </p>
        <Link
          href="/admin/posts"
          className="mt-8 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
        >
          回到文章管理
        </Link>
      </div>
    );
  }

  const { html, headings } = await renderMarkdown(post.content);

  return (
    <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#d8b9a7] bg-accent-soft px-4 py-2.5 text-xs text-[#8a4a2c]">
        <span className="rounded bg-white/70 px-1.5 py-0.5 font-mono">草稿预览</span>
        <span>这是未发布的草稿，仅你可见，搜索引擎不会收录。</span>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-14">
        <div className="min-w-0 max-w-[42rem]">
          <header className="border-b border-line pb-7">
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[2rem]">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 font-mono text-xs text-faint">
              <span>未发布</span>
              <span>{post.readingMinutes} 分钟阅读</span>
              <span>最后修改 {formatDate(post.updatedAt)}</span>
            </div>
          </header>

          <div className="mt-8">
            <MarkdownRenderer html={html} />
          </div>

          <ArticleNav prev={null} next={null} />
        </div>

        <aside className="hidden lg:block">
          <TocSidebar headings={headings} />
        </aside>
      </div>
    </article>
  );
}

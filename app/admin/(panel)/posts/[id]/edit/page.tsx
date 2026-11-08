import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { adminGetById } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "编辑文章" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await adminGetById(id);

  if (!post) notFound();

  return (
    <ArticleForm
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary ?? "",
        content: post.content,
        coverUrl: post.coverUrl ?? "",
        status: post.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      }}
    />
  );
}

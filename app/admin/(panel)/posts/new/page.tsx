import type { Metadata } from "next";
import { ArticleForm } from "@/components/admin/ArticleForm";

export const metadata: Metadata = { title: "新增文章" };

export default function NewPostPage() {
  return (
    <ArticleForm
      initial={{
        title: "",
        slug: "",
        summary: "",
        content: "",
        coverUrl: "",
        status: "DRAFT",
      }}
    />
  );
}

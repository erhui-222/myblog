import type { Metadata } from "next";
import { TrashTable } from "@/components/admin/TrashTable";
import { EmptyState } from "@/components/site/EmptyState";
import { formatDateTime } from "@/lib/format";
import { listTrash } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "回收站" };

export default async function TrashPage() {
  const rows = await listTrash();

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    views: row.views,
    deletedAt: formatDateTime(row.deletedAt),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">回收站</h1>
        <p className="mt-1 text-sm text-muted">
          删除的文章会先放在这里，{data.length} 篇，超过 30 天自动彻底删除。
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="回收站是空的"
          description="删除文章后会出现在这里，可以随时恢复。"
          actionText="回到文章管理"
          actionHref="/admin/posts"
        />
      ) : (
        <TrashTable rows={data} />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";

export type TrashRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  deletedAt: string;
};

export function TrashTable({ rows }: { rows: TrashRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<TrashRow | null>(null);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const restore = async (row: TrashRow) => {
    setBusyId(row.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/posts/${row.id}/restore`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.error?.message ?? "恢复失败");
        return;
      }
      setMessage(
        payload.data.slugChanged
          ? `已恢复，但链接已被占用，新链接为 /posts/${payload.data.slug}`
          : "已恢复",
      );
      router.refresh();
    } finally {
      setBusyId("");
    }
  };

  const purge = async () => {
    if (!target) return;
    setBusyId(target.id);
    try {
      const response = await fetch(`/api/admin/trash/${target.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTitle: target.title }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.error?.message ?? "删除失败");
        return;
      }
      setTarget(null);
      setMessage("已彻底删除");
      router.refresh();
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      {message ? (
        <p role="status" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-ink">{row.title}</p>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  原状态 {row.status === "PUBLISHED" ? "已发布" : "草稿"} · {row.views} 阅读 ·
                  删除于 {row.deletedAt}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => restore(row)}
                  disabled={busyId === row.id}
                  className="h-8 rounded-lg border border-line px-3 text-xs text-ink transition-colors hover:bg-[#f4f1ea] disabled:opacity-50"
                >
                  {busyId === row.id ? "处理中…" : "恢复"}
                </button>
                <button
                  type="button"
                  onClick={() => setTarget(row)}
                  className="h-8 rounded-lg px-3 text-xs text-danger/80 transition-colors hover:bg-[#fdf2f0] hover:text-danger"
                >
                  彻底删除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(target)}
        title="彻底删除文章"
        danger
        description="这一步不可撤销，文章与其阅读记录会被永久删除。请输入文章标题以确认。"
        confirmLabel="永久删除"
        busy={busyId === target?.id}
        requireText={target?.title}
        onConfirm={purge}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

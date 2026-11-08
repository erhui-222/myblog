"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";

export function RowActions({
  id,
  slug,
  status,
  title,
}: {
  id: string;
  slug: string;
  status: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = async () => {
    setError("");
    if (status === "PUBLISHED") {
      window.open(`/posts/${slug}`, "_blank", "noopener");
      return;
    }
    const response = await fetch(`/api/admin/posts/${id}/preview-token`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "预览链接生成失败");
      return;
    }
    window.open(payload.data.url, "_blank", "noopener");
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "删除失败");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/posts/${id}/edit`}
        className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-[#f2efe8] hover:text-ink"
      >
        编辑
      </Link>
      <button
        type="button"
        onClick={preview}
        className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-[#f2efe8] hover:text-ink"
      >
        预览
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-xs text-danger/80 transition-colors hover:bg-[#fdf2f0] hover:text-danger"
      >
        删除
      </button>

      {error ? <span className="ml-1 text-[11px] text-danger">{error}</span> : null}

      <ConfirmDialog
        open={open}
        title="移入回收站"
        description={
          <>
            文章「{title}」将被移入回收站，访客访问原链接会返回 404。
            <br />
            之后可在回收站恢复，30 天后自动彻底删除。
          </>
        }
        confirmLabel="移入回收站"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

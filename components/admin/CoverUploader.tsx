"use client";

import { useRef, useState } from "react";

export function CoverUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "上传失败");
        return;
      }
      onChange(payload.data.url);
    } catch {
      setError("网络异常，上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs text-muted">封面图（可选）</span>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="封面预览" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white backdrop-blur"
          >
            移除
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-line bg-paper text-xs text-muted transition-colors hover:border-[#c9c2b4] hover:text-ink disabled:opacity-60"
        >
          {uploading ? "上传中…" : "点击上传 jpg / png / webp，≤5MB"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

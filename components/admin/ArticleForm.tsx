"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverUploader } from "./CoverUploader";
import { MarkdownEditor } from "./MarkdownEditor";

export type ArticleFormValues = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverUrl: string;
  status: "DRAFT" | "PUBLISHED";
};

type Props = { initial: ArticleFormValues };

export function ArticleForm({ initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ArticleFormValues>(initial);
  const [baseline, setBaseline] = useState<ArticleFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState<null | "DRAFT" | "PUBLISHED">(null);
  const [previewing, setPreviewing] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key as string]) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
  };

  const save = async (targetStatus: "DRAFT" | "PUBLISHED", confirmDuplicate = false) => {
    if (submitting) return;

    const localErrors: Record<string, string> = {};
    if (values.title.trim().length < 2) localErrors.title = "标题至少 2 个字";
    if (values.title.trim().length > 100) localErrors.title = "标题最多 100 个字";
    if (values.content.trim().length === 0) localErrors.content = "正文不能为空";
    if (values.summary.length > 200) localErrors.summary = "摘要最多 200 个字";

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setMessage("请先修正标红的字段");
      return;
    }

    setSubmitting(targetStatus);
    setMessage("");

    const payload = {
      title: values.title.trim(),
      slug: values.slug.trim() || undefined,
      summary: values.summary.trim() || undefined,
      content: values.content,
      coverUrl: values.coverUrl.trim() || undefined,
      status: targetStatus,
      confirmDuplicate,
    };

    try {
      const response = await fetch(
        values.id ? `/api/admin/posts/${values.id}` : "/api/admin/posts",
        {
          method: values.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        const code = result?.error?.code;
        if (code === "SLUG_CONFLICT" && !confirmDuplicate) {
          if (window.confirm(result.error.message)) {
            await save(targetStatus, true);
          }
          return;
        }
        setErrors(result?.error?.fields ?? {});
        setMessage(result?.error?.message ?? "保存失败，请重试");
        return;
      }

      const savedId = values.id ?? result.data.id;
      const savedValues = { ...values, id: savedId, slug: result.data.slug, status: targetStatus };
      setValues(savedValues);
      setBaseline(savedValues);
      setMessage(targetStatus === "PUBLISHED" ? "已发布" : "已保存为草稿");

      if (!values.id) {
        router.replace(`/admin/posts/${savedId}/edit`);
      }
      router.refresh();
    } catch {
      setMessage("网络异常，保存失败");
    } finally {
      setSubmitting(null);
    }
  };

  const preview = async () => {
    if (!values.id) {
      setMessage("先保存一次才能预览");
      return;
    }
    setPreviewing(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/posts/${values.id}/preview-token`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setMessage(result?.error?.message ?? "预览链接生成失败");
        return;
      }
      window.open(result.data.url, "_blank", "noopener");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/posts" className="text-sm text-muted transition-colors hover:text-ink">
            ← 文章管理
          </Link>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] ${
              values.status === "PUBLISHED"
                ? "bg-[#eaf1ea] text-ok"
                : "bg-[#f2efe8] text-muted"
            }`}
          >
            {values.status === "PUBLISHED" ? "已发布" : "草稿"}
          </span>
          {dirty ? <span className="text-[11px] text-faint">有未保存的修改</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={preview}
            disabled={previewing}
            className="h-9 rounded-lg border border-line bg-surface px-3.5 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            {previewing ? "生成中…" : "预览"}
          </button>
          <button
            type="button"
            onClick={() => save("DRAFT")}
            disabled={submitting !== null}
            className="h-9 rounded-lg border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:bg-[#f4f1ea] disabled:opacity-50"
          >
            {submitting === "DRAFT" ? "保存中…" : "存草稿"}
          </button>
          <button
            type="button"
            onClick={() => save("PUBLISHED")}
            disabled={submitting !== null}
            className="h-9 rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting === "PUBLISHED" ? "发布中…" : "保存并发布"}
          </button>
        </div>
      </div>

      {message ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.includes("失败") || message.includes("修正") || message.includes("不能")
              ? "border-[#e8c4bd] bg-[#fdf2f0] text-danger"
              : "border-[#cfe0d4] bg-[#f1f7f2] text-ok"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div>
            <input
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="文章标题"
              maxLength={100}
              aria-label="文章标题"
              className={`h-12 w-full rounded-xl border bg-surface px-4 text-lg font-semibold outline-none transition-colors focus:border-[#c9c2b4] ${
                errors.title ? "border-danger" : "border-line"
              }`}
            />
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-danger">{errors.title ?? ""}</span>
              <span className="text-faint">{values.title.length}/100</span>
            </div>
          </div>

          <div>
            <MarkdownEditor value={values.content} onChange={(value) => set("content", value)} />
            {errors.content ? (
              <p className="mt-1 text-xs text-danger">{errors.content}</p>
            ) : (
              <p className="mt-1 text-[11px] text-faint">
                正文为 Markdown。切换到「分屏」可以边写边看渲染效果，与发布后完全一致。
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <div>
              <label htmlFor="slug" className="mb-1.5 block text-xs text-muted">
                URL 标识（slug）
              </label>
              <input
                id="slug"
                value={values.slug}
                onChange={(event) => set("slug", event.target.value.toLowerCase())}
                placeholder="留空则根据标题自动生成"
                className={`h-9 w-full rounded-lg border bg-paper px-2.5 font-mono text-xs outline-none focus:border-[#c9c2b4] ${
                  errors.slug ? "border-danger" : "border-line"
                }`}
              />
              {errors.slug ? (
                <p className="mt-1 text-[11px] text-danger">{errors.slug}</p>
              ) : (
                <p className="mt-1 text-[11px] text-faint">
                  生成后不会随标题变化。已发布的文章改动后旧链接会失效。
                </p>
              )}
            </div>

            <div>
              <label htmlFor="summary" className="mb-1.5 block text-xs text-muted">
                摘要（可选）
              </label>
              <textarea
                id="summary"
                value={values.summary}
                onChange={(event) => set("summary", event.target.value)}
                rows={3}
                placeholder="留空则自动截取正文前 120 字"
                className={`w-full resize-y rounded-lg border bg-paper p-2.5 text-xs leading-relaxed outline-none focus:border-[#c9c2b4] ${
                  errors.summary ? "border-danger" : "border-line"
                }`}
              />
              <div className="mt-1 flex justify-between text-[11px]">
                <span className="text-danger">{errors.summary ?? ""}</span>
                <span className="text-faint">{values.summary.length}/200</span>
              </div>
            </div>

            <CoverUploader value={values.coverUrl} onChange={(value) => set("coverUrl", value)} />
          </div>

          <div className="rounded-xl border border-line bg-[#faf8f4] p-4 text-[11px] leading-relaxed text-muted">
            <p className="mb-1.5 font-medium text-ink">发布说明</p>
            <ul className="space-y-1">
              <li>· 草稿只有你自己能看到，访客访问会 404</li>
              <li>· 首次发布时记录发布时间，之后编辑不会改变排序</li>
              <li>· 预览链接 2 小时内有效</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

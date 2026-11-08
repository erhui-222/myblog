"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "edit" | "split" | "preview";

const TOOLS: { label: string; title: string; insert: string; wrap?: boolean }[] = [
  { label: "H2", title: "二级标题", insert: "## ", wrap: false },
  { label: "H3", title: "三级标题", insert: "### ", wrap: false },
  { label: "B", title: "加粗", insert: "**", wrap: true },
  { label: "`", title: "行内代码", insert: "`", wrap: true },
  { label: "链接", title: "链接", insert: "[文字](https://)", wrap: false },
  { label: "图片", title: "图片", insert: "![描述](图片地址)", wrap: false },
  { label: "引用", title: "引用", insert: "> ", wrap: false },
  { label: "代码块", title: "代码块", insert: "```\n代码\n```", wrap: false },
  { label: "列表", title: "无序列表", insert: "- ", wrap: false },
];

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("edit");
  const [html, setHtml] = useState("");
  const [rendering, setRendering] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === "edit") return;

    let cancelled = false;
    setRendering(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/markdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
        const payload = await response.json().catch(() => null);
        if (!cancelled && payload?.ok) setHtml(payload.data.html);
      } catch {
        // 预览失败不影响编辑
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, mode]);

  const insert = (item: (typeof TOOLS)[number]) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${item.insert}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);

    const next = item.wrap
      ? `${value.slice(0, start)}${item.insert}${selected || "文字"}${item.insert}${value.slice(end)}`
      : `${value.slice(0, start)}${item.insert}${selected}${value.slice(end)}`;

    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + item.insert.length + (selected ? selected.length : item.wrap ? 2 : 0);
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#faf8f4] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {TOOLS.map((item) => (
            <button
              key={item.title}
              type="button"
              title={item.title}
              onClick={() => insert(item)}
              className="h-7 min-w-7 rounded px-1.5 font-mono text-xs text-muted transition-colors hover:bg-[#efeae1] hover:text-ink"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-md border border-line bg-surface p-0.5 text-xs">
          {(
            [
              ["edit", "编辑"],
              ["split", "分屏"],
              ["preview", "预览"],
            ] as [Mode, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`h-6 rounded px-2 transition-colors ${
                mode === key ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={mode === "split" ? "grid md:grid-cols-2" : ""}>
        {mode !== "preview" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="用 Markdown 写正文，支持标题、列表、代码块、表格、图片…"
            spellCheck={false}
            className={`min-h-[420px] w-full resize-y bg-surface p-4 font-mono text-[13.5px] leading-7 outline-none ${
              mode === "split" ? "md:border-r md:border-line" : ""
            }`}
          />
        ) : null}

        {mode !== "edit" ? (
          <div className="min-h-[420px] overflow-x-auto border-t border-line p-4 md:border-t-0">
            {rendering && !html ? (
              <p className="text-sm text-faint">渲染中…</p>
            ) : value.trim() === "" ? (
              <p className="text-sm text-faint">还没有内容</p>
            ) : (
              <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const CODE_FENCE = /```[^\n]*\n([\s\S]*?)```/g;

/** 去掉 Markdown 标记，保留可读文字（代码块内容丢弃） */
export function stripMarkdown(md: string): string {
  return md
    .replace(CODE_FENCE, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*\|?[\s:-]+\|[\s|:-]*$/gm, " ")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SENTENCE_END = /[。！？.!?]/;

/**
 * 自动摘要：取前 limit 字，尽量在句末标点处截断。
 * 找不到合适标点则硬截断并补省略号。
 */
export function buildExcerpt(markdown: string, limit = 120): string {
  const plain = stripMarkdown(markdown);
  if (plain.length <= limit) return plain;

  const window = plain.slice(0, limit);
  let cut = -1;
  for (let i = window.length - 1; i >= Math.floor(limit * 0.5); i -= 1) {
    if (SENTENCE_END.test(window[i])) {
      cut = i + 1;
      break;
    }
  }

  if (cut > 0) return window.slice(0, cut).trim();
  return `${window.trim()}…`;
}

export { CODE_FENCE };

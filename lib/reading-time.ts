const CJK = /[\u4e00-\u9fff]/g;

/**
 * 阅读时长：中文按字符、英文按单词，约 300 字/分钟，向上取整，最小 1 分钟。
 * 代码块内容计入（只去掉围栏标记）。
 */
export function estimateReadingMinutes(markdown: string): number {
  const text = markdown
    .replace(/```[^\n]*\n?/g, " ")
    .replace(/[#>*_~`|-]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

  const cjkCount = (text.match(CJK) ?? []).length;
  const wordCount = (text.replace(CJK, " ").match(/[A-Za-z0-9]+/g) ?? []).length;

  return Math.max(1, Math.ceil((cjkCount + wordCount) / 300));
}

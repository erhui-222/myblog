import { pinyin } from "pinyin-pro";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 把标题转成 slug：中文转拼音，其余非字母数字统一变连字符。
 * 生成后不再随标题变化（由调用方保证）。
 */
export function slugify(title: string): string {
  const raw = title.trim();
  if (!raw) return "";

  const pinyinParts = pinyin(raw, { toneType: "none", type: "array", nonZh: "consecutive" });
  const joined = pinyinParts.join("-");

  const normalized = joined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return normalized;
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

/** 手动输入的 slug 做规范化，避免用户输入大写或空格 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

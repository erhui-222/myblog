import { describe, expect, it } from "vitest";
import { isValidSlug, normalizeSlug, slugify } from "../lib/slug";

describe("slugify", () => {
  it("把中文标题转成拼音 slug", () => {
    const slug = slugify("第一篇文章：从这里开始");
    expect(slug).toBe("di-yi-pian-wen-zhang-cong-zhe-li-kai-shi");
    expect(isValidSlug(slug)).toBe(true);
  });

  it("保留英文数字，去掉标点", () => {
    expect(slugify("Hello, World! 2026")).toBe("hello-world-2026");
  });

  it("合并连续连字符并去掉首尾", () => {
    expect(slugify("  --- 你好 --- ")).toBe("ni-hao");
  });

  it("纯符号标题回退为空字符串（由调用方兜底）", () => {
    expect(slugify("！！！")).toBe("");
  });

  it("超长标题截断到 80 字符以内", () => {
    const slug = slugify("a".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(80);
  });
});

describe("normalizeSlug", () => {
  it("大写与空格转为规范形式", () => {
    expect(normalizeSlug(" Hello World ")).toBe("hello-world");
  });

  it("非法字符被折叠成单个连字符", () => {
    expect(normalizeSlug("a///b??c")).toBe("a-b-c");
  });
});

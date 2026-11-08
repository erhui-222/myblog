import { describe, expect, it } from "vitest";
import { buildExcerpt, stripMarkdown } from "../lib/excerpt";

describe("stripMarkdown", () => {
  it("去掉代码块与行内代码", () => {
    const text = stripMarkdown("前面\n\n```js\nconsole.log(1)\n```\n\n后面 `code` 结尾");
    expect(text).toBe("前面 后面 结尾");
  });

  it("图片丢弃、链接保留文字", () => {
    const text = stripMarkdown("看 ![图](a.png) 和 [链接](https://x.com)");
    expect(text).toBe("看 和 链接");
  });

  it("去掉标题符号与强调符号", () => {
    expect(stripMarkdown("## 标题\n**加粗** 和 *斜体*")).toBe("标题 加粗 和 斜体");
  });
});

describe("buildExcerpt", () => {
  it("短文本原样返回", () => {
    expect(buildExcerpt("一句话。")).toBe("一句话。");
  });

  it("超过上限时在句末标点处截断", () => {
    const sentence = "这是一个句子。";
    const text = sentence.repeat(30);
    const excerpt = buildExcerpt(text, 50);
    expect(excerpt.length).toBeLessThanOrEqual(50);
    expect(excerpt.endsWith("。")).toBe(true);
  });

  it("没有标点则硬截断并补省略号", () => {
    const excerpt = buildExcerpt("啊".repeat(300), 40);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("不把 Markdown 标记算进摘要", () => {
    const excerpt = buildExcerpt("**加粗**的文字", 50);
    expect(excerpt).not.toContain("*");
  });
});

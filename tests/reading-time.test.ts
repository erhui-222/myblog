import { describe, expect, it } from "vitest";
import { estimateReadingMinutes } from "../lib/reading-time";

describe("estimateReadingMinutes", () => {
  it("空内容至少 1 分钟", () => {
    expect(estimateReadingMinutes("")).toBe(1);
  });

  it("300 个中文字约 1 分钟", () => {
    expect(estimateReadingMinutes("字".repeat(300))).toBe(1);
  });

  it("900 个中文字约 3 分钟", () => {
    expect(estimateReadingMinutes("字".repeat(900))).toBe(3);
  });

  it("英文按单词计数", () => {
    expect(estimateReadingMinutes("word ".repeat(600))).toBe(2);
  });

  it("代码块内容计入阅读量", () => {
    const prose = "字".repeat(250);
    const code = "```js\n" + "const a = 1;\n".repeat(100) + "```";
    // 只算正文约 1 分钟；加上代码块（约 400 个词）应超过 1 分钟
    expect(estimateReadingMinutes(prose)).toBe(1);
    expect(estimateReadingMinutes(`${prose}\n\n${code}`)).toBeGreaterThan(1);
  });
});

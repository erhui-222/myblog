import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";

export type Heading = { id: string; text: string; level: number };

/**
 * 白名单：只放开代码高亮需要的 style / className，其余一律按默认规则过滤。
 * style 仅允许出现在 pre / code / span 上，避免通过 style 注入外链资源。
 */
const schema = {
  ...defaultSchema,
  // 默认会给 id 加 user-content- 前缀，会让目录锚点对不上
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className", "id"],
    pre: ["className", "style", "tabIndex"],
    code: ["className", "style", "data-language"],
    span: ["className", "style", "data-line", "data-highlighted-line", "data-highlighted-chars"],
    figure: ["className", "data-rehype-pretty-code-figure"],
    figcaption: ["className", "data-language"],
    table: ["className"],
    th: ["align", "className"],
    td: ["align", "className"],
    input: ["type", "checked", "disabled"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypePrettyCode, {
    theme: "github-light",
    keepBackground: false,
    defaultLang: "plaintext",
  })
  .use(rehypeSanitize, schema as typeof defaultSchema)
  .use(rehypeStringify);

/** 从 Markdown 源码抽取标题目录，id 生成规则与 rehype-slug 一致 */
export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const result: Heading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .trim();

    // 所有标题都要过 slugger，否则重复标题的编号会和 rehype-slug 不一致
    const id = slugger.slug(text);
    if (level === 2 || level === 3) {
      result.push({ id, text, level });
    }
  }

  return result;
}

export async function renderMarkdown(markdown: string): Promise<{ html: string; headings: Heading[] }> {
  const file = await processor.process(markdown);
  return {
    html: String(file),
    headings: extractHeadings(markdown),
  };
}

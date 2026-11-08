import { CodeCopyEnhancer } from "./CodeCopyEnhancer";

export function MarkdownRenderer({ html }: { html: string }) {
  return (
    <>
      <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
      <CodeCopyEnhancer />
    </>
  );
}

"use client";

import { useEffect } from "react";

/** 给正文里的每个代码块补一个复制按钮，不改动服务端渲染出的 HTML 结构 */
export function CodeCopyEnhancer() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLPreElement>(".article-body pre"));

    const cleanups: (() => void)[] = [];

    for (const block of blocks) {
      if (block.dataset.copyReady === "true") continue;
      block.dataset.copyReady = "true";
      block.style.position = "relative";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      Object.assign(button.style, {
        position: "absolute",
        top: "8px",
        right: "8px",
        padding: "2px 8px",
        fontSize: "11px",
        lineHeight: "1.8",
        borderRadius: "6px",
        border: "1px solid #e7e3db",
        background: "#fffdfa",
        color: "#6f6b64",
        cursor: "pointer",
        opacity: "0",
        transition: "opacity 150ms ease",
      });

      const show = () => {
        button.style.opacity = "1";
      };
      const hide = () => {
        button.style.opacity = "0";
      };

      const onClick = async () => {
        const text = block.innerText.replace(/^复制\s*/, "");
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "已复制";
        } catch {
          button.textContent = "复制失败";
        }
        window.setTimeout(() => {
          button.textContent = "复制";
        }, 2000);
      };

      block.addEventListener("mouseenter", show);
      block.addEventListener("mouseleave", hide);
      block.addEventListener("focusin", show);
      block.addEventListener("focusout", hide);
      button.addEventListener("click", onClick);
      block.appendChild(button);

      cleanups.push(() => {
        block.removeEventListener("mouseenter", show);
        block.removeEventListener("mouseleave", hide);
        block.removeEventListener("focusin", show);
        block.removeEventListener("focusout", hide);
        button.removeEventListener("click", onClick);
        button.remove();
        delete block.dataset.copyReady;
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}

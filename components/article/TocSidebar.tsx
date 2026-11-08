"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/markdown";

export function TocSidebar({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: [0, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="文章目录" className="sticky top-24 hidden lg:block">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">目录</p>
      <ul className="mt-3 space-y-1.5 border-l border-line">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block border-l-2 py-0.5 text-[13px] leading-snug transition-colors ${
                heading.level === 3 ? "pl-7" : "pl-4"
              } ${
                activeId === heading.id
                  ? "-ml-px border-accent text-ink"
                  : "-ml-px border-transparent text-muted hover:text-ink"
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

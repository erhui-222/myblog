"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">error</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          页面出了点问题
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          刷新一下通常就好了。如果反复出现，可以稍后再试。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}

import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function HeroSection() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-14 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">
            since {siteConfig.since}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {siteConfig.tagline}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{siteConfig.description}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/about"
              className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
            >
              关于我
            </Link>
            {siteConfig.social.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm text-muted transition-colors hover:border-[#d8d2c6] hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 md:block">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-line bg-paper text-2xl font-semibold text-accent">
            {siteConfig.name.slice(0, 1)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Timeline({
  items,
}: {
  items: { date: string; title: string; description: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-medium tracking-wide text-muted">经历</h2>
      <ol className="mt-4 space-y-0 border-l border-line">
        {items.map((item) => (
          <li key={`${item.date}-${item.title}`} className="relative pb-6 pl-5 last:pb-0">
            <span className="absolute -left-[3.5px] top-2 h-1.5 w-1.5 rounded-full bg-accent" />
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono text-xs text-faint">{item.date}</span>
              <span className="text-sm font-medium text-ink">{item.title}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

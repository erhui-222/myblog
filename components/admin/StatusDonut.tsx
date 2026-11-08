export function StatusDonut({ published, draft }: { published: number; draft: number }) {
  const total = published + draft;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const publishedRatio = total === 0 ? 0 : published / total;
  const publishedLength = circumference * publishedRatio;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label="发布状态分布">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#efeae1" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${publishedLength} ${circumference - publishedLength}`}
          transform="rotate(-90 70 70)"
        />
        <text
          x="70"
          y="66"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fontWeight="600"
          fill="#1c1b19"
        >
          {Math.round(publishedRatio * 100)}%
        </text>
        <text x="70" y="86" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#9a958c">
          已发布
        </text>
      </svg>

      <ul className="w-full space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            已发布
          </span>
          <span className="font-mono tabular-nums text-ink">{published}</span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full bg-[#e0dacd]" />
            草稿
          </span>
          <span className="font-mono tabular-nums text-ink">{draft}</span>
        </li>
        <li className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-muted">合计</span>
          <span className="font-mono tabular-nums text-ink">{total}</span>
        </li>
      </ul>
    </div>
  );
}

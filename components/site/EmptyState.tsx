import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionText, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper font-mono text-lg text-faint">
        ·
      </div>
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {actionText && actionHref ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90"
        >
          {actionText}
        </Link>
      ) : null}
    </div>
  );
}

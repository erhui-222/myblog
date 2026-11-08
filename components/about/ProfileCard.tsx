export function ProfileCard({
  name,
  title,
  bio,
}: {
  name: string;
  title: string;
  bio: string[];
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-paper text-xl font-semibold text-accent">
        {name.slice(0, 1)}
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">{name}</h1>
      <p className="mt-1 text-sm text-muted">{title}</p>
      <div className="mt-5 space-y-3 border-t border-line pt-5">
        {bio.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-sm leading-relaxed text-[#3d3a35]">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

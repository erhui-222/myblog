export function SkillTags({ groups }: { groups: { name: string; items: string[] }[] }) {
  if (groups.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-medium tracking-wide text-muted">技能与方向</h2>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="w-16 shrink-0 pt-1 font-mono text-xs text-faint">{group.name}</span>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-[13px] text-[#3d3a35]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

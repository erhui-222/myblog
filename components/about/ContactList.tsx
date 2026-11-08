export function ContactList({
  contacts,
}: {
  contacts: { type: string; label: string; href: string }[];
}) {
  if (contacts.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-medium tracking-wide text-muted">联系方式</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {contacts.map((contact) => (
          <li key={contact.href}>
            <a
              href={contact.href}
              target={contact.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="group flex min-h-12 items-center justify-between gap-4 py-3 text-sm transition-colors"
            >
              <span className="text-muted group-hover:text-ink">{contact.type}</span>
              <span className="text-ink transition-colors group-hover:text-accent">
                {contact.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

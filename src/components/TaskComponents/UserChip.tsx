/**
 * Werner spec rev H — small user chip with avatar + name + role.
 *
 * Used in the doc card's From / To / CC strip on TaskDetails. Avatar
 * is a coloured circle with initials (matching production avatar
 * styling on Recent Responses cards).
 *
 * Visual is intentionally compact — same line height as the rest of
 * the dl rows so the meta block stays one tidy column.
 */

interface Props {
  name: string;
  role?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function UserChip({ name, role }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20 shrink-0">
        {initials(name)}
      </span>
      <span className="text-foreground">
        {name}
        {role && <span className="text-muted-foreground"> ({role})</span>}
      </span>
    </span>
  );
}

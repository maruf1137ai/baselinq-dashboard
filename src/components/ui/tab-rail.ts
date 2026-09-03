/**
 * The page tab rail — one definition, six call sites.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * `text-sm py-4 px-6 border-b-2 -mb-px` was retyped in five components and
 * declared a sixth time as a pair of constants inside `AuditPage`. That is
 * the same drift `PageHeader` was created to stop, one level down: six
 * copies of a rail that has to look identical on every page.
 *
 * ── Why the height changed ───────────────────────────────────────────────
 *
 * `py-4` around a 21px label made the rail 54px. Measured at 1440px, that
 * is the entire reason Finance, Programme and Project Health start their
 * content at 134px while Documents, Compliance and Meetings start at 80 —
 * a rail is real content, but 54px of it for a row of one-word labels is
 * not. `py-3` brings it to 46px and matches what the rest of the product
 * already does with a control row: the Tasks filter line is 36px, a select
 * is 32px, a panel header is 44px.
 *
 * The 24px horizontal padding stays. It is what separates the tab labels
 * enough to read as separate targets, and it costs no vertical space.
 */

/** The rail itself: the rule the triggers hang their underline on. */
export const TAB_RAIL = "flex items-center gap-2 border-b border-border";

/** A plain <button> tab. Pass `active` to get the underline. */
export function tabTrigger(active: boolean): string {
  return [
    "text-sm py-3 px-6 border-b-2 -mb-px whitespace-nowrap transition-all",
    active ? "border-primary text-foreground" : "text-muted-foreground border-transparent",
  ].join(" ");
}

/** Radix `TabsList` equivalent of `TAB_RAIL`. */
export const TAB_LIST_RADIX =
  "h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0 border-b border-border";

/** Radix `TabsTrigger` equivalent of `tabTrigger` — state comes from data attrs. */
export const TAB_TRIGGER_RADIX =
  "text-sm font-normal py-3 px-6 rounded-none border-b-2 border-transparent -mb-px whitespace-nowrap text-muted-foreground " +
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none " +
  "data-[state=active]:border-primary data-[state=active]:text-foreground hover:text-foreground";

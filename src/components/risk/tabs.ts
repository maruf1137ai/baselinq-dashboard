/**
 * Project Health's tab model.
 *
 * Extracted from the page for one reason: the two things it decides — which
 * tabs a viewer may see, and which `?tab=` slug maps to which tab — are both
 * things that must not regress, and both were only reachable by mounting the
 * whole page. They are pure, so they are tested directly.
 *
 * ── Why this order ────────────────────────────────────────────────────────
 *
 * Project Health serves two readers and the tab order is the reconciliation.
 *
 * The first four tabs are the INSURER's reading order, and they are a single
 * argument in sequence: what the administration found (Risk signals), whether
 * notice was served inside the contractual period (Notice deadlines), whether
 * the supporting record is sealed and hash-verifiable (Evidence), and what has
 * been disclosed to whom on what basis of consent (Insurer). Read top to
 * bottom that is the case that this project is being competently administered
 * — which is what the page was built against and what it must keep doing.
 *
 * "Commercial position" is APPENDED, not inserted. It answers a different
 * question for a different reader — the principal agent's "where do I stand" —
 * and putting it between the evidence tabs would break the insurer's sequence
 * in half. It is also the only tab that is permission-gated, and a gated tab
 * in the middle of a strip leaves a hole in the argument for the viewers who
 * cannot see it.
 *
 * What the two readers SHARE is lifted out of the tabs entirely: the verdict
 * and the key indicators are the page masthead, above the strip, on every tab.
 * See the layout note in `ProjectHealth.tsx`.
 */

export const BASE_TABS = ["Risk signals", "Notice deadlines", "Evidence", "Insurer"] as const;
export const TABS = [...BASE_TABS, "Commercial position"] as const;
export type TabKey = (typeof TABS)[number];

/**
 * A viewer without `finance.view` is not shown the commercial tab.
 *
 * This is the first of two locks, not the only one: `useProjectCommercials`
 * never REQUESTS the figures for them, `CommercialTab` refuses to render
 * independently of its caller, and the server gates all three underlying
 * routes. The gate fails closed while the permission map is in flight — see
 * `resolveFinanceAccess`.
 */
export const tabsFor = (canViewFinance: boolean): readonly TabKey[] =>
  canViewFinance ? TABS : BASE_TABS;

/**
 * `?tab=` slugs, so another page can link to a specific tab.
 *
 * The homepage action queue needs this: a notice-deadline row is the highest
 * stakes thing it renders, and landing the user on "Risk signals" and leaving
 * them to find the right tab is not an action — it is a maze. Slugs rather
 * than the labels themselves so the URL survives a change of wording.
 *
 * These strings are a contract with the homepage links and must not change.
 */
export const TAB_SLUG: Record<string, TabKey> = {
  "risk-signals": "Risk signals",
  "notice-deadlines": "Notice deadlines",
  evidence: "Evidence",
  insurer: "Insurer",
  commercial: "Commercial position",
};

/** The slug for a tab, for writing the URL back. */
export const slugFor = (tab: TabKey): string | undefined =>
  Object.keys(TAB_SLUG).find((k) => TAB_SLUG[k] === tab);

/**
 * The tab to show for a `?tab=` value and a viewer's permissions.
 *
 * `?tab=commercial` is a shareable URL and can be pasted to anybody. A viewer
 * who may not see finance data falls back to the first tab rather than landing
 * on an empty one — and the tab's data was never requested for them anyway.
 */
export function resolveTab(raw: string | null, canViewFinance: boolean): TabKey {
  const wanted = TAB_SLUG[raw ?? ""];
  const allowed = tabsFor(canViewFinance);
  return wanted && allowed.includes(wanted) ? wanted : "Risk signals";
}

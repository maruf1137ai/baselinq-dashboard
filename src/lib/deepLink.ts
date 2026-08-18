/**
 * Deep-link query parameters — resolving `?tab=`, `?pc=`, `?vo=`,
 * `?milestone=` and `?obligation=` against what the page actually holds.
 *
 * WHY THIS IS A SEPARATE, PURE MODULE
 * -----------------------------------
 * The dangerous case here is not the happy path. It is the link that no
 * longer resolves: an id that was deleted, or one the viewer was never
 * permitted to see. A page that reacts to those by *filtering* its list down
 * to the named record ends up asserting "there is nothing here" to someone who
 * has simply not been shown it — the same shape of bug as the risk cell that
 * once read "Open risk signals 0" to a viewer lacking permission for the
 * twelve that existed.
 *
 * So the rule these helpers enforce is: a deep link may only ever *select*
 * something that is already on the page. It never filters, never fetches by
 * id, and never becomes a second route into data. When it cannot resolve, it
 * resolves to nothing and the page renders exactly as it would have with no
 * parameter at all.
 *
 * Being pure and separate means the degrade cases are testable without
 * mounting a page — see src/lib/__tests__/deepLink.test.ts.
 */

/**
 * Tab keys travel through the URL, so they have to survive a human retyping
 * one, a mail client re-encoding it, and `+` vs `%20`. Case, surrounding
 * whitespace and the choice of space/underscore/hyphen/plus as a word
 * separator are all normalised away; nothing else is.
 */
function normaliseTabKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_+-]+/g, " ");
}

/**
 * Resolves the `tab` parameter against the tabs THIS viewer can see.
 *
 * `visibleTabs` is the permission-filtered list the page already computed, so
 * a tab the viewer is not entitled to is simply absent from it and the
 * parameter naming it falls back like any other unknown value. The parameter
 * cannot widen access: it can only pick from a list that was already decided
 * without reference to the URL.
 *
 * Falls back to the page's existing default (the first visible tab) when the
 * parameter is absent, blank, unknown, or names a tab this viewer cannot see.
 * With no visible tabs at all the result is "", which is what the page did
 * before deep links existed.
 */
export function resolveTabParam(
  param: string | null | undefined,
  visibleTabs: readonly string[],
): string {
  const fallback = visibleTabs[0] ?? "";
  if (!param || !param.trim()) return fallback;
  const wanted = normaliseTabKey(param);
  return visibleTabs.find((tab) => normaliseTabKey(tab) === wanted) ?? fallback;
}

/**
 * Finds the one record a deep link names, among the records the page has
 * already loaded and is already showing.
 *
 * `idsOf` returns every identifier a link is allowed to name the record by —
 * for a variation order that is both the display number ("VO-001") and the
 * task id ("43"), because both appear in the app and either could plausibly
 * end up in a link. Comparison is on the string form, trimmed and
 * case-insensitive, so a numeric id from the API matches a numeric id from the
 * query string.
 *
 * Returns null — never throws, never an "unresolved" marker the UI might
 * render — when:
 *   • the parameter is absent or blank;
 *   • the list is still loading, or is empty because this viewer's permissions
 *     produced an empty list;
 *   • the id is stale and matches nothing.
 * In every one of those cases the caller selects nothing and shows the plain
 * page.
 */
export function findByDeepLinkId<T>(
  param: string | null | undefined,
  items: readonly T[],
  idsOf: (item: T) => readonly (string | number | null | undefined)[],
): T | null {
  if (!param) return null;
  const wanted = param.trim().toLowerCase();
  if (!wanted) return null;
  return (
    items.find((item) =>
      idsOf(item).some(
        (id) =>
          id !== null &&
          id !== undefined &&
          String(id).trim().toLowerCase() === wanted,
      ),
    ) ?? null
  );
}

/**
 * The page a record sits on in a client-paginated list, 1-based.
 *
 * A deep link to the 34th certificate is useless if the table opens on page 1
 * and the row is three pages away. Returns null when the record is not in the
 * list at all, which the caller reads as "leave the pagination alone".
 */
export function pageContaining<T>(
  items: readonly T[],
  match: (item: T) => boolean,
  pageSize: number,
): number | null {
  if (pageSize <= 0) return null;
  const index = items.findIndex(match);
  return index === -1 ? null : Math.floor(index / pageSize) + 1;
}

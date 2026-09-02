/**
 * Turns a list of role codes into a plain-English sentence fragment for the
 * Help pages' "who can do it" text — e.g. `["CLIENT", "PM"]` with
 * `{CLIENT: "Client / Owner", PM: "Project Manager"}` becomes
 * "Client / Owner and Project Manager".
 *
 * Dedupes, drops codes with no known display name (a role deleted after being
 * granted, or a code the roles list hasn't loaded yet), and sorts
 * alphabetically by display name so the sentence doesn't reorder itself
 * between renders as the underlying grant set changes shape.
 */
export function formatRoleList(
  roleCodes: string[],
  roleNamesByCode: Record<string, string>,
): string {
  const names = [...new Set(roleCodes)]
    .map((code) => roleNamesByCode[code])
    .filter((name): name is string => !!name)
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) return "Nobody currently";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Union of role codes across two `useGrantedRoles` code buckets — for OR-gated rows. */
export function unionRoleCodes(...lists: (string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const code of list ?? []) set.add(code);
  }
  return [...set];
}

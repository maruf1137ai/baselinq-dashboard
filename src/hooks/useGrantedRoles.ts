/**
 * Which roles currently hold a given permission code (or codes), from the
 * live Roles & Permissions matrix.
 *
 * Generic sibling of useAutoCcRoles.ts — that one only ever asks about
 * `task.auto_assign.<type>`. This is for anything else that needs "who can do
 * X" off live grants instead of a hardcoded role list, most directly the Help
 * pages (frontend/src/pages/Help*.tsx), whose "who can do it" prose used to be
 * hand-written strings that went stale the moment an admin edited the matrix.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";

/** code -> role codes currently granted that permission, resolved global -> org -> project. */
export type GrantedRolesResponse = Record<string, string[]>;

/**
 * Returns `{ [code]: roleCode[] }` for every code passed in, or `undefined`
 * until the answer arrives. A code the server doesn't recognise resolves to
 * an empty array rather than being omitted — see GrantedRolesView's docstring
 * (backend/permissions/auto_cc.py).
 */
export function useGrantedRoles(
  codes: string[],
  projectId: string | undefined,
): GrantedRolesResponse | undefined {
  // Order-independent and de-duplicated so two callers asking for the same
  // codes in a different order still share one cached request.
  const key = [...new Set(codes)].sort().join(",");

  const { data } = useQuery<GrantedRolesResponse>({
    queryKey: ["granted-roles", key, projectId ?? null],
    enabled: codes.length > 0 && !!projectId,
    // Cheap and read-only, but changes the moment an admin edits the matrix —
    // same staleness budget as useAutoCcRoles.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const qs = new URLSearchParams({ codes: key });
      if (projectId) qs.set("project_id", projectId);
      return (await fetchData(`permissions/granted-roles/?${qs}`)) as GrantedRolesResponse;
    },
  });

  return data;
}

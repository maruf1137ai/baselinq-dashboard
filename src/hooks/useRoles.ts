import useFetch from "./useFetch";

export interface AppRole {
  id?: number;
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
}

export function useRoles() {
  const { data, isLoading } = useFetch<AppRole[]>("auth/roles/");
  const all = Array.isArray(data) ? data : [];
  const seen = new Set<string>();
  const roles = all.filter((r) => {
    if (!r.code || r.is_active === false) return false;
    if (seen.has(r.code)) return false;
    seen.add(r.code);
    return true;
  });
  return { roles, isLoading };
}

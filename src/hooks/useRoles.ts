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
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const roles = all.filter((r) => {
    if (!r.code || r.is_active === false) return false;
    const nameKey = r.name.trim().toLowerCase();
    if (seenCodes.has(r.code) || seenNames.has(nameKey)) return false;
    seenCodes.add(r.code);
    seenNames.add(nameKey);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
  return { roles, isLoading };
}

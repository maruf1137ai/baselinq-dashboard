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
  return { roles: (data ?? []).filter((r) => r.is_active !== false), isLoading };
}

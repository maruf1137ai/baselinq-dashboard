import { useEffectivePermissions } from "./useEffectivePermissions";

/**
 * Returns whether the current user has a given permission code in the given
 * project (or globally if no projectId).
 *
 * Returns `true` while loading to avoid redirect/flicker on app boot. Once the
 * effective-permissions payload arrives, flips to the actual value.
 */
export function usePermission(code: string, projectId?: number | null): boolean {
  const { data, isLoading } = useEffectivePermissions(projectId);
  if (isLoading) return true;
  return Boolean(data?.permissions?.[code]);
}

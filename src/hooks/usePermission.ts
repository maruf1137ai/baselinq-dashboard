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

/**
 * `code`, or `fallback` when the server does not know `code` at all.
 *
 * The effective-permissions payload lists every permission the backend knows,
 * granted or not — so a code that is ABSENT means the backend predates it,
 * not that it was denied. Finance's per-tab view codes arrive with a backend
 * migration; reading them with plain `usePermission` against a backend that
 * has not run it hid four of the five Finance tabs from everyone. Falling back
 * to the parent code keeps a frontend that ships first showing what the
 * backend would.
 */
export function usePermissionOr(code: string, fallback: string, projectId?: number | null): boolean {
  const { data, isLoading } = useEffectivePermissions(projectId);
  if (isLoading) return true;
  const permissions = data?.permissions ?? {};
  return code in permissions ? Boolean(permissions[code]) : Boolean(permissions[fallback]);
}

/**
 * Is the signed-in user Baselinq staff?
 *
 * Distinct from every other gate in this app: it is not a project permission
 * and is not in the permission matrix. It answers "may this person act on
 * Baselinq's own billing", which the server decides with `is_staff or
 * is_superuser` (see billing/views.py::_is_platform_staff).
 *
 * Returns FALSE while loading, unlike `usePermission` which returns true. The
 * controls this gates are irreversible and belong to a different company: a
 * flash of an "Issue invoice" button in front of a customer is worse than a
 * control appearing a moment late.
 */
export function useIsPlatformStaff(projectId?: number | null): boolean {
  const { data, isLoading } = useEffectivePermissions(projectId);
  if (isLoading) return false;
  return Boolean(data?.isPlatformStaff);
}

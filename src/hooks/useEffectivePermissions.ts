import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/Api";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface EffectivePermissions {
  projectId: number | null;
  roleCode: string | null;
  permissions: Record<string, boolean>;
  /**
   * True when the signed-in user is Baselinq staff.
   *
   * Platform-fee invoice actions (build / issue / settle / cancel) are gated
   * server-side on `is_staff or is_superuser`, deliberately outside the
   * permission matrix — every code in that matrix is granted to customer roles
   * on their own projects, and issuing Baselinq's own invoice is not a
   * customer act. Without this flag the client had no way to know, so it gated
   * those controls on a project permission and showed customers an
   * irreversible "Issue invoice" button that the server then refused.
   */
  isPlatformStaff?: boolean;
  /** A Baselinq invoice is over 30 days overdue: the project is read-only. */
  billingLocked?: boolean;
  billingLockInvoice?: string | null;
  billingLockedSince?: string | null;
}

/**
 * Fetches the current user's effective permission map for the given project
 * (or globally if no projectId). Fresh for 30s; refetched on user or project
 * change, on a permissions push, on window focus and every 60s.
 */
export function useEffectivePermissions(projectId?: number | null) {
  const { data: user } = useCurrentUser();
  const qs = projectId ? `?project_id=${projectId}` : "";
  const enabled = !!user?.id;

  const query = useQuery<EffectivePermissions>({
    queryKey: ["effective-perms", user?.id ?? "anon", projectId ?? 0],
    queryFn: async () => {
      const raw = await fetchData(`permissions/effective/${qs}`);
      return raw as EffectivePermissions;
    },
    enabled,
    staleTime: 30 * 1000,
    // The push (PermissionLiveSync) is the primary path. These are the
    // fallback when it cannot reach this user — socket down, or a second
    // backend process without a shared channel layer: re-read on returning
    // to the tab, and once a minute while it stays open.
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

  return query;
}

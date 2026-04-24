import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/Api";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface EffectivePermissions {
  projectId: number | null;
  roleCode: string | null;
  permissions: Record<string, boolean>;
}

/**
 * Fetches the current user's effective permission map for the given project
 * (or globally if no projectId). Cached for 2 minutes and refetched on user
 * or project change.
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
    staleTime: 2 * 60 * 1000,
  });

  return query;
}

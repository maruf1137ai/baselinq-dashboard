/**
 * Which roles are pre-filled into a task's CC field, from the permission matrix.
 *
 * The create forms already pre-fill CC, but from `TASK_TYPE_ROLE_RULES` in
 * lib/roleGroups.ts — a hardcoded list. For an RFI that list is every
 * professional plus every contractor code, so it copies in almost everyone,
 * and narrowing it means a frontend deploy.
 *
 * `task.auto_assign.<type>` has always meant exactly this. Reading it here
 * makes the switch on the Roles & Permissions page the thing that decides,
 * and an admin can change who gets copied in without anyone shipping code.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";

/** Task types with an auto-assign permission. CPI no longer has one. */
export type AutoCcTaskType = "rfi" | "si" | "vo" | "dc" | "gi";

interface AutoCcResponse {
  taskType: string;
  permission: string | null;
  roleCodes: string[];
}

/**
 * Returns the role codes to pre-fill, or `undefined` until the answer arrives.
 *
 * Undefined matters: TaskMetaFields applies its CC pre-fill once and latches,
 * so handing it an empty array while loading would count as "applied" and the
 * real list would never take effect. Callers pass the value straight through
 * and let it stay undefined until it is known.
 */
export function useAutoCcRoles(taskType: AutoCcTaskType): string[] | undefined {
  const projectId = useSelectedProjectId();

  const { data } = useQuery<AutoCcResponse>({
    queryKey: ["auto-cc-roles", taskType, projectId ?? null],
    enabled: !!taskType,
    // Cheap and read-only, but it changes the moment an admin edits the
    // matrix — and the permissions socket invalidates it when they do.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const qs = new URLSearchParams({ task_type: taskType });
      if (projectId) qs.set("project_id", projectId);
      return (await fetchData(`permissions/auto-cc/?${qs}`)) as AutoCcResponse;
    },
  });

  return data?.roleCodes;
}

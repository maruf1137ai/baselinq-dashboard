import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
import type { Folder, FolderTab } from '@/types/folder';

interface UseFoldersParams {
  projectId: string | undefined;
  tab?: FolderTab;
  enabled?: boolean;
}

/**
 * React Query hook to fetch the folder tree for a project.
 * Returns top-level folders with nested children.
 *
 * @param projectId - The project ID to fetch folders for
 * @param tab - Optional tab filter (contracts, drawings, documents)
 * @param enabled - Whether the query should run (default: true if projectId exists)
 */
export function useFolders({ projectId, tab, enabled = true }: UseFoldersParams) {
  return useQuery<Folder[]>({
    queryKey: ['folders', projectId, tab],
    queryFn: async () => {
      console.log('🔍 useFolders called:', { projectId, tab, enabled });

      if (!projectId) {
        console.warn('⚠️ No projectId provided to useFolders');
        return [];
      }

      const params = new URLSearchParams({ project_id: projectId });
      if (tab) {
        params.append('tab', tab);
      }

      const url = `documents/folders/?${params.toString()}`;
      console.log('📡 Fetching folders from:', url);

      const result = await fetchData(url);
      console.log('✅ Folders API response:', result);

      return result;
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - folders don't change frequently
  });
}

/**
 * Helper hook specifically for Contracts tab (read-only system folders).
 */
export function useContractsFolders(projectId: string | undefined) {
  return useFolders({ projectId, tab: 'contracts' });
}

/**
 * Helper hook for Drawings tab.
 */
export function useDrawingsFolders(projectId: string | undefined) {
  return useFolders({ projectId, tab: 'drawings' });
}

/**
 * Helper hook for Documents tab.
 */
export function useDocumentsFolders(projectId: string | undefined) {
  return useFolders({ projectId, tab: 'documents' });
}

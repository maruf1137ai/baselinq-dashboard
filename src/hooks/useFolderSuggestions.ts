import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';

export interface FolderSuggestions {
  disciplines: string[];
  drawingSubfolders: string[];
  documentSubfolders: string[];
}

/**
 * Fetches folder suggestions from the backend API.
 *
 * Returns:
 * - disciplines: Canonical list of discipline names (e.g., "Architecture", "Structural")
 * - drawingSubfolders: Suggested folder names for Drawings tab
 * - documentSubfolders: Suggested folder names for Documents tab
 *
 * Data is static and cached indefinitely (staleTime: Infinity).
 */
export function useFolderSuggestions() {
  return useQuery<FolderSuggestions>({
    queryKey: ['folder-suggestions'],
    queryFn: () => fetchData('documents/folder-suggestions/'),
    staleTime: Infinity, // Static data, never refetch unless manually invalidated
  });
}

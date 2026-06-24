import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';

export interface InsuranceStatus {
  projectId: string;
  folderId: string | null;
  folderName: string;
  satisfied: boolean;
  documentCount: number;
}

export function useInsuranceStatus(projectId: string | null | undefined) {
  return useQuery<InsuranceStatus>({
    queryKey: ['insurance-status', projectId],
    queryFn: () =>
      fetchData(`documents/insurance-status/?project_id=${projectId}`),
    enabled: !!projectId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

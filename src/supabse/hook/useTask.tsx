import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GetTask, modifyTask } from '../api';

const useTask = (projectId?: string) => {
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['task', projectId],
    queryFn: () => GetTask(projectId),
    enabled: !!projectId,
  });

  return { data: queryData?.data || [], isLoading, error, refetch };
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTask: any) => modifyTask({ newTask }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
};

export default useTask;

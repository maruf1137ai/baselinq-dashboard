// Django API project hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  ProjectData,
} from "@/lib/Api";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await getProjects();
      // API returns { count, next, previous, results }
      // Extract the results array
      return response?.results || [];
    },
  });
};

export const useProject = (projectId?: string | number) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId as any),
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectData: ProjectData) => createProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectData: ProjectData) => updateProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

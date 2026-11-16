// Django API project hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchData,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  ProjectData,
} from "@/lib/Api";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { pageUrl } from "@/hooks/useAllPages";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    // Every page. `projects/` is paged at twenty, and this read the first
    // page only, so a user's 21st project was missing from every screen
    // that picks from this list (the weather widget, Edit project, Site).
    queryFn: async () => (await fetchAllPages<any>((page) => pageUrl("projects/", page), fetchData)).rows,
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

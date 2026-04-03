import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, PlusCircle, LogOut, Trash2 } from "lucide-react";
import Trending from "./icons/Trending";
import AiWorkspace from "./icons/AiWorkspace";
import Communication from "./icons/Communication";
import Task from "./icons/Task";
import SaveMoney from "./icons/SaveMoney";
import Shield from "./icons/Shield";
import Meetings from "./icons/Meeting";
import Programme from "./icons/Programme";
import Document from "./icons/Document";
import Settings from "./icons/Settings";
import Help from "./icons/Help";
import Document2 from "./icons/Document2";
import { useProjects } from "@/hooks/useProjects"; // Django API hook
import { useCurrentUser } from "@/hooks/useCurrentUser"; // Django auth hook
import { useLogout } from "@/hooks/useLogout"; // Django logout hook
import { deleteProject, fetchData } from "@/lib/Api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useFetch from "@/hooks/useFetch";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionKey } from "@/lib/roleUtils";

interface Project {
  id: string;
  name: string;
  project_number: string;
  location?: string;
  status?: string;
}

const navItems = [
  { title: "Home", url: "/", icon: <Trending />, permission: null },
  { title: "Tasks", url: "/tasks", icon: <Task />, permission: null },
  { title: "Programme", url: "/programme", icon: <Programme />, permission: null },
  { title: "Meetings", url: "/meetings", icon: <Meetings />, permission: null },
  { title: "Communications", url: "/communications", icon: <Communication />, permission: null },
  { title: "Documents", url: "/documents", icon: <Document2 />, permission: null },
  { title: "Finance", url: "/finance", icon: <SaveMoney />, permission: null },
  { title: "Compliance", url: "/compliance", icon: <Shield />, permission: null },
  { title: "Linq", url: "/ai-workspace", icon: <AiWorkspace />, permission: null },
] as const;

const settingsItems = [
  { title: "Settings", url: "/settings", icon: <Settings />, permission: null },
  { title: "Help", url: "/help", icon: <Help />, permission: null },
] as const;

export function DashboardSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser(); // Django auth hook
  const { data: projectsData, isLoading, refetch } = useFetch(`projects/?userId=${user?.id}`, { enabled: !!user?.id })
  const projects = projectsData?.results || [];
  const { logout } = useLogout(); // Django logout hook
  const navigate = useNavigate();
  const { setUserRole, clearUserRole } = useUserRoleStore();
  const { can } = usePermissions();
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem("selectedProjectId") || "",
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const handleProjectChange = () => {
      setSelectedProjectId(localStorage.getItem("selectedProjectId") || "");
    };

    window.addEventListener("project-change", handleProjectChange);
    return () =>
      window.removeEventListener("project-change", handleProjectChange);
  }, []);

  // Fetch user role for the selected project
  const fetchUserRole = async (projectId: string, userId: number) => {
    try {
      const response = await fetchData(`projects/${projectId}/user-role/?userId=${userId}`);
      if (response?.roleName) {
        // Normalize Client/Owner variants → CLIENT so all role checks are consistent
        const raw = response.roleName as string;
        const normalized = /^(client.?owner|owner)$/i.test(raw.trim()) ? "CLIENT" : raw;
        setUserRole(normalized);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  useEffect(() => {
    // console.log(selectedProjectId)
    const isTrulyEmpty = !isLoading && user && projectsData && projects.length === 0;
    // console.log(!isLoading, user, projectsData, projects.length === 0)

    if (isTrulyEmpty) {
      if (selectedProjectId) {
        // Clear stale localStorage when no projects exist
        // console.log("No projects found, clearing selection");
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("projectLocation");
        setSelectedProjectId("");
        clearUserRole();
      }
      // navigate("/create-project");
    } else if (projects.length > 0 && (!selectedProjectId || !projects.some((p: any) => String(p._id || p.id) === selectedProjectId))) {
      // Auto select first project if none selected or stored ID doesn't match any project
      const firstProject = projects[0];
      const firstId = firstProject._id || firstProject.id;
      if (firstId) {
        // console.log("Auto-selecting first project:", firstId);
        setSelectedProjectId(String(firstId));
        localStorage.setItem("selectedProjectId", String(firstId));

        // Fetch user role for the first project
        if (user?.id) {
          fetchUserRole(String(firstId), user.id);
        }
      }
    }
  }, [projects, isLoading, selectedProjectId, projectsData, user?.id]);

  // Fetch user role when project or user changes
  useEffect(() => {
    if (selectedProjectId && user?.id) {
      fetchUserRole(selectedProjectId, user.id);
    }
  }, [selectedProjectId, user?.id]);

  // Listen for user-role-change event from team members table
  useEffect(() => {
    const handleUserRoleChange = () => {
      if (selectedProjectId && user?.id) {
        fetchUserRole(selectedProjectId, user.id);
      }
    };

    window.addEventListener("user-role-change", handleUserRoleChange);
    return () =>
      window.removeEventListener("user-role-change", handleUserRoleChange);
  }, [selectedProjectId, user?.id]);

  const handleProjectSelect = async (project: Project) => {
    const pId = (project as any)?._id;
    setSelectedProjectId(pId);
    localStorage.setItem("selectedProjectId", pId);
    localStorage.setItem("projectLocation", project?.location || "");

    // Fetch user role for the selected project
    if (user?.id) {
      await fetchUserRole(pId, user.id);
    }

    window.dispatchEvent(new Event("project-change"));
    window.location.reload();
  };

  const selectedProject = projects.find((p: any) => (p._id || p.id) === selectedProjectId);

  const handleLogout = () => {
    clearUserRole();
    logout();
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const projectId = (projectToDelete as any)._id;
      await deleteProject(projectId);

      toast.success("Project deleted successfully");

      // Find next project to select
      const currentIndex = projects.findIndex((p: any) => p._id === projectId);
      let nextProject = null;

      if (projects.length > 1) {
        // Select next project, or previous if deleting the last one
        if (currentIndex < projects.length - 1) {
          nextProject = projects[currentIndex + 1];
        } else if (currentIndex > 0) {
          nextProject = projects[currentIndex - 1];
        }
      }

      if (nextProject) {
        const nextId = (nextProject as any)._id;
        setSelectedProjectId(nextId);
        localStorage.setItem("selectedProjectId", nextId);
        localStorage.setItem("projectLocation", nextProject?.location || "");
        window.dispatchEvent(new Event("project-change"));

        // Fetch user role for the next project
        if (user?.id) {
          await fetchUserRole(nextId, user.id);
        }
      } else {
        // No projects left
        // Invalidate specific query key for projects
        queryClient.invalidateQueries({ queryKey: [`projects/?userId=${user?.id}`] });
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("projectLocation");
        setSelectedProjectId("");
        clearUserRole();
        window.dispatchEvent(new Event("project-change"));
      }

      // Refetch projects to update the list
      await refetch();

      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.");
    }
  };


  return (
    <>
      <Sidebar className="border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full">
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="p-3 border border-border rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="h-9 w-9 bg-[#121212] rounded-xl flex items-center justify-center">
                    <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h1 className="text-sm font-regular text-foreground aeonik truncate">
                      {selectedProject
                        ? selectedProject.name
                        : isLoading
                          ? "Loading..."
                          : "Select Project"}
                    </h1>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((project: any) => {
                  // console.log(selectedProjectId == String(project._id))
                  return <DropdownMenuItem
                    key={project._id || project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="cursor-pointer flex justify-between">
                    <div className="flex items-center gap-2">
                      {(selectedProjectId == String(project._id) || selectedProjectId == String(project.id)) && (
                        <span className="ml-auto text-xs text-blue-500 h-2 w-2 rounded-full bg-blue-500 block">
                        </span>
                      )}
                      {project.name}

                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2
                        className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                          setShowDeleteDialog(true);
                        }}
                      />

                    </div>
                  </DropdownMenuItem>
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/create-project")}
                  className="cursor-pointer text-blue-600 gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create New Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 overflow-auto px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground/50 px-0 uppercase py-2 text-muted-foreground/50">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent className="">
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = item.url === "/"
                      ? location.pathname === "/"
                      : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={
                            isActive
                              ? "!bg-white px-[16px] py-[11px] border border-border rounded-lg"
                              : "border border-transparent px-[16px] py-[11px]"
                          }>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3">
                            {React.cloneElement(item.icon, {
                              className: `text-muted-foreground  ${isActive ? "text-black" : ""
                                }`,
                            })}
                            {open && (
                              <span
                                className={`text-sm font-normal ${isActive ? "text-black" : "text-muted-foreground"}`}>
                                {item.title}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase px-3 py-2">
                Settings
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsItems.map((item) => {
                    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={
                            isActive
                              ? "!bg-white px-[16px] py-[11px] border border-border rounded-lg"
                              : "border border-transparent px-[16px] py-[11px]"
                          }>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3">
                            {React.cloneElement(item.icon, {
                              className: `text-muted-foreground  ${isActive ? "text-black" : ""
                                }`,
                            })}
                            {open && (
                              <span
                                className={`text-sm font-normal ${isActive ? "text-black" : "text-muted-foreground"}`}>
                                {item.title}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>

          {open && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-sm font-medium uppercase">
                    {(user?.name ||
                      user?.email?.split("@")[0] ||
                      "U")[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm capitalize font-medium text-sidebar-foreground truncate">
                    {user?.name ||
                      user?.email?.split("@")[0] ||
                      "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-gray-100 outline-none">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-48">
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

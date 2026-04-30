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
import { LogOut, UserCircle, FolderOpen, User as UserIcon, Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import Trending from "./icons/Trending";
import AiWorkspace from "./icons/AiWorkspace";
import Communication from "./icons/Communication";
import Task from "./icons/Task";
import SaveMoney from "./icons/SaveMoney";
import Shield from "./icons/Shield";
import Meetings from "./icons/Meeting";
import Programme from "./icons/Programme";
import Settings from "./icons/Settings";
import Help from "./icons/Help";
import Document2 from "./icons/Document2";
import { useCurrentUser } from "@/hooks/useCurrentUser"; // Django auth hook
import { useLogout } from "@/hooks/useLogout"; // Django logout hook
import { deleteProject, fetchData } from "@/lib/Api";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { PermissionKey } from "@/lib/roleUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";


const navItems: { title: string; url: string; icon: React.ReactElement; permission: PermissionKey | null }[] = [
  { title: "Home", url: "/", icon: <Trending />, permission: null },
  { title: "Tasks", url: "/tasks", icon: <Task />, permission: null },
  { title: "Programme", url: "/programme", icon: <Programme />, permission: "viewProgramme" },
  { title: "Meetings", url: "/meetings", icon: <Meetings />, permission: null },
  { title: "Communications", url: "/communications", icon: <Communication />, permission: null },
  { title: "Documents", url: "/documents", icon: <Document2 />, permission: null },
  { title: "Finance", url: "/finance", icon: <SaveMoney />, permission: "viewFinance" },
  { title: "Compliance", url: "/compliance", icon: <Shield />, permission: "viewCompliance" },
  { title: "Linq", url: "/ai-workspace", icon: <AiWorkspace />, permission: null },
];

const settingsItems: { title: string; url: string; icon: React.ReactElement; permission: PermissionKey | null }[] = [
  { title: "Settings", url: "/settings", icon: <Settings />, permission: "viewSettings" },
  { title: "Help", url: "/help", icon: <Help />, permission: null },
];

export function DashboardSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser(); // Django auth hook
  const { can } = usePermissions();
  const { data: projectsData, isLoading, refetch } = useFetch(`projects/?userId=${user?.id}`, { enabled: !!user?.id })
  const projects = projectsData?.results || [];
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);
  const { logout } = useLogout(); // Django logout hook
  const navigate = useNavigate();
  const { setUserRole, clearUserRole } = useUserRoleStore();
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem("selectedProjectId") || "",
  );
  const { data: channelsData } = useFetch<any[]>(
    selectedProjectId ? `channels/?projectId=${selectedProjectId}` : "",
    { refetchInterval: 30000 }
  )
  const totalUnread = Array.isArray(channelsData)
    ? channelsData.reduce((sum: number, ch: any) => sum + (ch.unread_count || 0), 0)
    : 0

  const { data: meetingUnreadData, refetch: refetchMeetingUnread } = useFetch<{ count: number }>(
    selectedProjectId ? `notifications/unread-count/?project_id=${selectedProjectId}&type=meeting_invited` : "",
    { refetchInterval: 30000 }
  )
  const meetingUnread = meetingUnreadData?.count || 0

  const { data: docUnreadData, refetch: refetchDocUnread } = useFetch<{ count: number }>(
    selectedProjectId ? `notifications/unread-count/?project_id=${selectedProjectId}&type=document_created,document_version_created` : "",
    { refetchInterval: 30000 }
  )
  const docUnread = docUnreadData?.count || 0

  useEffect(() => {
    const handler = () => {
      refetchMeetingUnread();
      refetchDocUnread();
    };
    window.addEventListener("notifications-marked-read", handler);
    return () => window.removeEventListener("notifications-marked-read", handler);
  }, [refetchMeetingUnread, refetchDocUnread]);

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
    } else if (selectedProjectId && projects.length > 0 && !projects.some((p: any) => String(p._id || p.id) === selectedProjectId)) {
      // Clear selection if it doesn't match any accessible project
      localStorage.removeItem("selectedProjectId");
      localStorage.removeItem("projectLocation");
      setSelectedProjectId("");
      clearUserRole();
    }
  }, [projects, isLoading, selectedProjectId, projectsData, user?.id]);

  // Fetch user role when project or user changes
  useEffect(() => {
    if (selectedProjectId && user?.id) {
      fetchUserRole(selectedProjectId, user.id);
    }
  }, [selectedProjectId, user?.id]);

  // Listen for user-role-change event from users table
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

  const handleProjectSelect = async (project: any) => {
    const pId = (project as any)?._id;
    setSelectedProjectId(pId);
    localStorage.setItem("selectedProjectId", pId);
    localStorage.setItem("projectLocation", project?.location || "");

    // Fetch user role for the selected project
    if (user?.id) {
      await fetchUserRole(pId, user.id);
    }

    window.dispatchEvent(new Event("project-change"));
    setIsSwitchingProject(true);
    window.location.reload();
  };

  const selectedProject = projects.find((p: any) => (p._id || p.id) === selectedProjectId);

  const handleLogout = () => {
    clearUserRole();
    logout();
  };



  return (
    <>
      {isSwitchingProject && <AwesomeLoader fullPage message="Switching Project" />}
      <Sidebar className="border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full">
          <div className="p-4">
            {location.pathname.startsWith("/account") ? (
              <div
                className="p-3 border border-border rounded-2xl flex items-center gap-3 bg-white/50 cursor-pointer hover:bg-white transition-colors group"
                onClick={() => navigate("/account")}
              >
                <div className="h-9 w-9 bg-[#121212] rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-border/10 group-hover:scale-105 transition-transform">
                  <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h1 className="text-sm font-regular text-foreground aeonik truncate">
                    baselinq
                  </h1>
                </div>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="p-3 border border-border rounded-2xl flex items-center gap-3 bg-white/50 hover:bg-white transition-colors cursor-pointer outline-none">
                    <div
                      className="h-9 w-9 bg-[#121212] rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-border/10 hover:scale-105 transition-transform"
                      onClick={(e) => { e.stopPropagation(); navigate("/"); }}
                    >
                      <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-1 text-left">
                      <h1 className="text-sm font-regular text-foreground aeonik truncate flex-1">
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          selectedProject?.name || ""
                        )}
                      </h1>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={4}
                  className="w-[var(--radix-dropdown-menu-trigger-width)]"
                >
                  <DropdownMenuLabel>Projects</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {projects.length === 0 ? (
                    <DropdownMenuItem disabled>No projects</DropdownMenuItem>
                  ) : (
                    projects.map((project: any) => {
                      const pId = String(project._id || project.id);
                      const isSelected = pId === selectedProjectId;
                      return (
                        <DropdownMenuItem
                          key={pId}
                          onClick={() => handleProjectSelect(project)}
                          className="cursor-pointer flex items-center gap-2"
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                          <span className={isSelected ? "font-medium" : "pl-[18px]"}>{project.name}</span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex-1 overflow-auto px-2">
            {location.pathname.startsWith("/account") ? (
              // ── Account nav ──
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs text-muted-foreground/50 px-0 normal-case py-2">
                  Account
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {[
                      { title: "Projects", url: "/account", icon: <FolderOpen className="w-4 h-4" />, show: true },
                      { title: "Profile", url: "/account/profile", icon: <UserIcon className="w-4 h-4" />, show: true },
                      { title: "Organisation", url: "/account/organization", icon: <Building2 className="w-4 h-4" />, show: user?.account_type === "organisation" },
                    ].filter(item => item.show).map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={isActive ? "!bg-white px-[16px] py-[11px] border border-border rounded-lg" : "border border-transparent px-[16px] py-[11px]"}>
                            <NavLink to={item.url} className="flex items-center gap-3">
                              {React.cloneElement(item.icon, { className: `text-muted-foreground ${isActive ? "text-black" : ""}` })}
                              {open && <span className={`text-sm font-normal ${isActive ? "text-black" : "text-muted-foreground"}`}>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              // ── Normal nav (project selected) ──
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs text-muted-foreground/50 px-0 normal-case py-2">
                    Main Menu
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.filter((item) => !item.permission || can(item.permission)).map((item) => {
                        const isActive = item.url === "/"
                          ? location.pathname === "/"
                          : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                        const badge =
                          item.title === "Communications" && totalUnread > 0 ? totalUnread :
                          item.title === "Meetings" && meetingUnread > 0 ? meetingUnread :
                          item.title === "Documents" && docUnread > 0 ? docUnread :
                          0;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={isActive ? "!bg-white px-[16px] py-[11px] border border-border rounded-lg" : "border border-transparent px-[16px] py-[11px]"}>
                              <NavLink to={item.url} className="flex items-center gap-3">
                                <span className="relative shrink-0">
                                  {React.cloneElement(item.icon, { className: `text-muted-foreground ${isActive ? "text-black" : ""}` })}
                                  {!open && badge > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-medium leading-none">
                                      {badge > 99 ? "99+" : badge}
                                    </span>
                                  )}
                                </span>
                                {open && <span className={`text-sm font-normal flex-1 ${isActive ? "text-black" : "text-muted-foreground"}`}>{item.title}</span>}
                                {open && badge > 0 && (
                                  <span className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                                    {badge > 99 ? "99+" : badge}
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
                  <SidebarGroupLabel className="text-xs text-muted-foreground normal-case px-3 py-2">
                    Settings
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {settingsItems.filter((item) => !item.permission || can(item.permission)).map((item) => {
                        const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={isActive ? "!bg-white px-[16px] py-[11px] border border-border rounded-lg" : "border border-transparent px-[16px] py-[11px]"}>
                              <NavLink to={item.url} className="flex items-center gap-3">
                                {React.cloneElement(item.icon, { className: `text-muted-foreground ${isActive ? "text-black" : ""}` })}
                                {open && <span className={`text-sm font-normal ${isActive ? "text-black" : "text-muted-foreground"}`}>{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </div>

          {open && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/account/profile")}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                >
                  <span className="text-white text-sm font-medium uppercase">
                    {(user?.name ||
                      user?.email?.split("@")[0] ||
                      "U")[0]}
                  </span>
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate("/account/profile")}>
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
                      onClick={() => navigate("/account/profile")}
                      className="cursor-pointer gap-2">
                      <UserCircle className="h-4 w-4" />
                      <span>My Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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

    </>
  );
}

import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
import { LogOut, UserCircle, FolderOpen, User as UserIcon, Building2, ChevronDown, Check, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRolesSidebar } from "@/components/roles/RolesSidebarContext";
import { RolesNav } from "@/components/roles/RolesNav";
import Trending from "./icons/Trending";
import AiWorkspace from "./icons/AiWorkspace";
import Communication from "./icons/Communication";
import Task from "./icons/Task";
import SaveMoney from "./icons/SaveMoney";
import Shield from "./icons/Shield";
import Pulse from "./icons/Pulse";
import Meetings from "./icons/Meeting";
import Programme from "./icons/Programme";
import Settings from "./icons/Settings";
import Help from "./icons/Help";
import Document2 from "./icons/Document2";
import { useCurrentUser } from "@/hooks/useCurrentUser"; // Django auth hook
import { useLogout } from "@/hooks/useLogout"; // Django logout hook
import { fetchData } from "@/lib/Api";
import useFetch from "@/hooks/useFetch";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { PermissionKey } from "@/lib/roleUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { useUnreadSummary } from "@/hooks/useUnreadSummary";


const navItems: { title: string; url: string; icon: React.ReactElement; permission: PermissionKey | null }[] = [
  { title: "Home", url: "/", icon: <Trending />, permission: null },
  { title: "Tasks", url: "/tasks", icon: <Task />, permission: null },
  { title: "Programme", url: "/programme", icon: <Programme />, permission: "viewProgramme" },
  { title: "Meetings", url: "/meetings", icon: <Meetings />, permission: null },
  { title: "Communications", url: "/communications", icon: <Communication />, permission: null },
  { title: "Documents", url: "/documents", icon: <Document2 />, permission: "viewDocuments" },
  { title: "Finance", url: "/finance", icon: <SaveMoney />, permission: "viewFinance" },
  { title: "Compliance", url: "/compliance", icon: <Shield />, permission: "viewCompliance" },
  // Not <Shield /> — Compliance already uses it, and two identical adjacent
  // nav rows can only be told apart by reading. See `Pulse`.
  { title: "Project Health", url: "/project-health", icon: <Pulse />, permission: "viewCompliance" },
  { title: "Linq", url: "/ai-workspace", icon: <AiWorkspace />, permission: null },
];

const settingsItems: { title: string; url: string; icon: React.ReactElement; permission: PermissionKey | null }[] = [
  { title: "Settings", url: "/settings", icon: <Settings />, permission: "viewSettings" },
  // Help lands on the hub page (/help), which offers the Tasks and
  // Finance reference guides as two options — see src/pages/Help.tsx.
  { title: "Help", url: "/help", icon: <Help />, permission: null },
  // Roles & Permissions — visible only to roles that can act on it. Own
  // permission category now (viewRolesPermissions -> roles.view/roles.edit,
  // see user/migrations/0059_seed_roles_permission_category.py), not
  // settings.edit — default access is exactly Administrator/Principal
  // Agent/Project Manager/Super User. Uses the plain check (via can(),
  // below), matching what the /roles-permissions route itself requires
  // (RoleRoute also checks plain can("viewRolesPermissions"), no bypass) —
  // link visibility can't drift from actual access.
  { title: "Roles & Permissions", url: "/roles-permissions", icon: <Shield />, permission: "viewRolesPermissions" },
];

export function DashboardSidebar() {
  const { open } = useSidebar();
  // Non-null only on /roles-permissions, where RolesPermissions mounts the
  // provider above DashboardLayout. Everywhere else this stays null and the
  // sidebar behaves exactly as it always has.
  const rolesSidebar = useRolesSidebar();
  const showRolesNav = rolesSidebar?.navMode === "roles";
  const location = useLocation();
  const { data: user } = useCurrentUser(); // Django auth hook
  const { can, canViewSettings } = usePermissions();
  const { data: projectsData, isLoading } = useFetch(`projects/?userId=${user?.id}`, { enabled: !!user?.id })
  const projects = projectsData?.results || [];
  const { logout } = useLogout(); // Django logout hook
  const navigate = useNavigate();
  const { userRole, setUserRole, clearUserRole } = useUserRoleStore();
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem("selectedProjectId") || "",
  );
  // All three sidebar badges come from ONE request, shared with the bell in
  // DashboardHeader (see useUnreadSummary). They were previously three
  // separate polls — channels/?projectId, and two notifications/unread-count
  // calls — refreshed by a hand-rolled window event whose handler refetched
  // only two of the three. That is why "mark all as read" emptied the bell
  // and left Communications showing a number: the channel query was never
  // refetched, and the endpoint behind it was never updated either. Reading
  // one cache entry means these cannot disagree with each other or the bell.
  // Surface counts come pre-grouped from the server (notification/surfaces.py),
  // so this file holds no notification-type list of its own to fall behind —
  // the Meetings badge counted only meeting_invited and the Documents badge
  // only two of four document types, which is why the bell could show rows
  // these badges silently ignored.
  const unread = useUnreadSummary();

  // Every sidebar item that can carry unread notifications maps to a
  // notification/surfaces.py surface key, except Communications: its badge
  // is unread MESSAGES (unread.channels), not a notification-type count —
  // see useUnreadSummary's UnreadSummary.channels doc.
  const SURFACE_BY_TITLE: Record<string, string> = {
    Tasks: "tasks",
    Meetings: "meetings",
    Documents: "documents",
    Finance: "finance",
    "Project Health": "project_health",
    Compliance: "compliance",
    Settings: "settings",
  };
  const badgeFor = (title: string) =>
    title === "Communications" ? unread.channels : unread.surfaceCount(SURFACE_BY_TITLE[title] ?? "");

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

    window.dispatchEvent(new Event("project-change"));
    navigate("/");

    if (user?.id) {
      fetchUserRole(pId, user.id);
    }
  };

  const selectedProject = projects.find((p: any) => (p._id || p.id) === selectedProjectId);

  const handleLogout = () => {
    clearUserRole();
    logout();
  };



  return (
    <>
      <Sidebar className="border-r border-border bg-sidebar">
        <SidebarContent className="flex flex-col h-full">
          {/* Fixed h-16 with a bottom border, exactly matching
              DashboardHeader's "h-16 border-b border-border". The two now
              form one continuous horizontal rule across the whole app.
              Previously this block was p-4 around a p-3 card around an h-9
              logo — 92px total — so the project name hung ~28px below the
              header's line and the sidebar looked misaligned. */}
          <div className="h-16 shrink-0 flex items-center px-3 border-b border-border">
            {location.pathname.startsWith("/account") ? (
              <div
                className="w-full p-2 border border-border rounded-lg flex items-center gap-2.5 bg-white/50 cursor-pointer hover:bg-card transition-colors group"
                onClick={() => navigate("/account")}
              >
                <div className="h-8 w-8 bg-[#121212] rounded-md flex items-center justify-center shrink-0 shadow-sm border border-border/10 group-hover:scale-105 transition-transform">
                  <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h1 className="text-sm font-normal text-foreground aeonik truncate">
                    baselinq
                  </h1>
                </div>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="w-full p-2 border border-border rounded-lg flex items-center gap-2.5 bg-white/50 hover:bg-card transition-colors cursor-pointer outline-none">
                    <div
                      className="h-8 w-8 bg-[#121212] rounded-md flex items-center justify-center shrink-0 shadow-sm border border-border/10 hover:scale-105 transition-transform"
                      onClick={(e) => { e.stopPropagation(); navigate("/"); }}
                    >
                      <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-1 text-left">
                      <h1 className="text-sm font-normal text-foreground aeonik truncate flex-1">
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          selectedProject?.name || ""
                        )}
                      </h1>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
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
                          {isSelected && <Check className="h-4 w-4 shrink-0" />}
                          <span className={isSelected ? "font-medium" : "pl-[18px]"}>{project.name}</span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* On /roles-permissions the nav swaps between the roles list and
                the main menu. One control, right of the project switcher, and
                the arrow points wherever it is about to take you. */}
            {rolesSidebar && open && (
              <button
                type="button"
                onClick={() => rolesSidebar.setNavMode(showRolesNav ? "main" : "roles")}
                aria-label={showRolesNav ? "Back to main menu" : "Back to roles list"}
                title={showRolesNav ? "Back to main menu" : "Back to roles list"}
                className="ml-2 h-9 w-9 shrink-0 rounded-md border border-border bg-white/50 flex items-center justify-center hover:bg-card transition-colors group"
              >
                {showRolesNav ? (
                  <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            )}
          </div>

          {/* The roles list is full-bleed to the right edge, so it drops the
              shared gutter; every other nav keeps it. */}
          <div
            className={`subtle-scrollbar flex-1 overflow-auto pl-3 pt-3 ${
              showRolesNav ? "pr-0" : "pr-3"
            }`}
          >
            {/* Collapsed rail: no room beside the logo, so the same control
                lives at the top of the nav body instead. */}
            {rolesSidebar && !open && (
              <button
                type="button"
                onClick={() => rolesSidebar.setNavMode(showRolesNav ? "main" : "roles")}
                aria-label={showRolesNav ? "Back to main menu" : "Back to roles list"}
                title={showRolesNav ? "Back to main menu" : "Back to roles list"}
                className="mb-2 h-9 w-full rounded-md border border-border bg-white/50 flex items-center justify-center hover:bg-card transition-colors"
              >
                {showRolesNav ? (
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}

            {showRolesNav ? (
              // ── Roles nav — replaces the main menu on /roles-permissions ──
              <RolesNav />
            ) : location.pathname.startsWith("/account") ? (
              // ── Account nav ──
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 normal-case h-auto pb-1.5 pt-0">
                  Account
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {[
                      { title: "Projects", url: "/account", icon: <FolderOpen className="h-4 w-4" />, show: true },
                      { title: "Profile", url: "/account/profile", icon: <UserIcon className="h-4 w-4" />, show: true },
                      { title: "Organisation", url: "/account/organization", icon: <Building2 className="h-4 w-4" />, show: user?.account_type === "organisation" },
                    ].filter(item => item.show).map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={isActive
                              ? "!bg-card px-3 py-2 border border-border/70 rounded-md shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                              : "px-3 py-2 border border-transparent rounded-md hover:bg-white/60 transition-colors"}>
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
                  <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 normal-case h-auto pb-1.5 pt-0">
                    Main Menu
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.filter((item) => !item.permission || can(item.permission)).map((item) => {
                        const isActive = item.url === "/"
                          ? location.pathname === "/"
                          : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                        const badge = badgeFor(item.title);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={isActive
                              ? "!bg-card px-3 py-2 border border-border/70 rounded-md shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                              : "px-3 py-2 border border-transparent rounded-md hover:bg-white/60 transition-colors"}>
                              <NavLink to={item.url} className="flex items-center gap-3">
                                <span className="relative shrink-0">
                                  {React.cloneElement(item.icon, { className: `text-muted-foreground ${isActive ? "text-black" : ""}` })}
                                  {!open && badge > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium leading-none">
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
                      {settingsItems.filter((item) =>
                        !item.permission
                          || (item.permission === "viewSettings" ? canViewSettings
                            : can(item.permission))
                      ).map((item) => {
                        const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                        const badge = badgeFor(item.title);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={isActive
                              ? "!bg-card px-3 py-2 border border-border/70 rounded-md shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                              : "px-3 py-2 border border-transparent rounded-md hover:bg-white/60 transition-colors"}>
                              <NavLink to={item.url} className="flex items-center gap-3">
                                <span className="relative shrink-0">
                                  {React.cloneElement(item.icon, { className: `text-muted-foreground ${isActive ? "text-black" : ""}` })}
                                  {!open && badge > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium leading-none">
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
                    {userRole || ""}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted outline-none">
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

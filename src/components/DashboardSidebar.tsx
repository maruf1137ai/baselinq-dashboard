import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
import { ChevronDown, PlusCircle, LogOut } from "lucide-react";
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
import Logo from "./icons/Logo";
import { useProjects } from "@/supabse/hook/useProject"; // Restored import
import { useUser } from "@/supabse/hook/useUser"; // New import
import { signOutUser } from "@/supabse/api"; // New import
import { OnboardingModal } from "./OnboardingModal";

const navItems = [
  { title: "Overview", url: "/", icon: <Trending /> },
  { title: "AI Workspace", url: "/ai-workspace", icon: <AiWorkspace /> },
  { title: "Communications", url: "/communications", icon: <Communication /> },
  { title: "Tasks", url: "/tasks", icon: <Task /> },
  { title: "Finance", url: "/finance", icon: <SaveMoney /> },
  { title: "Compliance", url: "/compliance", icon: <Shield /> },
  { title: "Meetings", url: "/meetings", icon: <Meetings /> },
  { title: "Programme", url: "/programme", icon: <Programme /> },
  { title: "Documents", url: "/documents", icon: <Document2 /> },
  { title: "Products", url: "/products", icon: <Document2 /> },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: <Settings /> },
  { title: "Help", url: "/help", icon: <Help /> },
];

export function DashboardSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { data: projects = [], isLoading } = useProjects();
  const { data: user } = useUser(); // New hook usage
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    localStorage.getItem("selectedProjectId") || ""
  );

  useEffect(() => {
    const handleProjectChange = () => {
      setSelectedProjectId(localStorage.getItem("selectedProjectId") || "");
    };

    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  useEffect(() => {
    if (!isLoading && projects.length === 0) {
      setShowOnboarding(true);
    } else if (projects.length > 0 && !selectedProjectId) {
      // Auto select first project if none selected
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      localStorage.setItem("selectedProjectId", firstId);
    }
  }, [projects, isLoading, selectedProjectId]);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId?.id);
    localStorage.setItem("selectedProjectId", projectId?.id);
    localStorage.setItem("projectLocation", projectId?.location);
    window.dispatchEvent(new Event("project-change"));
    // window.location.reload()
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleLogout = async () => {
    try {
      await signOutUser();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <Sidebar className="border-r border-[#DEDEDE] bg-sidebar">
        <SidebarContent className="flex flex-col h-full">
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="p-3 border border-[#EDEDED] rounded-[16px] flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="h-9 w-9 bg-[#121212] rounded-[10px] flex items-center justify-center">
                    <Logo />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h1 className="text-sm font-regular text-[#121212] aeonik truncate">
                      {selectedProject ? selectedProject.name : (isLoading ? "Loading..." : "Select Project")}
                    </h1>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((project: any) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="cursor-pointer"
                  >
                    {project.name}
                    {selectedProjectId === project.id && (
                      <span className="ml-auto text-xs text-blue-500">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowOnboarding(true)}
                  className="cursor-pointer text-blue-600 gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create New Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 overflow-auto px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-[#8B8B8B] px-0 uppercase py-2 text-[#8B8B8B]">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent className="">
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={isActive ? "!bg-white px-[16px] py-[11px] border border-[#E8E8E8] rounded-[8px]" : "border border-transparent px-[16px] py-[11px]"}>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3">
                            {React.cloneElement(item.icon, {
                              className: `text-[#6B6B6B]  ${isActive ? "text-black" : ""
                                }`,
                            })}
                            {open && (
                              <span className={`text-sm font-normal ${isActive ? "text-black" : "text-[#6B6B6B]"}`}>{item.title}</span>
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
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={isActive ? "!bg-white px-[16px] py-[11px] border border-[#E8E8E8] rounded-[8px]" : "border border-transparent px-[16px] py-[11px]"}>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3">
                            {React.cloneElement(item.icon, {
                              className: `text-[#6B6B6B]  ${isActive ? "text-black" : ""
                                }`,
                            })}
                            {open && (
                              <span className={`text-sm font-normal ${isActive ? "text-black" : "text-[#6B6B6B]"}`}>{item.title}</span>
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
            <div className="p-4 border-t border-[#DEDEDE]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={user?.user_metadata?.avatar_url || "/images/profile-img.png"}
                    alt="User Avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm capitalize font-medium text-sidebar-foreground truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
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
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
                    >
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

      <OnboardingModal isOpen={showOnboarding} onOpenChange={setShowOnboarding} />
    </>
  );
}

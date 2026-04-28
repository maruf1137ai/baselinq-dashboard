import { useState } from "react";
import TeamMembersTable from "@/components/settings/teamMembersTable";
import RolePermissions from "@/components/settings/Role&Permissions";
import ApprovalChains from "@/components/settings/ApprovalChains";
import AiRouting from "@/components/settings/AiRouting";
import { usePermissions } from "@/hooks/usePermissions";
import { RolesTab } from "./permissions";

const TeamManagement = () => {
  const { canManageTeam, canViewPermissions, canEditPermissions, canManageRoles } = usePermissions();

  const allTabs = [
    { id: "Users",            show: canManageTeam },
    { id: "Role Permissions", show: canViewPermissions },
    { id: "Custom Roles",     show: canManageRoles },
    { id: "Approval Chains",  show: true },
    { id: "AI Routing",       show: true },
  ];
  const visibleTabs = allTabs.filter((t) => t.show).map((t) => t.id);

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0] ?? "Approval Chains");

  // If the active tab becomes hidden (permissions changed), fall back to first visible
  const resolvedTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? "");

  return (
    <div className="p-6">
      <h2 className="text-2xl font-normal tracking-tight text-foreground">User Management</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Manage users, roles, permissions, and approval workflows.
      </p>
      <div className="btns flex items-center gap-2 border-b border-border">
        {visibleTabs.map((btn) => (
          <button
            key={btn}
            onClick={() => setActiveTab(btn)}
            className={`text-sm py-4 px-6 border-b-2 transition-all ${resolvedTab === btn
                ? "border-primary text-foreground"
                : "text-muted-foreground border-transparent"
              }`}>
            {btn}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {resolvedTab === "Users" && <TeamMembersTable />}
        {resolvedTab === "Role Permissions" && <RolePermissions readOnly={!canEditPermissions} />}
        {resolvedTab === "Custom Roles" && <RolesTab />}
        {resolvedTab === "Approval Chains" && <ApprovalChains />}
        {resolvedTab === "AI Routing" && <AiRouting />}
      </div>
    </div>
  );
};

export default TeamManagement;

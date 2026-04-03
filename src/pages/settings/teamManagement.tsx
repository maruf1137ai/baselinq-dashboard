import React, { useState } from "react";
import TeamMembersTable from "@/components/settings/teamMembersTable";
import RolePermissions from "@/components/settings/Role&Permissions";
import ApprovalChains from "@/components/settings/ApprovalChains";
import AiRouting from "@/components/settings/AiRouting";
import { usePermissions } from "@/hooks/usePermissions";

const TeamManagement = () => {
  const { canEditTeamRoles, canManageTeam } = usePermissions();
  const [activeTab, setActiveTab] = useState("Team Members");

  const btns = [
    "Team Members",
    ...(canEditTeamRoles ? ["Role Permissions"] : []),
    ...(canManageTeam ? ["Approval Chains", "AI Routing"] : []),
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-normal tracking-tight text-foreground">Team Management</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Manage team members, roles, permissions, and approval workflows.
      </p>
      <div className="btns flex items-center gap-2 border-b border-border">
        {btns.map((btn) => (
          <button
            key={btn}
            onClick={() => setActiveTab(btn)}
            className={`text-sm py-4 px-6 border-b-2 transition-all ${
              activeTab === btn
                ? "border-primary text-foreground"
                : "text-muted-foreground border-transparent"
            }`}>
            {btn}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "Team Members" && <TeamMembersTable />}
        {activeTab === "Role Permissions" && canEditTeamRoles && <RolePermissions />}
        {activeTab === "Approval Chains" && canManageTeam && <ApprovalChains />}
        {activeTab === "AI Routing" && canManageTeam && <AiRouting />}
      </div>
    </div>
  );
};

export default TeamManagement;

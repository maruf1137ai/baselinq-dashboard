import { DashboardLayout } from "@/components/DashboardLayout";
import React, { useState } from "react";
import { Sidebar } from "@/components/settings/sidebar";
import { Outlet } from "react-router-dom";
import TeamMembersTable from "@/components/settings/teamMembersTable";
import RolePermissions from "@/components/settings/Role&Permissions";
import ApprovalChains from "@/components/settings/ApprovalChains";
import AiRouting from "@/components/settings/AiRouting";

const btns = [
  "Team Members",
  "Role Permissions",
  "Approval Chains",
  "AI Routing",
];

const TeamManagement = () => {
  const [activeTab, setActiveTab] = useState("Team Members");

  return (
    <div className="p-6">
      <h2 className="text-2xl font-normal tracking-tight text-foreground">Team Management</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Manage team members, roles, permissions, and approval workflows.
      </p>
      <div className="btns flex items-center gap-2 border-b border-border">
        {btns?.map((btn) => (
          <button
            key={btn}
            onClick={() => setActiveTab(btn)}
            className={` text-sm py-4 px-6 border-b-2 transition-all  ${
              activeTab == btn
                ? "border-primary text-foreground"
                : "text-muted-foreground border-transparent"
            }`}>
            {btn}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab == "Team Members" && <TeamMembersTable />}
        {activeTab == "Role Permissions" && <RolePermissions />}
        {activeTab == "Approval Chains" && <ApprovalChains />}
        {activeTab == "AI Routing" && <AiRouting />}
      </div>
    </div>
  );
};

export default TeamManagement;

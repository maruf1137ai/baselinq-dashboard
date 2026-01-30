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
      <h2 className="text-[23px] text-[#1A1A1A] mb-2">Team Management</h2>
      <p className="text-[#6B7280] text-base mb-6">
        Manage team members, roles, permissions, and approval workflows.
      </p>
      <div className="btns flex items-center gap-2 border-b border-[#EAEAEA]">
        {btns?.map((btn) => (
          <button
            key={btn}
            onClick={() => setActiveTab(btn)}
            className={` text-base py-4 px-6 border-b-2 transition-all  ${
              activeTab == btn
                ? "border-[#8081F6] text-[#1A1A1A]"
                : "text-[#717784] border-transparent"
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

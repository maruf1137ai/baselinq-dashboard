import { useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import TeamMembersTable from "@/components/settings/teamMembersTable";
import RolePermissions from "@/components/settings/Role&Permissions";
import ApprovalChains from "@/components/settings/ApprovalChains";
import AiRouting from "@/components/settings/AiRouting";
import { usePermissions } from "@/hooks/usePermissions";
import { RolesTab } from "./permissions";
import { PageBody, PageHeader } from "@/components/ui/page-header";

const TeamManagement = () => {
  const { canViewSettings, canEditSettings } = usePermissions();

  const allTabs = [
    { id: "Users",            show: canViewSettings },
    { id: "Role Permissions", show: canViewSettings },
    { id: "Custom Roles",     show: canEditSettings },
    { id: "Approval Chains",  show: true },
    { id: "AI Routing",       show: true },
  ];
  const visibleTabs = allTabs.filter((t) => t.show).map((t) => t.id);

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0] ?? "Approval Chains");

  // If the active tab becomes hidden (permissions changed), fall back to first visible
  const resolvedTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? "");

  return (
    <PageBody>
      <PageHeader
        title="User Management"
        description="Manage users, roles, permissions, and approval workflows."
        reference={
          <Link
            to="/help/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="How adding, editing, and removing a user actually works"
          >
            <HelpCircle className="h-4 w-4" />
            Settings reference
          </Link>
        }
      />
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

      <div>
        {resolvedTab === "Users" && <TeamMembersTable />}
        {resolvedTab === "Role Permissions" && <RolePermissions readOnly={!canEditSettings} />}
        {resolvedTab === "Custom Roles" && <RolesTab />}
        {resolvedTab === "Approval Chains" && <ApprovalChains />}
        {resolvedTab === "AI Routing" && <AiRouting />}
      </div>
    </PageBody>
  );
};

export default TeamManagement;

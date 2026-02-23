import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  Download,
  Printer,
  FileText,
  Filter,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
} from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import CashIcon from "@/components/icons/CashIcon";
import Asterisk from "@/components/icons/Asterisk";

// JBCC contractual time limits per task type (in calendar days)
const JBCC_DEADLINES: Record<string, { clause: string; days: number; label: string }[]> = {
  VO: [
    { clause: "JBCC 17.1", days: 14, label: "Pricing submission" },
    { clause: "JBCC 17.2", days: 7, label: "Client approval" },
  ],
  RFI: [
    { clause: "JBCC 5.5", days: 5, label: "Response required" },
  ],
  SI: [
    { clause: "JBCC 18.1", days: 3, label: "Acknowledgment" },
  ],
  DC: [
    { clause: "JBCC 29.1", days: 20, label: "Notice period" },
    { clause: "JBCC 29.3", days: 28, label: "Assessment completion" },
  ],
  CPI: [
    { clause: "JBCC 20.1", days: 30, label: "Programme schedule" },
  ],
  GI: [
    { clause: "JBCC 5.1", days: 7, label: "Acknowledgment" },
  ],
};

// Timeline stages per task type
const taskTypeStages: Record<string, string[]> = {
  VO: ["Draft", "Submitted", "Under Review", "Priced", "Approved"],
  RFI: ["Draft", "Sent for Review", "Further Info Required", "Response Provided", "Closed"],
  SI: ["Draft", "Issued", "Acknowledged", "Actioned", "Verified"],
  DC: ["Delay Identified", "Notice Issued", "Under Assessment", "Determination Made", "EOT Awarded"],
  CPI: ["Scheduled", "In Progress", "On Track / At Risk", "Completed"],
  GI: ["Draft", "Issued", "Distributed", "Acknowledged"],
};

// Task type labels
const TASK_TYPE_LABELS: Record<string, string> = {
  VO: "Variation Order",
  RFI: "Request for Information",
  SI: "Site Instruction",
  DC: "Delay Claim",
  CPI: "Critical Path Item",
  GI: "General Instruction",
};

// Role-based access
const auditAccessRoles = {
  fullAccess: ["Project Manager", "Client Project Manager", "Contracts Manager", "Architect"],
  viewOnly: ["Construction Manager", "Site Engineer", "Planning Engineer", "Consultant Quantity Surveyor"],
  restricted: ["Subcontractor", "Supplier"],
};

const getAccessLevel = (userRole: string): "full" | "view" | "restricted" => {
  const roles = userRole ? userRole.split(/\s*\/\s*/).map((r) => r.trim()) : [];
  if (roles.some((r) => auditAccessRoles.fullAccess.includes(r))) return "full";
  if (roles.some((r) => auditAccessRoles.viewOnly.includes(r))) return "view";
  return "restricted";
};

const getDaysRemaining = (createdAt: string, deadlineDays: number): number => {
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getDeadlineDate = (createdAt: string, deadlineDays: number): string => {
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  return deadline.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
};

const getDeadlineStatus = (daysRemaining: number): { label: string; color: string } => {
  if (daysRemaining < 0) return { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" };
  if (daysRemaining <= 3) return { label: "At Risk", color: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "On Track", color: "bg-green-50 text-green-700 border-green-200" };
};

const isTaskCompleted = (task: any): boolean => {
  const status = (task.status || "").toLowerCase();
  return ["done", "completed", "closed", "approved"].includes(status);
};

const getTaskType = (task: any): string => {
  return (task.taskType || task.task_type || "").toUpperCase();
};

export default function AuditPage() {
  const projectId = localStorage.getItem("selectedProjectId");
  const { userRole } = useUserRoleStore();
  const accessLevel = getAccessLevel(userRole);

  const [typeFilter, setTypeFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");

  // Fetch all tasks for the project
  const { data: taskResponse, isLoading } = useFetch<{ count: number; results: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );

  const tasks = taskResponse?.results || [];

  // Compute compliance metrics
  const complianceData = useMemo(() => {
    if (!tasks.length) {
      return {
        score: 0,
        totalTasks: 0,
        compliantTasks: 0,
        overdueItems: 0,
        pendingDeadlines: 0,
        riskLevel: "Low" as "High" | "Medium" | "Low",
        byType: {} as Record<string, { total: number; compliant: number; overdue: number }>,
        deadlines: [] as any[],
      };
    }

    let compliantCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    const byType: Record<string, { total: number; compliant: number; overdue: number }> = {};
    const deadlines: any[] = [];

    tasks.forEach((task: any) => {
      const type = getTaskType(task);
      if (!type) return;

      // Initialize type bucket
      if (!byType[type]) {
        byType[type] = { total: 0, compliant: 0, overdue: 0 };
      }
      byType[type].total++;

      const completed = isTaskCompleted(task);
      const createdAt = task.created_at || task.createdAt;

      if (completed) {
        compliantCount++;
        byType[type].compliant++;
      }

      // Calculate deadlines for this task
      const typeDeadlines = JBCC_DEADLINES[type] || [];
      typeDeadlines.forEach((dl) => {
        if (createdAt) {
          const daysRemaining = getDaysRemaining(createdAt, dl.days);
          const deadlineDate = getDeadlineDate(createdAt, dl.days);
          const status = getDeadlineStatus(daysRemaining);

          if (!completed && daysRemaining < 0) {
            overdueCount++;
            byType[type].overdue++;
          }

          if (!completed && daysRemaining >= 0 && daysRemaining <= 7) {
            pendingCount++;
          }

          deadlines.push({
            taskId: task.id || task._id,
            taskNumber: task.number || task.taskNumber || `${type}-${(task.id || "").toString().slice(-3).padStart(3, "0")}`,
            taskType: type,
            clause: dl.clause,
            label: dl.label,
            deadline: deadlineDate,
            daysRemaining,
            status,
            assignedTo: task.assignedTo?.[0]?.name || task.assigned_to?.[0]?.name || "Unassigned",
            isCompleted: completed,
          });
        }
      });
    });

    const score = tasks.length > 0 ? Math.round((compliantCount / tasks.length) * 100) : 0;
    const riskLevel: "High" | "Medium" | "Low" = overdueCount > 5 ? "High" : overdueCount > 2 ? "Medium" : "Low";

    // Sort deadlines: overdue first, then by days remaining
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      score,
      totalTasks: tasks.length,
      compliantTasks: compliantCount,
      overdueItems: overdueCount,
      pendingDeadlines: pendingCount,
      riskLevel,
      byType,
      deadlines,
    };
  }, [tasks]);

  // Filter deadlines
  const filteredDeadlines = useMemo(() => {
    let filtered = complianceData.deadlines;
    if (typeFilter !== "all") {
      filtered = filtered.filter((d) => d.taskType === typeFilter);
    }
    if (deadlineFilter === "overdue") {
      filtered = filtered.filter((d) => d.daysRemaining < 0 && !d.isCompleted);
    } else if (deadlineFilter === "at-risk") {
      filtered = filtered.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 3 && !d.isCompleted);
    } else if (deadlineFilter === "on-track") {
      filtered = filtered.filter((d) => d.daysRemaining > 3 && !d.isCompleted);
    } else if (deadlineFilter === "completed") {
      filtered = filtered.filter((d) => d.isCompleted);
    }
    return filtered;
  }, [complianceData.deadlines, typeFilter, deadlineFilter]);

  // Audit trail logs (from all tasks)
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");

  // Fetch audit logs from all tasks
  const { data: allAuditLogs } = useFetch<any[]>(
    projectId ? `projects/${projectId}/audit-logs/` : "",
    { enabled: !!projectId }
  );

  // Fallback: generate audit entries from task data
  const auditTrail = useMemo(() => {
    if (allAuditLogs && Array.isArray(allAuditLogs) && allAuditLogs.length > 0) {
      let logs = [...allAuditLogs];
      if (auditTypeFilter !== "all") {
        logs = logs.filter((log: any) => (log.taskType || "").toUpperCase() === auditTypeFilter);
      }
      return logs.sort((a: any, b: any) =>
        new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
      );
    }

    // Fallback: derive audit entries from tasks
    const entries: any[] = [];
    tasks.forEach((task: any) => {
      const type = getTaskType(task);
      const createdAt = task.created_at || task.createdAt;
      if (createdAt) {
        entries.push({
          action: `${type} Created`,
          description: `${TASK_TYPE_LABELS[type] || type} "${task.title || task.number || ""}" was created`,
          createdByName: task.createdByName || task.created_by_name || "System",
          created_at: createdAt,
          taskType: type,
          taskId: task.id || task._id,
        });
      }
      if (isTaskCompleted(task)) {
        entries.push({
          action: `${type} Completed`,
          description: `${TASK_TYPE_LABELS[type] || type} "${task.title || task.number || ""}" was completed`,
          createdByName: "System",
          created_at: task.updated_at || task.updatedAt || createdAt,
          taskType: type,
          taskId: task.id || task._id,
        });
      }
    });

    let filtered = entries;
    if (auditTypeFilter !== "all") {
      filtered = filtered.filter((e) => e.taskType === auditTypeFilter);
    }

    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allAuditLogs, tasks, auditTypeFilter]);

  // CSV export
  const exportCSV = () => {
    const headers = ["Task #", "Type", "Clause", "Deadline", "Days Remaining", "Status", "Assigned To"];
    const rows = complianceData.deadlines.map((d) => [
      d.taskNumber,
      d.taskType,
      d.clause,
      d.deadline,
      d.daysRemaining,
      d.isCompleted ? "Completed" : d.status.label,
      d.assignedTo,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskColors: Record<string, string> = {
    High: "text-red-600 bg-red-50 border-red-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-green-600 bg-green-50 border-green-200",
  };

  return (
    <DashboardLayout padding="p-0">
      <div className="min-h-screen">
        <div className="px-8 py-[17px]">
          <div className="mb-1">
            <p className="text-base text-gray3 mb-1">Dashboard</p>
            <h1 className="text-3xl tracking-tight text-foreground">Audit & Compliance</h1>
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="bg-[#F3F2F0] p-1 rounded-[10px] h-auto">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="audit-trail"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
                <Activity className="w-4 h-4 mr-2" />
                Audit Trail
              </TabsTrigger>
              <TabsTrigger
                value="deadlines"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                Deadline Tracker
              </TabsTrigger>
              {accessLevel === "full" && (
                <TabsTrigger
                  value="export"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export & Reports
                </TabsTrigger>
              )}
            </TabsList>

            {/* Section 1: Compliance Overview */}
            <TabsContent value="overview" className="mt-6">
              {/* Stat Cards */}
              <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Compliance Score</p>
                    </div>
                    <div className="bg-white py-[6px] px-[14px] rounded-[6px]">
                      <h3 className="text-2xl text-[#0F172A]">{complianceData.score}%</h3>
                      <Progress value={complianceData.score} className="h-[8px] my-2.5" />
                      <p className="text-xs text-[#717784]">
                        {complianceData.score >= 80
                          ? "Above target threshold"
                          : complianceData.score >= 50
                            ? "Approaching target"
                            : "Below target threshold"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                  <CardContent className="p-2.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2.5 mb-2">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Pending Deadlines</p>
                    </div>
                    <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                      <h3 className="text-2xl text-[#0F172A]">{complianceData.pendingDeadlines}</h3>
                      <p className="text-xs text-[#717784]">
                        {complianceData.pendingDeadlines > 0
                          ? `${complianceData.pendingDeadlines} due within 7 days`
                          : "No upcoming deadlines"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                  <CardContent className="p-2.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2.5 mb-2">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Overdue Items</p>
                    </div>
                    <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                      <h3 className="text-2xl text-[#0F172A]">
                        <span className={complianceData.overdueItems > 0 ? "text-[#DC2626]" : ""}>
                          {complianceData.overdueItems}
                        </span>
                      </h3>
                      <p className="text-xs text-[#717784]">
                        {complianceData.overdueItems > 0
                          ? `${complianceData.overdueItems} items past deadline`
                          : "All items on track"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                  <CardContent className="p-2.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Asterisk />
                      <p className="text-sm text-gray2 mb-1">Risk Level</p>
                    </div>
                    <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                      <Badge className={`${riskColors[complianceData.riskLevel]} border w-fit text-sm`}>
                        {complianceData.riskLevel}
                      </Badge>
                      <p className="text-xs text-[#717784] mt-2">
                        Based on {complianceData.overdueItems} overdue items
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compliance by Task Type */}
              <div className="mt-6 bg-white rounded-[10px] border border-[#E5E7EB] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E5E7EB]">
                  <h3 className="text-sm font-medium text-[#1A1A1A]">Compliance by Document Type</h3>
                </div>
                <Table>
                  <TableHeader className="bg-[#FAFAFA]">
                    <TableRow className="hover:bg-[#FAFAFA]">
                      <TableHead className="pl-6 h-12 text-[#6B7280] font-normal">Document Type</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Total</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Compliant</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Overdue</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Compliance %</TableHead>
                      <TableHead className="pr-6 text-right text-[#6B7280] font-normal">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(complianceData.byType).length > 0 ? (
                      Object.entries(complianceData.byType).map(([type, data]) => {
                        const pct = data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;
                        return (
                          <TableRow key={type} className="hover:bg-gray-50 border-b border-[#E5E7EB] last:border-0">
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#F3F4F6] text-[#1A1A1A] border-none text-xs font-medium">
                                  {type}
                                </Badge>
                                <span className="text-sm text-[#6B7280]">{TASK_TYPE_LABELS[type] || type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-sm text-[#1A1A1A]">{data.total}</TableCell>
                            <TableCell className="py-4 text-sm text-green-600">{data.compliant}</TableCell>
                            <TableCell className="py-4 text-sm text-red-600">{data.overdue}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2 w-20" />
                                <span className="text-sm text-[#1A1A1A]">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 py-4 text-right">
                              <Badge className={`${pct >= 80 ? "bg-green-50 text-green-700 border-green-200" : pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"} border text-xs`}>
                                {pct >= 80 ? "Good" : pct >= 50 ? "Needs Attention" : "Critical"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#6B7280] text-sm">
                          {isLoading ? "Loading compliance data..." : "No task data available"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Section 2: Audit Trail */}
            <TabsContent value="audit-trail" className="mt-6">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">Filter by type:</span>
                </div>
                <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}>
                  <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="VO">VO - Variation Order</SelectItem>
                    <SelectItem value="RFI">RFI - Request for Info</SelectItem>
                    <SelectItem value="SI">SI - Site Instruction</SelectItem>
                    <SelectItem value="DC">DC - Delay Claim</SelectItem>
                    <SelectItem value="CPI">CPI - Critical Path</SelectItem>
                    <SelectItem value="GI">GI - General Instruction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-6">
                <h3 className="text-sm font-medium text-[#1A1A1A] mb-6">Compliance Activity Timeline</h3>
                <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
                  {auditTrail.length > 0 ? (
                    auditTrail.slice(0, 50).map((log: any, i: number) => (
                      <div key={i} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 rounded-full z-10 ${
                          (log.action || "").toLowerCase().includes("completed") || (log.action || "").toLowerCase().includes("approved")
                            ? "border-green-600"
                            : (log.action || "").toLowerCase().includes("overdue") || (log.action || "").toLowerCase().includes("rejected")
                              ? "border-red-600"
                              : "border-blue-600"
                        }`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-gray-900">{log.action || "Status Change"}</p>
                            {log.taskType && (
                              <Badge className="bg-[#F3F4F6] text-[#6B7280] border-none text-[10px]">
                                {log.taskType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(log.created_at || log.createdAt).toLocaleDateString("en-ZA", {
                              day: "numeric", month: "short", year: "numeric"
                            })}{" "}
                            &middot; {log.createdByName || "System"}
                          </p>
                          {log.description && (
                            <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">
                              {log.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative pl-8">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 border-gray-300 rounded-full z-10" />
                      <p className="text-xs text-gray-400">
                        {isLoading ? "Loading audit trail..." : "No audit activity recorded yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Section 3: JBCC Deadline Tracker */}
            <TabsContent value="deadlines" className="mt-6">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">Filters:</span>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="VO">VO</SelectItem>
                    <SelectItem value="RFI">RFI</SelectItem>
                    <SelectItem value="SI">SI</SelectItem>
                    <SelectItem value="DC">DC</SelectItem>
                    <SelectItem value="CPI">CPI</SelectItem>
                    <SelectItem value="GI">GI</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
                  <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-red-50 border-red-200 shadow-none rounded-[10px]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-medium text-red-900">
                        {complianceData.deadlines.filter((d) => d.daysRemaining < 0 && !d.isCompleted).length}
                      </p>
                      <p className="text-xs text-red-700">Overdue</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200 shadow-none rounded-[10px]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-2xl font-medium text-amber-900">
                        {complianceData.deadlines.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 3 && !d.isCompleted).length}
                      </p>
                      <p className="text-xs text-amber-700">At Risk</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 shadow-none rounded-[10px]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-medium text-green-900">
                        {complianceData.deadlines.filter((d) => d.daysRemaining > 3 && !d.isCompleted).length}
                      </p>
                      <p className="text-xs text-green-700">On Track</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Deadline Table */}
              <div className="bg-white rounded-[10px] border border-[#E5E7EB] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#FAFAFA]">
                    <TableRow className="hover:bg-[#FAFAFA]">
                      <TableHead className="pl-6 h-12 text-[#6B7280] font-normal">Task #</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Type</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">JBCC Clause</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Requirement</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Deadline</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Days Remaining</TableHead>
                      <TableHead className="text-[#6B7280] font-normal">Assigned To</TableHead>
                      <TableHead className="pr-6 text-right text-[#6B7280] font-normal">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeadlines.length > 0 ? (
                      filteredDeadlines.map((d, i) => (
                        <TableRow key={i} className="hover:bg-gray-50 border-b border-[#E5E7EB] last:border-0">
                          <TableCell className="pl-6 py-4 text-sm font-medium text-[#1A1A1A]">
                            {d.taskNumber}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className="bg-[#F3F4F6] text-[#1A1A1A] border-none text-xs">
                              {d.taskType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-sm text-[#6B7280]">{d.clause}</TableCell>
                          <TableCell className="py-4 text-sm text-[#1A1A1A]">{d.label}</TableCell>
                          <TableCell className="py-4 text-sm text-[#6B7280]">{d.deadline}</TableCell>
                          <TableCell className="py-4">
                            {d.isCompleted ? (
                              <span className="text-sm text-green-600">Completed</span>
                            ) : (
                              <span className={`text-sm font-medium ${d.daysRemaining < 0 ? "text-red-600" : d.daysRemaining <= 3 ? "text-amber-600" : "text-green-600"}`}>
                                {d.daysRemaining < 0
                                  ? `${Math.abs(d.daysRemaining)} days overdue`
                                  : d.daysRemaining === 0
                                    ? "Due today"
                                    : `${d.daysRemaining} days`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-sm text-[#1A1A1A]">{d.assignedTo}</TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            {d.isCompleted ? (
                              <Badge className="bg-green-50 text-green-700 border-green-200 border text-xs">
                                Completed
                              </Badge>
                            ) : (
                              <Badge className={`${d.status.color} border text-xs`}>
                                {d.status.label}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-[#6B7280] text-sm">
                          {isLoading ? "Loading deadline data..." : "No deadlines match the current filter"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Section 4: Export & Reports */}
            {accessLevel === "full" && (
              <TabsContent value="export" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Export CSV */}
                  <Card className="bg-white border border-[#E5E7EB] shadow-none rounded-[10px]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[#1A1A1A]">Export CSV</h3>
                          <p className="text-xs text-[#6B7280]">Download compliance data as CSV</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#6B7280] mb-4">
                        Export all JBCC deadline data including task numbers, clauses, deadlines,
                        and current status for all document types.
                      </p>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={exportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Print Report */}
                  <Card className="bg-white border border-[#E5E7EB] shadow-none rounded-[10px]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <Printer className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[#1A1A1A]">Print Report</h3>
                          <p className="text-xs text-[#6B7280]">Print compliance summary</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#6B7280] mb-4">
                        Generate a printer-friendly compliance report with overview stats,
                        deadline tracking, and audit trail summary.
                      </p>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print Report
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Summary Stats */}
                  <Card className="bg-white border border-[#E5E7EB] shadow-none rounded-[10px]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[#1A1A1A]">Report Summary</h3>
                          <p className="text-xs text-[#6B7280]">Quick compliance overview</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B7280]">Total Tasks</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">{complianceData.totalTasks}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B7280]">Compliant</span>
                          <span className="text-sm font-medium text-green-600">{complianceData.compliantTasks}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B7280]">Overdue</span>
                          <span className="text-sm font-medium text-red-600">{complianceData.overdueItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B7280]">Compliance Score</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">{complianceData.score}%</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                          <span className="text-xs text-[#6B7280]">Risk Level</span>
                          <Badge className={`${riskColors[complianceData.riskLevel]} border text-xs`}>
                            {complianceData.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

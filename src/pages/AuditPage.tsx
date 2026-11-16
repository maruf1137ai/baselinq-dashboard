import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import {
  PROJECT_TRAIL_LIMIT,
  buildAuditTrail,
  isTrailCapped,
  tasksFrom,
  trailToCsv,
} from "@/lib/auditTrail";

/**
 * The project's audit trail: only rows the server recorded.
 *
 * This page used to carry a compliance score, a risk level and a deadline
 * tracker computed from JBCC clauses and periods that were made up, and it
 * filled an empty trail with invented entries. All of that is gone (see
 * lib/auditTrail). Notice deadlines are on the Compliance page.
 */
export default function AuditPage() {
  const projectId = localStorage.getItem("selectedProjectId");
  const pidNum = parseInt(projectId || "0") || null;
  const { data: effectivePerms, isLoading: permsLoading } = useEffectivePermissions(pidNum);
  // Export is for full audit access only, as before.
  const canExport = !permsLoading && !!effectivePerms?.permissions?.["audit.full_access"];

  const [typeFilter, setTypeFilter] = useState("all");

  // The tasks list only supplies each row's record number and type.
  const { data: taskResponse, isError: tasksFailed } = useFetch<any>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );
  const tasks = useMemo(() => tasksFrom(taskResponse), [taskResponse]);

  const {
    data: logs,
    isLoading,
    isError,
    refetch,
  } = useFetch<any[]>(projectId ? `tasks/audits/?projectId=${projectId}` : "", { enabled: !!projectId });

  const trail = useMemo(() => buildAuditTrail(Array.isArray(logs) ? logs : [], tasks), [logs, tasks]);
  const shown = useMemo(
    () => (typeFilter === "all" ? trail : trail.filter((e) => e.taskType === typeFilter)),
    [trail, typeFilter]
  );
  const capped = isTrailCapped(logs);

  const exportCSV = () => {
    const blob = new Blob([trailToCsv(shown)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Audit trail"
          description="Every action recorded on this project's records, with who did it and when."
          actions={
            canExport && shown.length > 0 ? (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            ) : null
          }
        />

        <p className="text-sm text-[#6B7280]">
          Notice deadlines and time bars are worked out from the contract on the{" "}
          <Link to="/compliance" className="underline text-[#1A1A1A]">Compliance page</Link>.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter by type:</span>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px] bg-card border-border">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="VO">Variation Order</SelectItem>
              <SelectItem value="RFI">Request for Information</SelectItem>
              <SelectItem value="SI">Site Instruction</SelectItem>
              <SelectItem value="GI">General Instruction</SelectItem>
              <SelectItem value="IC">Intention to Claim</SelectItem>
              <SelectItem value="DC">Claim</SelectItem>
              <SelectItem value="CPI">Critical Path Item (legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tasksFailed && !isError && (
          <p role="status" className="text-sm text-amber-800">
            Record numbers could not be loaded, so some rows show no record number.
          </p>
        )}

        {capped && !isError && (
          <p data-testid="trail-capped" className="text-sm text-[#6B7280]">
            Showing the latest {PROJECT_TRAIL_LIMIT} entries. Older entries are kept on each record's own page.
          </p>
        )}

        <div className="bg-card rounded-xl border border-border p-6">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <AwesomeLoader message="Loading the audit trail" />
            </div>
          ) : isError ? (
            <div role="alert" className="flex flex-col gap-2 text-sm text-red-700">
              <p>The audit trail could not be loaded. Nothing is shown rather than a partial record.</p>
              <div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : shown.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {trail.length === 0
                ? "No activity has been recorded on this project yet."
                : "No activity recorded for this type."}
            </p>
          ) : (
            <ol className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
              {shown.map((e, i) => (
                <li key={`${e.taskId}-${e.created_at}-${i}`} className="relative pl-8">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 bg-card border-2 border-border rounded-full" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.record && <span className="text-xs font-medium text-[#1A1A1A]">{e.record}</span>}
                    <p className="text-xs text-[#1A1A1A]">{e.action}</p>
                    {e.taskType && (
                      <Badge className="bg-muted text-[#6B7280] border-none text-xs">{e.taskType}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {formatDate(e.created_at)} &middot; {e.createdByName ?? "No user recorded"}
                  </p>
                  {e.description && (
                    <p className="mt-1 text-xs text-[#4B5563] line-clamp-2">{e.description}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

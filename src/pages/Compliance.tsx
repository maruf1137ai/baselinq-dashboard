/**
 * Compliance — contractual obligations and notice deadlines for the selected project.
 *
 * Two real, populated sources feed this page:
 *   • `documents/obligations/?project_id=` — a project-level aggregate of
 *     DocumentObligation rows (one request, not one per document — see
 *     `src/hooks/useCompliance.ts`). No aggregate route existed when this page
 *     was first rebuilt off hardcoded data; it does now.
 *   • `projects/{id}/time-bars/` — TimeBarClock rows, per project.
 *
 * Per-obligation evidence upload and notice drafting are real: DocumentObligation
 * now has an evidence relation and a notice-generation endpoint, neither of
 * which existed when this page was first rebuilt — see AddEvidenceModal.tsx,
 * GenerateNoticeModal.tsx and ComplianceDetailModal.tsx.
 *
 * Deliberately absent: an invented compliance score. The counts below are a
 * direct tally of overdue / due-soon / no-date / on-track / closed rows —
 * never a single percentage standing in for all of it, so a project with
 * everything overdue can't report a friendly-looking 60%.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import ObligationModal, {
  type ObligationDraft,
} from "@/components/Compliance/ObligationModal";
import AddEvidenceModal from "@/components/Compliance/AddEvidenceModal";
import GenerateNoticeModal from "@/components/Compliance/GenerateNoticeModal";
import ComplianceDetailModal from "@/components/Compliance/ComplianceDetailModal";
import { fetchData } from "@/lib/Api";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { cn } from "@/lib/utils";
import type { ApiDocument } from "@/components/documents/DocumentTable";
import { formatDate } from "@/lib/dateUtils";
import {
  useComplianceObligations,
  type ComplianceObligation,
} from "@/hooks/useCompliance";
import {
  buildTimeBarRows,
  deriveUrgency,
  filterComplianceRows,
  isObligationClosed,
  parseDueDate,
  sortComplianceRows,
  summariseCompliance,
  summariseLoadIssues,
  urgencyLabel,
  type ApiTimeBar,
  type ComplianceRow,
  type ComplianceUrgency,
} from "@/lib/compliance";
import {
  CalendarClock, CalendarOff, FileText, Paperclip, Search, Shield, ShieldAlert, ShieldQuestion,
} from "lucide-react";
import { AiMark } from "@/components/icons/AiMark";

/**
 * The app's canonical "01 Jun 2026" format. The date is resolved to a local
 * calendar date first: `new Date("2026-08-20")` is UTC midnight, which renders
 * as the 19th west of Greenwich, and a due date shown a day early is exactly
 * the kind of quiet wrong this page cannot afford. An unreadable value is
 * shown verbatim rather than swallowed.
 */
function formatDueDate(value: string): string {
  return formatDate(parseDueDate(value) ?? value, "short", value);
}

const URGENCY_STYLES: Record<ComplianceUrgency, string> = {
  overdue: "bg-red-50 text-red-700 border-red-200",
  "due-soon": "bg-amber-50 text-amber-700 border-amber-200",
  "no-date": "bg-muted text-muted-foreground border-border",
  "on-track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};

/** Builds display rows from the aggregate obligations response, reusing the
 *  same tested urgency rules the rest of this page relies on rather than
 *  trusting a second, server-computed notion of "overdue". */
function buildObligationRowsFromAggregate(
  obligations: ComplianceObligation[],
  today: Date,
): ComplianceRow[] {
  return obligations.map(o => {
    const { urgency, daysFromDue } = deriveUrgency(
      o.dueDate,
      isObligationClosed(o.status),
      today,
    );
    return {
      key: `obligation-${o._id}`,
      source: "obligation" as const,
      title: o.title,
      context: o.documentName,
      dueDate: o.dueDate,
      status: o.status,
      urgency,
      daysFromDue,
      responsibleRole: o.responsibleRole || undefined,
      documentId: o.documentId,
      obligationId: o._id,
    };
  });
}

const Compliance = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceRow | null>(null);
  const [evidenceObligation, setEvidenceObligation] = useState<ComplianceObligation | null>(null);
  const [noticeObligation, setNoticeObligation] = useState<ComplianceObligation | null>(null);
  const [detailObligation, setDetailObligation] = useState<ComplianceObligation | null>(null);

  const { mutateAsync: post, isPending: isCreating } = usePost();
  const { mutateAsync: patch, isPending: isPatching } = usePatch();

  const {
    data: obligationsData,
    isLoading: obligationsLoading,
    isError: obligationsError,
    refetch: refetchObligations,
  } = useComplianceObligations(projectId);
  const obligations: ComplianceObligation[] = obligationsData?.obligations ?? [];
  const obligationsById = useMemo(
    () => new Map(obligations.map(o => [o._id, o])),
    [obligations],
  );

  const {
    data: timeBarData,
    isLoading: timeBarsLoading,
    isError: timeBarsError,
    refetch: refetchTimeBars,
  } = useQuery({
    queryKey: ["time-bars", projectId],
    queryFn: () => fetchData(`projects/${projectId}/time-bars/`),
    enabled: !!projectId,
  });

  // Fetched only to populate the document picker on "Track obligation" — the
  // obligation list itself no longer depends on this (see useComplianceObligations
  // above), so a failure here degrades the create dropdown, not the page.
  const { data: docsData } = useQuery({
    queryKey: ["documents", projectId, "compliance-picker"],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const documents: ApiDocument[] = useMemo(() => docsData?.results ?? [], [docsData]);
  const documentOptions = useMemo(
    () => documents.map(d => ({ id: String(d._id), name: d.name })),
    [documents],
  );

  const isLoading = obligationsLoading || timeBarsLoading;

  const loadIssue = summariseLoadIssues({
    documentsFailed: obligationsError,
    timeBarsFailed: timeBarsError,
  });

  const canRetry = obligationsError || timeBarsError;

  const retryFailed = () => {
    if (obligationsError) refetchObligations();
    if (timeBarsError) refetchTimeBars();
  };

  const rows = useMemo(() => {
    const today = new Date();
    const bars: ApiTimeBar[] = timeBarData?.time_bars ?? [];
    return sortComplianceRows([
      ...buildObligationRowsFromAggregate(obligations, today),
      ...buildTimeBarRows(bars, today),
    ]);
  }, [obligations, timeBarData]);

  const counts = useMemo(() => summariseCompliance(rows), [rows]);
  const visibleRows = useMemo(
    () => filterComplianceRows(rows, searchTerm),
    [rows, searchTerm],
  );

  // Stable identity so the dialog only resets its fields when the row changes.
  const editingDraft = useMemo(
    () => ({
      title: editing?.title ?? "",
      dueDate: editing?.dueDate ?? "",
      responsibleRole: editing?.responsibleRole ?? "",
    }),
    [editing],
  );

  const invalidateObligations = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-obligations", projectId] });

  const createObligation = async (draft: ObligationDraft, documentId: string | null) => {
    if (!documentId) return;
    try {
      await post({
        url: `documents/${documentId}/obligations/?project_id=${projectId}`,
        data: {
          title: draft.title.trim(),
          due_date: draft.dueDate || null,
          responsible_role: draft.responsibleRole.trim(),
        },
      });
      toast.success("Obligation is now tracked");
      setCreateOpen(false);
      invalidateObligations();
    } catch {
      toast.error("Could not create the obligation");
    }
  };

  const saveObligation = async (draft: ObligationDraft) => {
    if (!editing?.documentId || !editing.obligationId) return;
    try {
      await patch({
        url: `documents/${editing.documentId}/obligations/${editing.obligationId}/?project_id=${projectId}`,
        data: {
          title: draft.title.trim(),
          due_date: draft.dueDate || null,
          responsible_role: draft.responsibleRole.trim(),
        },
      });
      toast.success("Obligation updated");
      setEditing(null);
      invalidateObligations();
    } catch {
      toast.error("Could not update the obligation");
    }
  };

  const completeObligation = async (row: ComplianceRow) => {
    try {
      await patch({
        url: `documents/${row.documentId}/obligations/${row.obligationId}/?project_id=${projectId}`,
        data: { status: "Completed" },
      });
      toast.success("Marked complete");
      invalidateObligations();
    } catch {
      toast.error("Could not update the obligation");
    }
  };

  // Not a claim that AI analysis runs on this page — it doesn't, there's no
  // project-level analysis endpoint. This just points at where obligations
  // actually come from, honestly.
  const handleAnalyseWithAI = () => {
    toast.info("Select a document to run AI analysis and extract obligations.");
    navigate(`/documents${projectId ? `?project_id=${projectId}` : ""}`);
  };

  if (!projectId) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={Shield}
          title="No project selected"
          description="Choose a project to see the obligations and notice deadlines recorded against it."
        />
      </DashboardLayout>
    );
  }

  // Both sources down. Fall through to the ordinary empty state and the page
  // reads "No contractual obligations tracked yet · 0 overdue" — an outage
  // rendered as a clean bill of health, on the one page where that is the most
  // expensive thing we could say. State the outage instead.
  if (loadIssue.level === "total") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Compliance" />
          <EmptyState
            icon={ShieldAlert}
            title="Compliance data unavailable"
            description={loadIssue.message}
            action={
              <Button variant="outline" size="sm" onClick={retryFailed}>
                Try again
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Compliance"
          description="Obligations extracted from this project's documents, and the notice deadlines being tracked against it."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-foreground hover:bg-muted"
                onClick={handleAnalyseWithAI}
              >
                <AiMark className="mr-1.5" /> Analyse with AI
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Track obligation
              </Button>
            </div>
          }
        />

        {/* Counts are derived from the rows below — never from a stored score.
            When something failed to load they are qualified rather than shown
            bare: "0 overdue" is a sentence a user acts on. */}
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <span className="text-muted-foreground">{counts.overdue} overdue</span>
          <span className="text-muted-foreground">{counts.dueSoon} due within 14 days</span>
          <span className="text-muted-foreground">{counts.noDate} with no date recorded</span>
          <span className="text-muted-foreground">{counts.onTrack} on track</span>
          <span className="text-muted-foreground">{counts.closed} closed</span>
          {loadIssue.level === "partial" && (
            <span className="text-muted-foreground">· of what could be loaded</span>
          )}
        </div>

        {/* Same shape as the no-due-date banner below: a plain statement of
            what is missing, with the one action that can change it. */}
        {loadIssue.level === "partial" && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {loadIssue.message}
            </p>
            {canRetry && (
              <Button variant="outline" size="sm" className="shrink-0" onClick={retryFailed}>
                Try again
              </Button>
            )}
          </div>
        )}

        {counts.noDate > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {counts.noDate} obligation{counts.noDate === 1 ? " has" : "s have"} no
              due date. Obligations extracted automatically from a document are
              recorded without one, and an obligation with no date cannot be
              reported as overdue — here or anywhere else in Baselinq. Record the
              date from the contract to bring it into the count.
            </p>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search obligations and deadlines"
            placeholder="Search obligations and deadlines..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 pl-10 bg-card border-border rounded-lg text-sm"
          />
        </div>

        {isLoading ? (
          <AwesomeLoader />
        ) : visibleRows.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={Search}
              title="No obligations match this search"
              description={`Nothing matches "${searchTerm}". Try the document name or the clause reference instead.`}
              action={
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Shield}
              title="No contractual obligations tracked yet"
              description="Obligations appear here once extracted from a document or added manually — with the date they fall due. Missing one can forfeit a claim or hold up a payment certificate."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Track obligation
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-3">
            {visibleRows.map(row => {
              const raw = row.source === "obligation" && row.obligationId
                ? obligationsById.get(row.obligationId)
                : undefined;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "bg-card border border-border rounded-xl p-4",
                    raw && "cursor-pointer hover:bg-muted/30",
                  )}
                  onClick={raw ? () => setDetailObligation(raw) : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{row.title}</p>
                        {row.source === "time-bar" ? (
                          row.clauseVerified ? (
                            <Badge variant="outline" className="text-xs">
                              {row.context} {row.clauseRef}
                            </Badge>
                          ) : (
                            // Never show a clause number we could not verify.
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground gap-1"
                              title="Clause could not be verified against the contract corpus"
                            >
                              <ShieldQuestion className="h-3 w-3" />
                              {row.context} · clause unverified
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            {row.context}
                          </Badge>
                        )}
                        {raw?.noticeGeneratedAt && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">
                            Notice drafted
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        {row.dueDate ? (
                          <>
                            <CalendarClock className="h-3 w-3" />
                            Due {formatDueDate(row.dueDate)}
                          </>
                        ) : (
                          <>
                            <CalendarOff className="h-3 w-3" />
                            No due date recorded
                          </>
                        )}
                        {row.responsibleRole && <span>· {row.responsibleRole}</span>}
                        {row.source === "time-bar" && <span>· notice deadline</span>}
                        {raw && (
                          <span className="flex items-center gap-1">
                            · <Paperclip className="h-3 w-3" />
                            {raw.evidenceCount} evidence file{raw.evidenceCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap",
                          URGENCY_STYLES[row.urgency],
                        )}
                      >
                        {urgencyLabel(row)}
                      </span>
                      {row.source === "obligation" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditing(row); }}
                          >
                            {row.dueDate ? "Amend" : "Set due date"}
                          </Button>
                          {row.urgency !== "closed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); completeObligation(row); }}
                            >
                              Mark complete
                            </Button>
                          )}
                          {raw && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setNoticeObligation(raw); }}
                              >
                                Generate & Link Notice
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setEvidenceObligation(raw); }}
                              >
                                Add Evidence
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/documents/${row.documentId}`); }}
                          >
                            Document
                          </Button>
                        </>
                      ) : (
                        // Time bars are served and closed on Project Health, where
                        // the awareness-date caveats sit. One place, not two.
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate("/project-health"); }}
                        >
                          Project Health
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ObligationModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        documents={documentOptions}
        onSubmit={createObligation}
        isSaving={isCreating}
      />
      <ObligationModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        mode="edit"
        initial={editingDraft}
        onSubmit={saveObligation}
        isSaving={isPatching}
      />
      <GenerateNoticeModal
        isOpen={!!noticeObligation}
        onClose={() => setNoticeObligation(null)}
        projectId={projectId}
        obligation={noticeObligation}
      />
      <AddEvidenceModal
        isOpen={!!evidenceObligation}
        onClose={() => setEvidenceObligation(null)}
        projectId={projectId}
        obligation={evidenceObligation}
      />
      <ComplianceDetailModal
        isOpen={!!detailObligation}
        onClose={() => setDetailObligation(null)}
        projectId={projectId}
        obligation={detailObligation}
      />
    </DashboardLayout>
  );
};

export default Compliance;

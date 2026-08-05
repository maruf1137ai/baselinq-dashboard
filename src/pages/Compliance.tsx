/**
 * Compliance — contractual obligations and notice deadlines for the selected project.
 *
 * Everything on this page is live. Two backends feed it:
 *   • `documents/{id}/obligations/` — DocumentObligation rows, per document
 *   • `projects/{id}/time-bars/`    — TimeBarClock rows, per project
 *
 * There is no project-level obligations endpoint yet, so obligations are
 * gathered document by document. That is an N+1 and it is deliberate: the
 * alternative was leaving the page on fabricated data until the backend grows
 * an aggregate route. The page no longer waits for it — the two project-level
 * fetches render the page and the obligation rows stream in behind them.
 *
 * The other consequence of that shape is that the page can be partly blind: a
 * failed request, or a second page of documents we never asked about, both
 * produce a short list that looks complete. Anything missing is named on the
 * page rather than absorbed into the counts.
 *
 * Deliberately absent: an evidence-completeness bar and a compliance score.
 * Neither has a data source — obligations carry no evidence relation and
 * nothing on the server scores compliance — so showing either would be a
 * number we made up about whether a claim is safe.
 */
import { useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchData } from "@/lib/Api";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { cn } from "@/lib/utils";
import type { ApiDocument } from "@/components/documents/DocumentTable";
import { formatDate } from "@/lib/dateUtils";
import {
  buildObligationRows,
  buildTimeBarRows,
  filterComplianceRows,
  parseDueDate,
  sortComplianceRows,
  summariseCompliance,
  summariseLoadIssues,
  urgencyLabel,
  type ApiObligation,
  type ApiTimeBar,
  type ComplianceRow,
  type ComplianceUrgency,
} from "@/lib/compliance";
import {
  CalendarClock, CalendarOff, FileText, Search, Shield, ShieldAlert, ShieldQuestion,
} from "lucide-react";

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

const Compliance = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceRow | null>(null);

  const { mutateAsync: post, isPending: isCreating } = usePost();
  const { mutateAsync: patch, isPending: isPatching } = usePatch();

  const {
    data: docsData,
    isLoading: docsLoading,
    isError: docsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents", projectId, "compliance"],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const documents: ApiDocument[] = useMemo(() => docsData?.results ?? [], [docsData]);

  // The documents endpoint is DRF-paginated and the rest of the app reads
  // `results` off page one only (see Documents.tsx). We follow that rather
  // than inventing a page-walk here — but where the app can afford to show a
  // short list, this page cannot: an obligation we never asked about looks
  // identical to an obligation that is not due. So compare `count` against
  // what arrived and say plainly how many documents were not covered.
  const undeliveredDocuments = useMemo(() => {
    const total = typeof docsData?.count === "number" ? docsData.count : null;
    if (total === null) return 0;
    return Math.max(0, total - documents.length);
  }, [docsData, documents.length]);

  const obligationQueries = useQueries({
    queries: documents.map(doc => ({
      queryKey: ["obligations", doc._id, projectId],
      queryFn: () =>
        fetchData(`documents/${doc._id}/obligations/?project_id=${projectId}`),
      enabled: !!projectId,
      select: (data: ApiObligation[] | { results?: ApiObligation[] }): ApiObligation[] =>
        Array.isArray(data) ? data : data?.results ?? [],
    })),
  });

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

  // Only the two project-level fetches gate the page. The per-document
  // obligation requests are an N+1 — on a fifty-document project that is fifty
  // round trips, and holding the whole screen behind the slowest of them made
  // the page feel broken. They stream in instead, with a count of what is
  // still outstanding so a short list is never mistaken for a complete one.
  const isLoading = docsLoading || timeBarsLoading;
  const obligationsPending = obligationQueries.filter(q => q.isPending).length;
  const failedObligationDocuments = obligationQueries.filter(q => q.isError).length;

  const loadIssue = summariseLoadIssues({
    documentsFailed: docsError,
    timeBarsFailed: timeBarsError,
    failedObligationDocuments,
    totalObligationDocuments: obligationQueries.length,
    undeliveredDocuments,
  });

  const canRetry = docsError || timeBarsError || failedObligationDocuments > 0;

  const retryFailed = () => {
    if (docsError) refetchDocuments();
    if (timeBarsError) refetchTimeBars();
    obligationQueries.forEach(q => {
      if (q.isError) q.refetch();
    });
  };

  const rows = useMemo(() => {
    const today = new Date();
    const obligationRows = documents.flatMap((doc, i) =>
      buildObligationRows(
        String(doc._id),
        doc.name,
        (obligationQueries[i]?.data as ApiObligation[]) ?? [],
        today,
      ),
    );
    const bars: ApiTimeBar[] = timeBarData?.time_bars ?? [];
    return sortComplianceRows([
      ...obligationRows,
      ...buildTimeBarRows(bars, today),
    ]);
    // `obligationQueries` is a fresh array each render; its data is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, timeBarData, obligationQueries.map(q => q.dataUpdatedAt).join()]);

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

  const documentOptions = useMemo(
    () => documents.map(d => ({ id: String(d._id), name: d.name })),
    [documents],
  );

  const invalidateObligations = () =>
    queryClient.invalidateQueries({ queryKey: ["obligations"] });

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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Track obligation
            </Button>
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

        {/* Obligations arrive one document at a time. Quiet line rather than a
            spinner over the page — the rows already on screen are real. */}
        {!isLoading && obligationsPending > 0 && (
          <p className="text-xs text-muted-foreground">
            Still loading obligations for {obligationsPending} of{" "}
            {obligationQueries.length} document
            {obligationQueries.length === 1 ? "" : "s"}.
          </p>
        )}

        {isLoading ? (
          <AwesomeLoader />
        ) : visibleRows.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={Search}
              title="No obligations match this search"
              description={`Nothing matches “${searchTerm}”. Try the document name or the clause reference instead.`}
              action={
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              }
            />
          ) : obligationsPending > 0 ? (
            // Documents are still being asked about — "nothing tracked yet" is
            // not a conclusion we can draw yet. The line above says so.
            null
          ) : (
            <EmptyState
              icon={Shield}
              title="No contractual obligations tracked yet"
              description="Obligations appear here with the document that creates them and the date they fall due. Missing one can forfeit a claim or hold up a payment certificate."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Track obligation
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-3">
            {visibleRows.map(row => (
              <div key={row.key} className="bg-card border border-border rounded-xl p-4">
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
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
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
                        <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                          {row.dueDate ? "Amend" : "Set due date"}
                        </Button>
                        {row.urgency !== "closed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => completeObligation(row)}
                          >
                            Mark complete
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/documents/${row.documentId}`)}
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
                        onClick={() => navigate("/project-health")}
                      >
                        Project Health
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    </DashboardLayout>
  );
};

export default Compliance;

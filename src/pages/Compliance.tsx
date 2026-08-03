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
 * an aggregate route.
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
import {
  buildObligationRows,
  buildTimeBarRows,
  filterComplianceRows,
  sortComplianceRows,
  summariseCompliance,
  type ApiObligation,
  type ApiTimeBar,
  type ComplianceRow,
  type ComplianceUrgency,
} from "@/lib/compliance";
import {
  CalendarClock, CalendarOff, FileText, Search, Shield, ShieldQuestion,
} from "lucide-react";

const URGENCY_STYLES: Record<ComplianceUrgency, string> = {
  overdue: "bg-red-50 text-red-700 border-red-200",
  "due-soon": "bg-amber-50 text-amber-700 border-amber-200",
  "no-date": "bg-muted text-muted-foreground border-border",
  "on-track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};

function urgencyLabel(row: ComplianceRow): string {
  switch (row.urgency) {
    case "overdue":
      return `${Math.abs(row.daysFromDue ?? 0)}d overdue`;
    case "due-soon":
      return `${row.daysFromDue}d left`;
    case "no-date":
      return "No date recorded";
    case "on-track":
      return `${row.daysFromDue}d left`;
    default:
      return row.status;
  }
}

const Compliance = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceRow | null>(null);

  const { mutateAsync: post, isPending: isCreating } = usePost();
  const { mutateAsync: patch, isPending: isPatching } = usePatch();

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["documents", projectId, "compliance"],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const documents: ApiDocument[] = useMemo(() => docsData?.results ?? [], [docsData]);

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

  const { data: timeBarData, isLoading: timeBarsLoading } = useQuery({
    queryKey: ["time-bars", projectId],
    queryFn: () => fetchData(`projects/${projectId}/time-bars/`),
    enabled: !!projectId,
  });

  const obligationsLoading = obligationQueries.some(q => q.isLoading);
  const isLoading = docsLoading || obligationsLoading || timeBarsLoading;

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

        {/* Counts are derived from the rows below — never from a stored score. */}
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <span className="text-muted-foreground">{counts.overdue} overdue</span>
          <span className="text-muted-foreground">{counts.dueSoon} due within 14 days</span>
          <span className="text-muted-foreground">{counts.noDate} with no date recorded</span>
          <span className="text-muted-foreground">{counts.onTrack} on track</span>
          <span className="text-muted-foreground">{counts.closed} closed</span>
        </div>

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
              description={`Nothing matches “${searchTerm}”. Try the document name or the clause reference instead.`}
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
                          Due {row.dueDate}
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

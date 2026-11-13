/**
 * Admin Panel → Projects: every customer project — filtered, sorted, paged,
 * exportable — with one project's full picture in a drawer: its counts and
 * health, billing, team and companies, and a status change (with a reason,
 * kept in the audit log). Projects are never deleted from here; one that ends
 * is Completed or Cancelled.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Download, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  type AdminProjectRow,
  downloadAdminExport,
  getAdminProject,
  getAdminProjects,
  postAdminProjectStatus,
} from "@/lib/Api";
import { money, ratePct, serverReason } from "@/lib/platformBilling";
import { getStatusBadgeClasses } from "@/lib/statusColors";
import { AdminPage, ErrorNotice, TD, TH, formatDate } from "./adminUi";
import {
  ConfirmActionDialog,
  DetailStat,
  DrawerSection,
  Initials,
  Pager,
  type PendingAction,
  SortTh,
  useDebounced,
} from "./adminManage";

const STATUSES = ["Draft", "Active", "On Hold", "Completed", "Cancelled"];

const BILLING: Record<AdminProjectRow["billing"], { label: string; variant: "success" | "neutral" | "warning" }> = {
  on: { label: "Billing on", variant: "success" },
  off: { label: "Billing off", variant: "neutral" },
  not_configured: { label: "Not set up", variant: "warning" },
};

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs ${getStatusBadgeClasses(status)}`}>{status}</span>;
}

const ago = (iso: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "No activity");

function ProjectDrawer({ projectId, onClose }: { projectId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const { data: p, isLoading, isError, error } = useQuery({
    queryKey: ["adminProject", projectId],
    queryFn: () => getAdminProject(projectId as number),
    enabled: projectId !== null,
  });

  const changeStatus = (status: string) =>
    setPending({
      title: `Change status to ${status}?`,
      description: "The project's team sees the new status straight away.",
      confirmLabel: "Change status",
      destructive: status === "Cancelled",
      reasonRequired: true,
      run: async (reason) => {
        try {
          const updated = await postAdminProjectStatus(projectId as number, status, reason);
          qc.setQueryData(["adminProject", projectId], updated);
          qc.invalidateQueries({ queryKey: ["adminProjects"] });
          toast.success(`Status changed to ${status}`);
        } catch (e) {
          toast.error(serverReason(e, "The status could not be changed"));
          throw e;
        } finally {
          setNextStatus("");
        }
      },
    });

  return (
    <Sheet open={projectId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent size="lg" className="overflow-y-auto">
        {isLoading || !p ? (
          isError ? <ErrorNotice error={error} /> : <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{p.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {p.projectNumber}{p.location ? ` · ${p.location}` : ""}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusPill status={p.status} />
                <Badge variant={BILLING[p.billing].variant} className="font-normal">{BILLING[p.billing].label}</Badge>
                {p.inactive && <Badge variant="warning" className="font-normal">No activity in 30 days</Badge>}
              </div>
            </SheetHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={nextStatus} onValueChange={(v) => { setNextStatus(v); changeStatus(v); }}>
                <SelectTrigger className="h-9 w-48" aria-label="Change status"><SelectValue placeholder="Change status…" /></SelectTrigger>
                <SelectContent>
                  {p.statusChoices.filter((s) => s !== p.status).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button asChild size="sm" variant="outline">
                <Link to={`/account/admin/billing/projects/${p.id}`}>Billing terms</Link>
              </Button>
            </div>

            {(p.counts.overdueTasks > 0 || p.counts.openRiskSignals > 0) && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {p.counts.overdueTasks > 0 && `${p.counts.overdueTasks} overdue task${p.counts.overdueTasks === 1 ? "" : "s"}`}
                  {p.counts.overdueTasks > 0 && p.counts.openRiskSignals > 0 && " · "}
                  {p.counts.openRiskSignals > 0 && `${p.counts.openRiskSignals} open risk signal${p.counts.openRiskSignals === 1 ? "" : "s"}`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DetailStat label="Open tasks" value={`${p.counts.openTasks} of ${p.counts.tasks}`} />
              <DetailStat label="Variation orders" value={`${p.counts.approvedVariations} approved of ${p.counts.variations}`} />
              <DetailStat label="Certificates" value={`${p.counts.postedCertificates} posted of ${p.counts.certificates}`} />
              <DetailStat label="Certified value" value={money(p.counts.certifiedValue)} />
              <DetailStat label="Documents" value={p.counts.documents} />
              <DetailStat label="Meetings" value={p.counts.meetings} />
              <DetailStat label="Contract value" value={p.contractValue ? money(p.contractValue) : "—"} />
              <DetailStat label="Last activity" value={ago(p.lastActivity)} />
              <DetailStat label="Created" value={formatDate(p.createdAt)} />
            </div>

            <DrawerSection title="Billing">
              <ul className="rounded-lg border border-border divide-y divide-border text-sm">
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Rate</span><span>{p.billingSummary.feeRatePct != null ? ratePct(p.billingSummary.feeRatePct) : "—"}</span></li>
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Billed to</span><span className="truncate ml-4">{p.billingSummary.billingContactEmail || "Not set"}</span></li>
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Not invoiced yet</span><span className="tabular-nums">{money(p.billingSummary.unbilledTotal)}</span></li>
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Invoiced, unpaid</span><span className="tabular-nums">{money(p.billingSummary.outstandingTotal)}</span></li>
              </ul>
            </DrawerSection>

            <DrawerSection title={`Team (${p.team.length})`}>
              {p.team.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has been added yet{p.createdBy ? ` — created by ${p.createdBy}` : ""}.</p>
              ) : (
                <ul className="rounded-lg border border-border divide-y divide-border">
                  {p.team.map((m) => (
                    <li key={`${m.userId}-${m.role}`} className={`flex items-center gap-3 px-3 py-2 ${m.isActive ? "" : "opacity-60"}`}>
                      <Initials name={m.name || m.email} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{m.name || m.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.company || m.email}</p>
                      </div>
                      <Badge variant="outline" className="font-normal shrink-0">{m.role}{m.isActive ? "" : " (removed)"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            {p.associatedCompanies.length > 0 && (
              <DrawerSection title="Associated companies">
                <ul className="rounded-lg border border-border divide-y divide-border">
                  {p.associatedCompanies.map((c, i) => (
                    <li key={i} className="px-3 py-2">
                      <p className="text-sm text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{[c.role, c.type, c.contact].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ul>
              </DrawerSection>
            )}

            {p.adminHistory.length > 0 && (
              <DrawerSection title="Admin history">
                <ol className="space-y-2">
                  {p.adminHistory.map((h, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-foreground">{h.actor || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">
                        {h.action === "project.status"
                          ? `changed status ${String(h.detail.from)} → ${String(h.detail.to)}`
                          : h.action.replace(/[._]/g, " ")}
                      </span>
                      {typeof h.detail?.reason === "string" && h.detail.reason && (
                        <span className="text-muted-foreground"> — “{h.detail.reason}”</span>
                      )}
                      <span className="block text-xs text-muted-foreground">{formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}</span>
                    </li>
                  ))}
                </ol>
              </DrawerSection>
            )}
          </div>
        )}
        <ConfirmActionDialog action={pending} onClose={() => { setPending(null); setNextStatus(""); }} />
      </SheetContent>
    </Sheet>
  );
}

const AdminProjects = () => {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [billing, setBilling] = useState("all");
  const [inactive, setInactive] = useState(false);
  const [sort, setSort] = useState("created");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const params = { q, status: statusFilter === "all" ? undefined : statusFilter,
    billing: billing === "all" ? undefined : billing, inactive: inactive ? "1" : undefined, sort, page };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminProjects", params],
    queryFn: () => getAdminProjects(params),
    placeholderData: (prev) => prev,
  });

  const filter = (fn: () => void) => { fn(); setPage(1); };
  const onSort = (key: string) => filter(() => setSort(key));

  return (
    <AdminPage title="Projects" description="Every customer project on the platform. Open one to see its health, billing and team, or change its status.">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => filter(() => setSearch(e.target.value))}
            placeholder="Search name, number or location…" className="pl-9 h-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => filter(() => setStatusFilter(v))}>
          <SelectTrigger className="h-10 w-40 bg-card" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={billing} onValueChange={(v) => filter(() => setBilling(v))}>
          <SelectTrigger className="h-10 w-40 bg-card" aria-label="Billing"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any billing</SelectItem>
            <SelectItem value="on">Billing on</SelectItem>
            <SelectItem value="off">Billing off</SelectItem>
            <SelectItem value="not_configured">Not set up</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Switch checked={inactive} onCheckedChange={(v) => filter(() => setInactive(v))} aria-label="Inactive 30+ days" />
          Inactive 30+ days
        </label>
        <Button variant="outline" size="sm" className="ml-auto h-10" onClick={() =>
          downloadAdminExport("projects", params).catch((e) => toast.error(serverReason(e, "Export failed")))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : isError || !data ? (
          <div className="p-5"><ErrorNotice error={error} /></div>
        ) : data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No projects match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <SortTh label="Project" sortKey="name" sort={sort} onSort={onSort} />
                    <SortTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
                    <th className={TH}>Company</th>
                    <SortTh label="Team" sortKey="users" sort={sort} onSort={onSort} />
                    <SortTh label="Last activity" sortKey="lastActivity" sort={sort} onSort={onSort} />
                    <th className={TH}>Billing</th>
                    <SortTh label="Created" sortKey="created" sort={sort} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((p) => (
                    <tr key={p.id} onClick={() => setOpen(p.id)} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50">
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FolderOpen className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate max-w-[240px]">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{p.projectNumber}{p.location ? ` · ${p.location}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}><StatusPill status={p.status} /></td>
                      <td className={TD}>{p.company || <span className="text-muted-foreground">—</span>}</td>
                      <td className={`${TD} tabular-nums`}>{p.userCount}</td>
                      <td className={TD}>
                        <span className={p.inactive ? "text-amber-700" : ""}>{ago(p.lastActivity)}</span>
                      </td>
                      <td className={TD}><Badge variant={BILLING[p.billing].variant} className="font-normal">{BILLING[p.billing].label}</Badge></td>
                      <td className={TD}>{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pages={data.pages} count={data.count} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </div>

      <ProjectDrawer projectId={open} onClose={() => setOpen(null)} />
    </AdminPage>
  );
};

export default AdminProjects;

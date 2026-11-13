/**
 * Admin Panel → Companies: every company — filtered, sorted, paged — with one
 * company's full picture in a drawer: its money, details (editable), status,
 * users (each movable to another company) and projects.
 *
 * Suspending is ENFORCED by the server (user/views_admin_ops.py): the
 * company's users cannot sign in, and are signed out, until it is reactivated.
 * Superusers are never locked out. "Inactive" is a label only. Status changes
 * and moves need a reason; every change is in the audit log.
 */
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  type AdminCompanyDetail,
  type AdminCompanyRow,
  getAdminCompanies,
  getAdminCompany,
  patchAdminCompany,
  postAdminCompanyStatus,
  postAdminUserCompany,
} from "@/lib/Api";
import { money, serverReason } from "@/lib/platformBilling";
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

const STATUS: Record<AdminCompanyRow["status"], { label: string; variant: "success" | "neutral" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  suspended: { label: "Suspended", variant: "danger" },
};

const STATUS_COPY: Record<string, string> = {
  suspended: "Its users are signed out now and cannot sign in until it is reactivated. Baselinq superusers are not affected.",
  active: "Its users can sign in again with their existing passwords.",
  inactive: "A label only — its users can still sign in.",
};

type EditDraft = { name: string; vatNumber: string; registrationNumber: string; ckNumber: string; companySize: string; description: string };

const draftOf = (c: AdminCompanyDetail): EditDraft => ({
  name: c.name, vatNumber: c.vatNumber ?? "", registrationNumber: c.registrationNumber ?? "",
  ckNumber: c.ckNumber ?? "", companySize: c.companySize ?? "", description: c.description ?? "",
});

/** Move one user to another company — choose where, and say why. */
function MoveUserDialog({ user, fromId, onClose, onMoved }: {
  user: { id: number; name: string; email: string } | null; fromId: number; onClose: () => void; onMoved: () => void;
}) {
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const companies = useQuery({
    queryKey: ["adminCompanies", "all"],
    queryFn: () => getAdminCompanies({ sort: "name", pageSize: 100 }),
    enabled: !!user,
  });
  useEffect(() => { setTarget(""); setReason(""); }, [user]);

  const move = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await postAdminUserCompany(user.id, target === "none" ? null : Number(target), reason.trim());
      toast.success(`${user.name || user.email} moved to ${res.organization ?? "no company"}`);
      onMoved();
      onClose();
    } catch (e) {
      toast.error(serverReason(e, "The user could not be moved"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {user?.name || user?.email}</DialogTitle>
          <DialogDescription>They keep their projects and roles; only the company they belong to changes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger aria-label="New company"><SelectValue placeholder="Choose a company…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company</SelectItem>
              {(companies.data?.results ?? []).filter((c) => c.id !== fromId).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Reason — kept in the audit log</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Back</Button>
          <Button size="sm" onClick={move} disabled={busy || !target || !reason.trim()}>{busy ? "Moving…" : "Move user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompanyDrawer({ companyId, onClose }: { companyId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [moving, setMoving] = useState<{ id: number; name: string; email: string } | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: c, isLoading, isError, error } = useQuery({
    queryKey: ["adminCompany", companyId],
    queryFn: () => getAdminCompany(companyId as number),
    enabled: companyId !== null,
  });
  useEffect(() => { if (c) setDraft(draftOf(c)); }, [c]);

  const refresh = (updated?: AdminCompanyDetail) => {
    if (updated) qc.setQueryData(["adminCompany", companyId], updated);
    else qc.invalidateQueries({ queryKey: ["adminCompany", companyId] });
    qc.invalidateQueries({ queryKey: ["adminCompanies"] });
    qc.invalidateQueries({ queryKey: ["adminUsers"] });
  };

  const dirty = !!c && !!draft && JSON.stringify(draft) !== JSON.stringify(draftOf(c));
  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      refresh(await patchAdminCompany(companyId as number, draft));
      toast.success("Company details saved");
    } catch (e) {
      toast.error(serverReason(e, "The details could not be saved"));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (status: string) =>
    setPending({
      title: status === "suspended" ? "Suspend this company?" : `Mark this company ${status}?`,
      description: STATUS_COPY[status] ?? "",
      confirmLabel: status === "suspended" ? "Suspend company" : "Change status",
      destructive: status === "suspended",
      reasonRequired: true,
      run: async (reason) => {
        try {
          refresh(await postAdminCompanyStatus(companyId as number, status, reason));
          toast.success(status === "suspended" ? "Company suspended — its users are signed out" : "Status changed");
        } catch (e) {
          toast.error(serverReason(e, "The status could not be changed"));
          throw e;
        } finally {
          setNextStatus("");
        }
      },
    });

  const field = (key: keyof EditDraft, label: string) => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={draft?.[key] ?? ""} onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })} className="h-9" />
    </div>
  );

  return (
    <Sheet open={companyId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent size="lg" className="overflow-y-auto">
        {isLoading || !c || !draft ? (
          isError ? <ErrorNotice error={error} /> : <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{c.name}</SheetTitle>
                  <SheetDescription>Added {formatDate(c.createdAt)}</SheetDescription>
                </div>
              </div>
              <div className="pt-1"><Badge variant={STATUS[c.status].variant} className="font-normal">{STATUS[c.status].label}</Badge></div>
            </SheetHeader>

            {c.status === "suspended" && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                Suspended — its users cannot sign in until the company is reactivated.
              </p>
            )}

            <Select value={nextStatus} onValueChange={(v) => { setNextStatus(v); changeStatus(v); }}>
              <SelectTrigger className="h-9 w-52" aria-label="Change status"><SelectValue placeholder="Change status…" /></SelectTrigger>
              <SelectContent>
                {c.statusChoices.filter((s) => s !== c.status).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS[s as AdminCompanyRow["status"]]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <DetailStat label="Certified value" value={money(c.money.certifiedValue)} />
              <DetailStat label="Platform fees charged" value={money(c.money.feesCharged)} />
              <DetailStat label="Invoiced, unpaid" value={money(c.money.invoicedUnpaid)} />
              <DetailStat label="Paid" value={money(c.money.paid)} />
            </div>

            <DrawerSection title="Details" action={
              <Button size="xs" onClick={save} disabled={!dirty || saving || !draft.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
            }>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <div className="col-span-2">{field("name", "Name")}</div>
                {field("vatNumber", "VAT number")}
                {field("registrationNumber", "Registration number")}
                {field("ckNumber", "CK number")}
                {field("companySize", "Size")}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
              </div>
            </DrawerSection>

            <DrawerSection title={`Users (${c.users.length})`}>
              {c.users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody belongs to this company.</p>
              ) : (
                <ul className="rounded-lg border border-border divide-y divide-border">
                  {c.users.map((u) => (
                    <li key={u.id} className={`flex items-center gap-3 px-3 py-2 ${u.isActive ? "" : "opacity-60"}`}>
                      <Initials name={u.name || u.email} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.role || u.email}{u.isActive ? "" : " · deactivated"}</p>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => setMoving(u)}>Move</Button>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            <DrawerSection title={`Projects (${c.projects.length})`}>
              {c.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Its users have not created a project.</p>
              ) : (
                <ul className="rounded-lg border border-border divide-y divide-border">
                  {c.projects.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.number}</p>
                      </div>
                      <Badge variant="outline" className="font-normal">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            {c.adminHistory.length > 0 && (
              <DrawerSection title="Admin history">
                <ol className="space-y-2">
                  {c.adminHistory.map((h, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-foreground">{h.actor || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">
                        {h.action === "company.status" ? `changed status ${String(h.detail.from)} → ${String(h.detail.to)}` : "edited the details"}
                      </span>
                      {typeof h.detail?.reason === "string" && h.detail.reason && <span className="text-muted-foreground"> — “{h.detail.reason}”</span>}
                      <span className="block text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </DrawerSection>
            )}
          </div>
        )}
        <ConfirmActionDialog action={pending} onClose={() => { setPending(null); setNextStatus(""); }} />
        <MoveUserDialog user={moving} fromId={companyId ?? 0} onClose={() => setMoving(null)} onMoved={() => refresh()} />
      </SheetContent>
    </Sheet>
  );
}

const AdminCompanies = () => {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("created");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const params = { q, status: statusFilter === "all" ? undefined : statusFilter, sort, page };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminCompanies", params],
    queryFn: () => getAdminCompanies(params),
    placeholderData: (prev) => prev,
  });
  const filter = (fn: () => void) => { fn(); setPage(1); };
  const onSort = (key: string) => filter(() => setSort(key));

  return (
    <AdminPage title="Companies" description="Every company on the platform. Open one to see its people, projects and money, edit its details, or suspend it.">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => filter(() => setSearch(e.target.value))} placeholder="Search name, VAT or registration…" className="pl-9 h-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => filter(() => setStatusFilter(v))}>
          <SelectTrigger className="h-10 w-40 bg-card" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : isError || !data ? (
          <div className="p-5"><ErrorNotice error={error} /></div>
        ) : data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No companies match.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <SortTh label="Company" sortKey="name" sort={sort} onSort={onSort} />
                    <th className={TH}>Status</th>
                    <SortTh label="Users" sortKey="users" sort={sort} onSort={onSort} />
                    <SortTh label="Projects" sortKey="projects" sort={sort} onSort={onSort} />
                    <th className={TH}>VAT number</th>
                    <SortTh label="Added" sortKey="created" sort={sort} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((co) => (
                    <tr key={co.id} onClick={() => setOpen(co.id)} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50">
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate max-w-[260px]">{co.name}</p>
                            {co.companySize && <p className="text-xs text-muted-foreground">{co.companySize} people</p>}
                          </div>
                        </div>
                      </td>
                      <td className={TD}><Badge variant={STATUS[co.status].variant} className="font-normal">{STATUS[co.status].label}</Badge></td>
                      <td className={`${TD} tabular-nums`}>{co.userCount}</td>
                      <td className={`${TD} tabular-nums`}>{co.projectCount}</td>
                      <td className={TD}>{co.vatNumber || <span className="text-muted-foreground">—</span>}</td>
                      <td className={TD}>{formatDate(co.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pages={data.pages} count={data.count} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </div>

      <CompanyDrawer companyId={open} onClose={() => setOpen(null)} />
    </AdminPage>
  );
};

export default AdminCompanies;

/**
 * Admin Panel → Users: every account, and every invitation, across all
 * companies — filtered, sorted, paged, exportable — with one user's full
 * picture and the actions on it in a drawer.
 *
 * Actions are the server's (user/views_admin_manage.py), which refuses the
 * unsafe ones itself: nobody deactivates or demotes their own account, the
 * last active superuser cannot be removed, and deactivating, granting or
 * removing superuser need a reason. Every action lands in the audit log.
 * Nothing here deletes a user — a person who leaves is deactivated, so their
 * name stays on every record they signed.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Download, Lock, Mail, Search, ShieldCheck, Unlock, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  type AdminInvitationRow,
  type AdminUserAction,
  type AdminUserDetail,
  downloadAdminExport,
  getAdminCompanies,
  getAdminInvitations,
  getAdminUser,
  getAdminUsers,
  postAdminInvitationAction,
  postAdminUserAction,
} from "@/lib/Api";
import { serverReason } from "@/lib/platformBilling";
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

const ago = (iso: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "Never");

const STATUS_FILTERS = [
  { value: "all", label: "All users" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Deactivated" },
  { value: "locked", label: "Locked out" },
  { value: "never_signed_in", label: "Never signed in" },
  { value: "staff", label: "Staff" },
  { value: "superuser", label: "Superusers" },
];

function AccessBadges({ u }: { u: { isActive: boolean; isStaff: boolean; isSuperuser: boolean; isLocked: boolean } }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {!u.isActive && <Badge variant="neutral" className="font-normal">Deactivated</Badge>}
      {u.isLocked && <Badge variant="warning" className="font-normal gap-1"><Lock className="h-3 w-3" />Locked</Badge>}
      {u.isSuperuser ? (
        <Badge variant="info" className="font-normal">Superuser</Badge>
      ) : u.isStaff ? (
        <Badge variant="outline" className="font-normal">Staff</Badge>
      ) : null}
    </span>
  );
}

const ACTION_COPY: Record<AdminUserAction, Omit<PendingAction, "run">> = {
  deactivate: {
    title: "Deactivate this user?",
    description: "They are signed out everywhere and cannot sign in. Their name stays on everything they signed. You can reactivate them later.",
    confirmLabel: "Deactivate", destructive: true, reasonRequired: true,
  },
  reactivate: { title: "Reactivate this user?", description: "They can sign in again with their existing password.", confirmLabel: "Reactivate" },
  unlock: { title: "Unlock this user?", description: "Clears the sign-in and signing-PIN lockouts after repeated wrong attempts.", confirmLabel: "Unlock" },
  clear_pin: {
    title: "Clear signing PIN?",
    description: "They will set a new PIN the next time they sign — a PIN is required before approving a Variation Order.",
    confirmLabel: "Clear PIN",
  },
  grant_staff: { title: "Make this user Baselinq staff?", description: "Staff can read billing on every project, but cannot change it.", confirmLabel: "Make staff" },
  revoke_staff: { title: "Remove staff access?", description: "They keep their normal access to their own projects.", confirmLabel: "Remove staff", destructive: true },
  grant_superuser: {
    title: "Make this user a superuser?",
    description: "Superusers can see and change everything in the admin panel, including billing and other users' access.",
    confirmLabel: "Make superuser", reasonRequired: true,
  },
  revoke_superuser: {
    title: "Remove superuser access?",
    description: "They lose the admin panel. They stay staff until that is removed separately.",
    confirmLabel: "Remove superuser", destructive: true, reasonRequired: true,
  },
};

function UserDrawer({ userId, onClose }: { userId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { data: u, isLoading, isError, error } = useQuery({
    queryKey: ["adminUser", userId],
    queryFn: () => getAdminUser(userId as number),
    enabled: userId !== null,
  });

  const ask = (action: AdminUserAction) =>
    setPending({
      ...ACTION_COPY[action],
      run: async (reason) => {
        try {
          const updated = await postAdminUserAction(userId as number, action, reason);
          qc.setQueryData(["adminUser", userId], updated);
          qc.invalidateQueries({ queryKey: ["adminUsers"] });
          toast.success("Done");
        } catch (e) {
          toast.error(serverReason(e, "That could not be done"));
          throw e;
        }
      },
    });

  const actions = (d: AdminUserDetail) => (
    <div className="flex flex-wrap gap-2">
      {d.isActive ? (
        <Button size="sm" variant="outline" onClick={() => ask("deactivate")}><UserX className="h-4 w-4 mr-1.5" />Deactivate</Button>
      ) : (
        <Button size="sm" onClick={() => ask("reactivate")}><UserCheck className="h-4 w-4 mr-1.5" />Reactivate</Button>
      )}
      {d.isLocked && <Button size="sm" variant="outline" onClick={() => ask("unlock")}><Unlock className="h-4 w-4 mr-1.5" />Unlock</Button>}
      {d.signingPinSet && <Button size="sm" variant="outline" onClick={() => ask("clear_pin")}>Clear PIN</Button>}
      {d.isSuperuser ? (
        <Button size="sm" variant="outline" onClick={() => ask("revoke_superuser")}>Remove superuser</Button>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={() => ask("grant_superuser")}><ShieldCheck className="h-4 w-4 mr-1.5" />Make superuser</Button>
          {d.isStaff ? (
            <Button size="sm" variant="outline" onClick={() => ask("revoke_staff")}>Remove staff</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => ask("grant_staff")}>Make staff</Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <Sheet open={userId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent size="lg" className="overflow-y-auto">
        {isLoading || !u ? (
          isError ? <ErrorNotice error={error} /> : <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Initials name={u.name || u.email} className="h-11 w-11 text-sm" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{u.name || u.email}</SheetTitle>
                  <SheetDescription className="truncate">{u.email}</SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                <AccessBadges u={u} />
                <span>{u.organization || "No company"}{u.role ? ` · ${u.role}` : ""}</span>
              </div>
            </SheetHeader>

            {actions(u)}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DetailStat label="Last sign-in" value={ago(u.lastLogin)} />
              <DetailStat label="Last active" value={u.lastActiveOn ? formatDate(u.lastActiveOn) : "—"} />
              <DetailStat label="Active days (30d)" value={u.activeDaysLast30} />
              <DetailStat label="Joined" value={formatDate(u.dateJoined)} />
              <DetailStat label="Projects" value={u.projects.length} />
              <DetailStat label="Invitations sent" value={u.invitationsSent} />
            </div>

            <DrawerSection title="Security">
              <ul className="rounded-lg border border-border divide-y divide-border text-sm">
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Email verified</span><span>{u.isEmailVerified ? "Yes" : "No"}</span></li>
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Failed sign-ins</span><span className="tabular-nums">{u.failedLoginAttempts}</span></li>
                <li className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Signing PIN</span><span>{u.signingPinSet ? "Set" : "Not set"}{u.signingPinLockedUntil ? " · locked" : ""}</span></li>
              </ul>
            </DrawerSection>

            <DrawerSection title={`Projects (${u.projects.length})`}>
              {u.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not on any project.</p>
              ) : (
                <ul className="rounded-lg border border-border divide-y divide-border">
                  {u.projects.map((p) => (
                    <li key={`${p.id}-${p.role}`} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.number} · {p.status}</p>
                      </div>
                      <Badge variant={p.owner ? "info" : "outline"} className="font-normal shrink-0">
                        {p.role}{!p.isActive ? " (removed)" : ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            <DrawerSection title="Recent activity">
              {u.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No task activity recorded.</p>
              ) : (
                <ol className="space-y-2.5">
                  {u.recentActivity.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground leading-snug">{a.description || a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.project ? `${a.project} · ` : ""}{ago(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </DrawerSection>

            {u.adminHistory.length > 0 && (
              <DrawerSection title="Admin history">
                <ol className="space-y-2">
                  {u.adminHistory.map((h, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-foreground">{h.actor || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{h.action.replace("user.", "").replace(/_/g, " ")}</span>
                      {typeof h.detail?.reason === "string" && h.detail.reason && (
                        <span className="text-muted-foreground"> — “{h.detail.reason}”</span>
                      )}
                      <span className="block text-xs text-muted-foreground">{ago(h.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </DrawerSection>
            )}
          </div>
        )}
        <ConfirmActionDialog action={pending} onClose={() => setPending(null)} />
      </SheetContent>
    </Sheet>
  );
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [company, setCompany] = useState("all");
  const [sort, setSort] = useState("joined");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const params = { q, status: statusFilter === "all" ? undefined : statusFilter,
    company: company === "all" ? undefined : company, sort, page };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminUsers", params],
    queryFn: () => getAdminUsers(params),
    placeholderData: (prev) => prev,
  });
  const companies = useQuery({ queryKey: ["adminCompanies", "all"], queryFn: () => getAdminCompanies({ sort: "name", pageSize: 100 }) });

  const filter = (fn: () => void) => { fn(); setPage(1); };
  const onSort = (key: string) => filter(() => setSort(key));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => filter(() => setSearch(e.target.value))}
            placeholder="Search name, email or company…" className="pl-9 h-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => filter(() => setStatusFilter(v))}>
          <SelectTrigger className="h-10 w-44 bg-card" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={company} onValueChange={(v) => filter(() => setCompany(v))}>
          <SelectTrigger className="h-10 w-48 bg-card" aria-label="Company"><SelectValue placeholder="All companies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {(companies.data?.results ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto h-10" onClick={() =>
          downloadAdminExport("users", params).catch((e) => toast.error(serverReason(e, "Export failed")))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : isError || !data ? (
          <div className="p-5"><ErrorNotice error={error} /></div>
        ) : data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No users match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <SortTh label="User" sortKey="name" sort={sort} onSort={onSort} />
                    <SortTh label="Company" sort={sort} onSort={onSort} />
                    <SortTh label="Projects" sortKey="projects" sort={sort} onSort={onSort} />
                    <SortTh label="Last sign-in" sortKey="lastLogin" sort={sort} onSort={onSort} />
                    <SortTh label="Last active" sortKey="lastActive" sort={sort} onSort={onSort} />
                    <SortTh label="Joined" sortKey="joined" sort={sort} onSort={onSort} />
                    <th className={TH}>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((u) => (
                    <tr key={u.id} onClick={() => setOpen(u.id)}
                      className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 ${u.isActive ? "" : "opacity-60"}`}>
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <Initials name={u.name || u.email} />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate max-w-[220px]">{u.name || u.email}</p>
                            {u.name && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{u.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={TD}>{u.organization || <span className="text-muted-foreground">—</span>}
                        {u.role && <span className="block text-xs text-muted-foreground">{u.role}</span>}</td>
                      <td className={`${TD} tabular-nums`}>{u.projectCount}</td>
                      <td className={TD}>{ago(u.lastLogin)}</td>
                      <td className={TD}>{u.lastActiveOn ? formatDate(u.lastActiveOn) : "—"}</td>
                      <td className={TD}>{formatDate(u.dateJoined)}</td>
                      <td className={TD}><AccessBadges u={u} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pages={data.pages} count={data.count} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </div>

      <UserDrawer userId={open} onClose={() => setOpen(null)} />
    </>
  );
}

const INVITE_BADGE: Record<AdminInvitationRow["status"], { label: string; variant: "warning" | "neutral" | "success" }> = {
  pending: { label: "Pending", variant: "warning" },
  expired: { label: "Expired", variant: "neutral" },
  accepted: { label: "Accepted", variant: "success" },
};

function InvitationsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const params = { status: statusFilter === "all" ? undefined : statusFilter, page };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminInvitations", params],
    queryFn: () => getAdminInvitations(params),
    placeholderData: (prev) => prev,
  });

  const act = (inv: AdminInvitationRow, action: "resend" | "cancel") =>
    setPending({
      title: action === "resend" ? `Resend the invitation to ${inv.email}?` : `Cancel the invitation to ${inv.email}?`,
      description: action === "resend"
        ? "Emails the same link again and gives it another 7 days."
        : "The link stops working. You can invite them again later.",
      confirmLabel: action === "resend" ? "Resend" : "Cancel invitation",
      destructive: action === "cancel",
      run: async () => {
        try {
          const res = await postAdminInvitationAction(inv.id, action);
          toast.success(action === "resend"
            ? (res.emailSent ? "Invitation resent" : "Extended — but the email could not be sent")
            : "Invitation cancelled");
          qc.invalidateQueries({ queryKey: ["adminInvitations"] });
        } catch (e) {
          toast.error(serverReason(e, "That could not be done"));
          throw e;
        }
      },
    });

  return (
    <>
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <TabsList aria-label="Invitation status">
          {["pending", "expired", "accepted", "all"].map((s) => (
            <TabsTrigger key={s} value={s} className="px-3 capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
        ) : isError || !data ? (
          <div className="p-5"><ErrorNotice error={error} /></div>
        ) : data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No {statusFilter === "all" ? "" : statusFilter} invitations.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Invited", "For", "Invited by", "Sent", "Expires", "Status", ""].map((h, i) => <th key={i} className={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><Mail className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate max-w-[220px]">{inv.name || inv.email}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{inv.name ? inv.email : inv.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>{inv.project || inv.organization || "—"}{inv.position && <span className="block text-xs text-muted-foreground">{inv.position}</span>}</td>
                      <td className={TD}>{inv.invitedBy || "—"}</td>
                      <td className={TD}>{formatDate(inv.createdAt)}</td>
                      <td className={TD}>{inv.status === "accepted" ? "—" : formatDate(inv.expiresAt)}</td>
                      <td className={TD}><Badge variant={INVITE_BADGE[inv.status].variant} className="font-normal">{INVITE_BADGE[inv.status].label}</Badge></td>
                      <td className={`${TD} text-right`}>
                        {inv.status !== "accepted" && (
                          <span className="inline-flex gap-1">
                            <Button size="xs" variant="ghost" onClick={() => act(inv, "resend")}>Resend</Button>
                            <Button size="xs" variant="ghost" onClick={() => act(inv, "cancel")}>Cancel</Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pages={data.pages} count={data.count} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </div>
      <ConfirmActionDialog action={pending} onClose={() => setPending(null)} />
    </>
  );
}

const AdminUsers = () => {
  const [tab, setTab] = useState("users");
  return (
    <AdminPage title="Users" description="Every account and invitation on the platform. Open a user to see everything about them and manage their access.">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users" className="px-4">Users</TabsTrigger>
          <TabsTrigger value="invitations" className="px-4">Invitations</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "users" ? <UsersTab /> : <InvitationsTab />}
    </AdminPage>
  );
};

export default AdminUsers;

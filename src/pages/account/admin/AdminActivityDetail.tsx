/**
 * Admin Panel → Activity → one person: their card in full, then every change
 * they made from the admin panel, searchable by area and text.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { getAdminAudit, getAdminStaff } from "@/lib/Api";
import { AdminPage, ErrorNotice } from "./adminUi";
import { Pager, auditDetailLine, describeAuditAction, useDebounced } from "./adminManage";
import { StaffSummary, ago, stamp } from "./AdminActivity";

const AREAS = [
  { value: "all", label: "Every area" },
  { value: "billing", label: "Billing" },
  { value: "user", label: "Users" },
  { value: "invitation", label: "Invitations" },
  { value: "project", label: "Projects" },
  { value: "company", label: "Companies" },
];

const AdminActivityDetail = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [page, setPage] = useState(1);

  const staff = useQuery({ queryKey: ["adminStaff"], queryFn: getAdminStaff });
  const person = staff.data?.results.find((s) => String(s.id) === userId);

  const params = { actor: userId, area: area === "all" ? undefined : area, q, page };
  const audit = useQuery({
    queryKey: ["adminAudit", params],
    queryFn: () => getAdminAudit(params),
    placeholderData: (prev) => prev,
    enabled: !!userId,
  });

  const filter = (fn: () => void) => { fn(); setPage(1); };
  const who = person ? person.name || person.email : "Activity";

  return (
    <AdminPage title={who} description="Every change this person made from the admin panel — what, when and why.">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => navigate("/account/admin/activity")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        All activity
      </Button>

      {staff.isLoading ? (
        <div className="flex justify-center py-10"><AwesomeLoader message="Loading" /></div>
      ) : staff.isError ? (
        <ErrorNotice error={staff.error} />
      ) : !person ? (
        <p className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          This person is not staff or a superuser any more, so they have no activity card. Their past changes are still listed below.
        </p>
      ) : (
        <div className={`rounded-xl border border-border bg-card p-5 ${person.isActive ? "" : "opacity-60"}`}>
          <StaffSummary s={person} wide />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => filter(() => setSearch(e.target.value))} placeholder="Search what was changed…" className="pl-9 h-10 bg-card" />
        </div>
        <Select value={area} onValueChange={(v) => filter(() => setArea(v))}>
          <SelectTrigger className="h-10 w-40 bg-card" aria-label="Area"><SelectValue /></SelectTrigger>
          <SelectContent>{AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <header className="px-5 py-3 border-b border-border">
          <h2 className="text-sm text-foreground">Activity log</h2>
          <p className="text-xs text-muted-foreground">Every change made from the admin panel. Nothing here can be edited or deleted.</p>
        </header>
        {audit.isLoading ? (
          <div className="flex justify-center py-12"><AwesomeLoader message="Loading" /></div>
        ) : audit.isError || !audit.data ? (
          <div className="p-5"><ErrorNotice error={audit.error} /></div>
        ) : audit.data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {q || area !== "all" ? "No changes match." : "No changes made from the admin panel yet."}
          </p>
        ) : (
          <>
            <ol className="divide-y divide-border">
              {audit.data.results.map((a) => {
                const detail = auditDetailLine(a.detail);
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="text-muted-foreground">{describeAuditAction(a.action)}</span> {a.targetLabel}
                      </p>
                      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                    </div>
                    <time className="shrink-0 text-right whitespace-nowrap" dateTime={a.createdAt}>
                      <span className="block text-xs text-foreground tabular-nums">{stamp(a.createdAt)}</span>
                      <span className="block text-[11px] text-muted-foreground">{ago(a.createdAt)}</span>
                    </time>
                  </li>
                );
              })}
            </ol>
            <Pager page={audit.data.page} pages={audit.data.pages} count={audit.data.count} pageSize={audit.data.pageSize} onPage={setPage} />
          </>
        )}
      </div>
    </AdminPage>
  );
};

export default AdminActivityDetail;

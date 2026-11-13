import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Pager } from "@/components/ui/pager";
import { type Paged, usePagedFetch } from "@/hooks/usePagedFetch";
import { money, ratePct } from "@/lib/platformBilling";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPage, ErrorNotice, SectionCard, TD, TD_NUM, TH, TH_NUM } from "../adminUi";

export interface BillingProjectRow {
  projectId: number;
  projectName: string;
  projectNumber: string;
  billing: "on" | "off" | "not_configured";
  feeRatePct: number;
  rateSource: "default" | "negotiated";
  capAmount: number | null;
  billingContactName: string;
  billingContactEmail: string;
  unbilledTotal: string;
  outstandingTotal: string;
  overdueCount: number;
}

const BILLING_BADGE = {
  on: { label: "On", variant: "success" as const },
  off: { label: "Off", variant: "neutral" as const },
  not_configured: { label: "Not set up", variant: "warning" as const },
};

const PAGE_SIZE = 25;

const BillingProjects = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, isPaging } = usePagedFetch<Paged<BillingProjectRow>>(
    `billing/admin/projects/${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    page,
    PAGE_SIZE,
  );

  return (
    <AdminPage title="Project billing" description="Every project's fee terms and what it owes. Open one to change its terms.">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project name or number…" className="pl-9 h-10 bg-card" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : isError || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <SectionCard
          title={`${data.count} project${data.count === 1 ? "" : "s"}`}
          /* `count` is the whole filtered total; the list arrives a page at a time. */
          subtitle="Amounts include 15% VAT."
        >
          {data.results.length === 0 ? (
            /*
              Without this the page rendered a bare header row over nothing —
              which reads as broken rather than empty. Every sibling admin
              list already branches here; this one did not.
            */
            <EmptyState
              variant="plain"
              size="sm"
              icon={FolderOpen}
              title={q ? "No projects match that search" : "No projects yet"}
              description={q ? "Try a different name or project number." : "Projects appear here once they exist."}
            />
          ) : (
          <table className={`w-full ${isPaging ? "opacity-60 transition-opacity" : ""}`}>
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: "Project" },
                  { label: "Billing" },
                  { label: "Rate", numeric: true },
                  { label: "Cap", numeric: true },
                  { label: "Billed to" },
                  { label: "Not invoiced", numeric: true },
                  { label: "Unpaid", numeric: true },
                ].map((c) => (
                  <th key={c.label} className={c.numeric ? TH_NUM : TH}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map((p) => (
                <tr
                  key={p.projectId}
                  onClick={() => navigate(`/account/admin/billing/projects/${p.projectId}`)}
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                >
                  <td className={TD}>
                    {p.projectName}
                    <span className="block text-xs text-muted-foreground">{p.projectNumber}</span>
                  </td>
                  <td className={TD}>
                    <Badge variant={BILLING_BADGE[p.billing].variant}>{BILLING_BADGE[p.billing].label}</Badge>
                  </td>
                  <td className={TD_NUM}>
                    {ratePct(p.feeRatePct)}
                    <span className="block text-xs text-muted-foreground">{p.rateSource === "negotiated" ? "Negotiated" : "Standard"}</span>
                  </td>
                  <td className={TD_NUM}>{p.capAmount != null ? money(p.capAmount) : "No cap"}</td>
                  <td className={TD}>{p.billingContactName || p.billingContactEmail || <span className="text-muted-foreground">Not set</span>}</td>
                  <td className={TD_NUM}>{money(p.unbilledTotal)}</td>
                  <td className={TD_NUM}>
                    {money(p.outstandingTotal)}
                    {p.overdueCount > 0 && <Badge variant="danger" className="ml-2">{p.overdueCount} overdue</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          <Pager {...data} onPage={setPage} loading={isPaging} />
        </SectionCard>
      )}
    </AdminPage>
  );
};

export default BillingProjects;

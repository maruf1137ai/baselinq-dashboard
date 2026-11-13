import { useState } from "react";

import { Pager } from "@/components/ui/pager";
import { usePagedFetch } from "@/hooks/usePagedFetch";
import { money } from "@/lib/platformBilling";
import { ErrorNotice, TD, TD_NUM, TH, TH_NUM } from "../adminUi";

interface ForecastRow {
  projectId: number;
  name: string;
  contractSum: string;
  feeRatePct: number;
  expectedTotalFee: string;
  feeChargedToDate: string;
  remainingFee: string;
  endDate: string | null;
  monthsRemaining: number | null;
  monthlyRunRate: string | null;
}

interface Forecast {
  totals: {
    projectCount: number;
    contractSum: string;
    expectedTotalFee: string;
    feeChargedToDate: string;
    remainingFee: string;
    undatedRemaining: string;
  };
  series: { month: string; expectedFee: string }[];
  /** This page of the table; totals and series cover every billed project. */
  projects: ForecastRow[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

/** Expected 1% fees across every billed project, spread over contract end dates. */
const ExpectedFeesCard = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isPaging } = usePagedFetch<Forecast>("billing/admin/forecast/", page, PAGE_SIZE);

  if (isLoading) return <div className="border border-border rounded-xl bg-card p-5 text-sm text-muted-foreground">Loading expected fees…</div>;
  if (isError || !data) return <ErrorNotice error={error} />;

  const { totals, series, projects } = data;
  const peak = Math.max(...series.map((s) => Number(s.expectedFee)), 0);
  const figures: [string, string][] = [
    ["Total contract value", totals.contractSum],
    ["Expected fees", totals.expectedTotalFee],
    ["Charged to date", totals.feeChargedToDate],
    ["Still to come", totals.remainingFee],
  ];

  return (
    <div className="border border-border rounded-xl bg-card shadow-sm p-5 space-y-5">
      <div>
        <h2 className="text-base text-foreground">Expected fees</h2>
        <p className="text-xs text-muted-foreground">
          Contract value × each project's rate, across {totals.projectCount} billed project{totals.projectCount === 1 ? "" : "s"}. Excludes VAT.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {figures.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg text-foreground tabular-nums">{money(value)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Next 12 months</div>
        {series.map((s) => {
          const value = Number(s.expectedFee);
          return (
            <div key={s.month} className="flex items-center gap-3 text-xs">
              <span className="w-14 shrink-0 text-muted-foreground">{monthLabel(s.month)}</span>
              <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-primary" style={{ width: peak ? `${(value / peak) * 100}%` : 0 }} />
              </div>
              <span className="w-28 shrink-0 text-right tabular-nums text-foreground">{money(s.expectedFee)}</span>
            </div>
          );
        })}
        {Number(totals.undatedRemaining) > 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            {money(totals.undatedRemaining)} more from projects with no end date — not placed in a month.
          </p>
        )}
      </div>

      <div className="-mx-5 -mb-5 border-t border-border">
        <div className="overflow-x-auto">
          <table className={`w-full ${isPaging ? "opacity-60 transition-opacity" : ""}`}>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className={TH}>Project</th>
                <th className={TH_NUM}>Contract</th>
                <th className={TH_NUM}>Rate</th>
                <th className={TH_NUM}>Expected</th>
                <th className={TH_NUM}>Charged</th>
                <th className={TH_NUM}>Remaining</th>
                <th className={TH_NUM}>Per month</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.projectId} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className={TD}>{p.name}</td>
                  <td className={TD_NUM}>{money(p.contractSum)}</td>
                  <td className={TD_NUM}>{p.feeRatePct}%</td>
                  <td className={TD_NUM}>{money(p.expectedTotalFee)}</td>
                  <td className={TD_NUM}>{money(p.feeChargedToDate)}</td>
                  <td className={TD_NUM}>{money(p.remainingFee)}</td>
                  <td className={TD_NUM}>
                    {p.monthlyRunRate ? money(p.monthlyRunRate) : (
                      <span className="text-muted-foreground">{p.endDate ? "Due now" : "No end date"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-sm text-muted-foreground">No project has billing switched on.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={data.page} pageSize={data.pageSize} count={data.count} totalPages={data.totalPages} onPage={setPage} loading={isPaging} />
      </div>
    </div>
  );
};

export default ExpectedFeesCard;

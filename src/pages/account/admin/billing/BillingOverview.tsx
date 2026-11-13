import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarCheck, CircleDollarSign, FileClock, FileText, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { money, serverReason } from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, StatCard } from "../adminUi";
import { useRefreshBilling } from "./billingShared";
import ExpectedFeesCard from "./ExpectedFeesCard";

interface Overview {
  month: string;
  earnedThisMonth: string;
  unbilledTotal: string;
  unbilledCount: number;
  outstandingTotal: string;
  outstandingCount: number;
  overdueTotal: string;
  overdueCount: number;
  paidThisMonth: string;
  paidThisMonthCount: number;
  draftCount: number;
  projects: { billingOn: number; billingOff: number; notConfigured: number };
}

interface MonthEndResult {
  built: { projectId: number; projectName: string; totalAmount: string }[];
  skipped: { projectId: number; projectName: string; reason: string }[];
  failed: { projectId: number; projectName: string; reason: string }[];
}

/** Last month — month end is run after the month closes. */
function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** A money figure as a card. StatCard counts whole numbers, so money gets its own. */
function MoneyCard({ label, value, hint, icon, tone }: {
  label: string; value: string; hint?: string; icon: React.ReactNode; tone?: "danger";
}) {
  return (
    <div className="border border-border rounded-xl bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tracking-wider">{label}</span>
        <span className={tone === "danger" ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-normal text-foreground tabular-nums">{money(value)}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const BillingOverview = () => {
  const navigate = useNavigate();
  const refresh = useRefreshBilling();
  const { data, isLoading, isError, error } = useFetch<Overview>("billing/admin/overview/");
  const [runOpen, setRunOpen] = useState(false);
  const [month, setMonth] = useState(previousMonth);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MonthEndResult | null>(null);

  const runMonthEnd = async () => {
    setRunning(true);
    try {
      const res = (await postData({ url: "billing/admin/invoices/month-end/", data: { month } })) as MonthEndResult;
      setResult(res);
      refresh();
      toast.success(`${res.built.length} draft invoice${res.built.length === 1 ? "" : "s"} built`);
    } catch (e) {
      toast.error(serverReason(e, "Month end could not run"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminPage title="Billing" description="Baselinq's platform fee across every project — 1% plus 15% VAT unless negotiated.">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : isError || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Every month: build the drafts, check them, issue them. Mark each paid when the money arrives.
            </p>
            <Button size="sm" onClick={() => { setResult(null); setRunOpen(true); }}>
              <CalendarCheck className="h-4 w-4 mr-1.5" />
              Run month end
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MoneyCard label="Earned this month" value={data.earnedThisMonth} hint="Fees + VAT accrued since the 1st" icon={<CircleDollarSign className="h-4 w-4" />} />
            <MoneyCard label="Not invoiced yet" value={data.unbilledTotal} hint={`${data.unbilledCount} fee${data.unbilledCount === 1 ? "" : "s"} waiting for an invoice`} icon={<FileClock className="h-4 w-4" />} />
            <MoneyCard label="Invoiced, unpaid" value={data.outstandingTotal} hint={`${data.outstandingCount} invoice${data.outstandingCount === 1 ? "" : "s"} out`} icon={<FileText className="h-4 w-4" />} />
            <MoneyCard label="Overdue" value={data.overdueTotal} hint={`${data.overdueCount} past the due date`} icon={<AlertTriangle className="h-4 w-4" />} tone={data.overdueCount ? "danger" : undefined} />
            <MoneyCard label="Paid this month" value={data.paidThisMonth} hint={`${data.paidThisMonthCount} invoice${data.paidThisMonthCount === 1 ? "" : "s"}`} icon={<Wallet className="h-4 w-4" />} />
            <StatCard label="Drafts to review" value={data.draftCount} hint="Built, not yet issued" icon={<FileText className="h-4 w-4" />} />
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" size="sm" onClick={() => navigate("/account/admin/billing/projects")}>
              {data.projects.billingOn} projects billing · {data.projects.billingOff} off · {data.projects.notConfigured} not set up
            </Button>
            {data.draftCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate("/account/admin/billing/invoices?status=draft")}>
                Review {data.draftCount} draft{data.draftCount === 1 ? "" : "s"}
              </Button>
            )}
            {data.overdueCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate("/account/admin/billing/invoices?status=overdue")}>
                Chase {data.overdueCount} overdue
              </Button>
            )}
          </div>

          <ExpectedFeesCard />
        </>
      )}

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run month end</DialogTitle>
            <DialogDescription>
              Builds one draft invoice per project with every fee still unbilled up to the end of the month. Nothing is
              sent — you review and issue each draft.
            </DialogDescription>
          </DialogHeader>
          {result ? (
            <div className="space-y-3 text-sm max-h-[320px] overflow-y-auto">
              <p className="text-foreground">{result.built.length} draft{result.built.length === 1 ? "" : "s"} built</p>
              {result.built.map((b) => (
                <div key={b.projectId} className="flex justify-between text-muted-foreground">
                  <span>{b.projectName}</span>
                  <span className="tabular-nums">{money(b.totalAmount)}</span>
                </div>
              ))}
              {[...result.failed, ...result.skipped].length > 0 && (
                <p className="text-foreground pt-2">Not built</p>
              )}
              {[...result.failed, ...result.skipped].map((s) => (
                <p key={s.projectId} className="text-xs text-muted-foreground">
                  <span className="text-foreground">{s.projectName}</span> — {s.reason}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Month</label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            {result ? (
              <Button size="sm" onClick={() => { setRunOpen(false); navigate("/account/admin/billing/invoices?status=draft"); }}>
                Review drafts
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setRunOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={runMonthEnd} disabled={running || !month}>
                  {running ? "Building…" : "Build drafts"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default BillingOverview;

/**
 * Admin Panel → System health: is the platform actually working?
 *
 * Every check comes from auth/admin-panel/health/ (user/views_admin_ops.py)
 * as ok / warning / critical with a sentence, so a background job that has
 * stopped reads as stopped — the risk alert check went silent for weeks
 * once, and an empty table looked exactly like "no risks".
 *
 * State is never colour alone: each card carries an icon and a word.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertOctagon, AlertTriangle, CircleCheck, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { type AdminHealthCheck, getAdminHealth } from "@/lib/Api";
import { AdminPage, ErrorNotice, TD, TD_NUM, TH, TH_NUM } from "./adminUi";

const STATE = {
  ok: { icon: CircleCheck, label: "OK", variant: "success" as const, tone: "text-green-700" },
  warning: { icon: AlertTriangle, label: "Check", variant: "warning" as const, tone: "text-amber-700" },
  critical: { icon: AlertOctagon, label: "Critical", variant: "danger" as const, tone: "text-red-700" },
};

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

function CheckCard({ check }: { check: AdminHealthCheck }) {
  const s = STATE[check.state];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <s.icon className={`h-5 w-5 mt-0.5 shrink-0 ${s.tone}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm text-foreground">{check.title}</h3>
            <Badge variant={s.variant} className="font-normal">{s.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{check.summary}</p>
          {check.detail.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground list-disc pl-4">
              {check.detail.slice(0, 6).map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Table({ title, empty, head, rows }: {
  title: string; empty: string; head: { label: string; numeric?: boolean }[]; rows: React.ReactNode[][];
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <h2 className="px-5 py-3 border-b border-border text-sm text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">{head.map((h) => <th key={h.label} className={h.numeric ? TH_NUM : TH}>{h.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 align-top">
                  {r.map((cell, j) => <td key={j} className={head[j].numeric ? TD_NUM : `${TD} whitespace-normal`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const AdminHealth = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["adminHealth"], queryFn: getAdminHealth });

  const critical = data?.checks.filter((c) => c.state === "critical").length ?? 0;
  const warnings = data?.checks.filter((c) => c.state === "warning").length ?? 0;
  const overall = critical ? STATE.critical : warnings ? STATE.warning : STATE.ok;

  return (
    <AdminPage title="System health" description="Whether the platform's background work is running, messages are being delivered, and what AI is costing.">
      {isLoading ? (
        <div className="flex justify-center py-16"><AwesomeLoader message="Checking" /></div>
      ) : isError || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            critical ? "border-red-200 bg-red-50" : warnings ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
          }`}>
            <div className="flex items-center gap-3">
              <overall.icon className={`h-5 w-5 ${overall.tone}`} aria-hidden="true" />
              <div>
                <p className="text-sm text-foreground">
                  {critical || warnings
                    ? `${critical + warnings} of ${data.checks.length} checks need attention`
                    : "All systems working"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Checked {ago(data.checkedAt)} · {data.activeUsersToday} user{data.activeUsersToday === 1 ? "" : "s"} active today
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />Check again
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...data.checks]
              .sort((a, b) => ["critical", "warning", "ok"].indexOf(a.state) - ["critical", "warning", "ok"].indexOf(b.state))
              .map((c) => <CheckCard key={c.key} check={c} />)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Table
              title="AI usage by feature (30 days)"
              empty="No AI calls in the last 30 days."
              head={[{ label: "Feature" }, { label: "Calls", numeric: true }, { label: "Errors", numeric: true }, { label: "Cost (USD)", numeric: true }]}
              rows={data.aiByFeature.map((r) => [r.feature.replace(/_/g, " "), r.calls, r.errors, `$${Number(r.costUsd).toFixed(2)}`])}
            />
            <Table
              title="Projects using the most AI (30 days)"
              empty="No project-linked AI calls in the last 30 days."
              head={[{ label: "Project" }, { label: "Calls", numeric: true }, { label: "Cost (USD)", numeric: true }]}
              rows={data.aiTopProjects.map((r) => [r.project, r.calls, `$${Number(r.costUsd).toFixed(2)}`])}
            />
            <Table
              title="Recent delivery failures"
              empty="No email or push failures on record."
              head={[{ label: "When" }, { label: "Channel" }, { label: "To" }, { label: "Error" }]}
              rows={data.recentDeliveryFailures.map((f) => [ago(f.at), f.channel, f.target, f.error || "—"])}
            />
            <Table
              title="Recent AI job failures"
              empty="No background AI job has failed."
              head={[{ label: "When" }, { label: "Job" }, { label: "Error" }]}
              rows={data.recentJobFailures.map((f) => [ago(f.at), f.kind, f.error || "—"])}
            />
          </div>
        </>
      )}
    </AdminPage>
  );
};

export default AdminHealth;

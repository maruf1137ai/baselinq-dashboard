/**
 * Admin panel landing page: how the platform is growing and being used, what
 * needs attention, and who and what is newest.
 *
 * Figures come from auth/admin-panel/stats/ (user/views_admin_panel.py) for
 * the chosen range, beside the same-length range before it; the newest users
 * and projects from auth/admin-panel/overview/.
 *
 * Layout, top to bottom: six headline figures, each with its trend and a
 * sparkline; one large trend chart (switchable) beside what needs attention;
 * compact panels for activity, revenue and AI usage — one row per measure, so
 * a quiet period reads as a quiet row rather than an empty chart; then the
 * latest admin actions and the newest users and projects.
 *
 * Built from the app's own system (BRAND-GUIDELINES.md): rounded-xl cards on
 * bg-card with a hairline border, brand purple as the only accent, green/red
 * only for direction of change (always with an arrow and a sign, never colour
 * alone), text-xs/text-sm with two weights.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  FileSignature,
  FileText,
  FolderOpen,
  Info,
  ListChecks,
  Minus,
  Receipt,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  type AdminAttentionItem,
  type AdminKpi,
  type AdminStats,
  type AdminStatsBucket,
  type AdminStatsRange,
  getAdminOverview,
  getAdminStats,
} from "@/lib/Api";
import { money } from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, formatDate } from "./adminUi";
import { Sparkline, TrendChart, type TrendPoint } from "./adminCharts";
import { Initials, describeAuditAction } from "./adminManage";

const RANGES: { key: AdminStatsRange; label: string; long: string }[] = [
  { key: "7d", label: "7D", long: "7 days" },
  { key: "30d", label: "30D", long: "30 days" },
  { key: "90d", label: "90D", long: "90 days" },
  { key: "12m", label: "12M", long: "12 months" },
];

/** "▲ 12% vs previous 30 days" — the words a screen reader and a tooltip get. */
export function describeChange(current: number, previous: number, against: string): string {
  if (current === previous) return `No change vs ${against}`;
  if (previous === 0) return `▲ ${current.toLocaleString()} vs none in the ${against}`;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs ${against}`;
}

/** Direction of change as a badge: arrow + sign, colour only as a third cue. */
export function TrendBadge({ current, previous, against }: { current: number; previous: number; against: string }) {
  const text = describeChange(current, previous, against);
  if (current === previous) {
    return (
      <Badge variant="neutral" className="gap-1 font-normal" title={text}>
        <Minus className="h-3 w-3" aria-hidden="true" /> 0%
        <span className="sr-only">{text}</span>
      </Badge>
    );
  }
  const up = current > previous;
  const label = previous === 0 ? `+${current.toLocaleString()}` : `${up ? "+" : "−"}${Math.abs(Math.round(((current - previous) / previous) * 100))}%`;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={up ? "success" : "danger"} className="gap-0.5 font-normal tabular-nums" title={text}>
      <Icon className="h-3 w-3" aria-hidden="true" /> {label}
      <span className="sr-only">{text}</span>
    </Badge>
  );
}

function Panel({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 className="text-sm text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

/** For a running total: how many were added this period, never a % of a different number. */
export function AddedBadge({ added, previous, against }: { added: number; previous: number; against: string }) {
  const text = `${added.toLocaleString()} added; ${previous.toLocaleString()} in the ${against}`;
  return (
    <Badge variant={added > 0 ? "success" : "neutral"} className="gap-0.5 font-normal tabular-nums" title={text}>
      {added > 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
      {added > 0 ? `+${added.toLocaleString()}` : "0"}
      <span className="sr-only">{text}</span>
    </Badge>
  );
}

function KpiCard({ icon, label, value, sub, current, previous, against, spark, sparkVariant = "area", total = false }: {
  icon: LucideIcon; label: string; value: string; sub: string; current: number; previous: number;
  against: string; spark: number[]; sparkVariant?: "area" | "bars";
  /** A running total: the badge counts what was added, not a % change. */
  total?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <IconChip icon={icon} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {total ? (
          <AddedBadge added={current} previous={previous} against={against} />
        ) : (
          <TrendBadge current={current} previous={previous} against={against} />
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-normal tracking-tight text-foreground tabular-nums truncate">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="w-24 shrink-0">
          <Sparkline values={spark} variant={sparkVariant} />
        </div>
      </div>
    </div>
  );
}

const SEVERITY = {
  critical: { icon: AlertOctagon, label: "Critical", variant: "danger" as const },
  warning: { icon: AlertTriangle, label: "Check", variant: "warning" as const },
  info: { icon: Info, label: "Info", variant: "neutral" as const },
};

function AttentionPanel({ items }: { items: AdminAttentionItem[] }) {
  return (
    <Panel
      title="Needs attention"
      subtitle={items.length ? `${items.length} item${items.length === 1 ? "" : "s"}, most urgent first` : undefined}
      className="flex flex-col"
    >
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 pb-8 pt-4 text-center">
          <CircleCheck className="h-6 w-6 text-green-700" aria-hidden="true" />
          <p className="text-sm text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground">Nothing needs attention right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border overflow-y-auto lg:max-h-[300px]">
          {items.map((item) => {
            const s = SEVERITY[item.severity];
            const body = (
              <>
                <s.icon
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    item.severity === "critical" ? "text-red-700" : item.severity === "warning" ? "text-amber-700" : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground leading-snug">{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
                  <Badge variant={s.variant} className="mt-1.5 font-normal">{s.label}</Badge>
                </div>
                {item.key !== "risk_sweep_stale" && (
                  <span className="text-sm text-foreground tabular-nums shrink-0">{item.count}</span>
                )}
                {item.link && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />}
              </>
            );
            return (
              <li key={item.key}>
                {item.link ? (
                  <Link to={item.link} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">{body}</Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

type Series = AdminStatsBucket[];
const col = (series: Series, key: keyof AdminStatsBucket) => series.map((b) => Number(b[key]) || 0);
const sum = (xs: number[]) => xs.reduce((t, v) => t + v, 0);

/** A running total over the range, ending at `total` — growth as a line, not a spike. */
function runningTotal(series: Series, key: keyof AdminStatsBucket, total: number): number[] {
  const steps = col(series, key);
  let acc = total - sum(steps);
  return steps.map((v) => (acc += v));
}

function MeasureRow({ icon, label, value, spark, sparkVariant = "bars" }: {
  icon: LucideIcon; label: string; value: string; spark: number[]; sparkVariant?: "area" | "bars";
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <IconChip icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground tabular-nums">{value}</p>
      </div>
      <div className="w-28 shrink-0">
        <Sparkline values={spark} variant={sparkVariant} height={28} />
      </div>
    </li>
  );
}


const HERO = [
  { key: "users", label: "Total users", tab: "Users" },
  { key: "active", label: "Active users", tab: "Active" },
  { key: "projects", label: "Total projects", tab: "Projects" },
  { key: "fees", label: "Fees earned", tab: "Fees" },
] as const;
type HeroKey = (typeof HERO)[number]["key"];

const AdminDashboard = () => {
  const [range, setRange] = useState<AdminStatsRange>("30d");
  const [hero, setHero] = useState<HeroKey>("users");
  const against = `previous ${RANGES.find((r) => r.key === range)!.long}`;
  const rangeLong = RANGES.find((r) => r.key === range)!.long;

  const stats = useQuery({ queryKey: ["adminStats", range], queryFn: () => getAdminStats(range) });
  const overview = useQuery({ queryKey: ["adminOverview"], queryFn: getAdminOverview });
  const s: AdminStats | undefined = stats.data;

  const heroData = useMemo(() => {
    if (!s) return null;
    const series = s.series;
    const pts = (values: number[]): TrendPoint[] => series.map((b, i) => ({ start: b.start, value: values[i] }));
    const feesRunning = (() => {
      let acc = 0;
      return col(series, "feesEarned").map((v) => (acc += v));
    })();
    return {
      users: { points: pts(runningTotal(series, "newUsers", s.kpis.users.total ?? 0)), fmt: (n: number) => Math.round(n).toLocaleString() },
      active: { points: pts(col(series, "activeUsers")), fmt: (n: number) => Math.round(n).toLocaleString() },
      projects: { points: pts(runningTotal(series, "newProjects", s.kpis.projects.total ?? 0)), fmt: (n: number) => Math.round(n).toLocaleString() },
      fees: { points: pts(feesRunning), fmt: (n: number) => money(n) },
    };
  }, [s]);

  const k = (x: AdminKpi<number | string>) => ({ current: Number(x.current), previous: Number(x.previous) });

  return (
    <AdminPage title="Admin Panel" description="How the platform is growing and being used, and what needs attention.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {s ? `${formatDate(s.start)} – ${formatDate(s.end)} · compared with the ${against}` : " "}
        </p>
        <Tabs value={range} onValueChange={(v) => setRange(v as AdminStatsRange)}>
          <TabsList aria-label="Time range">
            {RANGES.map((r) => (
              <TabsTrigger key={r.key} value={r.key} aria-label={r.long} className="px-3">
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {stats.isLoading ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : stats.isError || !s || !heroData ? (
        <ErrorNotice error={stats.error} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard icon={Users} label="Users" value={(s.kpis.users.total ?? 0).toLocaleString()}
              sub={`${s.kpis.users.previous} joined in the ${against}`} {...k(s.kpis.users)} against={against} total
              spark={runningTotal(s.series, "newUsers", s.kpis.users.total ?? 0)} />
            <KpiCard icon={UserCheck} label="Active users" value={s.kpis.activeUsers.current.toLocaleString()}
              sub={`Used the app in ${rangeLong}`} {...k(s.kpis.activeUsers)} against={against}
              spark={col(s.series, "activeUsers")} sparkVariant="bars" />
            <KpiCard icon={FolderOpen} label="Projects" value={(s.kpis.projects.total ?? 0).toLocaleString()}
              sub={`${s.kpis.projects.previous} created in the ${against}`} {...k(s.kpis.projects)} against={against} total
              spark={runningTotal(s.series, "newProjects", s.kpis.projects.total ?? 0)} />
            <KpiCard icon={Building2} label="Companies" value={(s.kpis.companies.total ?? 0).toLocaleString()}
              sub={`${s.kpis.companies.previous} added in the ${against}`} {...k(s.kpis.companies)} against={against} total
              spark={[]} />
            <KpiCard icon={Receipt} label="Fees earned" value={money(s.kpis.feesEarned.current)}
              sub="Platform fees incl. VAT" {...k(s.kpis.feesEarned)} against={against}
              spark={col(s.series, "feesEarned")} sparkVariant="bars" />
            <KpiCard icon={Wallet} label="Fees paid" value={money(s.kpis.feesPaid.current)}
              sub="Invoices marked paid" {...k(s.kpis.feesPaid)} against={against}
              spark={col(s.series, "feesPaid")} sparkVariant="bars" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title={HERO.find((h) => h.key === hero)!.label}
              subtitle={hero === "active" ? `People who used the app, per ${s.bucket}` : `Running total over ${rangeLong}`}
              className="lg:col-span-2"
              action={
                <Tabs value={hero} onValueChange={(v) => setHero(v as HeroKey)}>
                  <TabsList aria-label="Chart measure" className="h-8">
                    {HERO.map((h) => (
                      <TabsTrigger key={h.key} value={h.key} aria-label={h.label} className="px-2.5 text-xs">{h.tab}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              }
            >
              <div className="px-3 pb-4">
                <TrendChart
                  label={HERO.find((h) => h.key === hero)!.label}
                  points={heroData[hero].points}
                  kind={s.bucket}
                  formatValue={heroData[hero].fmt}
                  formatAxis={hero === "fees" ? (n) => `R${n >= 1000 ? `${Math.round(n / 1000)}k` : Math.round(n)}` : heroData[hero].fmt}
                />
              </div>
            </Panel>
            <AttentionPanel items={s.attention} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Platform activity" subtitle={`Created across every project in ${rangeLong}`}>
              <ul className="divide-y divide-border border-t border-border">
                <MeasureRow icon={FileSignature} label="Payment certificates" value={sum(col(s.series, "certificates")).toLocaleString()} spark={col(s.series, "certificates")} />
                <MeasureRow icon={FileText} label="Variation orders" value={sum(col(s.series, "variations")).toLocaleString()} spark={col(s.series, "variations")} />
                <MeasureRow icon={ListChecks} label="Tasks" value={sum(col(s.series, "tasks")).toLocaleString()} spark={col(s.series, "tasks")} />
                <MeasureRow icon={FolderOpen} label="Documents" value={sum(col(s.series, "documents")).toLocaleString()} spark={col(s.series, "documents")} />
                <MeasureRow icon={CalendarDays} label="Meetings" value={sum(col(s.series, "meetings")).toLocaleString()} spark={col(s.series, "meetings")} />
              </ul>
            </Panel>

            <Panel title="Revenue" subtitle={`Platform fees incl. 15% VAT, ${rangeLong}`}
              action={<Link to="/account/admin/billing" className="text-xs text-primary hover:underline">Billing</Link>}>
              <ul className="divide-y divide-border border-t border-border">
                <MeasureRow icon={Receipt} label="Earned" value={money(s.kpis.feesEarned.current)} spark={col(s.series, "feesEarned")} />
                <MeasureRow icon={Wallet} label="Paid" value={money(s.kpis.feesPaid.current)} spark={col(s.series, "feesPaid")} />
              </ul>
            </Panel>

            <Panel title="AI usage" subtitle={`Calls to AI models, ${rangeLong}`}>
              <ul className="divide-y divide-border border-t border-border">
                <MeasureRow icon={Bot} label="AI calls" value={sum(col(s.series, "aiCalls")).toLocaleString()} spark={col(s.series, "aiCalls")} />
                <MeasureRow icon={Receipt} label="AI cost" value={`$${sum(col(s.series, "aiCostUsd")).toFixed(2)}`} spark={col(s.series, "aiCostUsd")} />
              </ul>
            </Panel>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Recent admin actions" subtitle="Changes made from the admin panel">
          {!s?.recentAdminActions.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No admin actions recorded yet.</p>
          ) : (
            <ol className="px-5 pb-4 space-y-3">
              {s.recentAdminActions.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {a.actor || "Someone"} <span className="text-muted-foreground">{describeAuditAction(a.action)}</span> {a.targetLabel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Newest users" action={<Link to="/account/admin/users" className="text-xs text-primary hover:underline">View all</Link>}>
          <ul className="divide-y divide-border border-t border-border">
            {(overview.data?.recentUsers ?? []).slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                <Initials name={u.name || u.email} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">
                    {u.name || u.email}
                    {u.isSuperuser && <Badge variant="outline" className="ml-2 font-normal">Superuser</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.organization || u.email}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(u.dateJoined)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Newest projects" action={<Link to="/account/admin/projects" className="text-xs text-primary hover:underline">View all</Link>}>
          {overview.data && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-3">
              {Object.entries(overview.data.projects.byStatus).filter(([, n]) => n > 0).map(([status, n]) => (
                <Badge key={status} variant="outline" className="font-normal">{status} · {n}</Badge>
              ))}
            </div>
          )}
          <ul className="divide-y divide-border border-t border-border">
            {(overview.data?.recentProjects ?? []).slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                <IconChip icon={FolderOpen} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.status} · {p.createdBy || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminPage>
  );
};

export default AdminDashboard;

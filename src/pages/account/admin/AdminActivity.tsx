/**
 * Admin Panel → Activity: one card per Baselinq staff member or superuser —
 * when each was last here and how much they changed. Clicking a card opens
 * that person's own page (AdminActivityDetail) with every change they made
 * from the admin panel.
 *
 * The log is append-only on the server (user/models.py AdminAuditLog); these
 * pages only read it.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { type AdminStaffMember, getAdminStaff } from "@/lib/Api";
import { AdminPage, ErrorNotice, formatDate } from "./adminUi";
import { Initials } from "./adminManage";

export const ago = (iso: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "Never");
/** "4 Nov 2026, 14:32" — the exact moment, in the viewer's time zone. */
export const stamp = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");

/** One figure on a staff card: a label, a value, and an optional second line. */
function CardStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground tabular-nums truncate" title={sub ? `${value} · ${sub}` : value}>{value}</dd>
      {sub && <dd className="text-[11px] text-muted-foreground truncate">{sub}</dd>}
    </div>
  );
}

/**
 * The inside of a staff card — who they are, then four figures. `wide` lays
 * the figures out in one row for the detail page's header.
 */
export function StaffSummary({ s, wide = false }: { s: AdminStaffMember; wide?: boolean }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <Initials name={s.name || s.email} className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground truncate" title={s.name || s.email}>{s.name || s.email}</p>
          {s.name && <p className="text-xs text-muted-foreground truncate" title={s.email}>{s.email}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant={s.isSuperuser ? "info" : "outline"} className="font-normal">
              {s.isSuperuser ? "Superuser" : "Staff"}
            </Badge>
            {!s.isActive && <Badge variant="neutral" className="font-normal">Deactivated</Badge>}
          </div>
        </div>
      </div>
      <dl className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 ${wide ? "md:grid-cols-4" : ""}`}>
        <CardStat label="Last sign-in" value={s.lastLogin ? stamp(s.lastLogin) : "Never"} sub={s.lastLogin ? ago(s.lastLogin) : undefined} />
        <CardStat label="Last active" value={s.lastActiveOn ? formatDate(s.lastActiveOn) : "—"} />
        <CardStat label="Changes, last 30 days" value={s.actionsLast30Days.toLocaleString()} />
        <CardStat label="Last change" value={s.lastActionAt ? stamp(s.lastActionAt) : "—"} sub={s.lastActionAt ? ago(s.lastActionAt) : undefined} />
      </dl>
    </>
  );
}

const AdminActivity = () => {
  const staff = useQuery({ queryKey: ["adminStaff"], queryFn: getAdminStaff });

  return (
    <AdminPage title="Activity" description="Baselinq's own people — when each was last here and how much they changed. Open a card to see everything that person did.">
      {staff.isLoading ? (
        <div className="flex justify-center py-10"><AwesomeLoader message="Loading" /></div>
      ) : staff.isError || !staff.data ? (
        <ErrorNotice error={staff.error} />
      ) : staff.data.results.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">No staff or superusers yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {staff.data.results.map((s) => (
            <Link
              key={s.id}
              to={`/account/admin/activity/${s.id}`}
              title={`See ${s.name || s.email}'s activity`}
              className={`block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                s.isActive ? "" : "opacity-60"
              }`}
            >
              <StaffSummary s={s} />
            </Link>
          ))}
        </div>
      )}
    </AdminPage>
  );
};

export default AdminActivity;

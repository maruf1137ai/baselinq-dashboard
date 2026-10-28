import { DashboardLayout } from "@/components/DashboardLayout";
import {
  OrderStatus,
  VariationOrdersTable,
  VariationOrder,
} from "@/components/finance/VariationOrdersTable";
import React, { useEffect, useMemo, useState } from "react";
import CostLadger from "@/components/finance/costLadger";
import PaymentCertificate from "@/components/finance/paymentCertificate";
import PlatformFees from "@/components/finance/platformFees";
import useFetchAllPages from "@/hooks/useFetchAllPages";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermission } from "@/hooks/usePermission";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { findByDeepLinkId, resolveTabParam } from "@/lib/deepLink";
import { markSurfaceNotificationsRead } from "@/lib/markNotificationsRead";
import { useFinanceUnreadNotifications } from "@/hooks/useFinanceUnreadNotifications";
import { HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceToolbar } from "@/components/finance/FinanceToolbar";

// The VO's own real status (`item.task.status`), NOT the wrapping Task's
// kanban column (`item.status` — todo/in review/done, which a seed/demo
// script or an unrelated board move can set with no regard for the VO's
// actual commercial state). See VariationOrdersTable.tsx's OrderStatus for
// why the distinction matters. Falls back to Draft rather than guessing at
// one of the "further along" states for a value it doesn't recognise.
const mapStatus = (status: string | undefined | null): OrderStatus => {
  const known = Object.values(OrderStatus) as string[];
  return known.includes(status || "") ? (status as OrderStatus) : OrderStatus.Draft;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
};

const Finance = () => {
  const { canViewFinance } = usePermissions();

  const selectedProjectId =
    parseInt(localStorage.getItem("selectedProjectId") || "0") || null;

  // Platform Fees is the EMPLOYER'S BILL from Baselinq. It is not project
  // cost — it is what this project's employer owes us, broken down to the
  // certificate and variation it arose from. A contractor holding
  // `finance.view` should not be reading it.
  //
  // `finance.approve_payment` is the closest existing code: it is the final
  // sign-off on payment certificates, so it sits with the employer/PA side
  // rather than with anyone who merely has read access to Finance.
  //
  // TODO(security): this is a CLIENT-SIDE GATE ONLY and must not be mistaken
  // for access control.
  //   1. `GET /api/cost-ledger/fees/` is `IsAuthenticated` + project
  //      membership. Any project member can still read the employer's bill
  //      directly from the API — hiding the tab hides the UI, not the data.
  //      Server-side enforcement on that action is still required.
  //   2. `finance.approve_payment` is being borrowed, not chosen. It means
  //      "may sign off a payment certificate", which is adjacent to but not
  //      the same as "may see what Baselinq bills the employer". A dedicated
  //      `finance.platform_fee.view` code should be added to the permission
  //      matrix and enforced on both sides, and this gate switched to it.
  const canViewPlatformFees = usePermission("finance.approve_payment", selectedProjectId);

  const visibleTabs = canViewFinance
    ? [
      "Cost Ledger",
      "Payment Certificates",
      "Variation Orders",
      ...(canViewPlatformFees ? ["Platform Fees"] : []),
    ]
    : [];

  const navigate = useNavigate();

  // ── Deep links ────────────────────────────────────────────────────────────
  // /finance?tab=<tabKey>&pc=<paymentCertificateId>
  // /finance?tab=<tabKey>&vo=<variationOrderId>
  //
  // Same pattern as Project Health: useSearchParams drives the existing state
  // and the choice is written back, so the URL stays shareable and survives a
  // reload. No router, no store, no second selection mechanism.
  //
  // The tab is DERIVED from the URL rather than seeded into useState once.
  // `visibleTabs` is not stable on first paint — usePermission returns true
  // while the effective-permissions payload is in flight, so "Platform Fees"
  // can appear a beat late. A useState initialiser would capture the tab list
  // as it stood at mount and permanently ignore a valid ?tab= for a tab that
  // had not appeared yet. Deriving keeps one source of truth and self-corrects.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTabParam(searchParams.get("tab"), visibleTabs);

  // NOTE ON PERMISSIONS: `visibleTabs` is computed above from canViewFinance
  // and canViewPlatformFees WITHOUT reference to the URL. A ?tab= value can
  // only ever pick a member of that already-filtered list, so following a
  // ?tab=Payment Certificates&pc=… link as a viewer without finance.view
  // yields visibleTabs === [] and activeTab === "" — the same refusal as
  // navigating here normally. The parameter is not a way past the gate.
  // Opening the Payment Certificates tab shows a table of every certificate
  // and the state it is in, which is exactly what its notifications say — so
  // viewing the tab clears the whole "finance" surface, not only the one
  // certificate a ?pc= deep link happened to point at. Previously nothing
  // cleared unless you arrived through that deep link, so certificates read
  // in the normal way stayed counted forever.
  //
  // Gated on canViewFinance so a user who cannot see the table cannot clear
  // notifications about it. `activeTab` is already permission-derived, but
  // it is briefly "" while permissions resolve, hence the explicit check.
  const onPaymentCertificatesTab = activeTab === "Payment Certificates";
  useEffect(() => {
    if (!canViewFinance || !onPaymentCertificatesTab) return;
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) return;
    void markSurfaceNotificationsRead("finance", projectId);
  }, [canViewFinance, onPaymentCertificatesTab]);

  const chooseTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    // The record parameters belong to the tab that was being viewed. Carrying
    // them across to another tab would leave a selection pointing at something
    // no longer on screen.
    params.delete("pc");
    params.delete("vo");
    setSearchParams(params, { replace: true });
  };

  // Selection is HIGHLIGHT-ONLY now — set from a `?vo=` deep link, never
  // from an in-page edit/delete action (there is none; see
  // VariationOrdersTable.tsx's HEADERS comment for why).
  const [selectedOrder, setSelectedOrder] = useState<VariationOrder | null>(null);
  const [voSearch, setVoSearch] = useState("");

  const projectId = localStorage.getItem("selectedProjectId") || "";

  // Same hook PaymentCertificate calls for its per-row badges — shares that
  // query's cache entry (no extra request), just rolled up here into one
  // number so the tab strip can show WHICH tab an unread item is on. Only
  // Payment Certificates gets a count: the "finance" notification surface is
  // generated exclusively by PC lifecycle events today (see
  // backend/notification/surfaces.py) — Variation Orders' notifications are
  // typed under the "tasks" surface and already counted in the Tasks sidebar
  // badge, and Cost Ledger has no notification type at all.
  const { unreadByPcId } = useFinanceUnreadNotifications(projectId);
  const pcUnreadCount = Object.values(unreadByPcId).reduce((sum, arr) => sum + arr.length, 0);

  const { data: voResponse, isLoading: isLoadingVO } = useFetchAllPages<any>(
    projectId ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    { enabled: !!projectId }
  );

  const variationOrders = useMemo((): VariationOrder[] => {
    const results = voResponse?.results || [];

    return results
      .map((item: any): VariationOrder => {
        // No fabricated fallback: when the API carries no assignee the row
        // says so rather than borrowing a real contractor's name.
        const assigneeName = item.assignedBy?.name || item.task?.createdBy?.name || null;
        const value = item.task?.grandTotal || 0;
        // Schedule impact is only shown when the record actually carries one.
        const impact = typeof item.task?.impact === "number" ? item.task.impact : null;

        return {
          // Werner rev H — read camelCase OR snake_case before
          // falling back to "VO-{taskId}" (the PK). Without this the
          // finance list shows "VO-43" while the chat/board show "VO-001".
          id: item.task?.voNumber || item.task?.vo_number || `VO-${item.taskId}`,
          taskId: String(item.taskId),
          title: item.task?.title || "-",
          value,
          status: mapStatus(item.task?.status),
          signedAt: item.task?.signedAt ?? null,
          requestedBy: assigneeName ? { name: assigneeName } : null,
          updated: formatDate(item.update_at),
          impact,
          rawTask: item.task,
        };
      });
  }, [voResponse]);

  // ?vo=<variationOrderId> selects the SAME `selectedOrder` the in-page Edit
  // click sets — one selection, two entry paths, rather than a parallel
  // highlight mechanism that could disagree with it.
  //
  // A link may name the variation by its display number ("VO-001") or by its
  // task id, because both are visible in the app and either could end up in a
  // link. It resolves ONLY against `variationOrders`, the list already on
  // screen: a deleted id, or one belonging to a project this viewer is not on,
  // simply finds nothing. Nothing is selected, nothing is filtered, and the
  // full list renders exactly as it would with no parameter — the page never
  // implies the variation was deleted when it was only never shown.
  const linkedOrder = useMemo(
    () =>
      findByDeepLinkId(searchParams.get("vo"), variationOrders, (o) => [
        o.id,
        o.taskId,
      ]),
    [searchParams, variationOrders],
  );

  useEffect(() => {
    if (linkedOrder) setSelectedOrder(linkedOrder);
  }, [linkedOrder]);

  return (
    <DashboardLayout>
      {/* DashboardLayout owns the p-6 page padding; a page is a plain
          space-y-6 wrapper, same as Project Health. */}
      <div className="space-y-6">
        <PageHeader
          title="Finance"
          reference={
            <Link
              to="/help/finance"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Who can create / submit / approve / post in Cost Ledger, Variation Orders and Payment Certificates"
            >
              <HelpCircle className="h-4 w-4" />
              Finance reference
            </Link>
          }
        />
        <div>
          <header className="border-b border-border">
            {/* role="tablist" + aria-selected so the tab strip is navigable and
                announced as tabs rather than a row of unrelated buttons.

                focus-visible is declared explicitly because these are bare
                <button>s, not the Button primitive. Without it the browser
                draws its own default outline — a blue box that belongs to no
                part of this design system and does not match the brand. */}
            <div className="flex items-center gap-2" role="tablist">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => chooseTab(tab)}
                  className={`flex items-center gap-1.5 text-sm py-3 px-6 border-b-2 -mb-px whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm ${activeTab === tab
                    ? "border-primary text-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}>
                  {tab}
                  {tab === "Payment Certificates" && pcUnreadCount > 0 && (
                    <span className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                      {pcUnreadCount > 99 ? "99+" : pcUnreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </header>

          {activeTab === "Variation Orders" && (
            <main className="pt-6 space-y-4">
              {/* One toolbar row, same shape as the other three finance tabs:
                  search grows on the left, actions right-aligned beside it. */}
              {/* No "New Variation Order" here, deliberately.

                  A variation is a commercial decision, not a spreadsheet row.
                  It has to originate as an item — normally escalated from a
                  Site Instruction — so that it carries its originating RFI and
                  SI, travels the approval flow, and is signed off. Finance is
                  a READ-OUT of approved commercial flow, never an entry point
                  for it: the cost-ledger debit and the 1% platform fee are
                  consequences of that approval, created automatically.

                  This button POSTed straight to tasks/variation-orders/ with
                  title as the only required field, no basis, no clause
                  reference, no originating instruction — and because VOForm's
                  line-item block is commented out, every variation it produced
                  was R0.00. That is precisely the "approved verbally, no legal
                  standing" failure the product exists to prevent.

                  Raise variations from the task board via + Action, or by
                  escalating an SI. */}
              <FinanceToolbar
                search={voSearch}
                onSearchChange={setVoSearch}
                placeholder="Search by VO #, title, requested by..."
              />

              {isLoadingVO ? (
                <div className="flex items-center justify-center py-20">
                  <AwesomeLoader message="Pricing variation orders" />
                </div>
              ) : (
                <VariationOrdersTable
                  orders={variationOrders}
                  search={voSearch}
                  highlightTaskId={selectedOrder?.taskId ?? null}
                  onViewDetails={(taskId) => navigate(`/tasks/${taskId}`)}
                />
              )}
            </main>
          )}
          {activeTab === "Cost Ledger" && <CostLadger />}
          {activeTab === "Payment Certificates" && (
            <PaymentCertificate certificateParam={searchParams.get("pc")} />
          )}
          {activeTab === "Platform Fees" && canViewPlatformFees && <PlatformFees />}
          {/* {activeTab === "Forecast" && <Forecast />} */}
        </div>
      </div>

      {/* The create-VO drawer is gone with its trigger, and so is the
          edit/delete Sheet+Dialog pair that used to live here — leaving
          mounted UI that nothing can open is the dead-UI pattern this page
          has just been cleared of. Variations are raised from the task
          board and move forward through their own workflow from there. */}
    </DashboardLayout>
  );
};

export default Finance;

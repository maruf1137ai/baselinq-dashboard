import { DashboardLayout } from "@/components/DashboardLayout";
import {
  OrderStatus,
  VariationOrdersTable,
  VariationOrder,
  VO_SORTS,
  VO_STATUS_OPTIONS,
  voMatchesStatus,
} from "@/components/finance/VariationOrdersTable";
import React, { useEffect, useMemo, useState } from "react";
import CostLadger from "@/components/finance/costLadger";
import PaymentCertificate from "@/components/finance/paymentCertificate";
import FinancialPositionTab from "@/components/finance/financialPositionTab";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionOr } from "@/hooks/usePermission";
import { useProjectVariations } from "@/hooks/useProjectVariations";
import { useVariationCertification } from "@/hooks/useVariationCertification";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { findByDeepLinkId, resolveTabParam } from "@/lib/deepLink";
import { formatDate } from "@/lib/dateUtils";
import { markSurfaceNotificationsRead } from "@/lib/markNotificationsRead";
import { useFinanceUnreadNotifications } from "@/hooks/useFinanceUnreadNotifications";
import { ArrowUpDown, Filter, HelpCircle, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceToolbar, ToolbarSelect } from "@/components/finance/FinanceToolbar";
import { FinanceLoadError } from "@/components/finance/FinanceLoadError";

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


/** The Financial Position summary — the first tab. */
const TAB_POSITION = "Financial Position";

/**
 * The former payments tab, now part of the Financial Position. Kept as a key so
 * shared ?tab=Payments Status links resolve there.
 */
const TAB_PAYMENTS = "Payments Status";

/**
 * Retired tab keys that still arrive in live URLs.
 *
 * `?tab=Platform Fees` and `?tab=Invoices` were shipped and shared, and
 * `?tab=invoices` — lowercase — is hard-coded in the BACKEND's invoice
 * notification links (billing/notify.py::INVOICES_LINK), which this change
 * does not touch. `resolveTabParam` normalises case, whitespace and the word
 * separator, and resolves an alias against the permission-filtered tab list
 * exactly as it resolves a direct hit, so a legacy link reaches the merged tab
 * only if the viewer may see it.
 *
 * `Payments` is here because normalisation alone would NOT carry it to
 * "Payments Status" — `normaliseTabKey` folds case and separators, not word
 * count — so without this entry every shared `?tab=Payments` link would fall
 * through to the fallback tab and quietly show the Cost Ledger instead.
 */
const LEGACY_TABS: Record<string, string> = {
  // Payments Status is now part of the Financial Position.
  Payments: TAB_POSITION,
  [TAB_PAYMENTS]: TAB_POSITION,
};

/**
 * Baselinq's own billing moved to Settings → Billing: it is Baselinq's bill to
 * its customer, not the project's money. These keys — the backend's invoice
 * notifications still link to ?tab=invoices — redirect there.
 */
const BILLING_TAB_KEYS = new Set(["baselinqbilling", "platformfees", "invoices"]);
const normaliseKey = (raw: string | null) => (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");

const Finance = () => {
  const { canViewFinance } = usePermissions();

  const selectedProjectId =
    parseInt(localStorage.getItem("selectedProjectId") || "0") || null;

  // Every tab answers to its own Roles & Permissions code, and the server
  // enforces the same codes (cost_ledger/views.py, billing/views.py):
  //
  //   finance.view                    the whole area — it is the parent
  //     ├─ Financial Position         finance.view (its payment register: finance.payments.view)
  //     ├─ Payment Certificates       finance.certificates.view
  //     ├─ Variation Orders           finance.variations.view
  //     └─ Cost Ledger                finance.cost_ledger.view
  //
  // The per-tab codes are children of finance.view, declared on the permission
  // rows themselves (`requires_code`) and enforced in
  // permissions/core.py::_compute_effective_permissions, so a child cannot
  // resolve true while its parent is false no matter what the stored grant says.
  // This page therefore only has to ask for the codes; it does not re-derive the
  // hierarchy.
  //
  // Baselinq's own billing (fees and invoices) is not here: it is Baselinq's
  // bill to its customer, not the project's money, and lives in Settings →
  // Billing beside the fee terms, gated on its own two codes and open to
  // Baselinq staff (QA BUG-06). Old ?tab= links to it redirect there.
  // Falls back to finance.view where the backend has not yet introduced the
  // per-tab codes (see usePermissionOr) — otherwise a frontend deployed ahead
  // of that migration shows nobody anything but Baselinq Billing.
  const canSeeCostLedger = usePermissionOr("finance.cost_ledger.view", "finance.view", selectedProjectId);
  const canSeeCertificates = usePermissionOr("finance.certificates.view", "finance.view", selectedProjectId);
  const canSeePayments = usePermissionOr("finance.payments.view", "finance.view", selectedProjectId);
  const canSeeVariations = usePermissionOr("finance.variations.view", "finance.view", selectedProjectId);

  // Each tab asks only for its own code. The parent is not re-checked here
  // because the SERVER already applied it: finance.cost_ledger.view and its
  // siblings resolve false whenever finance.view is false, so asking for the
  // child is asking for both. `canViewFinance` still guards the group as a
  // whole, so an area switched off produces no tabs rather than four
  // individually-denied ones.
  const visibleTabs = [
    // Payments Status sits beside the certificates it reports on: a certificate
    // is posted on one tab and chased on the next.
    ...(canViewFinance
      ? [
          // First: the client's one page about money (plan, page 5), with
          // the payment register beneath it.
          TAB_POSITION,
          ...(canSeeCertificates ? ["Payment Certificates"] : []),
          ...(canSeeVariations ? ["Variation Orders"] : []),
          ...(canSeeCostLedger ? ["Cost Ledger"] : []),
        ]
      : []),
  ];

  const navigate = useNavigate();

  // Old links to the billing tab land on Settings → Billing, where it now lives.
  const [billingParams] = useSearchParams();
  useEffect(() => {
    if (BILLING_TAB_KEYS.has(normaliseKey(billingParams.get("tab")))) {
      navigate("/settings/billing", { replace: true });
    }
  }, [billingParams, navigate]);

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
  // while the effective-permissions payload is in flight, so "Baselinq
  // Billing" can appear a beat late. A useState initialiser would capture the tab list
  // as it stood at mount and permanently ignore a valid ?tab= for a tab that
  // had not appeared yet. Deriving keeps one source of truth and self-corrects.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTabParam(searchParams.get("tab"), visibleTabs, LEGACY_TABS);

  // NOTE ON PERMISSIONS: `visibleTabs` is computed above from canViewFinance
  // and the per-tab codes WITHOUT reference to the URL. A ?tab= value can
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
  const [voStatus, setVoStatus] = useState("all");
  const [voSort, setVoSort] = useState("default");

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

  // The project's variation register — `tasks/variation-orders/`, the
  // variation records themselves. This read `tasks/tasks/?taskType=VO`, the
  // ASSIGNMENT tasks wrapping them, which the server scopes to the tasks the
  // viewer is assigned: a QS not assigned to a variation saw "No variation
  // orders yet" while Home counted three approved. Same query (and cache
  // entry) as Home's variation figures.
  const {
    rows: voRows,
    isLoading: isLoadingVO,
    isError: isVOError,
    refetch: refetchVO,
  } = useProjectVariations(projectId, canViewFinance);
  // Certified / Remaining per variation, from the certificate ledger.
  const variationCertification = useVariationCertification(projectId, canViewFinance);

  const variationOrders = useMemo((): VariationOrder[] => {
    return voRows.map((vo: any): VariationOrder => {
      // No fabricated fallback: when the API names no creator the row says so
      // rather than borrowing a real contractor's name.
      const creatorName = vo.createdBy?.name || null;
      // Schedule impact is only shown when the record actually carries one.
      const impact = typeof vo.agreedTimeConsequence === "number" ? vo.agreedTimeConsequence : null;
      // The wrapping assignment task, which /tasks/:taskId resolves against.
      const taskId = vo.task?._id ?? vo.task?.id ?? null;

      return {
        id: vo.voNumber || vo.vo_number || `VO-${vo._id}`,
        voNumber: vo.voNumber || vo.vo_number || null,
        taskId: taskId != null ? String(taskId) : "",
        title: vo.title || "-",
        // Excl. VAT, the basis of the contract sum it is added to when signed;
        // the grand total only where an older row carries no subtotal.
        value: Number(vo.subTotal ?? vo.sub_total ?? vo.grandTotal ?? 0) || 0,
        status: mapStatus(vo.status),
        signedAt: vo.signedAt ?? null,
        requestedBy: creatorName ? { name: creatorName } : null,
        // "09 Nov 2026", as every other Finance date reads; this was "09/11/26".
        updated: formatDate(vo.updatedAt, "short", "—"),
        impact,
        rawTask: vo,
      };
    });
  }, [voRows]);

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
            <div className="flex items-center gap-4">
              <Link
                to="/help/finance"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Who can create / submit / approve / post in Cost Ledger, Variation Orders and Payment Certificates"
              >
                <HelpCircle className="h-4 w-4" />
                Finance reference
              </Link>
            </div>
          }
        />
        <div>
          {/* The strip SCROLLS, as Project Health's does: five tabs at px-6
              are wider than `main` on a phone, and without an overflow
              container the surplus widened the page itself (QA BUG-25). */}
          {/* overflow-x-auto alone makes overflow-y auto too, and each tab's
              -mb-px underline sat 1px below the strip, so a vertical
              scrollbar appeared beside the tabs. The border now lives on the
              inner row (so the underline overlaps it inside the box), the
              strip never scrolls vertically, and its scrollbar is hidden —
              sideways swipe still works on a phone. */}
          <header className="overflow-x-auto overflow-y-hidden no-scrollbar">
            {/* role="tablist" + aria-selected so the tab strip is navigable and
                announced as tabs rather than a row of unrelated buttons.

                focus-visible is declared explicitly because these are bare
                <button>s, not the Button primitive. Without it the browser
                draws its own default outline — a blue box that belongs to no
                part of this design system and does not match the brand. */}
            <div className="flex items-center gap-2 min-w-max border-b border-border" role="tablist">
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
                placeholder="Search by VO #, title, raised by..."
              >
                <ToolbarSelect
                  label="Filter by status"
                  icon={Filter}
                  value={voStatus}
                  defaultValue="all"
                  onChange={setVoStatus}
                  className="w-[150px]"
                  options={[
                    { value: "all", label: "All statuses" },
                    // Only what some variation is in: no option that can only ever show nothing.
                    ...VO_STATUS_OPTIONS.filter((o) => variationOrders.some((vo) => voMatchesStatus(vo, o.value))),
                  ]}
                />
                <ToolbarSelect
                  label="Sort by"
                  icon={ArrowUpDown}
                  value={voSort}
                  defaultValue="default"
                  onChange={setVoSort}
                  className="w-[200px]"
                  options={Object.entries(VO_SORTS).map(([value, s]) => ({ value, label: s.label }))}
                />
                {(voStatus !== "all" || voSort !== "default" || voSearch) && (
                  <button
                    type="button"
                    onClick={() => { setVoStatus("all"); setVoSort("default"); setVoSearch(""); }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </FinanceToolbar>

              {isLoadingVO ? (
                <div className="flex items-center justify-center py-20">
                  <AwesomeLoader message="Loading variation orders" />
                </div>
              ) : isVOError && voRows.length === 0 ? (
                <FinanceLoadError what="The variation register" onRetry={() => refetchVO()} />
              ) : (
                <VariationOrdersTable
                  orders={variationOrders}
                  search={voSearch}
                  status={voStatus}
                  sort={voSort}
                  highlightTaskId={selectedOrder?.taskId ?? null}
                  certification={variationCertification}
                  onViewDetails={(taskId) => {
                    if (taskId) navigate(`/tasks/${taskId}`);
                  }}
                />
              )}
            </main>
          )}
          {activeTab === TAB_POSITION && canViewFinance && <FinancialPositionTab showPayments={canSeePayments} />}
          {activeTab === "Cost Ledger" && <CostLadger />}
          {activeTab === "Payment Certificates" && (
            <PaymentCertificate certificateParam={searchParams.get("pc")} />
          )}

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

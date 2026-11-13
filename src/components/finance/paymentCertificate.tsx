import React, { useEffect, useMemo, useState } from "react";
import { PaymentCertificateTable, PCEntry, PC_SORTS, PC_STATUS_OPTIONS } from "./paymentCertificateTable";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetchAllPages from "@/hooks/useFetchAllPages";
import { postData, patchData } from "@/lib/Api";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { FinanceLoadError } from "./FinanceLoadError";
import { UnverifiedNote } from "./UnverifiedMark";
import { usePermission } from "@/hooks/usePermission";
import { ArrowUpDown, Filter, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/formatCurrency";
import { FinanceToolbar, ToolbarSelect } from "./FinanceToolbar";
import { findByDeepLinkId } from "@/lib/deepLink";
import { useFinanceUnreadNotifications } from "@/hooks/useFinanceUnreadNotifications";
import useFetch from "@/hooks/useFetch";
import { formatDate } from "@/lib/dateUtils";
import { NeedsAttentionPanel, type FinancialPositionData } from "./FinancialPosition";

/** The alerts a QS or PM acts on from this tab (the server filters on them). */
const CERTIFICATE_ALERTS = [
  "CERTIFICATE_LATE",
  "VALUATION_COMING",
  "TAX_INVOICE_MISSING",
  "VARIATION_UNCERTIFIED",
  "FINANCE_SETUP_INCOMPLETE",
  "PAYMENT_UNCONFIRMED",
  "BANK_DETAILS_CHANGED",
];

function CertificateCycle({ canDraft, onDrafted }: { canDraft: boolean; onDrafted: (id: number) => void }) {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [drafting, setDrafting] = useState(false);
  // Same request as the Financial Position tab, so it is shared, not repeated.
  const { data } = useFetch<FinancialPositionData>(projectId ? `projects/${projectId}/financial-position/` : "", {
    enabled: !!projectId,
  });
  if (!data?.comingUp) return null;
  const next = data.comingUp.nextValuationDate;

  // Certificates draft themselves before the date for issue (client meeting,
  // 10 Nov 2026); this does it now. An existing certificate for the month is
  // opened rather than duplicated.
  const draftNow = async () => {
    setDrafting(true);
    try {
      const res: any = await postData({ url: `projects/${projectId}/certificates/draft-next/` });
      toast.success(res?.created ? `${res.pcNumber} drafted — value this period's work, then submit` : `${res?.pcNumber} is already drafted`);
      onDrafted(res.paymentCertificateId);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "The certificate could not be drafted.");
    } finally {
      setDrafting(false);
    }
  };
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        {next ? (
          <>
            Next date for issue <span className="font-medium text-foreground">{formatDate(next)}</span>
          </>
        ) : (
          "No certificate issue day is set for this project."
        )}
        {data.comingUp.signedVariationsAwaitingCertification.count > 0 &&
          ` · ${data.comingUp.signedVariationsAwaitingCertification.count} signed variation${
            data.comingUp.signedVariationsAwaitingCertification.count === 1 ? "" : "s"
          } to certify (${formatMoney(Number(data.comingUp.signedVariationsAwaitingCertification.remainingExclVat))} excl. VAT)`}
        {next && canDraft && (
          <button
            type="button"
            onClick={draftNow}
            disabled={drafting}
            className="ml-2 font-medium text-foreground hover:underline disabled:opacity-50"
          >
            {drafting
              ? "Drafting…"
              : `Draft the ${new Date(next).toLocaleDateString("en-ZA", { month: "long" })} certificate →`}
          </button>
        )}
      </p>
      <NeedsAttentionPanel projectId={projectId} codes={CERTIFICATE_ALERTS} />
    </div>
  );
}

interface PaymentCertificateProps {
  /** Raw `?pc=` value from /finance, or null. Resolved here rather than on the
   *  page because this is where the certificate list actually lives — an id is
   *  only ever matched against certificates already fetched and already on
   *  screen. */
  certificateParam?: string | null;
}

const PaymentCertificate = ({ certificateParam = null }: PaymentCertificateProps) => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Which certificate is being edited, or null. Reuses the same drawer as
  // "New Certificate" — see CreatePCDrawer's `editEntry` prop — rather than
  // a second form, since the backend already accepts the identical payload
  // shape on PATCH that it does on POST.
  const [editingEntry, setEditingEntry] = useState<PCEntry | null>(null);
  // Search sits in the parent toolbar alongside the action, same as the other
  // three finance tabs.
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("default");

  const { data, isLoading, isError, refetch } = useFetchAllPages<PCEntry>(
    projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
  );

  const certificates: PCEntry[] = data?.results ?? [];
  // Certificates saved before the server stored their total — see UnverifiedMark.
  const unverifiedCount = certificates.filter(
    (c) => c.totalPayable == null && (c as any).total_payable == null,
  ).length;
  const { unreadByPcId } = useFinanceUnreadNotifications(projectId);

  // Which certificate's details are open. One piece of state, shared by the
  // in-page click on a PC number and by the ?pc= deep link.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // A link may name the certificate by its numeric id or by its PC number.
  // It resolves ONLY against `certificates` — the rows this viewer's request
  // actually returned. A deleted certificate, or one on a project this user is
  // not a member of, resolves to null: nothing is selected, nothing is
  // filtered, and the tab renders precisely as it would with no parameter.
  // It never says "no certificates" to someone who was simply not shown one.
  const linkedCertificate = useMemo(
    () => findByDeepLinkId(certificateParam, certificates, (c) => [c.id, c.pcNumber]),
    [certificateParam, certificates],
  );

  useEffect(() => {
    if (linkedCertificate) setSelectedId(linkedCertificate.id);
  }, [linkedCertificate]);

  // Matches the backend's own check (_can_create_payment_certificate in
  // tasks/views.py): drafting a certificate requires finance.create_certificate
  // (see user/migrations/0038_pc_stage_permissions), not finance.approve_payment
  // or finance.edit. This used to check finance.approve_payment — correct
  // when that was the only certification permission, but too broad now that
  // creating and certifying are split: Client/Owner, Client PM and Project
  // Manager still hold finance.approve_payment (they still certify) but are
  // no longer among the roles that raise a certificate, and this button must
  // not offer them an action the server will 403.
  const projectIdNum = parseInt(projectId) || null;
  const canCreatePC = usePermission("finance.create_certificate", projectIdNum);

  return (
    // pt-6 only: the page already has DashboardLayout's p-6, so a p-6 here
    // inset this one tab from the other three.
    <main className="pt-6 space-y-4">
      {/* Where the certificate cycle stands, from the same rules that notify.
          Replaced a banner that only said certificates appear on the
          programme, in the space the QS needs for what is late. */}
      <CertificateCycle
        canDraft={!!canCreatePC}
        onDrafted={(id) => {
          refetch();
          setSelectedId(id);
        }}
      />

      <FinanceToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by PC #, period, status..."
      >
        <ToolbarSelect
          label="Filter by status"
          icon={Filter}
          value={status}
          defaultValue="all"
          onChange={setStatus}
          className="w-[150px]"
          options={[
            { value: "all", label: "All statuses" },
            // Only statuses some certificate is in: no option that can only ever show nothing.
            ...PC_STATUS_OPTIONS.filter((o) => certificates.some((c) => (c.workflowState || "draft") === o.value)),
          ]}
        />
        <ToolbarSelect
          label="Sort by"
          icon={ArrowUpDown}
          value={sort}
          defaultValue="default"
          onChange={setSort}
          className="w-[200px]"
          options={Object.entries(PC_SORTS).map(([value, s]) => ({ value, label: s.label }))}
        />
        {(status !== "all" || sort !== "default" || search) && (
          <button
            type="button"
            onClick={() => { setStatus("all"); setSort("default"); setSearch(""); }}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
        {canCreatePC && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs text-primary-foreground bg-primary hover:opacity-90 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Certificate
          </button>
        )}
      </FinanceToolbar>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <AwesomeLoader message="Loading certificates" />
        </div>
      ) : isError && !data ? (
        <FinanceLoadError what="Payment certificates" onRetry={() => refetch()} />
      ) : (
        <>
          {unverifiedCount > 0 && (
            <div className="mb-3">
              <UnverifiedNote count={unverifiedCount} />
            </div>
          )}
          <PaymentCertificateTable
            orders={certificates}
            search={search}
            status={status}
            sort={sort}
            selectedId={selectedId}
            onSelect={setSelectedId}
            unreadByPcId={unreadByPcId}
            onEditRequest={setEditingEntry}
          />
        </>
      )}

      <CreatePCDrawer
        isOpen={isCreateOpen || editingEntry !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingEntry(null);
        }}
        editEntry={editingEntry}
        projectId={projectId}
        // The failure is rethrown, not swallowed. It used to be caught into a
        // `console.error` while the drawer closed regardless, so a certificate
        // the server refused — for over-certifying a variation, say — looked
        // to the user exactly like one that had been created, minus the row.
        // The drawer now stays open on a rejection and renders the server's
        // integrity messages against the variations they came from.
        onSubmit={async (payload: CreatePCApiPayload) => {
          const created: any = await postData({
            url: "tasks/payment-certificates/",
            data: payload,
          });
          refetch();
          const warnings: string[] = Array.isArray(created?.integrityWarnings)
            ? created.integrityWarnings
            : Array.isArray(created?.integrity_warnings)
              ? created.integrity_warnings
              : [];
          const net = created?.totalPayable ?? created?.total_payable ?? created?.netAmount;
          toast.success(
            created?.pcNumber
              ? `${created.pcNumber} created${
                  typeof net === "number" ? ` — ${formatMoney(net)} payable` : ""
                }.`
              : "Payment certificate created.",
          );
          // Accepted, but the server flagged something about it — a certificate
          // that takes the project past its contract sum is allowed through
          // with a warning, and used to render as an ordinary row.
          for (const w of warnings) toast.warning(w);
          // The drawer needs the created certificate's id so it can register
          // any attached files against it.
          return created;
        }}
        // Draft-only, creator-only — the drawer only ever calls this when
        // editEntry is set, which paymentCertificateTable.tsx only offers via
        // entry.canEdit (server-computed, same rule PaymentCertificateViewSet
        // enforces on the PATCH itself — see tasks/pc_workflow.py).
        onEditSubmit={async (id, payload: CreatePCApiPayload) => {
          const updated: any = await patchData({
            url: `tasks/payment-certificates/${id}/`,
            data: payload,
          });
          refetch();
          toast.success(`${updated?.pcNumber ?? "Certificate"} updated.`);
          return updated;
        }}
      />
    </main>
  );
};

export default PaymentCertificate;

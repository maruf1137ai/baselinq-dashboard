import React, { useEffect, useMemo, useState } from "react";
import { PaymentCertificateTable, PCEntry } from "./paymentCertificateTable";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetchAllPages from "@/hooks/useFetchAllPages";
import { postData, patchData } from "@/lib/Api";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { usePermission } from "@/hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { BarChart2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/formatCurrency";
import { FinanceToolbar } from "./FinanceToolbar";
import { findByDeepLinkId } from "@/lib/deepLink";
import { useFinanceUnreadNotifications } from "@/hooks/useFinanceUnreadNotifications";

interface PaymentCertificateProps {
  /** Raw `?pc=` value from /finance, or null. Resolved here rather than on the
   *  page because this is where the certificate list actually lives — an id is
   *  only ever matched against certificates already fetched and already on
   *  screen. */
  certificateParam?: string | null;
}

const PaymentCertificate = ({ certificateParam = null }: PaymentCertificateProps) => {
  const navigate = useNavigate();
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

  const { data, isLoading, refetch } = useFetchAllPages<PCEntry>(
    projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
  );

  const certificates: PCEntry[] = data?.results ?? [];
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
      {/* Programme link banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">Payment certificates are linked to programme phases on the timeline.</span>
        </div>
        <button
          onClick={() => navigate("/programme")}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          View Programme Timeline →
        </button>
      </div>

      <FinanceToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by PC #, period, status..."
      >
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
          <AwesomeLoader message="Verifying certificates" />
        </div>
      ) : (
        <PaymentCertificateTable
          orders={certificates}
          search={search}
          selectedId={selectedId}
          onSelect={setSelectedId}
          unreadByPcId={unreadByPcId}
          onEditRequest={setEditingEntry}
        />
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
                  typeof net === "number" ? ` — ${formatZAR(net)} payable` : ""
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

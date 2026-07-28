import { DashboardLayout } from "@/components/DashboardLayout";
import {
  OrderStatus,
  VariationOrdersTable,
  VariationOrder,
} from "@/components/finance/VariationOrdersTable";
import { Button } from "@/components/ui/button";
import React, { useMemo, useState } from "react";
import CostLadger from "@/components/finance/costLadger";
import PaymentCertificate from "@/components/finance/paymentCertificate";
import PlatformFees from "@/components/finance/platformFees";
import useFetch from "@/hooks/useFetch";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermission } from "@/hooks/usePermission";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import VOForm from "@/components/header/forms/VOForm";
import { deleteData } from "@/lib/Api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceToolbar } from "@/components/finance/FinanceToolbar";
import { Plus } from "lucide-react";

const mapStatus = (status: string): OrderStatus => {
  const s = (status || "").toLowerCase();
  if (s === "done" || s === "approved" || s === "completed") return OrderStatus.Approved;
  if (s === "in review" || s === "inreview" || s === "in_review") return OrderStatus.InReview;
  return OrderStatus.Open;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
};

const Finance = () => {
  const { canViewFinance, canEditFinance } = usePermissions();
  const canEditVariationOrder = canEditFinance;

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
  const [activeTab, setActiveTab] = useState(() => visibleTabs[0] ?? "");
  const [isVOModalOpen, setIsVOModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VariationOrder | null>(null);
  const [voSearch, setVoSearch] = useState("");

  const projectId = localStorage.getItem("selectedProjectId") || "";

  const { data: voResponse, isLoading: isLoadingVO } = useFetch<{ count: number; results: any[] }>(
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
          status: mapStatus(item.status),
          requestedBy: assigneeName ? { name: assigneeName } : null,
          updated: formatDate(item.update_at),
          impact,
          rawTask: item.task,
        };
      });
  }, [voResponse]);

  const handleEdit = (order: VariationOrder) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleDelete = (order: VariationOrder) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const queryClient = useQueryClient();

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;
    try {
      await deleteData({ url: `tasks/tasks/${selectedOrder.taskId}/`, data: undefined });
      toast.success("Variation order deleted successfully");
      await queryClient.invalidateQueries({ queryKey: [`tasks/tasks/?taskType=VO&project=${projectId}`] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
    }
  };

  return (
    <DashboardLayout>
      {/* DashboardLayout owns the p-6 page padding; a page is a plain
          space-y-6 wrapper, same as Project Health. */}
      <div className="space-y-6">
        <PageHeader title="Finance" />
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
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm py-3 px-5 border-b-2 -mb-px transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm ${activeTab === tab
                    ? "border-primary text-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}>
                  {tab}
                </button>
              ))}
            </div>
          </header>

          {activeTab === "Variation Orders" && (
            <main className="pt-4 space-y-4">
              {/* One toolbar row, same shape as the other three finance tabs:
                  search grows on the left, actions right-aligned beside it. */}
              <FinanceToolbar
                search={voSearch}
                onSearchChange={setVoSearch}
                placeholder="Search by VO #, title, requested by..."
              >
                {canEditVariationOrder && (
                  <button
                    onClick={() => setIsVOModalOpen(true)}
                    className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs text-primary-foreground bg-primary hover:opacity-90 transition-all shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    New Variation Order
                  </button>
                )}
              </FinanceToolbar>

              {isLoadingVO ? (
                <div className="flex items-center justify-center py-20">
                  <AwesomeLoader message="Pricing variation orders" />
                </div>
              ) : (
                <VariationOrdersTable
                  orders={variationOrders}
                  search={voSearch}
                  onViewDetails={(taskId) => navigate(`/tasks/${taskId}`)}
                  onEdit={canEditVariationOrder ? handleEdit : undefined}
                  onDelete={canEditVariationOrder ? handleDelete : undefined}
                />
              )}
            </main>
          )}
          {activeTab === "Cost Ledger" && <CostLadger />}
          {activeTab === "Payment Certificates" && <PaymentCertificate />}
          {activeTab === "Platform Fees" && canViewPlatformFees && <PlatformFees />}
          {/* {activeTab === "Forecast" && <Forecast />} */}
        </div>
      </div>

      {/* Create VO drawer */}
      <Sheet open={canEditVariationOrder && isVOModalOpen} onOpenChange={setIsVOModalOpen}>
        <SheetContent side="right" size="lg" className="p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle>New Variation Order</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden px-6">
            <VOForm setOpen={setIsVOModalOpen} initialStatus="Draft" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit VO drawer */}
      <Sheet open={canEditVariationOrder && isEditModalOpen} onOpenChange={(open) => { setIsEditModalOpen(open); if (!open) setSelectedOrder(null); }}>
        <SheetContent side="right" size="lg" className="p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle>Edit Variation Order</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden px-6">
            {selectedOrder && (
              <VOForm
                setOpen={setIsEditModalOpen}
                initialStatus={selectedOrder.status}
                taskId={selectedOrder.taskId}
                initialData={{
                  title: selectedOrder.rawTask?.title,
                  discipline: selectedOrder.rawTask?.discipline,
                  description: selectedOrder.rawTask?.description,
                  lineItems: selectedOrder.rawTask?.lineItems,
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation modal */}
      <Dialog open={canEditVariationOrder && isDeleteModalOpen} onOpenChange={(open) => { setIsDeleteModalOpen(open); if (!open) setSelectedOrder(null); }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete Variation Order</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedOrder?.id}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => { setIsDeleteModalOpen(false); setSelectedOrder(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Finance;

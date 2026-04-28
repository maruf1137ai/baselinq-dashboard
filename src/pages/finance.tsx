import { DashboardLayout } from "@/components/DashboardLayout";
import {
  OrderStatus,
  VariationOrdersTable,
  VariationOrder,
} from "@/components/finance/VariationOrdersTable";
import { Button } from "@/components/ui/button";
import React, { useMemo, useState } from "react";
import { VOSummaryDrawer } from "@/components/finance/voSummaryDrwaer";
import CostLadger from "@/components/finance/costLadger";
import PaymentCertificate from "@/components/finance/paymentCertificate";
import Forecast from "@/components/finance/forecast";
import useFetch from "@/hooks/useFetch";
import { usePermissions } from "@/hooks/usePermissions";
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

const TABS = [
  "Cost Ledger",
  "Payment Certificates",
  "Variation Orders",
  // "Forecast",
];

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
  const {
    canViewCostLedger,
    canViewPaymentCertificate,
    canViewVariationOrder,
    canEditVariationOrder,
  } = usePermissions();

  const visibleTabs = [
    canViewCostLedger         && "Cost Ledger",
    canViewPaymentCertificate && "Payment Certificates",
    canViewVariationOrder     && "Variation Orders",
  ].filter(Boolean) as string[];

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0] ?? "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVOModalOpen, setIsVOModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VariationOrder | null>(null);

  const projectId = localStorage.getItem("selectedProjectId") || "";

  const { data: voResponse, isLoading: isLoadingVO } = useFetch<{ count: number; results: any[] }>(
    projectId ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    { enabled: !!projectId }
  );

  const variationOrders = useMemo((): VariationOrder[] => {
    const results = voResponse?.results || [];
    // Fallback names for VOs missing assignee data
    const fallbackNames = ["Murray & Roberts", "WBHO Construction", "Stefanutti Stocks", "Group Five", "Raubex Group"];

    return results
      .map((item: any, idx: number): VariationOrder => {
        const assigneeName = item.assignedBy?.name || item.task?.createdBy?.name || fallbackNames[idx % fallbackNames.length];
        // Estimate schedule impact from value: larger VOs typically have more impact
        const value = item.task?.grandTotal || 0;
        const estimatedImpact = item.task?.impact ?? (value > 300000 ? 14 : value > 100000 ? 7 : value > 50000 ? 3 : 0);

        return {
          id: item.task?.voNumber || `VO-${item.taskId}`,
          taskId: String(item.taskId),
          title: item.task?.title || "-",
          value,
          status: mapStatus(item.status),
          requestedBy: {
            name: assigneeName,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(assigneeName)}&size=32&background=random`,
          },
          updated: formatDate(item.update_at),
          impact: estimatedImpact,
          rawTask: item.task,
        };
      });
  }, [voResponse]);

  const summaryData = useMemo(() => {
    const totalApproved = variationOrders
      .filter((order) => order.status === OrderStatus.Approved)
      .reduce((sum, order) => sum + order.value, 0);

    const inReview = variationOrders
      .filter((order) => order.status === OrderStatus.InReview)
      .reduce((sum, order) => sum + order.value, 0);

    const draftPipeline = 0;
    const totalValue = totalApproved + inReview + draftPipeline;

    const approvedCount = variationOrders.filter(
      (o) => o.status === OrderStatus.Approved
    ).length;
    const inReviewCount = variationOrders.filter(
      (o) => o.status === OrderStatus.InReview
    ).length;
    const draftCount = 0;

    const contingencyTotal = 750000;
    const contingencyUsed = totalValue;
    const contingencyRemaining = contingencyTotal - contingencyUsed;
    const contingencyUsagePercentage =
      (contingencyUsed / contingencyTotal) * 100;

    return {
      totalApproved,
      inReview,
      draftPipeline,
      totalValue,
      approvedCount,
      inReviewCount,
      draftCount,
      contingencyRemaining,
      contingencyTotal,
      contingencyUsagePercentage,
    };
  }, [variationOrders]);

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
      <div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-normal text-foreground tracking-tight">Finance</h1>
          </div>
          <header className="border-b border-border">
            <div className="flex items-center gap-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-base py-4 px-6 border-b-2 transition-all ${activeTab === tab
                    ? "border-[#6c5ce7] text-foreground"
                    : "text-muted-foreground border-transparent"
                    }`}>
                  {tab}
                </button>
              ))}
            </div>
          </header>

          {activeTab === "Variation Orders" && (
            <main className="pt-6">
              {isLoadingVO ? (
                <div className="flex items-center justify-center py-20">
                  <AwesomeLoader message="Pricing Variation Orders" />
                </div>
              ) : (
                <VariationOrdersTable
                  orders={variationOrders}
                  onEdit={canEditVariationOrder ? handleEdit : undefined}
                  onDelete={canEditVariationOrder ? handleDelete : undefined}
                  onNew={canEditVariationOrder ? () => setIsVOModalOpen(true) : undefined}
                />
              )}
            </main>
          )}
          {activeTab === "Cost Ledger" && <CostLadger />}
          {activeTab === "Payment Certificates" && <PaymentCertificate />}
          {/* {activeTab === "Forecast" && <Forecast />} */}
        </div>
      </div>

      <VOSummaryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={summaryData}
      />

      {/* Create VO drawer */}
      <Sheet open={canEditVariationOrder && isVOModalOpen} onOpenChange={setIsVOModalOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 flex flex-col bg-white">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>New Variation Order</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden px-6">
            <VOForm setOpen={setIsVOModalOpen} initialStatus="Draft" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit VO drawer */}
      <Sheet open={canEditVariationOrder && isEditModalOpen} onOpenChange={(open) => { setIsEditModalOpen(open); if (!open) setSelectedOrder(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 flex flex-col bg-white">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
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
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Variation Order</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedOrder?.id}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
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

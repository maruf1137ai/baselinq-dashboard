import React, { useState } from "react";
import { PaymentCertificateTable, PCEntry } from "./paymentCertificateTable";
import { PaymentCertificateDrawer } from "./paymentCertificateDrawer";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { resolvePermissionCode } from "@/lib/roleUtils";
import { usePermission } from "@/hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { BarChart2 } from "lucide-react";

interface PCListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PCEntry[];
}

interface SummaryData {
  totalApproved: number;
  inReview: number;
  draftPipeline: number;
  totalValue: number;
  approvedCount: number;
  inReviewCount: number;
  draftCount: number;
  contingencyRemaining: number;
  contingencyTotal: number;
  contingencyUsagePercentage: number;
}

const summaryData: SummaryData = {
  totalApproved: 3657500,
  inReview: 192500,
  draftPipeline: 3465000,
  totalValue: 1748297,
  approvedCount: 3465000,
  inReviewCount: 192500,
  draftCount: 0,
  contingencyRemaining: -998297,
  contingencyTotal: 750000,
  contingencyUsagePercentage: 233.10626666666664,
};

const PaymentCertificate = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useFetch<PCListResponse>(
    projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
  );

  const certificates: PCEntry[] = data?.results ?? [];
  const { userRole } = useUserRoleStore();

  // Use permission matrix instead of hardcoded true
  const projectIdNum = parseInt(projectId) || null;
  const canCreatePC = usePermission("finance.approve_payment", projectIdNum);

  return (
    <main className="p-6">
      {/* Programme link banner */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <AwesomeLoader message="Verifying Certificates" />
        </div>
      ) : (
        <PaymentCertificateTable
          orders={certificates}
          onNew={canCreatePC ? () => setIsCreateOpen(true) : undefined}
        />
      )}

      <PaymentCertificateDrawer
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        data={summaryData}
      />

      <CreatePCDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        onSubmit={async (payload: CreatePCApiPayload) => {
          console.log("Submitting PC payload:", payload);
          try {
            await postData({
              url: "tasks/payment-certificates/",
              data: payload,
            });
            refetch();
          } catch (err) {
            console.error("Failed to create payment certificate:", err);
          }
        }}
      />
    </main>
  );
};

export default PaymentCertificate;

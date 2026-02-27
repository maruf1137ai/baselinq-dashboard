import React, { useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import { ViewSummaryIcon } from "../icons/icons";
import { PaymentCertificateTable, PCEntry } from "./paymentCertificateTable";
import { PaymentCertificateDrawer } from "./paymentCertificateDrawer";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { useUserRoleStore } from "@/store/useUserRoleStore";

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
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useFetch<PCListResponse>(
    projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
  );

  const certificates: PCEntry[] = data?.results ?? [];
  const { userRole } = useUserRoleStore();

  // Roles allowed to create PCs (matching backend)
  const allowedRoles = ["CQS", "CONTRACTS_MGR", "CPM", "CLIENT", "OWNER"];

  // Support compound roles like "Client / Owner" by splitting on " / "
  const userRoles = userRole
    ? userRole.split(/\s*\/\s*/).map((r) => r.trim().toUpperCase())
    : [];

  const canCreatePC = userRoles.some((role) => allowedRoles.includes(role));

  return (
    <main className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-base text-[#0E1C2E]">Payment Certificates</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* <button
            className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => setIsSummaryOpen(true)}>
            <ViewSummaryIcon className="w-5 h-5 mr-2 text-gray-500" />
            View Summary
          </button> */}

          {canCreatePC && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="w-5 h-5" />
              New Certificate
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          Loading...
        </div>
      ) : (
        <PaymentCertificateTable orders={certificates} />
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

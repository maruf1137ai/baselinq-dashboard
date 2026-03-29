import React, { useState } from "react";
import { PaymentCertificateTable, PCEntry } from "./paymentCertificateTable";
import { PaymentCertificateDrawer } from "./paymentCertificateDrawer";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { AwesomeLoader } from "../commons/AwesomeLoader";

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

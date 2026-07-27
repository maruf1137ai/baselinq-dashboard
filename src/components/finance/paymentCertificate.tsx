import React, { useState } from "react";
import { PaymentCertificateTable, PCEntry } from "./paymentCertificateTable";
import { CreatePCDrawer, CreatePCApiPayload } from "./createPCDrawer";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { usePermission } from "@/hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { BarChart2 } from "lucide-react";

interface PCListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PCEntry[];
}

const PaymentCertificate = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useFetch<PCListResponse>(
    projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
  );

  const certificates: PCEntry[] = data?.results ?? [];

  // Drafting a certificate is an edit action. `finance.approve_payment` is the
  // separate final sign-off and must not double as permission to create.
  const projectIdNum = parseInt(projectId) || null;
  const canCreatePC = usePermission("finance.edit", projectIdNum);

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
          <AwesomeLoader message="Verifying certificates" />
        </div>
      ) : (
        <PaymentCertificateTable
          orders={certificates}
          onNew={canCreatePC ? () => setIsCreateOpen(true) : undefined}
        />
      )}

      <CreatePCDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        onSubmit={async (payload: CreatePCApiPayload) => {
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

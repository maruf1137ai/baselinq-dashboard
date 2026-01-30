import React, { useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import { ViewSummaryIcon } from "../icons/icons";
import { VariationOrdersTable } from "./VariationOrdersTable";
import { paymentCertificateData } from "./data";
import { PaymentCertificateTable } from "./paymentCertificateTable";
import { PaymentCertificateDrawer } from "./paymentCertificateDrawer";

const summaryData = {
  totalApproved: "R 3,657,500",
  inReview: "R 192,500",
  draftPipeline: "R 3,465,000",
  totalValue: 1748297,
  approvedCount: "R 3,465,000",
  inReviewCount: "R 192,500",
  draftCount: "R 0",
  contingencyRemaining: -998297,
  contingencyTotal: 750000,
  contingencyUsagePercentage: 233.10626666666664,
};

const PaymentCertificate = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <main className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-base text-[#0E1C2E]">Payment Certificates</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => setIsDrawerOpen(true)}>
            <ViewSummaryIcon className="w-5 h-5 mr-2 text-gray-500" />
            View Summary
          </button>

          {/* <button className="flex items-center justify-center px-4 py-2 bg-[#6366F1] border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5]">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  New Variation Order
                </button> */}
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusIcon className="w-5 h-5" />
            New Certificate
          </Button>
        </div>
      </div>
      <PaymentCertificateTable orders={paymentCertificateData} />

      <PaymentCertificateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={summaryData}
      />
    </main>
  );
};

export default PaymentCertificate;

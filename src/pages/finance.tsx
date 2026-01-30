import { DashboardLayout } from "@/components/DashboardLayout";
import { variationOrders } from "@/components/finance/data";
import {
  OrderStatus,
  VariationOrdersTable,
} from "@/components/finance/VariationOrdersTable";
import { ViewSummaryIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { VOSummaryDrawer } from "@/components/finance/voSummaryDrwaer";
import CostLadger from "@/components/finance/costLadger";
import PaymentCertificate from "@/components/finance/paymentCertificate";
import Forecast from "@/components/finance/forecast";

const TABS = [
  "Variation Orders",
  "Cost Ledger",
  "Payment Certificates",
  "Forecast",
];

const Finance = () => {
  const [activeTab, setActiveTab] = useState("Variation Orders");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const summaryData = useMemo(() => {
    const totalApproved = variationOrders
      .filter((order) => order.status === OrderStatus.Approved)
      .reduce((sum, order) => sum + order.value, 0);

    const inReview = variationOrders
      .filter((order) => order.status === OrderStatus.InReview)
      .reduce((sum, order) => sum + order.value, 0);

    const draftPipeline = variationOrders
      .filter((order) => order.status === OrderStatus.Draft)
      .reduce((sum, order) => sum + order.value, 0);

    const totalValue = totalApproved + inReview + draftPipeline;

    const approvedCount = variationOrders.filter(
      (o) => o.status === OrderStatus.Approved
    ).length;
    const inReviewCount = variationOrders.filter(
      (o) => o.status === OrderStatus.InReview
    ).length;
    const draftCount = variationOrders.filter(
      (o) => o.status === OrderStatus.Draft
    ).length;

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
  }, []);

  return (
    <DashboardLayout padding="p-0">
      <div className="">
        <div className="max-w-7xl mx-auto">
          <header className="px-6 py-4 border-b border-gray-200">
            <nav>
              <ul className="flex items-center gap-6">
                {TABS.map((tab) => (
                  <li key={tab}>
                    <button
                      onClick={() => setActiveTab(tab)}
                      className={`py-3 text-sm font-medium transition-colors duration-200 ease-in-out border-b-2 border-transparent ${
                        activeTab === tab
                          ? "text-[#0E1C2E] border-[#8081F6]"
                          : "text-[#6B7280] hover:text-[#0E1C2E]"
                      }`}>
                      {tab}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          {activeTab === "Variation Orders" && (
            <main className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-base text-[#0E1C2E]">Variation Orders</h1>
                <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                  <button
                    className="flex items-center justify-center px-5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-base text-[#1A1F36] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                    New Variation Order
                  </Button>
                </div>
              </div>
              <VariationOrdersTable orders={variationOrders} />
            </main>
          )}
          {activeTab === "Cost Ledger" && <CostLadger />}
          {activeTab === "Payment Certificates" && <PaymentCertificate />}
          {activeTab === "Forecast" && <Forecast />}
        </div>
      </div>
      <VOSummaryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={summaryData}
      />
    </DashboardLayout>
  );
};

export default Finance;

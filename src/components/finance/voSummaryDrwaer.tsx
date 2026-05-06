import React from "react";
import { CloseIcon } from "../icons/icons";

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

interface VOSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: SummaryData;
}

import { formatZAR } from '@/lib/formatCurrency';

const formatCurrency = (value: number, sign = false) => {
  return `${sign ? "+" : ""} ${formatZAR(value)}`;
};

const SummaryRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor = "text-muted-foreground" }) => (
  <div className="flex justify-between items-center py-2 text-muted-foreground">
    <span className="text-base text-muted-foreground">{label}</span>
    <span className={`text-base ${valueColor}`}>{value}</span>
  </div>
);

export const VOSummaryDrawer: React.FC<VOSummaryDrawerProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  // console.log(data);
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title">
        <div className="flex flex-col h-full">
          <header className="flex justify-between items-center p-6 pb-0">
            <h2 id="summary-title" className="text-base text-foreground">
              VO Summary
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600">
              <CloseIcon className="w-6 h-6" />
              <span className="sr-only">Close panel</span>
            </button>
          </header>
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* VO Summary Section */}
            <section>
              <SummaryRow
                label="Total Approved"
                value={formatCurrency(data.totalApproved)}
                valueColor="text-[#16A34A]"
              />
              <SummaryRow
                label="In Review"
                value={formatCurrency(data.inReview)}
                valueColor="text-[#6c5ce7]"
              />
              <SummaryRow
                label="Draft Pipeline"
                value={formatCurrency(data.draftPipeline)}
              />
              <div className="border-t border-gray-200 my-3"></div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-base text-foreground">Total Value</span>
                <span className="text-base text-foreground">
                  {formatCurrency(data.totalValue)}
                </span>
              </div>
            </section>

            {/* Contingency Usage Section */}
            <section>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-muted-foreground">Contingency Usage</h3>
                <span className="text-sm font-medium text-gray-900">
                  {data.contingencyUsagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#6c5ce7] h-2 rounded-full"
                  style={{
                    width: `${data.contingencyUsagePercentage}%`,
                  }}></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formatCurrency(data.contingencyRemaining)} remaining of{" "}
                {formatCurrency(data.contingencyTotal)}
              </p>
              <div className="border-t border-gray-200 mt-6"></div>
            </section>

            {/* Status Breakdown Section */}
            <section>
              <h3 className="text-base text-foreground mb-3">
                Status Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-base text-muted-foreground">Approved</span>
                  </div>
                  <span className="text-base text-foreground">
                    {data.approvedCount} VOs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                    <span className="text-base text-muted-foreground">In Review</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {data.inReviewCount} VO
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-gray-400 rounded-full mr-3"></span>
                    <span className="text-base text-muted-foreground">Draft</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {data.draftCount} VOs
                  </span>
                </div>
              </div>
            </section>
          </div>
          <footer className="p-6">
            <div className="bg-muted rounded-lg p-3.5 text-sm text-muted-foreground">
              Average approval time: 12 days. VOs automatically trigger schedule
              impact assessment.
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

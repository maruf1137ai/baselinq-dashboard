import React from "react";
import { CloseIcon } from "../icons/icons";

interface FeesData {
  project: string;
  to_date: string;
  cap: string;
  progress: string;
  view_billing_ledger: boolean;
  financial_summary: {
    available: string;
    pending: string;
    committed: string;
    spent: string;
    total: string;
  };
}

interface ViewFeesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: FeesData;
}

const SummaryRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor = "text-[#0E1C2E]" }) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-base text-[#6B7280]">{label}</span>
    <span className={`text-base ${valueColor}`}>{value}</span>
  </div>
);

export const ViewFeesDrawer: React.FC<ViewFeesDrawerProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const {
    project,
    to_date,
    cap,
    progress,
    view_billing_ledger,
    financial_summary,
  } = data;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fees-summary-title">
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex justify-between items-center p-6 pb-0">
            <h2 id="fees-summary-title" className="text-base text-[#0E1C2E]">
              {project}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600">
              <CloseIcon className="w-6 h-6" />
              <span className="sr-only">Close panel</span>
            </button>
          </header>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Overview Section */}
            <section>
              <SummaryRow
                label="To Date"
                value={to_date}
                valueColor="text-[#16A34A]"
              />
              <SummaryRow label="Cap" value={cap} />
              {/* <SummaryRow
                label="Progress"
                value={progress}
                valueColor="text-[#4F46E5]"
              /> */}
              <section>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm text-[#6B7280]">Progress</h3>
                  <span className="text-sm font-medium text-gray-900">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#818CF8] h-2 rounded-full"
                    style={{
                      width: `${progress}%`,
                    }}></div>
                </div>
                {/* <p className="text-sm text-[#6B7280] mt-2">
                {formatCurrency(contingencyRemaining)} remaining of{" "}
                {formatCurrency(contingencyTotal)}
              </p> */}
              </section>
              {/* {view_billing_ledger && (
                <button className="mt-3 px-4 py-2 w-full border border-gray-300 rounded-lg text-sm text-[#0E1C2E] bg-[rgba(87,87,87,0.02)] hover:bg-gray-50 transition-all shadow-[0_0_0_1px_#CBD5E1]">
                  View Billing Ledger
                </button>
              )} */}
              <div className="border-t border-gray-200 my-4"></div>
            </section>

            {/* Financial Summary Section */}
            <section>
              <h3 className="text-base text-[#0E1C2E] mb-3">
                Financial Summary
              </h3>
              <div className="space-y-2">
                <SummaryRow
                  label="Available"
                  value={financial_summary.available}
                />
                <SummaryRow label="Pending" value={financial_summary.pending} />
                <SummaryRow
                  label="Committed"
                  value={financial_summary.committed}
                />
                <SummaryRow label="Spent" value={financial_summary.spent} />
                <div className="border-t border-gray-200 my-3"></div>
                <SummaryRow
                  label="Total"
                  value={financial_summary.total}
                  valueColor="text-[#0E1C2E]"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

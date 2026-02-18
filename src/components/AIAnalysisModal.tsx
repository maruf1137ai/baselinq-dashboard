import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { VOAnalysis } from "./AIAnalysis/VOAnalysis";
import { CPIAnalysis } from "./AIAnalysis/CPIAnalysis";
import { DCAnalysis } from "./AIAnalysis/DCAnalysis";
import { RFIAnalysis } from "./AIAnalysis/RFIAnalysis";
import { SIAnalysis } from "./AIAnalysis/SIAnalysis";
import { PriceBreakdown } from "./AIAnalysis/PriceBreakdown";
import { CommonSections } from "./AIAnalysis/SharedComponents";
import { MOCK_ANALYSIS_DATA, CPI_MOCK_DATA, DC_MOCK_DATA, RFI_MOCK_DATA, SI_MOCK_DATA } from "./AIAnalysis/MockData";

interface AIAnalysisModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  analysisData: any | null;
  taskType?: string;
}

export function AIAnalysisModal({
  onOpenChange,
  isLoading,
  analysisData,
  taskType: propTaskType = "VO",
  isOpen: propIsOpen,
}: AIAnalysisModalProps) {
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const totalSections = 15; // Sufficient for all types
  // const [isOpen, setIsOpen] = useState(true);
  // const [taskType, setTaskType] = useState("DC");

  // Support local state for debugging if parent doesn't provide it, 
  // but prioritize props for real usage
  const isOpen = propIsOpen;
  const taskType = propTaskType;

  // Destructure nested structure from API response, fallback to mock data based on type
  const resolvedData = analysisData || (
    taskType === 'CPI' ? CPI_MOCK_DATA[0] :
      taskType === 'DC' ? DC_MOCK_DATA[0] :
        taskType === 'RFI' ? RFI_MOCK_DATA[0] :
          taskType === 'SI' ? SI_MOCK_DATA[0] :
            MOCK_ANALYSIS_DATA[0]
  );

  const data = (resolvedData && 'analysis' in resolvedData) ? {
    ...(resolvedData as any).analysis,
    price_breakdown: (resolvedData as any).price_breakdown
  } : resolvedData as any;

  // Reset and start streaming when loading completes and data is available
  useEffect(() => {
    if (!isLoading && isOpen && (analysisData || data)) {
      setVisibleSections(0);
      const interval = setInterval(() => {
        setVisibleSections((prev) => {
          if (prev >= totalSections) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isLoading, isOpen, analysisData, !!data]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVisibleSections(0);
    }
  }, [isOpen]);

  if (!data && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#1B1C1F]">
            <Zap className="h-5 w-5 text-primary" />
            AI Contract Analysis
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280]">
            Intelligent compliance analysis {data?.vo_id || data?.dc_id || data?.rfi_id || data?.si_id || data?.cpi_id ? `for ${data.vo_id || data.dc_id || data.rfi_id || data.si_id || data.cpi_id}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
              <div className="ai-orb-loader">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
              <div className="text-center animate-pulse">
                <p className="text-sm font-medium text-primary">Interrogating Project Documents...</p>
                <p className="text-xs text-gray-400 mt-1">Cross-referencing {taskType} with Contract Schedule</p>
              </div>
            </div>
          ) : (
            <div className="pb-8">
              {taskType === "VO" && <VOAnalysis data={data} visibleSections={visibleSections} />}
              {taskType === "CPI" && <CPIAnalysis data={data} visibleSections={visibleSections} />}
              {taskType === "DC" && <DCAnalysis data={data} visibleSections={visibleSections} />}
              {taskType === "RFI" && <RFIAnalysis data={data} visibleSections={visibleSections} />}
              {taskType === "SI" && <SIAnalysis data={data} visibleSections={visibleSections} />}

              {/* Fallback for other types */}
              {!["VO", "CPI", "DC", "RFI", "SI"].includes(taskType) && (
                <div className="p-6 bg-white border border-dashed border-gray-200 rounded-[14px] text-center text-gray-400">
                  {taskType} Detailed Analysis Placeholder
                </div>
              )}

              {/* Price Breakdown Section if available (primarily for VO and SI) */}
              {(data.price_breakdown || (taskType === "VO" && resolvedData.price_breakdown)) && (
                <PriceBreakdown
                  priceData={data.price_breakdown || resolvedData.price_breakdown}
                  visibleSections={visibleSections}
                  startSelector={6}
                />
              )}

              {/* Shared Recommendations & Risk Flags */}
              <CommonSections data={data} visibleSections={visibleSections} startSelector={8} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

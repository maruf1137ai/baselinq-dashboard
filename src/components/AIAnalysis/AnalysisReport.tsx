import { useEffect, useState } from "react";
import { AlertTriangle, Info, RotateCcw } from "lucide-react";

import { AiMark } from "@/components/icons/AiMark";
import { Button } from "@/components/ui/button";

import { AnswerFeedback } from "./AnswerFeedback";
import { CPIAnalysis } from "./CPIAnalysis";
import { DCAnalysis } from "./DCAnalysis";
import { PriceBreakdown } from "./PriceBreakdown";
import { RFIAnalysis } from "./RFIAnalysis";
import { SIAnalysis } from "./SIAnalysis";
import { CommonSections } from "./SharedComponents";
import { VOAnalysis } from "./VOAnalysis";

/**
 * The checked, structured analysis of a task (Part 7), rendered inside the Linq chat.
 *
 * It shows only what the backend returned: while the analysis job runs, its progress; on failure,
 * the readable reason with a retry; never sample data. This used to live in a modal; the task page
 * now has a single "Analyze with AI" button that opens the chat and runs the analysis there, so
 * the reader keeps the conversation and the analysis in one place.
 */
export interface AnalysisReportProps {
  isLoading: boolean;
  /** The analysis response: { analysis, price_breakdown?, mock_used, cached, model_name, cached_at? }. */
  analysisData: any | null;
  taskType?: string;
  taskId?: string;
  /** What the background job is doing now (e.g. "analysing"), shown under the loader. */
  stage?: string | null;
  /** A readable failure from the backend; shown instead of a result. */
  error?: string | null;
  /** Run the analysis again (force refresh). */
  onRerun?: () => void;
}

const STAGE_TEXT: Record<string, string> = {
  queued: "Waiting to start…",
  started: "Reading the contract…",
  analysing: "Analysing against the contract…",
  done: "Checking citations…",
};

const TOTAL_SECTIONS = 15; // enough for every type

export function AnalysisReport({
  isLoading,
  analysisData,
  taskType = "VO",
  taskId,
  stage,
  error,
  onRerun,
}: AnalysisReportProps) {
  const [visibleSections, setVisibleSections] = useState<number>(0);

  const data = analysisData && typeof analysisData === "object" && "analysis" in analysisData
    ? { ...analysisData.analysis, price_breakdown: analysisData.price_breakdown }
    : null;

  // Reveal the sections one by one once a result is there.
  useEffect(() => {
    if (isLoading || !data) return;
    setVisibleSections(0);
    const interval = setInterval(() => {
      setVisibleSections((prev) => {
        if (prev >= TOTAL_SECTIONS) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, !!data]);

  const subject = data?.vo_id || data?.dc_id || data?.rfi_id || data?.si_id || data?.cpi_id;
  const analysedAt = analysisData?.cached_at ? new Date(analysisData.cached_at) : null;

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-4" role="status" aria-live="polite">
        <ReportHeading taskType={taskType} subject={subject} />
        <div className="flex flex-col items-center justify-center gap-5 py-8">
          <div className="ai-orb-loader">
            <div className="ai-orb-wave" />
            <div className="ai-orb-wave" />
            <div className="ai-orb-wave" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-primary">
              {(stage && (STAGE_TEXT[stage] || `${stage.charAt(0).toUpperCase()}${stage.slice(1)}…`))
                || "Starting the analysis…"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This can take a minute or two. You can keep using the chat — the analysis keeps running.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4" role="alert">
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
          <p className="text-sm text-foreground max-w-md">{error}</p>
          {onRerun && (
            <Button variant="outline" onClick={onRerun} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          )}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center text-muted-foreground">
          <Info className="h-6 w-6" />
          <p className="text-sm">No analysis yet.</p>
          {onRerun && <Button onClick={onRerun}>Analyze now</Button>}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 font-sans" aria-label="AI contract analysis">
      <ReportHeading taskType={taskType} subject={subject} />

      {analysisData?.mock_used && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Demo result — AI is not configured on this server, so this is not a real analysis.
        </div>
      )}

      {taskType === "VO" && <VOAnalysis data={data} visibleSections={visibleSections} />}
      {taskType === "CPI" && <CPIAnalysis data={data} visibleSections={visibleSections} />}
      {taskType === "DC" && <DCAnalysis data={data} visibleSections={visibleSections} />}
      {taskType === "RFI" && <RFIAnalysis data={data} visibleSections={visibleSections} />}
      {taskType === "SI" && <SIAnalysis data={data} visibleSections={visibleSections} />}

      {data.price_breakdown && <PriceBreakdown priceData={data.price_breakdown} />}

      <CommonSections data={data} visibleSections={visibleSections} startSelector={8} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span data-testid="analysis-footer">
          {analysisData?.cached ? "Saved analysis" : "New analysis"}
          {analysedAt ? ` · ${analysedAt.toLocaleString()}` : ""}
          {analysisData?.model_name ? ` · ${analysisData.model_name}` : ""}
        </span>
        <div className="flex items-center gap-1">
          {/* Part 15: was this analysis useful? (saved; read by the team in Django admin) */}
          <AnswerFeedback surface="analysis" targetId={taskId && !analysisData?.mock_used ? `${taskType}:${taskId}` : null} />
          {onRerun && (
            <Button variant="ghost" size="sm" onClick={onRerun} className="gap-1.5 h-7 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Re-run analysis
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportHeading({ taskType, subject }: { taskType: string; subject?: string }) {
  return (
    <div className="mb-3 border-b pb-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AiMark size={18} className="text-primary" />
        AI Contract Analysis
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        A structured check of this {taskType} against your contract{subject ? ` — ${subject}` : ""}.
      </p>
    </div>
  );
}

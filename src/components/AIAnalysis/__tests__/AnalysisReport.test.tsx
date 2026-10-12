/**
 * Part 7: "Analyze with AI" shows the checked, structured analysis. The report shows only what the
 * backend returned — progress while the job runs, a readable failure with a retry — and never
 * sample (mock) data. Every clause reference carries its verification status.
 *
 * The report used to be a modal; the task page now has a single "Analyze with AI" button that
 * opens the Linq chat and renders this inside it.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysisReport } from "../AnalysisReport";
import { CitationValidationBanner, ClauseStatusBadge } from "../SharedComponents";

const rfiResult = (over: Record<string, unknown> = {}) => ({
  analysis: {
    rfi_id: "RFI-245",
    summary: "The contract answers the question.",
    risk_level: "LOW",
    validation: { valid: true, total_citations: 1, invalid_citations: [], counts: { verified: 1 } },
    contract_citations: [],
  },
  mock_used: false,
  cached: true,
  model_name: "gpt-4o-mini",
  cached_at: "2026-10-08T10:00:00Z",
  ...over,
});

const show = (props: Record<string, unknown>) =>
  render(<AnalysisReport isLoading={false} analysisData={null} taskType="RFI" {...props} />);

describe("AnalysisReport", () => {
  it("shows the job's progress while it runs", () => {
    show({ isLoading: true, stage: "analysing" });
    expect(screen.getByRole("status")).toHaveTextContent("Analysing against the contract…");
  });

  it("tells the reader the analysis keeps running while they use the chat", () => {
    show({ isLoading: true, stage: "queued" });
    expect(screen.getByRole("status")).toHaveTextContent("You can keep using the chat");
  });

  it("shows a readable failure with a retry, not sample data", () => {
    const onRerun = vi.fn();
    show({ error: "The AI couldn't produce a valid analysis this time. Please try again.", onRerun });
    expect(screen.getByRole("alert")).toHaveTextContent("The AI couldn't produce a valid analysis this time.");
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRerun).toHaveBeenCalled();
  });

  it("with no result shows an empty state — never a sample analysis", () => {
    show({});
    expect(screen.getByText("No analysis yet.")).toBeInTheDocument();
    expect(screen.queryByText(/RFI-/)).not.toBeInTheDocument();
  });

  it("labels a demo (mock) result and footers a real one with its model", () => {
    const { rerender } = show({ analysisData: rfiResult({ mock_used: true }) });
    expect(screen.getByText(/Demo result — AI is not configured/)).toBeInTheDocument();
    rerender(<AnalysisReport isLoading={false} analysisData={rfiResult()} taskType="RFI" onRerun={vi.fn()} />);
    expect(screen.queryByText(/Demo result/)).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-footer")).toHaveTextContent("Saved analysis");
    expect(screen.getByTestId("analysis-footer")).toHaveTextContent("gpt-4o-mini");
    expect(screen.getByRole("button", { name: /Re-run analysis/ })).toBeInTheDocument();
  });

  it("names the task it checked, so the report is readable inside a conversation", () => {
    show({ analysisData: rfiResult() });
    expect(screen.getByRole("region", { name: /AI contract analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/A structured check of this RFI against your contract — RFI-245/))
      .toBeInTheDocument();
  });

  it("has no chat tab any more (the report lives inside the chat)", () => {
    show({ analysisData: rfiResult() });
    expect(screen.queryByText("AI RAG Chat")).not.toBeInTheDocument();
  });
});

describe("citation status in the analysis", () => {
  it("badges each clause reference with its status", () => {
    const { rerender, container } = render(<ClauseStatusBadge status="verified" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    rerender(<ClauseStatusBadge status="unverified" />);
    expect(screen.getByText("Not in your contract")).toBeInTheDocument();
    rerender(<ClauseStatusBadge status="reference_only" />);
    expect(screen.getByText("Standard form only")).toBeInTheDocument();
    rerender(<ClauseStatusBadge status="number_only" />);
    expect(screen.getByText("Quote not matched")).toBeInTheDocument();
    rerender(<ClauseStatusBadge status="not_cited" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ClauseStatusBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("summarises the per-status counts, never calling a missing clause verified", () => {
    render(<CitationValidationBanner visibleSections={9}
      validation={{ valid: false, total_citations: 3, invalid_citations: ["99.9"],
        counts: { verified: 2, unverified: 1, not_cited: 4 } }} />);
    const banner = screen.getByTestId("citation-banner");
    expect(banner).toHaveTextContent("2 of 3 clause citations verified in your contract · 1 not found in your contract.");
    expect(banner).toHaveTextContent("Not found: 99.9");
  });
});

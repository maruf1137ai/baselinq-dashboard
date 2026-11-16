/**
 * The task page has one AI button: it opens this chat and runs the structured analysis. The
 * analysis then joins the conversation as an ordinary Linq message — there is no card, panel or
 * heading block of its own — so it is readable wherever the chat is, and a chat that failed to
 * start cannot hide an analysis that succeeded.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  postData: vi.fn(), fetchData: vi.fn(), getPresignedUrl: vi.fn(), uploadFileToPresignedUrl: vi.fn(),
}));
vi.mock("@/lib/Api", () => api);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { AIChatInterface } from "../AIChatInterface";

const TASK = { id: 7, type: "SI" };

const analysisResult = {
  analysis: {
    si_id: "SI-052",
    overall_status: "COMPLIANT",
    risk_level: "MEDIUM",
    summary: "The instruction to extend working hours is compliant.",
    validation: { counts: { verified: 7 } },
    procedural_compliance: {
      authority_to_issue: { status: "COMPLIANT", finding: "The principal agent has the authority." },
    },
    risk_flags: [{ title: "Increased Safety Risks", severity: "MEDIUM" }],
  },
  mock_used: false,
  cached: false,
  model_name: "gpt-4o-mini",
};

const welcome = (over: Record<string, unknown> = {}) => ({
  messages: [{
    id: 1, role: "assistant", content: "I've reviewed SI-052 against your contract.",
    created_at: "2026-10-09T10:00:00Z", sources: [], ...over,
  }],
});

const analysis = (over: Record<string, unknown> = {}) => ({
  show: true, isLoading: false, analysisData: analysisResult, taskType: "SI", taskId: "7",
  stage: null, error: null, onRerun: vi.fn(), ...over,
});

const open = (analysisProps?: Record<string, unknown>) =>
  render(
    <MemoryRouter>
      <AIChatInterface taskType="SI" data={TASK} analysis={analysisProps as never} />
    </MemoryRouter>,
  );

beforeEach(() => {
  api.postData.mockReset();
  api.fetchData.mockReset();
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  Element.prototype.scrollIntoView = vi.fn() as unknown as typeof Element.prototype.scrollIntoView;
});

describe("VO price ranges", () => {
  // The backend still attaches its AI price ranges to a VO message. They cite no source (the
  // model's general knowledge), so the chat no longer draws them as a table.
  const priceBreakdown = {
    schema_version: 2,
    status: "ai_estimate",
    label: "AI estimate — not verified",
    disclaimer: "Indicative ranges produced by an AI model from general knowledge.",
    source: "ai_estimate",
    currency: "ZAR",
    total_claimed: 45000,
    counts: { estimated: 1, not_verified: 0, above_range: 1, within_range: 0, below_range: 0 },
    items: [{
      index: 1, description: "Concrete 30 MPa", quantity: 25, claimed_unit_rate: 1800, claimed_total: 45000,
      status: "ai_estimate", estimate: { unit: "m³", low: 1400, typical: 1600, high: 1750, basis: "Ready-mix." },
      position: "above_range", variance_vs_estimate_pct: 12.5, note: "",
    }],
  };

  it("are not shown under a VO message", async () => {
    api.fetchData.mockResolvedValue(welcome({ content: "I've reviewed VO-015.", price_breakdown: priceBreakdown }));
    render(
      <MemoryRouter>
        <AIChatInterface taskType="VO" data={{ id: 9, type: "VO" }} />
      </MemoryRouter>,
    );

    await screen.findByText("I've reviewed VO-015.");
    expect(screen.queryByRole("region", { name: "AI price estimates" })).not.toBeInTheDocument();
    expect(screen.queryByText(/R 1,400\.00/)).not.toBeInTheDocument();
    expect(screen.queryByText("AI estimate — not verified")).not.toBeInTheDocument();
  });
});

describe("the analysis as a chat message", () => {
  it("rides on Linq's opening message — one message, not two", async () => {
    api.fetchData.mockResolvedValue(welcome());
    const { container } = open(analysis());

    // Re-query rather than holding the node: loading the chat history re-renders the list, so an
    // element captured before it lands is detached by the time it is asserted on.
    await waitFor(() =>
      expect(screen.getByText(/7 of 7 clause citations verified/)).toBeInTheDocument());
    // The welcome's own words and the verdict are in the SAME bubble.
    const bubbles = container.querySelectorAll(".rounded-tl-none");
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].textContent).toContain("I've reviewed SI-052 against your contract.");
    expect(bubbles[0].textContent).toContain("Checked verdict");
    // No card, panel or region of its own.
    expect(screen.queryByRole("region", { name: /AI contract analysis/i })).not.toBeInTheDocument();
  });

  it("keeps the verdict short — the detail stays a question away", async () => {
    api.fetchData.mockResolvedValue(welcome());
    open(analysis());

    await waitFor(() => expect(screen.getByText(/Checked verdict/)).toBeInTheDocument());
    expect(screen.queryByText("Procedural Compliance")).not.toBeInTheDocument();
    expect(screen.queryByText(/The principal agent has the authority/)).not.toBeInTheDocument();
  });

  it("is still shown when the chat itself failed to start", async () => {
    api.fetchData.mockResolvedValue({ messages: [] });
    api.postData.mockRejectedValue({ response: { data: { message: "Linq couldn't start this chat." } } });
    open(analysis());

    expect(await screen.findByTestId("chat-init-error")).toHaveTextContent("Linq couldn't start this chat.");
    expect(screen.getByText(/Checked verdict/)).toBeInTheDocument();
  });

  it("says so in the conversation when the analysis failed", async () => {
    api.fetchData.mockResolvedValue(welcome());
    open(analysis({ analysisData: null, error: "The AI couldn't produce a valid analysis this time." }));

    await waitFor(() =>
      expect(screen.getByText("The AI couldn't produce a valid analysis this time.")).toBeInTheDocument());
  });

  it("is not added twice when the component re-renders", async () => {
    api.fetchData.mockResolvedValue(welcome());
    const props = analysis();
    const { rerender } = open(props);

    await waitFor(() => expect(screen.getByText(/Checked verdict/)).toBeInTheDocument());
    rerender(
      <MemoryRouter>
        <AIChatInterface taskType="SI" data={TASK} analysis={props as never} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText(/Checked verdict/)).toHaveLength(1));
  });

  it("shows the chat's own typing indicator while the analysis runs", async () => {
    api.fetchData.mockResolvedValue(welcome());
    open(analysis({ isLoading: true, analysisData: null }));

    expect(await screen.findByText("Analyzing context...")).toBeInTheDocument();
  });

  it("adds nothing when the task page did not ask for an analysis", async () => {
    api.fetchData.mockResolvedValue(welcome());
    open(undefined);

    await screen.findByText("I've reviewed SI-052 against your contract.");
    expect(screen.queryByText(/Checked verdict/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Re-run analysis" })).not.toBeInTheDocument();
  });

  it("offers the re-run that the old card's footer carried", async () => {
    api.fetchData.mockResolvedValue(welcome());
    const onRerun = vi.fn();
    open(analysis({ onRerun }));

    const button = await screen.findByRole("button", { name: "Re-run analysis" });
    button.click();
    expect(onRerun).toHaveBeenCalled();
  });
});

describe("a reply that runs as a background job (W1-b)", () => {
  it("asks for a job, says Working… while it runs, then shows the reply", async () => {
    api.fetchData.mockImplementation(async (url: string) => (url.startsWith("ai_analysis/jobs/")
      ? { id: "j1", kind: "ai_request", status: "succeeded", stage: "done", progress: 100, error_code: "",
          message: "", result: { messageId: 9, reply: "Clause 17.1 lets the architect vary the works.", sources: [] },
          created_at: null, finished_at: null }
      : welcome()));
    api.postData.mockResolvedValue({
      status: "queued", job_id: "j1",
      job: { id: "j1", kind: "ai_request", status: "running", stage: "writing the answer", progress: 20,
             error_code: "", message: "", result: null, created_at: null, finished_at: null },
    });
    open(undefined);
    await screen.findByText("I've reviewed SI-052 against your contract.");

    fireEvent.change(screen.getByPlaceholderText(/Examine compliance/), { target: { value: "Who can vary the works?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Working… writing the answer")).toBeInTheDocument();
    expect(api.postData).toHaveBeenCalledWith({
      url: "ai_analysis/si/7/chat/", data: { message: "Who can vary the works?", async: true },
    });
    expect(await screen.findByText("Clause 17.1 lets the architect vary the works.", {}, { timeout: 5000 }))
      .toBeInTheDocument();
    expect(screen.queryByText(/Working…/)).not.toBeInTheDocument();
  });

  it("shows the job's readable failure", async () => {
    const { toast } = await import("sonner");
    api.fetchData.mockImplementation(async (url: string) => (url.startsWith("ai_analysis/jobs/")
      ? { id: "j2", kind: "ai_request", status: "failed", stage: "", progress: 0, error_code: "ai_timeout",
          message: "The AI took too long to respond. Please try again.", result: null, created_at: null,
          finished_at: null }
      : welcome()));
    api.postData.mockResolvedValue({
      status: "queued", job_id: "j2",
      job: { id: "j2", kind: "ai_request", status: "queued", stage: "", progress: 0, error_code: "", message: "",
             result: null, created_at: null, finished_at: null },
    });
    open(undefined);
    await screen.findByText("I've reviewed SI-052 against your contract.");

    fireEvent.change(screen.getByPlaceholderText(/Examine compliance/), { target: { value: "Any delays?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("The AI took too long to respond. Please try again.", {}, { timeout: 5000 }))
      .toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("The AI took too long to respond. Please try again.");
  });
});

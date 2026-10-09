/**
 * Part 6: writing meeting notes is a background job. The server answers 202 with the job; the dialog shows
 * progress, polls it, and reports the real outcome (success, or the job's readable failure message).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn();
const jobState: { data: any } = { data: undefined };
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/hooks/usePost", () => ({ usePost: () => ({ mutateAsync, isPending: false }) }));
vi.mock("@/hooks/useAIJob", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useAIJob")>("@/hooks/useAIJob");
  return { ...actual, useAIJob: (id: string | null) => ({ data: id ? jobState.data : undefined }) };
});
vi.mock("sonner", () => ({ toast: { success: (...a: any[]) => toastSuccess(...a), error: (...a: any[]) => toastError(...a) } }));

import { GenerateAiNotesDialog } from "../generateAiNotesDialog";
import { isJobDone, isQueuedJobResponse, type AIJob } from "@/hooks/useAIJob";

const job = (over: Partial<AIJob> = {}): AIJob => ({
  id: "j1", kind: "meeting_notes", status: "running", stage: "writing the notes", progress: 20,
  error_code: "", message: "", result: null, created_at: null, finished_at: null, ...over,
});

beforeEach(() => {
  mutateAsync.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  jobState.data = undefined;
});

async function submitTranscript(onSuccess = vi.fn(), onOpenChange = vi.fn()) {
  const view = render(<GenerateAiNotesDialog meetingId={7} open onOpenChange={onOpenChange} onSuccess={onSuccess} />);
  fireEvent.change(screen.getByPlaceholderText(/Paste your meeting transcript/), { target: { value: "Alice: hi" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Generate Notes/ }));
  });
  return { view, onSuccess, onOpenChange };
}

describe("job helpers", () => {
  it("recognise a queued 202 body and a finished job", () => {
    expect(isQueuedJobResponse({ status: "queued", job_id: "x", job: job() })).toBe(true);
    expect(isQueuedJobResponse({ id: 7, title: "Weekly" })).toBe(false);
    expect(isJobDone(job({ status: "running" }))).toBe(false);
    expect(isJobDone(job({ status: "succeeded" }))).toBe(true);
    expect(isJobDone(job({ status: "failed" }))).toBe(true);
  });
});

describe("GenerateAiNotesDialog with a background job", () => {
  it("shows progress while the job runs, then reports success", async () => {
    mutateAsync.mockResolvedValue({ status: "queued", job_id: "j1", job: job({ status: "queued" }) });
    jobState.data = job({ status: "running" });
    const { view, onSuccess } = await submitTranscript();
    expect(screen.getByText(/Writing the notes/)).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();

    jobState.data = job({ status: "succeeded" });
    view.rerender(<GenerateAiNotesDialog meetingId={7} open onOpenChange={vi.fn()} onSuccess={onSuccess} />);
    expect(toastSuccess).toHaveBeenCalledWith("AI notes generated successfully.");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows the job's own readable failure message", async () => {
    mutateAsync.mockResolvedValue({ status: "queued", job_id: "j1", job: job({ status: "queued" }) });
    jobState.data = job({ status: "failed", message: "The AI service isn't responding. Please try again." });
    await submitTranscript();
    expect(toastError).toHaveBeenCalledWith("The AI service isn't responding. Please try again.");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("an immediate 200 (no job) still succeeds as before", async () => {
    mutateAsync.mockResolvedValue({ id: 7, title: "Weekly" });
    const { onSuccess } = await submitTranscript();
    expect(toastSuccess).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});

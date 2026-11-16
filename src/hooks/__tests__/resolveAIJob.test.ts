/**
 * W1-b: AI endpoints answer 202 with a background job; resolveAIJob polls it and hands back the body the
 * request used to return, so a chat reads its reply exactly as before.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock("@/lib/Api", () => api);

import { AIJobError, jobStatusLabel, resolveAIJob, type AIJob } from "../useAIJob";

const job = (over: Partial<AIJob> = {}): AIJob => ({
  id: "j1", kind: "ai_request", status: "queued", stage: "", progress: 0, error_code: "", message: "",
  result: null, created_at: null, finished_at: null, ...over,
});
const queued = (over: Partial<AIJob> = {}) => ({ status: "queued" as const, job_id: "j1", job: job(over) });

beforeEach(() => {
  api.fetchData.mockReset();
});

describe("resolveAIJob", () => {
  it("returns a body that is not a job as it is (a server that still answers in the request)", async () => {
    const body = { reply: "Clause 17.1 applies.", sources: [] };
    await expect(resolveAIJob(body)).resolves.toBe(body);
    expect(api.fetchData).not.toHaveBeenCalled();
  });

  it("polls the job until it succeeds and resolves its result, reporting each stage", async () => {
    api.fetchData
      .mockResolvedValueOnce(job({ status: "running", stage: "writing the answer" }))
      .mockResolvedValueOnce(job({ status: "succeeded", stage: "done", result: { reply: "Clause 17.1 applies." } }));
    const seen: string[] = [];
    const result = await resolveAIJob(queued(), { intervalMs: 0, onUpdate: (j) => seen.push(j.status) });
    expect(result).toEqual({ reply: "Clause 17.1 applies." });
    expect(seen).toEqual(["queued", "running", "succeeded"]);
    expect(api.fetchData).toHaveBeenCalledWith("ai_analysis/jobs/j1/");
  });

  it("rejects a failed job with its readable message, where existing error handling reads it", async () => {
    api.fetchData.mockResolvedValueOnce(job({
      status: "failed", error_code: "ai_timeout", message: "The AI took too long to respond. Please try again.",
    }));
    const err = await resolveAIJob(queued(), { intervalMs: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(AIJobError);
    expect(err.message).toBe("The AI took too long to respond. Please try again.");
    expect(err.response.data).toMatchObject({ code: "ai_timeout", message: err.message, error: err.message });
  });

  it("retries a dropped poll, and gives up after three in a row", async () => {
    api.fetchData
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(job({ status: "succeeded", result: { ok: true } }));
    await expect(resolveAIJob(queued(), { intervalMs: 0 })).resolves.toEqual({ ok: true });

    api.fetchData.mockReset();
    api.fetchData.mockRejectedValue(new Error("Network Error"));
    await expect(resolveAIJob(queued(), { intervalMs: 0 })).rejects.toThrow("Network Error");
    expect(api.fetchData).toHaveBeenCalledTimes(3);
  });

  it("stops waiting after the time limit and says the answer will still be saved", async () => {
    api.fetchData.mockResolvedValue(job({ status: "running" }));
    const err = await resolveAIJob(queued(), { intervalMs: 0, timeoutMs: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(AIJobError);
    expect(err.response.data.code).toBe("still_running");
    expect(err.message).toMatch(/taking longer than usual/);
  });

  it("stops when the screen that asked has gone", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(resolveAIJob(queued(), { intervalMs: 0, signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("jobStatusLabel", () => {
  it("says Working… and what the job is doing", () => {
    expect(jobStatusLabel(job())).toBe("Working…");
    expect(jobStatusLabel(job({ stage: "started" }))).toBe("Working…");
    expect(jobStatusLabel(job({ stage: "reading the file" }))).toBe("Working… reading the file");
  });
});

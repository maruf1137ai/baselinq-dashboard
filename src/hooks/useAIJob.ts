// Background AI jobs (backend ai_analysis/jobs.py, Part 6). Long AI work (meeting notes, task analyses, …)
// answers 202 with a job; this hook polls GET /ai_analysis/jobs/<id>/ until it has succeeded or failed.
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";

export type AIJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface AIJob {
  id: string;
  kind: string;
  status: AIJobStatus;
  stage: string;
  progress: number;
  error_code: string;
  message: string;
  result: any;
  created_at: string | null;
  finished_at: string | null;
}

export interface QueuedJobResponse {
  status: "queued";
  job_id: string;
  job: AIJob;
}

export const isJobDone = (job?: AIJob | null): boolean => job?.status === "succeeded" || job?.status === "failed";

/** A 202 body from an endpoint that queued its work as a job. */
export const isQueuedJobResponse = (body: any): body is QueuedJobResponse =>
  !!body && body.status === "queued" && typeof body.job_id === "string";

export function useAIJob(jobId: string | null, intervalMs = 2000) {
  return useQuery<AIJob>({
    queryKey: ["ai", "job", jobId],
    queryFn: () => fetchData(`ai_analysis/jobs/${jobId}/`),
    enabled: !!jobId,
    refetchInterval: (query) => (isJobDone(query.state.data) ? false : intervalMs),
    refetchIntervalInBackground: true,
    retry: 2,
  });
}

/** Ask an AI endpoint to answer with a job (202) instead of holding the request open (W1-b). */
export const ASYNC_AI = { async: true } as const;

/** Shown while a job runs: every long AI process says what it is doing (CLAUDE.md: no silent waits). */
export const jobStatusLabel = (job?: AIJob | null): string =>
  job?.stage && job.stage !== "started" && job.stage !== "done" ? `Working… ${job.stage}` : "Working…";

/**
 * A failed job, shaped like the axios error its request used to throw, so existing error handling
 * (`err.response.data.message` / `.error`, or `err.message`) shows the job's readable message.
 */
export class AIJobError extends Error {
  response: { status: number; data: { error: string; code: string; message: string; job_id: string } };

  constructor(job: Pick<AIJob, "id" | "error_code" | "message">, fallback = "Something went wrong on our side. Please try again.") {
    const message = job.message || fallback;
    super(message);
    this.name = "AIJobError";
    this.response = { status: 0, data: { error: message, code: job.error_code || "failed", message, job_id: job.id } };
  }
}

interface ResolveOptions {
  /** Called with every polled state (to show its stage). */
  onUpdate?: (job: AIJob) => void;
  intervalMs?: number;
  /** Give up waiting after this long; the job itself keeps running and its result is saved. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const STILL_RUNNING = "This is taking longer than usual. Please check back in a minute — the answer will be saved when it's ready.";

/**
 * The body an AI endpoint answered with. A 202 job is polled until it ends: its result (the body the
 * request would have returned) is resolved, a failure rejects with an AIJobError. Any other body is
 * returned as it is, so a server that still answers in the request works too.
 */
export async function resolveAIJob<T = any>(body: T | QueuedJobResponse, options: ResolveOptions = {}): Promise<T> {
  if (!isQueuedJobResponse(body)) return body as T;
  const { onUpdate, intervalMs = 2000, timeoutMs = 5 * 60_000, signal } = options;
  const deadline = Date.now() + timeoutMs;
  let job: AIJob = body.job;
  let misses = 0;
  for (;;) {
    onUpdate?.(job);
    if (job.status === "succeeded") return job.result as T;
    if (job.status === "failed") throw new AIJobError(job);
    if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
    if (Date.now() >= deadline) throw new AIJobError({ id: body.job_id, error_code: "still_running", message: STILL_RUNNING });
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      job = await fetchData(`ai_analysis/jobs/${body.job_id}/`);
      misses = 0;
    } catch (err) {
      // A dropped poll is retried (as useAIJob does); three in a row is a real error, shown to the user.
      if (++misses >= 3) throw err;
    }
  }
}

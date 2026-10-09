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

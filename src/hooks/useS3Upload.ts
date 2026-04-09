import { useState, useCallback, useRef, useEffect } from "react";
import { getPresignedUrl, uploadFileToPresignedUrl, validateFile } from "@/lib/Api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type S3UploadStatus = "uploading" | "done" | "error";

export interface S3FileEntry {
  id: string;
  file: File;
  status: S3UploadStatus;
  progress: number;
  s3Key?: string;
  error?: string;
  title?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manages per-file S3 uploads via presigned URLs.
 *
 * Usage:
 *   const s3 = useS3Upload("project-documents/pending");
 *   const id = crypto.randomUUID();
 *   s3.startUpload(id, file);          // fire-and-forget, state updates automatically
 *   const keys = await s3.waitForAll(ids); // at submit time
 */
export function useS3Upload(folder = "project-documents/pending") {
  const [entries, setEntries] = useState<S3FileEntry[]>([]);
  // Keeps live promises so we can await them at submit time even if state has re-rendered.
  const promisesRef = useRef<Map<string, Promise<string | null>>>(new Map());

  const startUpload = useCallback(
    (id: string, file: File): Promise<string | null> => {
      const validation = validateFile(file);
      if (!validation.valid) {
        const errEntry: S3FileEntry = {
          id,
          file,
          status: "error",
          progress: 0,
          error: validation.error,
        };
        setEntries((prev) => [...prev.filter((e) => e.id !== id), errEntry]);
        return Promise.resolve(null);
      }

      setEntries((prev) => [
        ...prev.filter((e) => e.id !== id),
        { id, file, status: "uploading", progress: 0 },
      ]);

      const promise = (async (): Promise<string | null> => {
        try {
          const { upload_url, key } = await getPresignedUrl({
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            folder,
          });

          await uploadFileToPresignedUrl(
            upload_url,
            file,
            file.type || "application/octet-stream",
            (progress) => {
              setEntries((prev) =>
                prev.map((e) => (e.id === id ? { ...e, progress } : e))
              );
            }
          );

          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, status: "done", progress: 100, s3Key: key }
                : e
            )
          );
          return key;
        } catch (err: any) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, status: "error", error: err?.message ?? "Upload failed" }
                : e
            )
          );
          return null;
        }
      })();

      promisesRef.current.set(id, promise);
      return promise;
    },
    [folder]
  );

  // Keep a ref in sync so retryUpload always sees current entries without stale closure.
  const entriesRef = useRef<S3FileEntry[]>([]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const retryUpload = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (entry) startUpload(id, entry.file);
    },
    [startUpload]
  );

  /** Remove an entry and cancel its tracked promise. */
  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    promisesRef.current.delete(id);
  }, []);

  /**
   * Wait for all in-flight uploads to settle, then return a map of id → s3Key.
   * Files that failed will map to null.
   */
  const waitForAll = useCallback(
    async (ids: string[]): Promise<Map<string, string | null>> => {
      const result = new Map<string, string | null>();
      await Promise.all(
        ids.map(async (id) => {
          const p = promisesRef.current.get(id);
          result.set(id, p ? await p : null);
        })
      );
      return result;
    },
    []
  );

  const updateEntry = useCallback((id: string, patch: Partial<S3FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const hasUploading = entries.some((e) => e.status === "uploading");
  const allDone = entries.length > 0 && entries.every((e) => e.status === "done" || e.status === "error");

  return { entries, startUpload, retryUpload, removeEntry, updateEntry, waitForAll, hasUploading, allDone };
}

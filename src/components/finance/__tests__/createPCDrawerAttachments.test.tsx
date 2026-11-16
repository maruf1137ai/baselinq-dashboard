/**
 * Files attached while creating a certificate are registered against it only
 * once it exists. A registration that fails used to be swallowed by a silent
 * `catch {}`, so the drawer closed and the user believed the signed JBCC
 * certificate was on file when it was not (review finding F10, 13 Nov 2026).
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const DEFAULTS = {
  originalContractValue: 10000000,
  currentContractValue: 10000000,
  previouslyCertified: 0,
  retentionRatePct: 0,
  vatRatePct: 15,
  currency: "ZAR",
  nextPcNumber: "PC-005",
};

// Every double returns the SAME object on each render. The drawer syncs its
// rows from these in effects, so a fresh array per render never settles.
const LOADED_DEFAULTS = { data: DEFAULTS, isLoading: false, isError: false };
const NOTHING = { data: undefined, isLoading: false, isError: false };
const NO_VARIATIONS = { rows: [], isLoading: false };
const NO_MILESTONES = { data: [] };
vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => (url.includes("payment-certificates/defaults/") ? LOADED_DEFAULTS : NOTHING),
}));
vi.mock("@/hooks/useProjectVariations", () => ({ useProjectVariations: () => NO_VARIATIONS }));
vi.mock("@/hooks/useMilestones", () => ({ useMilestones: () => NO_MILESTONES }));
vi.mock("@/pages/account/admin/adminManage", () => ({ useDebounced: (v: unknown) => v }));
vi.mock("@/components/S3AttachmentSection", () => ({ S3AttachmentSection: () => null }));

const signed = new File(["%PDF"], "PC-005 signed.pdf", { type: "application/pdf" });
const valuation = new File(["x"], "valuation.xlsx");
const UPLOADS = {
  entries: [
    { id: "a", file: signed, status: "done", progress: 100 },
    { id: "b", file: valuation, status: "done", progress: 100 },
  ],
  waitForAll: async () =>
    new Map([
      ["a", "task-attachments/pending/a.pdf"],
      ["b", "task-attachments/pending/b.xlsx"],
    ]),
  startUpload: vi.fn(),
  retryUpload: vi.fn(),
  removeEntry: vi.fn(),
  updateEntry: vi.fn(),
  hasUploading: false,
  allDone: true,
};
vi.mock("@/hooks/useS3Upload", () => ({ useS3Upload: () => UPLOADS }));

const registerS3TaskAttachment = vi.fn();
vi.mock("@/lib/Api", () => ({
  postData: vi.fn(),
  registerS3TaskAttachment: (...a: unknown[]) => registerS3TaskAttachment(...a),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

import { CreatePCDrawer } from "../createPCDrawer";

const draw = (onClose: () => void) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CreatePCDrawer
        isOpen
        onClose={onClose}
        projectId="45"
        onSubmit={async () => ({ id: 99 }) as never}
      />
    </QueryClientProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  registerS3TaskAttachment.mockReset();
  toastError.mockReset();
});

describe("attachments on a new certificate", () => {
  it("names the file that could not be attached, and still closes", async () => {
    registerS3TaskAttachment.mockImplementation(async (_t: string, _id: unknown, body: { file_name: string }) => {
      if (body.file_name === "PC-005 signed.pdf") throw new Error("Network Error");
      return {};
    });
    const onClose = vi.fn();
    draw(onClose);

    fireEvent.click(screen.getByRole("button", { name: "Create Certificate" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(registerS3TaskAttachment).toHaveBeenCalledTimes(2);
    expect(toastError).toHaveBeenCalledTimes(1);
    const message = String(toastError.mock.calls[0][0]);
    expect(message).toContain("PC-005 signed.pdf");
    expect(message).not.toContain("valuation.xlsx");
    expect(message).toMatch(/certificate was saved/);
  });

  it("says nothing when every file is attached", async () => {
    registerS3TaskAttachment.mockResolvedValue({});
    const onClose = vi.fn();
    draw(onClose);

    fireEvent.click(screen.getByRole("button", { name: "Create Certificate" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(registerS3TaskAttachment).toHaveBeenCalledTimes(2);
    expect(toastError).not.toHaveBeenCalled();
  });
});

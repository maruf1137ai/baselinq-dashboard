/**
 * The certificate drawer's "Prev. Certified" on a variation reads EVERY earlier
 * certificate, not the first page of them.
 *
 * `tasks/payment-certificates/` is paged at twenty. The drawer read one page,
 * so on a project with more than twenty certificates a variation certified on
 * the 21st showed nothing previously certified and opened ticked at its whole
 * approved value — offering money the server then refused on save.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  postData: vi.fn(() => Promise.resolve({})),
  registerS3TaskAttachment: vi.fn(),
}));
vi.mock("@/hooks/useMilestones", () => ({ useMilestones: () => ({ data: [] }) }));
vi.mock("@/hooks/useS3Upload", () => ({
  useS3Upload: () => ({ entries: [], upload: vi.fn(), remove: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/components/S3AttachmentSection", () => ({ S3AttachmentSection: () => null }));

import { CreatePCDrawer } from "@/components/finance/createPCDrawer";

const VARIATION = {
  _id: 1,
  projectId: 9,
  voNumber: "VO-001",
  title: "Extra slab",
  status: "Approved",
  certifiableValue: "1000.00",
};

/** Twenty certificates that never touched VO-001, then the one that did. */
const certificate = (id: number, voItems: unknown[] = []) => ({
  id,
  approvalStatus: "approved",
  workflowState: "posted",
  voItems,
});
const PAGE_1 = Array.from({ length: 20 }, (_, i) => certificate(i + 1));
const PAGE_2 = [
  certificate(21, [{ voNumber: "VO-001", thisPeriod: 1000, included: true }]),
];

function route(url: string) {
  if (url.startsWith("tasks/variation-orders/")) {
    return Promise.resolve({ count: 1, next: null, results: [VARIATION] });
  }
  if (url.startsWith("tasks/payment-certificates/defaults/")) {
    return Promise.resolve({
      originalContractValue: 100000,
      currentContractValue: 101000,
      previouslyCertified: 0,
      retentionRatePct: 0,
      vatRatePct: 15,
      currency: "ZAR",
      nextPcNumber: "PC-022",
    });
  }
  if (url.startsWith("tasks/payment-certificates/?")) {
    const page = Number(new URLSearchParams(url.split("?")[1]).get("page") || "1");
    return Promise.resolve(
      page === 1
        ? { count: 21, next: "http://api/next", previous: null, results: PAGE_1 }
        : { count: 21, next: null, previous: "http://api/prev", results: PAGE_2 },
    );
  }
  return Promise.resolve({});
}

beforeEach(() => {
  fetchData.mockReset();
  fetchData.mockImplementation(route);
});

const renderDrawer = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CreatePCDrawer isOpen onClose={vi.fn()} projectId="9" />
    </QueryClientProvider>,
  );

describe("certificate drawer variation history", () => {
  it("counts a variation certified on the second page of certificates", async () => {
    renderDrawer();

    const row = (await screen.findByText("VO-001")).closest("tr") as HTMLElement;
    // Fully certified on PC 21, so nothing is left and it is not ticked.
    await waitFor(() =>
      expect(within(row).getByRole("checkbox")).not.toBeChecked(),
    );
    expect(fetchData).toHaveBeenCalledWith(
      expect.stringMatching(/^tasks\/payment-certificates\/\?projectId=9.*page=2/),
    );
    expect(within(row).getByText("Fully certified")).toBeInTheDocument();
  });

  it("says so when the earlier certificates cannot be loaded", async () => {
    fetchData.mockImplementation((url: string) =>
      url.startsWith("tasks/payment-certificates/?")
        ? Promise.reject(new Error("boom"))
        : route(url),
    );
    renderDrawer();

    expect(
      await screen.findByText(/Earlier certificates could not be loaded/),
    ).toBeInTheDocument();
  });
});

/**
 * The certificate drawer's Baselinq fee preview is in rand.
 *
 * The fee is invoiced in rand whatever the project's currency. The drawer
 * formatted it in the project's currency, so on a US-dollar project it
 * promised a "US$" charge that the month-end invoice then raised in rand.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setActiveCurrency } from "@/lib/formatCurrency";

const fetchData = vi.fn();
const postData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  postData: (args: unknown) => postData(args),
  registerS3TaskAttachment: vi.fn(),
}));
vi.mock("@/hooks/useMilestones", () => ({ useMilestones: () => ({ data: [] }) }));
vi.mock("@/hooks/useS3Upload", () => ({
  useS3Upload: () => ({ entries: [], upload: vi.fn(), remove: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/components/S3AttachmentSection", () => ({ S3AttachmentSection: () => null }));

import { CreatePCDrawer } from "@/components/finance/createPCDrawer";

function route(url: string) {
  if (url.startsWith("tasks/payment-certificates/defaults/")) {
    return Promise.resolve({
      originalContractValue: 100000,
      currentContractValue: 100000,
      previouslyCertified: 0,
      retentionRatePct: 0,
      vatRatePct: 15,
      currency: "USD",
      nextPcNumber: "PC-001",
    });
  }
  if (url.startsWith("billing/projects/9/fee-config/")) {
    return Promise.resolve({
      configured: true,
      enabled: true,
      feeBase: "pc_only",
      feeRatePct: 1,
      vatRatePct: 15,
      billingContactName: "Acme Holdings",
    });
  }
  return Promise.resolve({ count: 0, next: null, results: [] });
}

beforeEach(() => {
  sessionStorage.clear();
  setActiveCurrency("USD");
  fetchData.mockReset();
  fetchData.mockImplementation(route);
  postData.mockReset();
  postData.mockResolvedValue({
    applies: true,
    feeAmount: "1000.00",
    vatAmount: "150.00",
    totalAmount: "1150.00",
    capReached: false,
  });
});
afterEach(() => setActiveCurrency("ZAR"));

const renderDrawer = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CreatePCDrawer isOpen onClose={vi.fn()} projectId="9" />
    </QueryClientProvider>,
  );

describe("certificate drawer fee preview", () => {
  it("shows Baselinq's fee in rand on a project in another currency", async () => {
    renderDrawer();

    expect(
      await screen.findByText(/R\s1\s150,00 will be charged to Acme Holdings/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^R\s1\s000,00$/)).toBeInTheDocument();
    expect(screen.getByText(/^\+ R\s150,00$/)).toBeInTheDocument();
    expect(screen.queryByText(/US\$\s1\s150,00/)).not.toBeInTheDocument();
  });
});

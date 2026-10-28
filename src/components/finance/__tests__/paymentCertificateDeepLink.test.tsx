/**
 * The Payment Certificates tab and the `?pc=` deep link.
 *
 * Two things are being pinned here. First, that the link and the in-page click
 * on a PC number drive the SAME selection — one dialog, one piece of state,
 * not two mechanisms that can disagree about which certificate is open.
 *
 * Second, and more important, that a certificate the link names but this
 * viewer's request did not return leaves the tab completely alone: every
 * certificate that DID come back is still listed, nothing is selected, and no
 * error appears. Filtering to the named id would show an empty certificate
 * table to somebody who was simply not shown that certificate — a page saying
 * "no payment certificates issued yet" about a project that has issued them.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PCEntry } from "@/components/finance/paymentCertificateTable";

const mockUseFetch = vi.fn();

vi.mock("@/hooks/useFetch", () => ({
  default: (...args: unknown[]) => mockUseFetch(...args),
}));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => false }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/components/finance/createPCDrawer", () => ({ CreatePCDrawer: () => null }));

import PaymentCertificate from "@/components/finance/paymentCertificate";

const certificate = (id: number, pcNumber: string): PCEntry => ({
  id,
  projectId: 1,
  pcNumber,
  period: "Aug 2026",
  claimAmount: 1000000,
  retentionAmount: 0,
  netAmount: 1000000,
  approvalStatus: "pending",
  workflowState: "submitted",
  createdAt: "2026-08-01",
  updatedAt: "2026-08-02",
});

const CERTIFICATES = [certificate(7, "PC-007"), certificate(8, "PC-008")];

const renderTab = (certificateParam: string | null) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PaymentCertificate certificateParam={certificateParam} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "1");
  mockUseFetch.mockReturnValue({
    data: { count: 2, results: CERTIFICATES },
    isLoading: false,
    refetch: vi.fn(),
  });
});

describe("?pc=", () => {
  it("selects and opens the certificate the link names", async () => {
    renderTab("8");

    expect(screen.getByText("PC-008").closest("tr")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
    expect(await screen.findByText("Details for PC-008")).toBeInTheDocument();
  });

  it("also accepts the PC number", () => {
    renderTab("PC-007");
    expect(screen.getByText("PC-007").closest("tr")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  });

  it("converges with the in-page click — one selection, either way", async () => {
    renderTab(null);
    expect(screen.queryByText(/^Details for/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("PC-007"));

    // The click sets the same state the link would have: the row is marked
    // and the same dialog opens.
    expect(screen.getByText("PC-007").closest("tr")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
    expect(await screen.findByText("Details for PC-007")).toBeInTheDocument();
  });

  it("shows the full table, unselected, for a stale id", () => {
    renderTab("99");

    expect(screen.getByText("PC-007")).toBeInTheDocument();
    expect(screen.getByText("PC-008")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    expect(screen.queryByText(/^Details for/)).not.toBeInTheDocument();
  });

  it("shows the full table when the certificate is one this viewer's request did not return", () => {
    mockUseFetch.mockReturnValue({
      data: { count: 1, results: [CERTIFICATES[0]] },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderTab("8");

    // What came back is all still there — the page does not narrow itself to
    // the id, and never claims the project has no certificates.
    expect(screen.getByText("PC-007")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
    expect(
      screen.queryByText("No payment certificates issued yet"),
    ).not.toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });
});

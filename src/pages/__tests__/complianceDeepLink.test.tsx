/**
 * /compliance?obligation=<obligationId>.
 *
 * Compliance is the page where an unfounded absence is most expensive. The
 * counts at the top of it — "0 overdue" — are read as a statement about the
 * project. So a link that no longer resolves must change nothing at all: the
 * full list, the true counts, no obligation opened, no error. It must never
 * filter to the named obligation, because a viewer whose request never
 * returned that obligation would then be shown an empty compliance page and
 * would reasonably conclude there was nothing to answer for.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ComplianceObligation } from "@/hooks/useCompliance";

const mockUseComplianceObligations = vi.fn();

vi.mock("@/hooks/useCompliance", async importOriginal => {
  const actual = await importOriginal<typeof import("@/hooks/useCompliance")>();
  return { ...actual, useComplianceObligations: () => mockUseComplianceObligations() };
});
// Time bars and the document picker are separate requests; this suite is about
// the obligation link, so they are answered empty.
vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async () => ({ time_bars: [], results: [] })),
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/Compliance/ComplianceDetailModal", () => ({
  default: ({ isOpen, obligation }: { isOpen: boolean; obligation: ComplianceObligation | null }) =>
    // Renders the id in an attribute rather than as text, so a query for the
    // obligation's title unambiguously finds its ROW.
    isOpen ? <div data-testid="detail-modal" data-obligation-id={obligation?._id} /> : null,
}));
vi.mock("@/components/Compliance/AddEvidenceModal", () => ({ default: () => null }));
vi.mock("@/components/Compliance/GenerateNoticeModal", () => ({ default: () => null }));
vi.mock("@/components/Compliance/ObligationModal", () => ({ default: () => null }));

import Compliance from "@/pages/Compliance";

const obligation = (id: string, title: string): ComplianceObligation => ({
  _id: id,
  title,
  documentId: "doc-1",
  documentReference: "JBCC PBA",
  documentName: "Principal Building Agreement",
  dueDate: "2026-09-30",
  responsibleRole: "Contractor",
  status: "Pending",
  isOverdue: false,
  daysOverdue: 0,
  daysUntilDue: 40,
  evidenceCount: 0,
  noticeContent: "",
  noticeGeneratedAt: null,
  notes: "",
});

const OBLIGATIONS = [
  obligation("ob-1", "Provide the construction guarantee"),
  obligation("ob-2", "Submit the health and safety plan"),
];

const renderCompliance = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Compliance />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "1");
  mockUseComplianceObligations.mockReturnValue({
    data: { obligations: OBLIGATIONS, counts: {} },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

/**
 * The "On track" count, read off its filter pill.
 *
 * These counts used to render as one string — "2 on track" — and the
 * assertions matched that literally. They are filter pills now, so the label
 * and the number are separate elements. The thing being asserted is
 * unchanged: the counts describe everything that loaded, not what a deep
 * link named.
 */
function onTrackCount(): string {
  const pill = screen
    .getAllByRole("button")
    .find((b) => (b.textContent || "").startsWith("On track"));
  if (!pill) throw new Error("no On track pill rendered");
  return (pill.textContent || "").replace("On track", "").trim();
}

describe("/compliance?obligation=", () => {
  it("opens the obligation the link names", async () => {
    renderCompliance("/compliance?obligation=ob-2");

    // Its row is marked, so the modal's context is visible behind it…
    const title = await screen.findByText("Submit the health and safety plan");
    expect(title.closest("[data-highlighted]")).not.toBeNull();
    // …and it is that obligation the modal opened on, not merely some modal.
    expect(screen.getByTestId("detail-modal")).toHaveAttribute("data-obligation-id", "ob-2");
  });

  it("opens nothing when there is no parameter", async () => {
    renderCompliance("/compliance");
    expect(await screen.findByText("Provide the construction guarantee")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-modal")).not.toBeInTheDocument();
  });

  it("lands on the plain page for a stale id — every obligation, true counts", async () => {
    renderCompliance("/compliance?obligation=ob-deleted");

    expect(await screen.findByText("Provide the construction guarantee")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-modal")).not.toBeInTheDocument();
    expect(screen.getByText("Submit the health and safety plan")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    // The counts still describe all of what loaded, not what the link named.
    expect(onTrackCount()).toBe("2");
    expect(screen.queryByText("No contractual obligations tracked yet")).not.toBeInTheDocument();
  });

  it("lands on the plain page when the obligation is one this viewer's list did not return", async () => {
    // The permission case. The obligation exists; this user's request did not
    // include it. The page must not filter — a viewer shown "0 overdue" over
    // an empty list would take that as a clean compliance position.
    mockUseComplianceObligations.mockReturnValue({
      data: { obligations: [OBLIGATIONS[0]], counts: {} },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderCompliance("/compliance?obligation=ob-2");

    expect(await screen.findByText("Provide the construction guarantee")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-modal")).not.toBeInTheDocument();
    expect(onTrackCount()).toBe("1");
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});

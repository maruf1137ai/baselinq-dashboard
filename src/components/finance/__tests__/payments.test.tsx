/**
 * The Payments tab, at the render level.
 *
 * Every assertion here is a way this screen could mislead someone about money
 * they are owed or owe. None of them is a styling preference.
 *
 * The two sharpest are the outage and the gate. A screen whose job is to say
 * what is outstanding must never answer a failed request with nothing — "no
 * posted certificates" over a 500 is an all-clear nobody can check — and must
 * never ASK for the figures on behalf of a viewer who may not see them, since
 * a contractor's browser holding the employer's certified total is a leak
 * whether or not it is painted.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Doubles ──────────────────────────────────────────────────────────────
const fetchState: { data: any; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};
/** What `useProjectPayments` was asked for, so the gate can be observed. */
let lastRequest: { projectId: unknown; enabled: boolean } | null = null;
let perms: Record<string, boolean> = {};
let financeView = true;

vi.mock("@/hooks/useProjectPayments", () => ({
  useProjectPayments: (projectId: unknown, enabled: boolean) => {
    lastRequest = { projectId, enabled };
    return { ...fetchState, refetch: vi.fn() };
  },
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    canViewFinance: financeView,
    canApprovePayment: false,
    isLoading: false,
  }),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => perms[code] ?? true,
  useIsPlatformStaff: () => false,
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: () => <div>loading</div>,
}));
// Both are reused rather than reimplemented, and both fetch on their own. What
// matters here is that this tab reaches for them, not what they then render.
vi.mock("../PaymentPositionSection", () => ({
  default: ({ certificateId }: { certificateId: number }) => (
    <div data-testid="position-section">{certificateId}</div>
  ),
}));
vi.mock("../RecordPaymentDialog", () => ({
  default: ({
    pcNumber,
    outstanding,
    serverToday,
  }: {
    pcNumber: string;
    outstanding: string;
    serverToday?: string;
  }) => (
    <div data-testid="record-dialog">{`${pcNumber}:${outstanding}:${serverToday ?? "none"}`}</div>
  ),
}));

import Payments from "../payments";

/**
 * Project 45 as `project_payment_summary` returns it: four posted
 * certificates, one of them 123 days past a due date the server had to fall
 * back to the certificate date for.
 */
const SUMMARY = {
  projectId: 45,
  asAt: "2026-11-09",
  certificateCount: 4,
  certifiedTotal: "5740000.00",
  receivedTotal: "3242000.00",
  outstandingTotal: "2498000.00",
  overdueTotal: "1748000.00",
  overdueCount: 1,
  certificates: [
    {
      paymentCertificateId: 45,
      pcNumber: "PC-001",
      workflowState: "posted",
      isPayable: true,
      certifiedAmount: "1400000.00",
      receivedAmount: "1400000.00",
      outstandingAmount: "0.00",
      isFullySettled: true,
      isPartlyPaid: false,
      isOverdue: false,
      daysPastDue: 0,
      due: { dueDate: "2026-04-02", computable: true, basisIsContractual: false },
    },
    {
      paymentCertificateId: 48,
      pcNumber: "PC-004",
      workflowState: "posted",
      isPayable: true,
      certifiedAmount: "1748000.00",
      receivedAmount: "0.00",
      outstandingAmount: "1748000.00",
      isFullySettled: false,
      isPartlyPaid: false,
      isOverdue: true,
      daysPastDue: 123,
      due: {
        dueDate: "2026-07-02",
        computable: true,
        basisIsContractual: false,
        warning: "Counted from the certificate date because no date for issue is recorded.",
      },
    },
    {
      paymentCertificateId: 49,
      pcNumber: "PC-005",
      workflowState: "posted",
      isPayable: true,
      certifiedAmount: "1842000.00",
      receivedAmount: "1092000.00",
      outstandingAmount: "750000.00",
      isFullySettled: false,
      isPartlyPaid: true,
      isOverdue: false,
      daysPastDue: 0,
      due: { dueDate: "2026-11-30", computable: true, basisIsContractual: true },
    },
    {
      paymentCertificateId: 50,
      pcNumber: "PC-006",
      workflowState: "posted",
      isPayable: true,
      certifiedAmount: "750000.00",
      receivedAmount: "750000.00",
      outstandingAmount: "0.00",
      isFullySettled: true,
      isPartlyPaid: false,
      // No due date can be computed: nothing to count from.
      due: { dueDate: null, computable: false, reason: "This certificate carries no date for issue." },
    },
  ],
};

const draw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Payments />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/** `formatZAR` groups with a NON-BREAKING space on purpose. See below. */
const text = () => (document.body.textContent ?? "").replace(/ /g, " ");

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "45");
  fetchState.data = SUMMARY;
  fetchState.isLoading = false;
  fetchState.isError = false;
  lastRequest = null;
  perms = {};
  financeView = true;
});

describe("the Payments tab", () => {
  it("answers the question it was built for at a glance", () => {
    draw();
    /*
      Normalise U+00A0 before comparing. `formatZAR` groups with a
      NON-BREAKING space so that "R 5 740 000,00" cannot wrap mid-number into
      "R 5 740" — a syntactically complete, plausible, wrong figure.

      The product owner's ask was "the values of whats owed and whats paid".
      All four are the SERVER's totals, not sums taken over the rows in the
      browser: the endpoint totals only posted certificates, and re-adding
      them here would be a second implementation that could disagree.
    */
    const body = text();
    expect(body).toContain("R 5 740 000,00"); // certified
    expect(body).toContain("R 3 242 000,00"); // received
    expect(body).toContain("R 2 498 000,00"); // outstanding
    expect(body).toContain("R 1 748 000,00"); // overdue
    expect(body).toContain("1 certificate past the contractual due date");
  });

  it("reads overdue without relying on colour", () => {
    draw();
    // The badge says the word and the chip beside it says the count. A reader
    // who cannot tell the red from the amber still reads "Overdue".
    expect(screen.getByText("Overdue", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText(/123 days late/)).toBeInTheDocument();
  });

  it("leads with the overdue certificate, not with the first one posted", () => {
    draw();
    const refs = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.querySelector("td")?.textContent);
    expect(refs).toEqual(["PC-004", "PC-005", "PC-001", "PC-006"]);
  });

  it("links each row to the certificate through the existing deep link", () => {
    draw();
    // `?tab=` + `?pc=` is the pattern the Payment Certificates tab already
    // answers to — not a second route into the same record.
    expect(screen.getByRole("link", { name: "PC-004" })).toHaveAttribute(
      "href",
      "/finance?tab=Payment%20Certificates&pc=48",
    );
  });

  it("says a due date cannot be computed rather than printing a dash", () => {
    draw();
    // "—" reads as a missing value. This is a date the contract cannot supply.
    expect(screen.getByText("Cannot be computed")).toBeInTheDocument();
  });

  it("dates the figures, because a screenshot of them will outlive the day", () => {
    draw();
    expect(text()).toContain("As at 09 Nov 2026");
  });

  it("does not present an outage as a project with nothing owed", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    draw();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/no posted certificates/i)).not.toBeInTheDocument();
    // And no figure at all, rather than four R 0,00 cards.
    expect(text()).not.toContain("R 0,00");
  });

  it("distinguishes a project with no posted certificates from a failed read", () => {
    fetchState.data = { ...SUMMARY, certificateCount: 0, certificates: [] };
    draw();
    expect(screen.getByText(/no posted certificates yet/i)).toBeInTheDocument();
  });

  describe("permission", () => {
    it("does not even ASK for the figures without finance.view", () => {
      financeView = false;
      draw();
      // Not merely unrendered: unrequested. A contractor's browser never holds
      // the employer's certified total.
      expect(lastRequest?.enabled).toBe(false);
      expect(screen.getByText(/not visible to your role/i)).toBeInTheDocument();
      expect(text()).not.toContain("R 5 740 000,00");
    });

    it("offers no Record payment control without finance.edit", () => {
      perms = { "finance.edit": false };
      draw();
      expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
      // Reading is still theirs.
      expect(screen.getByRole("link", { name: "PC-004" })).toBeInTheDocument();
    });

    it("offers it on an unsettled certificate, and never on a settled one", () => {
      draw();
      const rows = screen.getAllByRole("row").slice(1);
      // PC-004 is unsettled; PC-001 (third row, after the sort) is paid in
      // full — offering to record a payment on it invites a double entry.
      expect(rows[0].textContent).toContain("Record payment");
      expect(rows[2].textContent).not.toContain("Record payment");
    });
  });

  describe("reuse rather than reimplementation", () => {
    it("hands recording a payment to RecordPaymentDialog, with the row's balance", () => {
      draw();
      fireEvent.click(screen.getAllByRole("button", { name: /record payment/i })[0]);
      // The outstanding balance as the server sent it — a decimal STRING, not
      // a number parsed and re-rendered on the way through.
      expect(screen.getByTestId("record-dialog")).toHaveTextContent("PC-004:1748000.00");
    });

    it("hands the dialog the server's today, not the browser's", () => {
      // Found on Market Building, 2026-11-10. The dialog used to seed "Date
      // received" from the BROWSER's date. The payment position counts
      // receipts with received_on <= asAt, and asAt is the date in the
      // project's timezone, so a viewer east of SAST recording a payment in
      // their early hours dated it tomorrow in South African terms and their
      // own entry did not appear. The tab already holds the server's date —
      // it is printed under the table — so it must pass it down.
      draw();
      fireEvent.click(screen.getAllByRole("button", { name: /record payment/i })[0]);
      expect(screen.getByTestId("record-dialog")).toHaveTextContent("2026-11-09");
      expect(screen.getByTestId("record-dialog")).not.toHaveTextContent("none");
    });

    it("hands the full working to PaymentPositionSection", () => {
      draw();
      fireEvent.click(screen.getAllByRole("button", { name: /position/i })[0]);
      // The due-date derivation, the basis warning and the interest are that
      // component's, unchanged. This tab does not restate them.
      expect(screen.getByTestId("position-section")).toHaveTextContent("48");
    });
  });
});

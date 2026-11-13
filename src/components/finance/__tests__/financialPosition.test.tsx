import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const postData = vi.fn(async () => ({}));
vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => mockFetch(url),
  postData: (...a: unknown[]) => postData(...(a as [])),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  FinancialPositionView,
  NeedsAttention,
  NeedsAttentionPanel,
  type FinancialPositionData,
} from "../FinancialPosition";

const DATA: FinancialPositionData = {
  projectName: "Hatfield Street",
  asAt: "2026-11-10",
  contract: {
    originalContractSum: "42750000.00", revisedContractSum: "46478000.00", signedVariations: "3728000.00",
    awaitingSignature: { count: 1, valueExclVat: "100000.00" },
    certifiedToDate: "33347000.00", certifiedPct: 71.7, remainingToCertify: "13131000.00",
    certificatesPosted: 7, contractEndDate: "2027-03-31",
  },
  money: {
    paidInclVat: "26326839.60", outstandingInclVat: "8182130.40", overdueInclVat: "8182130.40", overdueCount: 2,
    overpaidInclVat: "0.00", unverifiedCount: 0, paymentsRecorded: 6,
  },
  dueNext: [{ paymentCertificateId: 110, pcNumber: "PC-006", outstanding: "4000000.00", dueDate: "2026-07-20", overdue: true, daysPastDue: 113, taxInvoice: "issued" }],
  comingUp: {
    nextValuationDate: "2026-11-25",
    signedVariationsAwaitingCertification: { count: 1, remainingExclVat: "420000.00" },
    certificatesInProgress: [],
    forecast: { explanation: "Remaining contract value spread evenly to the contract end date. A guide, not a programme forecast.", months: [{ month: "2026-12", amountExclVat: "2626200.00" }] },
  },
  fees: null,
  history: [{ date: "2026-08-21", text: "Payment received for PC-007: R 2 570 070.60", kind: "payment", refId: 111 }],
};

const draw = (data = DATA) =>
  render(
    <MemoryRouter>
      <FinancialPositionView data={data} />
    </MemoryRouter>,
  );

describe("FinancialPositionView", () => {
  it("shows the original contract sum as agreed, beside the revised sum and the signed difference", () => {
    draw();
    expect(screen.getByText("Original contract sum")).toBeInTheDocument();
    expect(screen.getByText("As agreed · fixed once work is certified")).toBeInTheDocument();
    expect(screen.getByText(/Original \+ R\s3\s728\s000 signed/)).toBeInTheDocument();
  });

  it("states each block's VAT basis", () => {
    draw();
    expect(screen.getByText("The contract · excl. VAT")).toBeInTheDocument();
    expect(screen.getByText("Money · incl. VAT")).toBeInTheDocument();
  });

  it("lists what is due with its lateness and tax invoice state", () => {
    draw();
    expect(screen.getByText(/113 days past due/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tax invoice issued/ })).toHaveAttribute("href", "/finance?tab=Payment%20Certificates&pc=110");
  });

  it("calls lateness an estimate when no date for issue is recorded", () => {
    draw({
      ...DATA,
      dueNext: [{ ...DATA.dueNext[0], dueBasisIsContractual: false }],
    } as typeof DATA);
    expect(screen.getByText(/113 days past due/)).toBeInTheDocument();
    expect(screen.getByText("Estimated: no date for issue recorded")).toBeInTheDocument();
    expect(screen.getByText(/past the due date \(estimated: no date for issue recorded\)/)).toBeInTheDocument();
  });

  it("does not call contractual lateness an estimate", () => {
    draw({ ...DATA, dueNext: [{ ...DATA.dueNext[0], dueBasisIsContractual: true }] } as typeof DATA);
    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
  });

  it("labels the forecast as a straight line, not a programme forecast", () => {
    draw();
    expect(screen.getByText(/A guide, not a programme forecast/)).toBeInTheDocument();
  });

  it("hides Baselinq fees from those not allowed to see them", () => {
    draw();
    expect(screen.queryByText(/Baselinq fees/)).not.toBeInTheDocument();
  });

  it("says how much of certified to date came from the Cost Ledger, as Cost Ledger does", () => {
    draw({
      ...DATA,
      contract: {
        ...DATA.contract,
        certifiedToDate: "33747000.00",
        certifiedFromCertificates: "33347000.00",
        ledgerCredits: { count: 2, total: "400000.00" },
        ledgerDebits: { count: 0, total: "0.00" },
      },
    });
    expect(screen.getByText("Certified to date includes Cost Ledger entries")).toBeInTheDocument();
    expect(screen.getByText(/From certificates/).nextElementSibling?.textContent).toMatch(/R\s33\s347\s000,00/);
    expect(screen.getByText(/Cost Ledger credits on no certificate \(2\)/).nextElementSibling?.textContent).toMatch(/R\s400\s000,00/);
    expect(screen.getByText("Balance still to certify")).toBeInTheDocument();
  });

  it("flags an over-certified contract instead of hiding it at zero", () => {
    draw({ ...DATA, contract: { ...DATA.contract, remainingToCertify: "-500000.00" } });
    expect(screen.getByText("Over-certified — see below")).toBeInTheDocument();
    expect(screen.getByText("Exceeds the revised sum")).toBeInTheDocument();
  });

  it("lists what needs attention, each linked to where it is done", () => {
    render(
      <MemoryRouter>
        <NeedsAttention
          alerts={[
            { code: "TAX_INVOICE_MISSING", title: "No tax invoice for PC-006, certified 22 days ago", severity: "red", sourceType: "paymentcertificate", sourceId: 110 },
            { code: "FINANCE_SETUP_INCOMPLETE", title: "Contract & payment settings incomplete: certificate issue day", severity: "orange", missing: ["certificate issue day"], sourceType: null, sourceId: null },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Needs attention (2)")).toBeInTheDocument();
    expect(screen.getByText("No tax invoice for PC-006, certified 22 days ago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tax invoice →/ })).toHaveAttribute("href", "/finance?tab=Payment%20Certificates&pc=110");
    expect(screen.getByText("Contract & payment settings: 1 missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Complete settings/ })).toHaveAttribute("href", "/settings/contract-payment");
  });

  it("keeps the to-do list off the printed statement", () => {
    render(
      <MemoryRouter>
        <FinancialPositionView
          linkable={false}
          data={{ ...DATA, alerts: [{ code: "PAYMENT_DUE", title: "PC-007 falls due in 2 days (12 Nov)", severity: "orange", sourceType: "paymentcertificate", sourceId: 111 }] }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Needs attention/)).not.toBeInTheDocument();
  });

  describe("a contractor's changed bank account", () => {
    const masked = (account: string, extra: Record<string, unknown> = {}) => ({
      bankName: "FNB", branchCode: "250655", accountType: "Current", swiftCode: "", account,
      accountDigits: 11, accountHolder: "Ndlovu Construction", ...extra,
    });
    const change = (overrides: Record<string, unknown> = {}) => ({
      id: 3, holder: "Ndlovu Construction", changedAt: "2026-11-11T09:00:00Z", changedBy: "J. Ndlovu",
      fieldsChanged: ["account_number"], before: masked("•••• 5678"), after: masked("•••• 6554"),
      canVerify: true, check: null, ...overrides,
    });
    const drawAlert = (bankChange: Record<string, unknown>) => {
      localStorage.setItem("selectedProjectId", "46");
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <NeedsAttention
              alerts={[{
                code: "BANK_DETAILS_CHANGED", severity: "red", sourceType: "bankdetailschange", sourceId: 3,
                title: "Ndlovu Construction's bank details changed on 11 Nov — verify the new account before paying",
                bankChange: bankChange as any,
              }]}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    };
    const fillCall = () => {
      fireEvent.change(screen.getByLabelText("Who you phoned"), { target: { value: "J. Ndlovu, FD" } });
      fireEvent.change(screen.getByLabelText("When"), { target: { value: "2026-11-11T08:30" } });
    };

    it("shows every field Was and Now, with what changed marked", () => {
      drawAlert(change({
        fieldsChanged: ["bank_name", "account_number", "account_type", "swift_code"],
        after: masked("•••• 6554", { bankName: "Capitec", accountType: "Savings", swiftCode: "CABLZAJJ", accountDigits: 10 }),
      }));
      fireEvent.click(screen.getByRole("button", { name: "Verify…" }));
      const row = (label: string) => screen.getByRole("rowheader", { name: new RegExp(`^${label}`) }).closest("tr")!;
      for (const label of ["Account holder", "Bank", "Branch code", "Account type", "Account number", "SWIFT / BIC"]) {
        expect(row(label)).toBeInTheDocument();
      }
      expect(row("Bank")).toHaveTextContent(/FNB.*Capitec/);
      expect(row("Bank")).toHaveTextContent("Changed");
      expect(row("Account type")).toHaveTextContent(/Current.*Savings/);
      expect(row("SWIFT / BIC")).toHaveTextContent(/None.*CABLZAJJ/);
      expect(row("Account number")).toHaveTextContent(/•••• 5678 \(11 digits\).*•••• 6554 \(10 digits\)/);
      expect(row("Branch code")).not.toHaveTextContent("Changed");
    });

    it("never lets the masking make a changed number look unchanged", () => {
      drawAlert(change({ before: masked("•••• 5678"), after: masked("•••• 5678") }));
      fireEvent.click(screen.getByRole("button", { name: "Verify…" }));
      expect(screen.getByRole("alert")).toHaveTextContent(/digits shown are the same\. It is a different account/);
    });

    it("verifies only once it says who was phoned and that the number was already known", async () => {
      drawAlert(change());
      fireEvent.click(screen.getByRole("button", { name: "Verify…" }));
      const verified = screen.getByRole("button", { name: "Verified by phone" });
      expect(verified).toBeDisabled();
      fillCall();
      expect(verified).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox"));
      expect(verified).not.toBeDisabled();
      fireEvent.click(verified);
      await waitFor(() => expect(postData).toHaveBeenCalled());
      const { url, data } = (postData.mock.calls.at(-1) as any[])[0];
      expect(url).toBe("projects/46/bank-detail-changes/3/verify/");
      expect(data.contactName).toBe("J. Ndlovu, FD");
      expect(data.calledAt).toBe(new Date("2026-11-11T08:30").toISOString());
    });

    it("reports a change as not genuine, which needs what they said", async () => {
      drawAlert(change());
      fireEvent.click(screen.getByRole("button", { name: "Verify…" }));
      fillCall();
      const report = screen.getByRole("button", { name: "Not genuine — report fraud" });
      expect(report).toBeDisabled();
      fireEvent.change(screen.getByLabelText("What they told you"), { target: { value: "They never changed it" } });
      expect(report).not.toBeDisabled();
      fireEvent.click(report);
      await waitFor(() => expect((postData.mock.calls.at(-1) as any[])[0].url).toBe("projects/46/bank-detail-changes/3/report/"));
      expect((postData.mock.calls.at(-1) as any[])[0].data.note).toBe("They never changed it");
    });

    it("offers no outcome to someone who may not verify", () => {
      drawAlert(change({ canVerify: false }));
      fireEvent.click(screen.getByRole("button", { name: "View…" }));
      expect(screen.queryByRole("button", { name: "Verified by phone" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /report fraud/ })).not.toBeInTheDocument();
    });

    it("shows a reported change as held, with no way to verify it", () => {
      drawAlert(change({
        check: { outcome: "not_genuine", at: "2026-11-11T09:30:00Z", by: "M. Mokoena", contactName: "J. Ndlovu",
          calledAt: "2026-11-11T09:15:00Z", note: "Never changed it" },
      }));
      fireEvent.click(screen.getByRole("button", { name: "Details…" }));
      expect(screen.getByText(/Do not pay into the new account\./)).toBeInTheDocument();
      expect(screen.getByText(/Baselinq support has been told/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Verified by phone" })).not.toBeInTheDocument();
    });
  });

  it("names the fee rate the project actually carries, not a fixed 1%", () => {
    draw({
      ...DATA,
      fees: {
        items: [{ source: "PC-006", baseExclVat: "1000000.00", feeRatePct: "0.75", totalInclVat: "8625.00", state: "paid", invoiceId: null, invoiceNumber: null, dueOn: null }],
        totals: { accruedInclVat: "8625.00", invoicedInclVat: "0.00", paidInclVat: "8625.00", outstandingInclVat: "0.00" },
      },
    });
    expect(screen.getByText("Baselinq fees (0,75%)")).toBeInTheDocument();
    expect(screen.queryByText(/\(1%\)/)).not.toBeInTheDocument();
  });

  it("shows a rand equivalent for a project in another currency, saying the rate, day and source", async () => {
    const { setActiveCurrency } = await import("@/lib/formatCurrency");
    setActiveCurrency("USD");
    draw({
      ...DATA,
      homeEquivalent: {
        currency: "ZAR", available: true, rate: "18.450000", asOf: "2026-11-11", source: "open.er-api.com",
        revisedContractSum: "857519100.00", certifiedToDate: "615252150.00", paidInclVat: "1.00", outstandingInclVat: "2.00",
      },
    });
    expect(screen.getByText(/In rand: revised sum R\s857\s519\s100,00 excl\. VAT/)).toBeInTheDocument();
    expect(screen.getByText(/paid R\s1,00 incl\. VAT/)).toBeInTheDocument();
    expect(screen.getByText(/At 1 USD = R 18,45/)).toBeInTheDocument();
    expect(screen.getByText(/open\.er-api\.com/)).toBeInTheDocument();
    setActiveCurrency("ZAR");
  });
});

const alert = (n: number) => ({
  code: "PAYMENT_OVERDUE",
  title: `PC-${n} unpaid ${n} days after the payment due date`,
  severity: "red" as const,
  sourceType: "paymentcertificate",
  sourceId: n,
});
const page = (p: number, ids: number[]) => ({
  count: 7, page: p, pageSize: 5, totalPages: 2, counts: { red: 6, orange: 1 }, results: ids.map(alert),
});

describe("NeedsAttentionPanel", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  const drawPanel = (codes?: string[]) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NeedsAttentionPanel projectId={45} codes={codes} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("asks the server for one page at a time and pages on", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes("page=2") ? page(2, [6, 7]) : page(1, [1, 2, 3, 4, 5])),
    );
    drawPanel();
    expect(await screen.findByText("Needs attention (7)")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("projects/45/financial-position/alerts/?page=1&pageSize=5");
    expect(screen.getByText("6 urgent")).toBeInTheDocument();
    expect(screen.getByText("1–5 of 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous alerts" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next alerts" }));
    expect(await screen.findByText("PC-7 unpaid 7 days after the payment due date")).toBeInTheDocument();
    expect(screen.getByText("6–7 of 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next alerts" })).toBeDisabled();
  });

  it("passes the codes it is limited to", async () => {
    mockFetch.mockResolvedValue(page(1, [1]));
    drawPanel(["TAX_INVOICE_MISSING", "PAYMENT_UNCONFIRMED"]);
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "projects/45/financial-position/alerts/?page=1&pageSize=5&codes=TAX_INVOICE_MISSING%2CPAYMENT_UNCONFIRMED",
      ),
    );
  });

  it("shows nothing when nothing needs attention", async () => {
    mockFetch.mockResolvedValue({ count: 0, page: 1, pageSize: 5, totalPages: 1, counts: { red: 0, orange: 0 }, results: [] });
    const { container } = drawPanel();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * The payment position, at the render level.
 *
 * Every assertion here is a way this section could mislead someone about
 * money they are owed or owe. None of them is a styling preference.
 *
 * The sharpest is the first. JBCC counts payment from the date FOR issue, and
 * that field is captured nowhere in the UI — so the server falls back to the
 * certificate date and says so. A fallback can only ever run LATE, in the
 * employer's favour. "123 days past due" printed on its own off that basis
 * would invite a contractor to demand interest from a date the contract does
 * not support, which is a worse position than never having been given the
 * number.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const state: { data: any; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/hooks/useFetch", () => ({ default: () => state }));
let perms: Record<string, boolean> = {};
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => perms[code] ?? true,
  useIsPlatformStaff: () => false,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const postData = vi.fn(async (..._a: unknown[]) => ({}));
vi.mock("@/lib/Api", () => ({ postData: (...a: unknown[]) => postData(...a) }));
vi.mock("@/hooks/useProjectCommercials", () => ({ invalidateProjectCommercials: vi.fn() }));
vi.mock("../RecordPaymentDialog", () => ({ default: () => null }));

import PaymentPositionSection from "../PaymentPositionSection";

const base = {
  paymentCertificateId: 48,
  pcNumber: "PC-004",
  isPayable: true,
  asAt: "2026-11-02",
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
    basis: "certificate_date",
    basisIsContractual: false,
    calculation: "14 calendar days from 2026-06-18 (the certificate date) = 2026-07-02.",
    warning:
      "Counted from the certificate date because no date for issue is recorded.",
    terms: { configured: false, provenance: "JBCC: payment within 14 calendar days" },
  },
  receipts: [],
};

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const draw = (data: any) => {
  state.data = data;
  state.isLoading = false;
  state.isError = false;
  perms = {};
  return wrap(<PaymentPositionSection certificateId={48} projectId={45} open />);
};

describe("payment position", () => {
  it("never shows an overdue count without the basis warning behind it", () => {
    draw(base);
    expect(screen.getByText(/123 days past due/)).toBeInTheDocument();
    expect(
      screen.getByText(/Counted from the certificate date because no date for issue is recorded/),
    ).toBeInTheDocument();
  });

  it("does not present an outage as a settled certificate", () => {
    state.data = undefined;
    state.isError = true;
    state.isLoading = false;
    perms = {};
    wrap(<PaymentPositionSection certificateId={48} projectId={45} open />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  describe("interest", () => {
    it("says it cannot be worked out rather than reporting R0,00", () => {
      // The server returns totalInterest 0.00 with complete:false when NO
      // period could be rated. "At least R 0,00" is true and useless — it
      // reads as "almost nothing is owed".
      draw({
        ...base,
        interest: {
          applicable: true,
          complete: false,
          totalInterest: "0.00",
          statement: "PARTIAL: 6 of 6 period(s) could not be rated.",
          segments: [
            {
              from: "2026-07-03",
              to: "2026-07-31",
              days: 29,
              outstanding: "1748000.00",
              rateAvailable: false,
              unavailableReason: "No repo rate captured.",
            },
          ],
        },
      });
      // Plain words, not the server's "PARTIAL: 6 of 6 period(s)…" code.
      expect(screen.getByText(/Late-payment interest is not available yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/At least/)).not.toBeInTheDocument();
    });

    it("marks an unrated period 'Not rated', not zero and not a dash", () => {
      draw({
        ...base,
        interest: {
          applicable: true,
          complete: false,
          totalInterest: "0.00",
          statement: "PARTIAL.",
          segments: [
            {
              from: "2026-07-03",
              to: "2026-07-31",
              days: 29,
              outstanding: "1748000.00",
              rateAvailable: false,
              unavailableReason: "No repo rate captured.",
            },
          ],
        },
      });
      // "—" is how money() renders null everywhere else in this screen, so it
      // would read as nil; R 0,00 would read as "no interest accrued".
      expect(screen.getByText("Not rated")).toBeInTheDocument();
      const body = (document.body.textContent ?? "").replace(/ /g, " ");
      expect(body).toContain("R 1 748 000,00"); // the balance, from `outstanding`
    });

    it("states an organ-of-state no-interest case neutrally, not as a warning", () => {
      // The contract gives no interest. Styling this as a problem tells a
      // state-sector contractor something is wrong when nothing is.
      draw({
        ...base,
        interest: {
          applicable: false,
          reason: "This contract provides for no late-payment interest.",
        },
      });
      expect(screen.getByText(/provides for no late-payment interest/)).toBeInTheDocument();
      expect(screen.queryByText(/cannot be worked out/i)).not.toBeInTheDocument();
    });
  });

  describe("receipts", () => {
    it("keeps a reversed receipt visible so the total still reconciles", () => {
      // A reversal is not a delete. Hide either row and the received total
      // stops agreeing with what is on screen.
      draw({
        ...base,
        receivedAmount: "0.00",
        receipts: [
          { id: 1, amount: "500000.00", receivedOn: "2026-10-01", reference: "EFT-1", status: "reversed", reversalReason: "Entered twice." },
          { id: 2, amount: "500000.00", receivedOn: "2026-10-02", status: "reversal", reversesReceiptId: 1 },
        ],
      });
      expect(screen.getByText("Reversed")).toBeInTheDocument();
      expect(screen.getByText("Reversal")).toBeInTheDocument();
      expect(screen.getByText(/Entered twice/)).toBeInTheDocument();
    });
  });

  it("carries the as-at date, so a screenshot in a dispute is dated", () => {
    draw(base);
    expect(screen.getByText(/As at/)).toBeInTheDocument();
  });

  describe("reversal", () => {
    it("offers Reverse on a recorded receipt to someone who may approve payments", () => {
      // The server's status value is "recorded". An earlier revision assumed
      // "active", so the control was never shown at all.
      draw({
        ...base,
        receipts: [
          { id: 1, amount: "500000.00", receivedOn: "2026-10-01", status: "recorded" },
        ],
      });
      expect(screen.getByRole("button", { name: /reverse/i })).toBeInTheDocument();
    });

    it("withholds it from someone who only has finance.edit", () => {
      // Reversal is gated harder than recording, as the server gates it:
      // it withdraws an assertion that money arrived.
      state.data = {
        ...base,
        receipts: [
          { id: 1, amount: "500000.00", receivedOn: "2026-10-01", status: "recorded" },
        ],
      };
      state.isError = false;
      state.isLoading = false;
      perms = { "finance.approve_payment": false };
      wrap(<PaymentPositionSection certificateId={48} projectId={45} open />);
      expect(screen.queryByRole("button", { name: /reverse/i })).not.toBeInTheDocument();
    });

    it("does not offer it on a receipt that is already reversed", () => {
      draw({
        ...base,
        receipts: [
          { id: 1, amount: "500000.00", receivedOn: "2026-10-01", status: "reversed" },
          { id: 2, amount: "500000.00", receivedOn: "2026-10-02", status: "reversal" },
        ],
      });
      expect(screen.queryByRole("button", { name: /reverse/i })).not.toBeInTheDocument();
    });
  });

  describe("the contractor's confirmation", () => {
    const pending = {
      id: 7, amount: "500000.00", receivedOn: "2026-10-01", status: "recorded",
      proofUrl: "/api/payment-receipts/7/proof/?sig=abc", proofName: "pop.pdf", confirmation: "pending",
    };

    it("shows the proof and that it awaits the contractor", () => {
      draw({ ...base, receipts: [pending] });
      expect(screen.getByText("Awaiting contractor")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Proof of payment" })).toBeInTheDocument();
    });

    it("opens the proof on the API's host, not this app's", () => {
      // The API sends a path. Left relative, the app's host would answer it
      // with index.html and the proof would never open.
      vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
      try {
        draw({ ...base, receipts: [pending] });
        expect(screen.getByRole("link", { name: "Proof of payment" })).toHaveAttribute(
          "href",
          "https://api.example.test/api/payment-receipts/7/proof/?sig=abc",
        );
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("asks whether the money arrived, only of someone who may answer", () => {
      draw({ ...base, receipts: [{ ...pending, canConfirm: true }] });
      expect(screen.getByText(/Did R\s500\s000,00 arrive in your account\?/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Yes, received…" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "No, not received…" })).toBeInTheDocument();
    });

    it("does not offer them to the person who recorded it", () => {
      draw({ ...base, receipts: [{ ...pending, canConfirm: false }] });
      expect(screen.queryByRole("button", { name: /Yes, received/ })).not.toBeInTheDocument();
    });

    it("restates the amount, date and payer reference before confirming", async () => {
      postData.mockClear();
      draw({ ...base, receipts: [{ ...pending, reference: "EFT-881", canConfirm: true }] });
      fireEvent.click(screen.getByRole("button", { name: "Yes, received…" }));
      // One click no longer confirms: nothing is sent until the restated payment is accepted.
      expect(postData).not.toHaveBeenCalled();
      const dialog = screen.getByRole("dialog", { name: "Confirm the money is in your account" });
      expect(dialog).toHaveTextContent(/R\s500\s000,00/);
      expect(dialog).toHaveTextContent("EFT-881");
      expect(dialog).toHaveTextContent(/1 Oct 2026/);
      fireEvent.click(screen.getByRole("button", { name: "Yes, it arrived" }));
      await waitFor(() =>
        expect(postData).toHaveBeenCalledWith({ url: "payment-receipts/7/confirm/", data: { received: true, note: "" } }),
      );
    });

    it("lets a confirmation pressed in error be corrected, with a reason", async () => {
      postData.mockClear();
      draw({
        ...base,
        receipts: [{
          ...pending, confirmation: "confirmed", canCorrectConfirmation: true, correctableUntil: "2026-10-15T09:00:00Z",
        }],
      });
      fireEvent.click(screen.getByRole("button", { name: "Correct…" }));
      const button = screen.getByRole("button", { name: "It did not arrive" });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Why you are correcting it"), { target: { value: "Not on our statement" } });
      fireEvent.click(button);
      await waitFor(() =>
        expect(postData).toHaveBeenCalledWith({
          url: "payment-receipts/7/correct-confirmation/",
          data: { reason: "Not on our statement" },
        }),
      );
    });

    it("offers no correction once the server says the window has closed", () => {
      draw({ ...base, receipts: [{ ...pending, confirmation: "confirmed", canCorrectConfirmation: false }] });
      expect(screen.queryByRole("button", { name: "Correct…" })).not.toBeInTheDocument();
    });

    it("does not show a receipt from before confirmation existed as confirmed", () => {
      draw({ ...base, receipts: [{ id: 8, amount: "1.00", receivedOn: "2026-09-01", status: "recorded", confirmation: null }] });
      expect(screen.queryByText("Receipt confirmed")).not.toBeInTheDocument();
      expect(screen.queryByText("Awaiting contractor")).not.toBeInTheDocument();
    });
  });

  it("offers Record payment to the Employer, who records with proof but holds no finance.edit", () => {
    state.data = { ...base, canRecordPayment: true };
    state.isError = false;
    state.isLoading = false;
    perms = { "finance.edit": false };
    wrap(<PaymentPositionSection certificateId={48} projectId={45} open />);
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
  });

  it("withholds Record payment when the server says this viewer may not", () => {
    state.data = { ...base, canRecordPayment: false };
    perms = {};
    wrap(<PaymentPositionSection certificateId={48} projectId={45} open />);
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
  });

  it("withholds Record payment when the server does not say this viewer may", () => {
    // A missing flag used to fall back to finance.edit, which the
    // contractor's own CM holds.
    draw({ ...base });
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
  });

  it("does not call an unverified payable figure VAT-inclusive", () => {
    draw({ ...base, certifiedBasis: "net_amount_unverified" });
    expect(screen.getByText("Payable (VAT basis unverified)")).toBeInTheDocument();
    expect(screen.queryByText("Payable incl. VAT")).not.toBeInTheDocument();
  });

  it("keeps a reversal reason readable rather than struck through", () => {
    draw({
      ...base,
      receipts: [{ id: 1, amount: "500000.00", receivedOn: "2026-10-01", status: "reversed", reversalReason: "Entered twice." }],
    });
    expect(screen.getByText("Entered twice.").closest(".line-through")).toBeNull();
  });

  it("says nothing is payable before the certificate is posted", () => {
    draw({ ...base, isPayable: false });
    expect(screen.getByText(/Nothing is payable until this certificate is posted/)).toBeInTheDocument();
  });
});

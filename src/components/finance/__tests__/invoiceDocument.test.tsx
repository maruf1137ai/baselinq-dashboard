/**
 * The tax invoice as a document.
 *
 * Every assertion below is a field the server was already sending and the UI
 * was dropping, or a statement the document made that was not true. A tax
 * invoice is read by a client's bookkeeper, filed, and produced to an auditor
 * eighteen months later; the failure mode is not an ugly screen, it is an
 * invoice that cannot be relied on or cannot be paid.
 *
 * The recipient block gets the most attention here for the reason it gets the
 * most attention in the component: `PlatformInvoice` has no recipient company
 * identity at all, and the one thing that must never happen is a plausible
 * one appearing there.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { InvoiceDocument } from "@/components/billing/InvoiceDetail";
import { type Invoice, missingIssuerFields } from "@/lib/platformBilling";

/**
 * An issued invoice carrying every field the server sends, so a dropped field
 * shows up here as a missing assertion rather than as an absent fixture.
 */
const ISSUED = {
  id: 1,
  projectId: 45,
  projectName: "Market Building",
  projectNumber: "PRJ-045",
  invoiceNumber: "BLQ-00045-0001",
  status: "issued",
  displayStatus: "unpaid",
  isSettled: false,
  isOutstanding: true,
  isOverdue: false,
  dueOn: "2026-11-30",
  supplierDetails: {
    legalName: "Baselinq (Pty) Ltd",
    vatNumber: "4000000000",
    registrationNumber: "2024/123456/07",
    address: "1 Bree Street, Cape Town, 8001",
    billingEmail: "billing@baselinq.test",
    bankName: "FNB",
    bankAccountName: "Baselinq (Pty) Ltd",
    bankAccountNumber: "62000000000",
    bankBranchCode: "250655",
  },
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  subtotal: "2000.00",
  vatAmount: "300.00",
  totalAmount: "2300.00",
  billingContactName: "Thandi Mokoena",
  billingContactEmail: "ap@vantage.test",
  notes: "Rate reduced to 0.75% for October by agreement.",
  issuedAt: "2026-11-02T08:15:00Z",
  settledAt: null,
  settledOn: null,
  settledReference: "",
  cancelledAt: null,
  cancellationReason: "",
  createdAt: "2026-10-31T00:00:00Z",
  vatRounding: "0.00",
  lines: [
    {
      id: 10,
      feeChargeId: 100,
      isCredit: false,
      isLive: true,
      description: "Platform fee at 1.000% on payment certificate PC-007",
      sourceRef: "PC-007",
      baseAmount: "100000.00",
      feeRatePct: "1.000",
      feeAmount: "1000.00",
      vatRatePct: "15.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
    },
    {
      id: 11,
      feeChargeId: 101,
      isCredit: true,
      isLive: true,
      description: "Reversal of platform fee on payment certificate PC-007",
      sourceRef: "PC-007",
      baseAmount: "100000.00",
      feeRatePct: "1.000",
      feeAmount: "1000.00",
      vatRatePct: "15.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
    },
  ],
} as unknown as Invoice;

const draw = (invoice: Invoice, isStaff = false) =>
  render(
    <MemoryRouter>
      <InvoiceDocument invoice={invoice} isStaff={isStaff} />
    </MemoryRouter>,
  );

/** `formatZAR` groups with a NON-BREAKING space on purpose. */
const text = () => (document.body.textContent ?? "").replace(/ /g, " ");

describe("the tax invoice document", () => {
  it("is titled as what it is", () => {
    draw(ISSUED);
    const heading = screen.getByRole("heading", { name: "TAX INVOICE" });
    expect(heading).toBeInTheDocument();
    // In the masthead. It also appears as the payment reference in the banking
    // block, which is the point of `bankDetailLines` taking the number.
    expect(heading.parentElement?.textContent).toContain("BLQ-00045-0001");
    expect(screen.getAllByText("BLQ-00045-0001")).toHaveLength(2);
  });

  it("carries the invoice date, which no screen in the product used to render", () => {
    draw(ISSUED);
    // `issuedAt`, not `createdAt`: a draft built on 31 October and issued on
    // 2 November is dated 2 November. It is mandatory on a tax invoice.
    expect(screen.getByText("Invoice date")).toBeInTheDocument();
    expect(screen.getByText("02 November 2026")).toBeInTheDocument();
  });

  it("states the supply period as a range, not only its end", () => {
    draw(ISSUED);
    // `periodStart` was sent all along and dropped, so the document said
    // "fees up to 31 October" without saying from when.
    expect(text()).toContain("01 October 2026 – 31 October 2026");
  });

  it("renders the fields the UI was discarding", () => {
    draw(ISSUED);
    const body = text();
    expect(body).toContain("PRJ-045"); // projectNumber, beside projectName
    expect(body).toContain("2024/123456/07"); // supplier registrationNumber
    expect(body).toContain("billing@baselinq.test"); // supplier billingEmail
    // Staff can type notes on an invoice; both screens dropped the field, so
    // they went nowhere at all.
    expect(body).toContain("Rate reduced to 0.75% for October by agreement.");
  });

  it("shows a credit line with its minus sign, so the lines sum to the total (QA BUG-21)", () => {
    draw(ISSUED);
    /*
      The server carries direction as a FLAG — `totalAmount` is always
      positive, `isCredit` decides the sign — while the invoice total is
      computed signed. Rendering the flag as a positive number made a charge
      and its reversal show the same figure above a R 0,00 total, so the lines
      could not be made to sum.
    */
    const rows = screen
      .getAllByRole("row")
      .map((r) => (r.textContent ?? "").replace(/ /g, " "));
    const credit = rows.find((t) => t.includes("Credit")) ?? "";
    const debit = rows.find((t) => t.includes("PC-007") && !t.includes("Credit")) ?? "";

    expect(credit).toContain("R -1 150,00");
    expect(credit).toContain("R -100 000,00");
    expect(debit).toContain("R 1 150,00");
    expect(debit).not.toContain("R -");
  });

  it("shows every line without an inner scroll", () => {
    const { container } = draw(ISSUED);
    // The lines used to sit in a `max-h-[300px] overflow-y-auto` box, so an
    // invoice could be paid without its last line ever being on screen.
    expect(container.querySelector("[class*='max-h-']")).toBeNull();
    expect(container.querySelector("[class*='overflow-y-auto']")).toBeNull();
  });

  it("keeps VAT as its own line and the totals in their order", () => {
    draw(ISSUED);
    const body = text();
    expect(body).toContain("Platform fee");
    expect(body).toContain("VAT (15%)");
    expect(body).toContain("Total due");
  });

  describe("Billed by", () => {
    it("always renders, and names what is missing rather than vanishing", () => {
      // The issuer block used to be hidden entirely unless a legal name or a
      // VAT number was present, so an invoice with neither went out with no
      // supplier on it at all.
      draw({ ...ISSUED, supplierDetails: { bankName: "FNB" } } as Invoice);
      expect(screen.getByText("Billed by")).toBeInTheDocument();
      const body = text();
      expect(body).toContain("registered name");
      expect(body).toContain("VAT number");
      expect(body).toContain("not valid without them");
    });

    it("tells staff where to fix it, and tells the customer only that it is wrong", () => {
      const bare = { ...ISSUED, supplierDetails: { bankName: "FNB" } } as Invoice;
      const staff = draw(bare, true);
      expect(text()).toContain("Admin Panel");
      staff.unmount();

      draw(bare, false);
      // The gap is still shown — it is the customer's problem too — without
      // instructions they cannot act on.
      expect(text()).toContain("not valid without them");
      expect(text()).not.toContain("Admin Panel");
    });

    it("says nothing when every required field is there", () => {
      draw(ISSUED);
      expect(text()).not.toContain("not valid without them");
    });
  });

  describe("Billed to", () => {
    it("renders the contact as an attention line, not as a company", () => {
      draw(ISSUED);
      // `billingContactName` is a PERSON. Presenting it where a registered
      // name belongs is how an invoice ends up addressed to a clerk.
      expect(text()).toContain("Attention: Thandi Mokoena");
      expect(text()).toContain("ap@vantage.test");
    });

    it("states the recipient identity gap instead of hiding it", () => {
      draw(ISSUED);
      /*
        `PlatformInvoice` holds no recipient legal name, registration number,
        VAT number or address. Nothing may be invented and nothing may be
        borrowed from the project — a project's name is not its employer's
        registered name. The gap is Baselinq's to see rather than the client
        auditor's to discover.
      */
      // Wording from ecb7b0d, which names each missing field and where to add it.
      expect(text()).toContain("This invoice does not carry the employer's registered name");
      expect(text()).toContain("Capture them in the project's client details.");
      // And emphatically NOT the project standing in for the company.
      const billedTo = screen.getByText("Billed to").closest("section");
      expect(billedTo?.textContent).not.toContain("Market Building");
    });
  });

  describe("a settled invoice", () => {
    const SETTLED = {
      ...ISSUED,
      status: "settled",
      displayStatus: "paid",
      isSettled: true,
      isOutstanding: false,
      settledOn: "2026-11-20",
      settledReference: "FNB 4417829",
    } as unknown as Invoice;

    it("still shows how it was payable", () => {
      draw(SETTLED);
      // The banking block used to render only while money was owed, so the
      // copy that gets filed and audited showed no account at all.
      expect(text()).toContain("Payable to");
      expect(text()).toContain("62000000000");
    });

    it("carries the urgency in a paid stamp rather than in what is hidden", () => {
      draw(SETTLED);
      expect(screen.getByText("Paid on 20 November 2026")).toBeInTheDocument();
      expect(text()).toContain("FNB 4417829");
      expect(text()).not.toContain("Pay by bank transfer");
    });
  });

  describe("a draft", () => {
    const DRAFT = {
      ...ISSUED,
      status: "draft",
      displayStatus: "draft",
      invoiceNumber: null,
      issuedAt: null,
      dueOn: null,
    } as unknown as Invoice;

    it("says in words that it is not a valid tax invoice", () => {
      draw(DRAFT);
      // In WORDS and not only as a watermark: the rotated text is decorative
      // and aria-hidden, so the banner has to carry the statement.
      expect(text()).toContain("Draft — not a valid tax invoice.");
      expect(text()).toContain("Not yet numbered");
      expect(text()).toContain("Not issued");
    });

    it("is watermarked so a printout of it cannot pass as one", () => {
      const { container } = draw(DRAFT);
      const marks = [...container.querySelectorAll("[aria-hidden='true']")].filter(
        (el) => el.textContent === "Draft",
      );
      expect(marks).toHaveLength(1);
    });

    it("carries no watermark once it has been issued", () => {
      const { container } = draw(ISSUED);
      expect(
        [...container.querySelectorAll("span")].some((el) => el.textContent === "Draft"),
      ).toBe(false);
    });
  });
});

describe("missingIssuerFields", () => {
  it("names each absent field, so the warning can be acted on", () => {
    expect(missingIssuerFields({})).toEqual([
      "registered name",
      "VAT number",
      "registration number",
      "address",
    ]);
  });

  it("treats whitespace as absent — a space is not a VAT number", () => {
    expect(
      missingIssuerFields({
        legalName: "Baselinq (Pty) Ltd",
        vatNumber: "   ",
        registrationNumber: "2024/123456/07",
        address: "1 Bree Street",
      }),
    ).toEqual(["VAT number"]);
  });

  it("is empty on a complete issuer", () => {
    expect(missingIssuerFields(ISSUED.supplierDetails)).toEqual([]);
  });
});

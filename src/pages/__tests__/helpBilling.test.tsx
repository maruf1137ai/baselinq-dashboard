/**
 * Billing help — for project users (/help/billing) and for Baselinq staff
 * (Admin Panel → Billing → Guide).
 *
 * 1. **Both render with nothing loaded.** The project page reads live role
 *    grants; until they arrive it must show its static prose, not crash.
 * 2. **Every section has a jump link**, so one cannot be added unreachable.
 * 3. **The facts survive edits.** VAT is on the fee not the work, the base
 *    excludes VAT, there is one invoice a month, and the worked example adds
 *    up. These are the points the client asked to have right "all the time",
 *    so they are asserted, not trusted.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import HelpBilling, { BILLING_SECTIONS } from "@/pages/HelpBilling";
import BillingGuide from "@/pages/account/admin/billing/BillingGuide";

function renderPage(page: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");

describe("Billing reference (project users)", () => {
  it("mounts and draws its heading with no data loaded", () => {
    renderPage(<HelpBilling />);
    expect(screen.getByRole("heading", { name: "Billing reference", level: 1 })).toBeInTheDocument();
  });

  it("renders every section with a jump link", () => {
    renderPage(<HelpBilling />);
    for (const s of BILLING_SECTIONS) {
      expect(screen.getByRole("heading", { name: s.title, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: s.title })).toHaveAttribute("href", `#${s.type.toLowerCase()}`);
    }
  });

  it("states the money rules correctly", () => {
    renderPage(<HelpBilling />);
    const body = text();
    expect(body).toContain("worked out on the value EXCLUDING VAT");
    expect(body).toContain("VAT at 15% is then added to the fee itself");
    expect(body).toContain("Each rand is charged once");
    expect(body).toContain("ONE invoice after the month ends");
    expect(body).toContain("invoice number (BLQ-…) as the payment reference");
  });

  it("has a worked example that adds up", () => {
    renderPage(<HelpBilling />);
    const body = text();
    // VO: 1% of R100 000 = R1 000 + R150 VAT.
    expect(body).toContain("1% = R1 000 fee + R150 VAT = R1 150");
    // PC: R500 000 − R25 000 retention − R100 000 already charged = R375 000.
    expect(body).toContain("= R375 000");
    expect(body).toContain("1% = R3 750 fee + R562,50 VAT = R4 312,50");
    // Month: R1 000 + R3 750 fee, R150 + R562,50 VAT.
    expect(body).toContain("R4 750 fee + R712,50 VAT = R5 462,50");
  });

  it("explains every status the Finance tabs show", () => {
    renderPage(<HelpBilling />);
    for (const status of ["Not invoiced", "Invoiced · BLQ-…", "Unpaid", "Overdue", "Paid", "Reversed / Credit"]) {
      expect(screen.getByText(status)).toBeInTheDocument();
    }
  });
});

describe("Billing guide (Baselinq staff)", () => {
  it("mounts with every step section and jump link", () => {
    renderPage(<BillingGuide />);
    expect(screen.getByRole("heading", { name: "Billing guide" })).toBeInTheDocument();
    for (const title of [
      "1. Before the first invoice (once)",
      "2. A project's billing terms",
      "3. Every month: build, check, issue",
      "4. When the money arrives",
      "5. Chasing overdue invoices",
      "6. Fixing a mistake",
      "7. Changing a rate",
      "Messages you might see",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("says what blocks an invoice and what a rate change does not touch", () => {
    renderPage(<BillingGuide />);
    const body = text();
    expect(body).toContain("legal name, VAT registration number and address. These three are required");
    expect(body).toContain("A rate change only affects fees recorded after it");
    expect(body).toContain("A paid invoice cannot be cancelled");
    // On by default, and switching on charges what is already posted/approved.
    expect(body).toContain("Billing is ON by default");
    expect(body).toContain("charges every certificate already posted and every variation already approved");
    // A rate below 1% waits for a second superuser; overdue locks the project.
    expect(body).toContain("cannot approve their own request");
    expect(body).toContain("the project locks to read-only");
  });

  it("tells project users when a fee is raised, where to find it and about the lock", () => {
    renderPage(<HelpBilling />);
    const body = text();
    expect(body).toContain("when a payment certificate reaches Posted");
    expect(body).toContain("14 days after it is issued");
    expect(body).toContain("If an invoice stays unpaid");
    expect(body).not.toContain("Finance → Baselinq Billing");
  });
});

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

let response: any;
const mockPost = vi.fn();
vi.mock("@/hooks/useFetch", () => ({
  default: () => ({ data: response, isLoading: false, isError: false }),
}));
vi.mock("@/lib/Api", () => ({ postData: (...a: unknown[]) => mockPost(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { TaxInvoiceSection } from "../TaxInvoiceSection";

const draft = {
  id: 9, paymentCertificateId: 48, pcNumber: "PC-004", status: "draft",
  invoiceNumber: null, invoiceDate: null,
  supplier: { name: "Ndlovu Construction" }, recipient: { name: "Mokoena Holdings" },
  description: "…", amountExclVat: "1520000.00", vatRatePct: "15.00", vatAmount: "228000.00",
  totalInclVat: "1748000.00", advanceRecovery: "0.00", issuedAt: null, issuedBy: null,
  creditNoteNumber: null, creditedAt: null, reason: null,
};

const draw = (props: Partial<React.ComponentProps<typeof TaxInvoiceSection>> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TaxInvoiceSection certificateId={48} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => mockPost.mockReset().mockResolvedValue({}));

describe("TaxInvoiceSection", () => {
  it("offers to prepare one when there is none", async () => {
    response = { invoice: null, cancelled: [], canEdit: true };
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Prepare tax invoice" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith({ url: "payment-certificates/48/tax-invoice/", data: {} }));
  });

  it("shows the locked figures and issues under the contractor's number", async () => {
    response = { invoice: draft, cancelled: [], canEdit: true };
    draw();
    expect(screen.getByText("Tax invoice (draft)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Issue on the contractor's behalf…" }));
    fireEvent.change(screen.getByLabelText("Contractor's invoice number"), { target: { value: "INV-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost.mock.calls[0][0].url).toBe("tax-invoices/9/issue/");
    expect(mockPost.mock.calls[0][0].data.invoiceNumber).toBe("INV-42");
  });

  it("names what is missing when the server refuses", async () => {
    response = { invoice: draft, cancelled: [], canEdit: true };
    mockPost.mockRejectedValueOnce({
      response: { data: { error: "A valid tax invoice needs…", missing: ["contractor VAT number"] } },
    });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Issue on the contractor's behalf…" }));
    fireEvent.change(screen.getByLabelText("Contractor's invoice number"), { target: { value: "INV-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("contractor VAT number");
  });

  it("says which payment rule the contract applies", () => {
    response = { invoice: draft, cancelled: [], canEdit: false };
    draw({ invoiceRequiredForPayment: true });
    expect(screen.getByText(/payment is subject to the contractor's tax invoice/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Issue/ })).not.toBeInTheDocument();
  });

  it("lets the contractor upload their own invoice, and names each difference from the certificate", async () => {
    response = { invoice: draft, cancelled: [], canEdit: true, contractorSide: true };
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: "The invoice does not match the certificate…",
          code: "amounts_mismatch",
          differences: [{ field: "vat_amount", label: "VAT", invoice: "227000.00", certificate: "228000.00" }],
        },
      },
    });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Upload your tax invoice…" }));
    fireEvent.change(screen.getByLabelText("Your invoice number"), { target: { value: "DRA-1" } });
    fireEvent.change(screen.getByLabelText("Amount excl. VAT on the invoice"), { target: { value: "1 520 000,00" } });
    fireEvent.change(screen.getByLabelText("VAT on the invoice"), { target: { value: "227 000,00" } });
    fireEvent.change(screen.getByLabelText("Total incl. VAT on the invoice"), { target: { value: "1 747 000,00" } });
    fireEvent.change(screen.getByLabelText("Invoice document"), {
      target: { files: [new File(["%PDF"], "dra-1.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const { url, data } = mockPost.mock.calls[0][0];
    expect(url).toBe("tax-invoices/9/upload/");
    expect((data as FormData).get("amountExclVat")).toBe("1520000");
    expect(await screen.findByRole("alert")).toHaveTextContent(/VAT: R\s227\s000,00 on the invoice/);
  });

  it("makes the contractor's own upload the lead action, even before a draft exists", async () => {
    response = { invoice: null, cancelled: [], canEdit: true, contractorSide: true };
    mockPost.mockResolvedValueOnce({ invoice: draft });
    draw();
    const upload = screen.getByRole("button", { name: "Upload your tax invoice…" });
    expect(upload.className).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "Use Baselinq's draft instead" }).className).not.toContain("bg-primary");
    fireEvent.click(upload);
    // Prepares the draft it uploads over, then opens the upload — no separate step.
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith({ url: "payment-certificates/48/tax-invoice/", data: {} }));
    expect(await screen.findByRole("dialog", { name: "Upload your tax invoice" })).toBeInTheDocument();
  });

  it("says the amounts are typed and matched, and that Baselinq does not read the document", () => {
    response = { invoice: draft, cancelled: [], canEdit: true, contractorSide: true };
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Upload your tax invoice…" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/matched to the certificate/);
    expect(dialog).toHaveTextContent(/Baselinq does not read the document/);
    expect(dialog).not.toHaveTextContent(/must match the certificate exactly/);
  });

  it("tells reviewers an uploaded invoice's amounts were typed by the uploader, not read from the PDF", () => {
    response = {
      invoice: { ...draft, status: "issued", invoiceNumber: "DRA-1", source: "uploaded", issuedBy: "J. Ndlovu", documentUrl: "/x.pdf" },
      cancelled: [],
      canEdit: false,
    };
    draw();
    expect(screen.getByText(/typed by J\. Ndlovu when uploading and matched to the certificate/)).toBeInTheDocument();
    expect(screen.getByText(/does not read the document itself/)).toBeInTheDocument();
  });

  it("names an unreadable amount instead of silently keeping Upload grey", () => {
    response = { invoice: draft, cancelled: [], canEdit: true, contractorSide: true };
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Upload your tax invoice…" }));
    fireEvent.change(screen.getByLabelText("VAT on the invoice"), { target: { value: "twenty" } });
    expect(screen.getByText("That is not a readable amount.")).toBeInTheDocument();
  });

  it("opens the upload clean, so a file from an abandoned attempt is never sent", () => {
    response = { invoice: draft, cancelled: [], canEdit: true, contractorSide: true };
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Upload your tax invoice…" }));
    fireEvent.change(screen.getByLabelText("Your invoice number"), { target: { value: "OLD-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload your tax invoice…" }));
    expect(screen.getByLabelText("Your invoice number")).toHaveValue("");
  });

  it("states no payment rule while the terms are unknown, and says so when they failed", () => {
    response = { invoice: draft, cancelled: [], canEdit: false };
    const { unmount } = draw();
    expect(screen.queryByText(/does not delay payment/)).not.toBeInTheDocument();
    unmount();
    draw({ termsUnavailable: true });
    expect(screen.getByText(/payment terms could not be read/)).toBeInTheDocument();
    expect(screen.queryByText(/does not delay payment/)).not.toBeInTheDocument();
  });
});

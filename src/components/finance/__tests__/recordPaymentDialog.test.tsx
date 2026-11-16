/**
 * Recording a payment needs the employer's proof of payment (client decision,
 * 10 Nov 2026), except for a set-off, which moves no money.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { setActiveCurrency } from "@/lib/formatCurrency";

const postData = vi.fn(async () => ({}));
vi.mock("@/lib/Api", () => ({ postData: (...a: unknown[]) => postData(...(a as [])) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useProjectCommercials", () => ({ invalidateProjectCommercials: vi.fn() }));

import RecordPaymentDialog from "../RecordPaymentDialog";

const draw = (props: Partial<React.ComponentProps<typeof RecordPaymentDialog>> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordPaymentDialog
        open
        onOpenChange={() => {}}
        certificateId={48}
        projectId={45}
        pcNumber="PC-004"
        outstanding="1748000.00"
        serverToday="2026-11-10"
        {...props}
      />
    </QueryClientProvider>,
  );

const account = (account: string, bankName = "FNB") => ({
  bankName, branchCode: "250655", accountType: "", swiftCode: "", account, accountHolder: "Ndlovu Construction",
});
const attachProof = () =>
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(["%PDF"], "pop.pdf", { type: "application/pdf" })] },
  });

describe("recording a payment", () => {
  it("waits for the proof of payment before it can be recorded", () => {
    draw();
    const button = screen.getByRole("button", { name: "Record payment" });
    expect(button).toBeDisabled();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["%PDF"], "pop.pdf", { type: "application/pdf" })] } });
    expect(button).not.toBeDisabled();
  });

  it("says the proof is required, and why Record payment is still disabled", () => {
    draw();
    expect(screen.getByText("Proof of payment (required)")).toBeInTheDocument();
    expect(screen.getByText("Attach the bank's confirmation to record this payment.")).toBeInTheDocument();
    attachProof();
    expect(screen.queryByText("Attach the bank's confirmation to record this payment.")).not.toBeInTheDocument();
  });

  it("accepts its own prefilled amount on a project in another currency", () => {
    setActiveCurrency("USD");
    try {
      draw();
      expect(screen.queryByText("That is not a readable amount.")).not.toBeInTheDocument();
      attachProof();
      expect(screen.getByRole("button", { name: "Record payment" })).not.toBeDisabled();
    } finally {
      setActiveCurrency("ZAR");
    }
  });

  it("shows the verified account the payment should have gone to", () => {
    draw({
      payeeAccounts: [{
        holder: "Ndlovu Construction", account: account("•••• 5678"), status: "verified",
        change: { id: 3, holder: "Ndlovu Construction", changedAt: "2026-11-03T09:00:00Z", changedBy: null,
          fieldsChanged: ["account_number"], before: account("•••• 1111"), after: account("•••• 5678") },
        check: { outcome: "verified", at: "2026-11-03T10:00:00Z", by: "M. Mokoena", contactName: "J. Ndlovu",
          calledAt: "2026-11-03T09:45:00Z", note: null },
      }],
    });
    expect(screen.getByText("Pay into Ndlovu Construction's account")).toBeInTheDocument();
    expect(screen.getByText(/FNB · branch 250655 · •••• 5678/)).toBeInTheDocument();
    expect(screen.getByText(/verified by phone by M\. Mokoena/)).toBeInTheDocument();
  });

  it("warns plainly when the account changed and is not verified", () => {
    draw({
      payeeAccounts: [{
        holder: "Ndlovu Construction", account: account("•••• 6554", "Capitec"), status: "unverified",
        change: { id: 3, holder: "Ndlovu Construction", changedAt: "2026-11-11T09:00:00Z", changedBy: null,
          fieldsChanged: ["account_number", "bank_name"], before: account("•••• 5678"), after: account("•••• 6554", "Capitec") },
        check: null,
      }],
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/changed on 11 Nov 2026 and are not verified\. Do not pay into the new account yet/);
    expect(alert).toHaveTextContent(/Was FNB · branch 250655 · •••• 5678 · now Capitec/);
  });

  it("warns that a reported account must not be paid", () => {
    draw({
      payeeAccounts: [{
        holder: "Ndlovu Construction", account: account("•••• 6554"), status: "reported",
        change: { id: 3, holder: "Ndlovu Construction", changedAt: "2026-11-11T09:00:00Z", changedBy: null,
          fieldsChanged: ["account_number"], before: account("•••• 5678"), after: account("•••• 6554") },
        check: { outcome: "not_genuine", at: null, by: null, contactName: null, calledAt: null, note: null },
      }],
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/reported NOT GENUINE\. Do not pay into them/);
  });
});

describe("after the server warns about a recorded payment", () => {
  const warned = {
    warnings: [{ code: "near_duplicate", message: "A receipt of R 1 748 000,00 was already recorded on 10 Nov 2026." }],
  };
  const props = {
    onOpenChange: () => {},
    certificateId: 48,
    projectId: 45,
    pcNumber: "PC-004",
    serverToday: "2026-11-10",
  };

  it("keeps the warnings on screen when the refetch changes the outstanding amount", async () => {
    postData.mockResolvedValueOnce(warned);
    const client = new QueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <RecordPaymentDialog open outstanding="1748000.00" {...props} />
      </QueryClientProvider>,
    );
    attachProof();
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText(/was already recorded on 10 Nov 2026/)).toBeInTheDocument();

    // The invalidated payment position comes back with the receipt counted.
    view.rerender(
      <QueryClientProvider client={client}>
        <RecordPaymentDialog open outstanding="0.00" serverToday="2026-11-11" {...props} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/was already recorded on 10 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
  });

  it("starts afresh, with the new outstanding amount, when opened again", async () => {
    postData.mockResolvedValueOnce(warned);
    const client = new QueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <RecordPaymentDialog open outstanding="1748000.00" {...props} />
      </QueryClientProvider>,
    );
    attachProof();
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await screen.findByText(/was already recorded on 10 Nov 2026/);

    view.rerender(
      <QueryClientProvider client={client}>
        <RecordPaymentDialog open={false} outstanding="500000.00" {...props} />
      </QueryClientProvider>,
    );
    view.rerender(
      <QueryClientProvider client={client}>
        <RecordPaymentDialog open outstanding="500000.00" {...props} />
      </QueryClientProvider>,
    );

    expect(screen.queryByText(/was already recorded on 10 Nov 2026/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect((screen.getByRole("textbox", { name: /amount received/i }) as HTMLInputElement).value).toMatch(/500.?000/);
  });
});

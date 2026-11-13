/**
 * Approving a payment certificate is never a single click (QA BUG-07).
 *
 * Approve certifies AND posts in one step — it mints the certificate, starts
 * the payment clock and accrues the platform fee — and it was one click with
 * nothing in between. The dialog puts the figures being certified in front of
 * the person and asks them to confirm their authority before anything is sent.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useFetch", () => ({
  default: () => ({
    data: { configured: true, enabled: true, feeBase: "both", feeRatePct: 1, vatRatePct: 15 },
    isLoading: false,
  }),
}));
vi.mock("@/lib/Api", () => ({
  postData: vi.fn(),
  deleteData: vi.fn(),
  registerS3TaskAttachment: vi.fn(),
  fetchData: vi.fn(),
}));

import { ApproveConfirmDialog, type PCEntry } from "@/components/finance/paymentCertificateTable";

const ENTRY = {
  id: 35,
  projectId: 47,
  pcNumber: "PC-035",
  period: "October 2026",
  claimAmount: 115000,
  retentionAmount: 5750,
  netAmount: 125637.5,
  vatAmount: 16387.5,
  totalPayable: 125637.5,
  approvalStatus: "pending",
  createdAt: "2026-10-26",
  updatedAt: "2026-10-26",
  integrityWarnings: ["Certified to date would reach R 1 200 000,00, above the contract sum."],
  voItems: [
    { voNumber: "VO-072", thisPeriod: 100000, included: true },
    { voNumber: "VO-073", thisPeriod: 5000, included: false },
  ],
} as unknown as PCEntry;

const open = (onConfirm = vi.fn()) => {
  render(
    <ApproveConfirmDialog
      entry={ENTRY}
      open
      onOpenChange={() => {}}
      isSubmitting={false}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
};

const text = () => (document.body.textContent ?? "").replace(/ /g, " ");

describe("ApproveConfirmDialog", () => {
  it("says what approving does — certify and post, final", () => {
    open();
    expect(screen.getByText("Approve PC-035?")).toBeInTheDocument();
    expect(text()).toMatch(/certifies and posts this certificate in one step/);
    expect(text()).toMatch(/final/);
  });

  it("shows the figures being certified, the included variations and the warnings", () => {
    open();
    expect(text()).toContain("R 125 637,50"); // total payable
    expect(text()).toContain("R 16 387,50"); // VAT
    expect(text()).toContain("VO-072");
    expect(text()).not.toContain("VO-073"); // unticked — not certified
    expect(text()).toMatch(/above the contract sum/);
    expect(text()).toMatch(/platform fee of 1% \(plus VAT\)/);
  });

  it("sends nothing until the authority box is ticked and Approve is pressed", () => {
    const onConfirm = open();
    const approve = screen.getByRole("button", { name: /approve and post/i });

    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

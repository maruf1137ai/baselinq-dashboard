import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  startTwoStepSetup: vi.fn(),
  confirmTwoStepSetup: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/Api", () => api);
vi.mock("sonner", () => ({ toast }));

import TwoStepEnrol from "@/components/auth/TwoStepEnrol";

const URI =
  "otpauth://totp/Baselinq%3Apa%40example.com?secret=ABCDEFGHIJKLMNOP&issuer=Baselinq&algorithm=SHA1&digits=6&period=30";

async function openSetup() {
  api.startTwoStepSetup.mockResolvedValue({ secret: "ABCDEFGHIJKLMNOP", otpauthUri: URI });
  render(<TwoStepEnrol email="pa@example.com" onDone={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Set up two-step sign-in" }));
  await screen.findByTestId("two-step-secret");
}

describe("TwoStepEnrol set-up screen", () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    Object.values(toast).forEach((f) => f.mockReset());
  });

  it("shows a QR code for the authenticator URI", async () => {
    await openSetup();
    const qr = screen.getByTestId("two-step-qr");
    await waitFor(() => expect(qr.querySelector("svg")).not.toBeNull());
  });

  it("copies the raw setup key, without spaces", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await openSetup();
    fireEvent.click(screen.getByRole("button", { name: /copy key/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ABCDEFGHIJKLMNOP"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("keeps the authenticator link for phones and lists the account details", async () => {
    await openSetup();
    expect(screen.getByRole("link", { name: /open in authenticator app/i })).toHaveAttribute("href", URI);
    expect(screen.getByText("Account: pa@example.com")).toBeInTheDocument();
    expect(screen.getByText("Issuer: Baselinq")).toBeInTheDocument();
  });
});

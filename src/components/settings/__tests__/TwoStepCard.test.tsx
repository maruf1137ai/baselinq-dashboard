import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getTwoStepStatus: vi.fn(),
  startTwoStepSetup: vi.fn(),
  confirmTwoStepSetup: vi.fn(),
  regenerateTwoStepRecoveryCodes: vi.fn(),
  disableTwoStep: vi.fn(),
}));
vi.mock("@/lib/Api", () => api);
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import TwoStepCard from "@/components/settings/TwoStepCard";

const OFF = { enrolled: false, required: false, graceEndsAt: null, recoveryCodesLeft: 0 };
const ON = { enrolled: true, required: false, graceEndsAt: null, recoveryCodesLeft: 10 };

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TwoStepCard email="pa@example.com" />
    </QueryClientProvider>,
  );
}

describe("TwoStepCard", () => {
  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it("turns two-step sign-in on and shows the recovery codes once", async () => {
    api.getTwoStepStatus.mockResolvedValueOnce(OFF).mockResolvedValue(ON);
    api.startTwoStepSetup.mockResolvedValue({ secret: "ABCDEFGH", otpauthUri: "otpauth://totp/x" });
    api.confirmTwoStepSetup.mockResolvedValue({ recoveryCodes: ["aaaaa-bbbbb"] });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on two-step sign-in" }));
    fireEvent.click(screen.getByRole("button", { name: "Set up two-step sign-in" }));
    fireEvent.change(await screen.findByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(await screen.findByText("aaaaa-bbbbb")).toBeInTheDocument();
    expect(api.startTwoStepSetup).toHaveBeenCalledWith(undefined);
    fireEvent.click(screen.getByRole("button", { name: "I've saved my codes" }));
    expect(await screen.findByText("10 of 10 recovery codes left.")).toBeInTheDocument();
  });

  it("shows the deadline, and no way to turn it off, for a role that requires it", async () => {
    api.getTwoStepStatus.mockResolvedValue({ ...OFF, required: true, graceEndsAt: "2026-11-28T10:00:00Z" });
    renderCard();
    expect(await screen.findByText(/needs two-step sign-in by 28 November 2026/)).toBeInTheDocument();
  });

  it("a required, enrolled account has no Turn off", async () => {
    api.getTwoStepStatus.mockResolvedValue({ ...ON, required: true });
    renderCard();
    expect(await screen.findByText(/can't be turned off/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn off" })).toBeNull();
  });

  it("a wrong code when turning off shows the error", async () => {
    api.getTwoStepStatus.mockResolvedValue(ON);
    api.disableTwoStep.mockRejectedValue({ response: { data: { code: "two_step_bad_code" } } });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong or has expired/);
  });

  it("a failed status load says so with a retry", async () => {
    api.getTwoStepStatus.mockRejectedValue(new Error("down"));
    renderCard();
    expect(await screen.findByText(/Couldn't load your two-step/)).toBeInTheDocument();
  });
});

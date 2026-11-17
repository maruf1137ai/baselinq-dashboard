/**
 * Sign-in with two-step sign-in: the code step, the recovery-code entry,
 * set-up when a certifying role's grace period is over, and the errors.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  loginUser: vi.fn(),
  verifyTwoStep: vi.fn(),
  startTwoStepSetup: vi.fn(),
  confirmTwoStepSetup: vi.fn(),
}));
vi.mock("@/lib/Api", () => api);
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import LoginPage from "@/pages/login";

const SIGNED_IN = { message: "Login successful", user: { id: 7, email: "pa@example.com" }, tokens: { access: "acc", refresh: "ref" } };

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<div data-testid="account-page" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signIn() {
  fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "pa@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

const refusal = (code: string, extra = {}) => Object.assign(new Error("x"), { response: { data: { code, ...extra } } });

describe("sign-in with two-step", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.values(api).forEach((f) => f.mockReset());
  });

  it("signs straight in when no code is needed", async () => {
    api.loginUser.mockResolvedValue(SIGNED_IN);
    renderLogin();
    signIn();
    await screen.findByTestId("account-page");
    expect(localStorage.getItem("access")).toBe("acc");
  });

  it("asks for the code, shows a wrong code's error, then signs in", async () => {
    localStorage.setItem("access", "stale");
    api.loginUser.mockResolvedValue({ twoStep: "code_required", preAuthToken: "pre" });
    api.verifyTwoStep.mockRejectedValueOnce(refusal("two_step_bad_code")).mockResolvedValueOnce(SIGNED_IN);
    renderLogin();
    signIn();
    const input = await screen.findByLabelText("6-digit code");
    expect(localStorage.getItem("access")).toBeNull(); // no tokens before the code
    fireEvent.change(input, { target: { value: "111 111" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong or has expired/);
    expect(api.verifyTwoStep).toHaveBeenCalledWith("pre", { code: "111111" });

    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "222222" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByTestId("account-page");
    expect(localStorage.getItem("access")).toBe("acc");
  });

  it("accepts a recovery code", async () => {
    api.loginUser.mockResolvedValue({ twoStep: "code_required", preAuthToken: "pre" });
    api.verifyTwoStep.mockResolvedValue({ ...SIGNED_IN, recoveryCodeUsed: true, twoStep: { recoveryCodesLeft: 9 } });
    renderLogin();
    signIn();
    fireEvent.click(await screen.findByRole("button", { name: "Use a recovery code" }));
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: " abcde-fghjk " } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByTestId("account-page");
    expect(api.verifyTwoStep).toHaveBeenCalledWith("pre", { recoveryCode: "abcde-fghjk" });
  });

  it("an expired sign-in offers to start again", async () => {
    api.loginUser.mockResolvedValue({ twoStep: "code_required", preAuthToken: "pre" });
    api.verifyTwoStep.mockRejectedValue(refusal("two_step_session_expired"));
    renderLogin();
    signIn();
    fireEvent.change(await screen.findByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Back to sign in" }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("says how long a lock lasts", async () => {
    api.loginUser.mockResolvedValue({ twoStep: "code_required", preAuthToken: "pre" });
    api.verifyTwoStep.mockRejectedValue(refusal("two_step_locked", { retryAfterSeconds: 900 }));
    renderLogin();
    signIn();
    fireEvent.change(await screen.findByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in 15 minutes");
  });

  it("sets up two-step sign-in when the role requires it, then signs in", async () => {
    api.loginUser.mockResolvedValue({ twoStep: "setup_required", preAuthToken: "enrol" });
    api.startTwoStepSetup.mockResolvedValue({ secret: "ABCDEFGHIJKLMNOP", otpauthUri: "otpauth://totp/Baselinq%3Apa%40example.com?secret=ABCDEFGHIJKLMNOP&issuer=Baselinq&algorithm=SHA1&digits=6&period=30" });
    api.confirmTwoStepSetup.mockResolvedValue({ ...SIGNED_IN, recoveryCodes: ["aaaaa-bbbbb", "ccccc-ddddd"] });
    renderLogin();
    signIn();
    fireEvent.click(await screen.findByRole("button", { name: "Set up two-step sign-in" }));
    expect(await screen.findByTestId("two-step-secret")).toHaveTextContent("ABCD EFGH IJKL MNOP");
    expect(api.startTwoStepSetup).toHaveBeenCalledWith("enrol");
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(await screen.findByText("aaaaa-bbbbb")).toBeInTheDocument();
    expect(api.confirmTwoStepSetup).toHaveBeenCalledWith("654321", "enrol");
    expect(localStorage.getItem("access")).toBeNull(); // not until the codes are saved
    fireEvent.click(screen.getByRole("button", { name: "I've saved my codes" }));
    await waitFor(() => expect(screen.getByTestId("account-page")).toBeInTheDocument());
    expect(localStorage.getItem("access")).toBe("acc");
  });
});

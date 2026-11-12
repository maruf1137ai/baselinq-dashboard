/**
 * Accepting an invitation for an email that already has an account.
 *
 * The backend refuses unless the request is signed in as that account. These
 * pages must therefore send an existing user through sign-in first, and must
 * not offer an "accept" that could only fail, or that acts without a session.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchInvitation = vi.fn();
const mockAcceptInvitation = vi.fn();
const mockAcceptAppointed = vi.fn();
// The appointed page builds its own axios client at import time.
const { mockAxiosGet, mockAxiosPost } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
  mockAxiosPost: vi.fn(),
}));

vi.mock("@/lib/Api", () => ({
  fetchInvitation: (...a: unknown[]) => mockFetchInvitation(...a),
  acceptInvitation: (...a: unknown[]) => mockAcceptInvitation(...a),
  acceptAppointedInvitation: (...a: unknown[]) => mockAcceptAppointed(...a),
  getPresignedUrl: vi.fn(),
  uploadFileToPresignedUrl: vi.fn(),
}));
vi.mock("@/hooks/useRoles", () => ({ useRoles: () => ({ roles: [] }) }));
vi.mock("axios", () => ({
  default: { create: () => ({ get: mockAxiosGet, post: mockAxiosPost }) },
}));

import AcceptInvitation from "@/pages/AcceptInvitation";
import AcceptAppointedInvitation from "@/pages/AcceptAppointedInvitation";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
          <Route path="/accept-appointed-invitation/:token" element={<AcceptAppointedInvitation />} />
          <Route path="/login" element={<div data-testid="login-page" />} />
          <Route path="/account" element={<div data-testid="account-page" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signInAs(email: string) {
  localStorage.setItem("access", "access-token");
  localStorage.setItem("user", JSON.stringify({ email }));
}

const EXISTING_INVITE = {
  email: "pat@example.com",
  position: "architect",
  contact_name: "Pat",
  invited_by: "Main PM",
  organization: null,
  expires_at: "2099-01-01T00:00:00Z",
  user_exists: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => localStorage.clear());

describe("user invitation, existing account", () => {
  it("asks for sign-in instead of accepting when nobody is signed in", async () => {
    mockFetchInvitation.mockResolvedValue(EXISTING_INVITE);
    renderAt("/accept-invitation/tok123");

    fireEvent.click(await screen.findByRole("button", { name: "Sign in to accept" }));

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
  });

  it("asks for sign-in when signed in as a different account", async () => {
    mockFetchInvitation.mockResolvedValue(EXISTING_INVITE);
    signInAs("someone.else@example.com");
    renderAt("/accept-invitation/tok123");

    expect(await screen.findByRole("button", { name: "Sign in to accept" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept & Join Project" })).not.toBeInTheDocument();
  });

  it("accepts as the signed-in invitee and keeps the existing session", async () => {
    mockFetchInvitation.mockResolvedValue(EXISTING_INVITE);
    mockAcceptInvitation.mockResolvedValue({ message: "ok", user: { email: "pat@example.com" } });
    signInAs("Pat@Example.com");
    renderAt("/accept-invitation/tok123");

    fireEvent.click(await screen.findByRole("button", { name: "Accept & Join Project" }));

    expect(await screen.findByTestId("account-page")).toBeInTheDocument();
    expect(mockAcceptInvitation).toHaveBeenCalledWith("tok123", expect.any(Object));
    expect(localStorage.getItem("access")).toBe("access-token");
  });
});

describe("associated-company invitation, existing account", () => {
  const INFO = {
    project_name: "Market Building",
    company_name: "Struct Partners",
    contact_name: "Pat",
    contact_email: "pat@example.com",
    invited_by: "Main PM",
    position: "structural",
    user_exists: true,
  };

  it("asks for sign-in and never posts without a session", async () => {
    mockAxiosGet.mockResolvedValue({ data: INFO });
    renderAt("/accept-appointed-invitation/tok456");

    fireEvent.click(await screen.findByRole("button", { name: "Sign in to accept" }));

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockAcceptAppointed).not.toHaveBeenCalled();
  });

  it("skips account setup for the signed-in invitee and accepts through the session", async () => {
    mockAxiosGet.mockResolvedValue({ data: INFO });
    mockAcceptAppointed.mockResolvedValue({ message: "ok", user: { email: "pat@example.com" } });
    signInAs("pat@example.com");
    renderAt("/accept-appointed-invitation/tok456");

    // Starts at "Account Type": no name or password to set.
    fireEvent.click(await screen.findByText("Individual / Sole Proprietor"));
    expect(screen.queryByPlaceholderText("Min. 8 characters")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Complete Setup/ }));

    await waitFor(() => expect(mockAcceptAppointed).toHaveBeenCalled());
    const [token, payload] = mockAcceptAppointed.mock.calls[0];
    expect(token).toBe("tok456");
    expect(payload).not.toHaveProperty("password");
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(localStorage.getItem("access")).toBe("access-token");
  });

  it("still lets a new invitee set up an account without signing in", async () => {
    mockAxiosGet.mockResolvedValue({ data: { ...INFO, user_exists: false } });
    renderAt("/accept-appointed-invitation/tok456");

    expect(await screen.findByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in to accept" })).not.toBeInTheDocument();
  });
});

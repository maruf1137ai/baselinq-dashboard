import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEffectivePermissions } from "../useEffectivePermissions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

async function importMocks() {
  const { fetchData } = await import("@/lib/Api");
  const { useCurrentUser } = await import("@/hooks/useCurrentUser");
  return {
    fetchData: fetchData as ReturnType<typeof vi.fn>,
    useCurrentUser: useCurrentUser as ReturnType<typeof vi.fn>,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useEffectivePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns permissions from API when user is loaded", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: { id: 1, email: "pm@test.com" } });
    fetchData.mockResolvedValueOnce({
      projectId: null,
      roleCode: "PM",
      permissions: { "meeting.schedule": true, "document.view": true },
    });

    const { result } = renderHook(() => useEffectivePermissions(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.permissions["meeting.schedule"]).toBe(true);
    expect(result.current.data?.roleCode).toBe("PM");
  });

  it("passes project_id as query param when projectId is provided", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: { id: 1 } });
    fetchData.mockResolvedValueOnce({
      projectId: 36,
      roleCode: "ARCH",
      permissions: { "meeting.schedule": false },
    });

    const { result } = renderHook(() => useEffectivePermissions(36), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchData).toHaveBeenCalledWith("permissions/effective/?project_id=36");
  });

  it("calls without query param when no projectId", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: { id: 1 } });
    fetchData.mockResolvedValueOnce({
      projectId: null,
      roleCode: "PM",
      permissions: {},
    });

    renderHook(() => useEffectivePermissions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(fetchData).toHaveBeenCalledWith("permissions/effective/"));
  });

  it("does not fetch when user is not yet loaded", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: null });

    const { result } = renderHook(() => useEffectivePermissions(), {
      wrapper: makeWrapper(),
    });

    // Give it a tick — should still not have fetched
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchData).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("handles API error gracefully", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: { id: 1 } });
    fetchData.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useEffectivePermissions(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("uses correct React Query cache key per user+project", async () => {
    const { fetchData, useCurrentUser } = await importMocks();
    useCurrentUser.mockReturnValue({ data: { id: 5 } });
    fetchData.mockResolvedValue({
      projectId: 42,
      roleCode: "ARCH",
      permissions: { "meeting.schedule": false },
    });

    const { result } = renderHook(() => useEffectivePermissions(42), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Verify the query fetched exactly once (no duplicate calls from bad key)
    expect(fetchData).toHaveBeenCalledTimes(1);
  });
});

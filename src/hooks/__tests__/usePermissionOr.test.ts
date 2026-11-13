import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEffective = vi.fn();
vi.mock("../useEffectivePermissions", () => ({
  useEffectivePermissions: () => mockEffective(),
}));

import { usePermissionOr } from "../usePermission";

const effective = (permissions: Record<string, boolean>) => ({ data: { permissions }, isLoading: false });

describe("usePermissionOr", () => {
  beforeEach(() => mockEffective.mockReset());

  it("uses the code when the server knows it, granted or denied", () => {
    mockEffective.mockReturnValue(effective({ "finance.view": true, "finance.payments.view": false }));
    const { result } = renderHook(() => usePermissionOr("finance.payments.view", "finance.view"));
    expect(result.current).toBe(false);
  });

  it("falls back to the parent when the server predates the code", () => {
    mockEffective.mockReturnValue(effective({ "finance.view": true }));
    const { result } = renderHook(() => usePermissionOr("finance.payments.view", "finance.view"));
    expect(result.current).toBe(true);
  });

  it("denies when neither is granted", () => {
    mockEffective.mockReturnValue(effective({ "finance.view": false }));
    const { result } = renderHook(() => usePermissionOr("finance.payments.view", "finance.view"));
    expect(result.current).toBe(false);
  });
});

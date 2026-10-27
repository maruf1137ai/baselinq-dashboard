/**
 * Settings → Billing (QA BUG-11 / BUG-12).
 *
 * BUG-11: a role the server refuses watched "Loading billing terms" forever —
 *         the loader was checked before the error, and the form stays empty
 *         when the read fails.
 * BUG-12: clearing the fee rate saved 0% on a project still marked Active.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchState: { data: any; isLoading: boolean; isError: boolean; error: any } = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};
let staff = false;
const putData = vi.fn(async () => ({}));

vi.mock("@/hooks/useFetch", () => ({ default: () => fetchState }));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  useIsPlatformStaff: () => staff,
}));
vi.mock("@/lib/Api", () => ({ putData: (...a: unknown[]) => putData(...(a as [])) }));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: ({ message }: { message: string }) => <div>{message}</div>,
}));

import Billing from "@/pages/settings/billing";

const CONFIG = {
  configured: true,
  enabled: true,
  feeBase: "both",
  feeRatePct: 1,
  vatRatePct: 15,
  capAmount: null,
  billingContactName: "Vantage",
  billingContactEmail: "ap@vantage.test",
};

const draw = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Billing />
    </QueryClientProvider>,
  );

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "47");
  fetchState.data = CONFIG;
  fetchState.isLoading = false;
  fetchState.isError = false;
  fetchState.error = null;
  staff = false;
  putData.mockClear();
});

describe("a refused read", () => {
  it("says the terms are not visible to this role instead of loading forever", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = Object.assign(new Error("You do not have permission"), { status: 403 });
    draw();
    expect(screen.getByText(/not visible to your role/i)).toBeInTheDocument();
    expect(screen.queryByText("Loading billing terms")).not.toBeInTheDocument();
  });

  it("keeps the outage wording for anything that is not a refusal", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = Object.assign(new Error("HTTP error! status: 500"), { status: 500 });
    draw();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});

describe("the staff form", () => {
  beforeEach(() => {
    staff = true;
  });

  it("will not save an emptied fee rate as 0%", () => {
    draw();
    fireEvent.change(screen.getByLabelText("Fee rate"), { target: { value: "" } });

    const save = screen.getByRole("button", { name: /save billing terms/i });
    expect(save).toBeDisabled();
    expect(screen.getByText(/Enter a fee rate/)).toBeInTheDocument();
    fireEvent.click(save);
    expect(putData).not.toHaveBeenCalled();
  });

  it("will not save 0% while billing is on", () => {
    draw();
    fireEvent.change(screen.getByLabelText("Fee rate"), { target: { value: "0" } });
    expect(screen.getByRole("button", { name: /save billing terms/i })).toBeDisabled();
  });

  it("saves ordinary terms as the figures typed", () => {
    draw();
    fireEvent.change(screen.getByLabelText("Fee rate"), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: /save billing terms/i }));
    expect(putData).toHaveBeenCalledTimes(1);
    const sent = (putData.mock.calls[0] as any)[0].data;
    expect(sent.feeRatePct).toBe("1.5");
    expect(sent.vatRatePct).toBe("15");
    expect(sent.capAmount).toBeNull();
    expect(sent.enabled).toBe(true);
  });
});

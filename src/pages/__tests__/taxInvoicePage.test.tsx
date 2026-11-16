/**
 * /finance/tax-invoices/:id — opened from an email, and gated by the server on
 * the invoice's own project. Its refusals must read as refusals and its
 * outages as outages.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchState: { data: any; isLoading: boolean; isError: boolean; error: any } = {
  data: undefined,
  isLoading: false,
  isError: true,
  error: null,
};
vi.mock("@/hooks/useFetch", () => ({ default: () => fetchState }));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import TaxInvoicePage from "../TaxInvoicePage";

const open = () =>
  render(
    <MemoryRouter initialEntries={["/finance/tax-invoices/3"]}>
      <Routes>
        <Route path="/finance/tax-invoices/:id" element={<TaxInvoicePage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchState.data = undefined;
  fetchState.isLoading = false;
  fetchState.isError = true;
  fetchState.error = null;
});

describe("the tax invoice page", () => {
  it("says a refusal is a refusal", () => {
    fetchState.error = { status: 403 };
    open();
    expect(screen.getByText("This tax invoice is not visible to your role")).toBeInTheDocument();
  });

  it("says when the invoice cannot be found", () => {
    fetchState.error = { status: 404 };
    open();
    expect(screen.getByText("This tax invoice could not be found")).toBeInTheDocument();
  });

  it("does not present an outage as a refusal or a missing invoice", () => {
    fetchState.error = { status: 500 };
    open();
    expect(screen.getByText("This tax invoice could not be loaded")).toBeInTheDocument();
    expect(screen.getByText(/not a statement that nothing is owed/)).toBeInTheDocument();
  });
});

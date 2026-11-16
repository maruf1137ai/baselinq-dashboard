/**
 * The statement emailed after a certificate or payment links to
 * /finance/statement?projectId=…, which need not be the project selected in
 * this browser.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetched: string[] = [];
const fetchState: { data: any; isLoading: boolean; isError: boolean; error: any } = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
};
vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => {
    fetched.push(url);
    return fetchState;
  },
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import FinancialStatementPage from "../FinancialStatementPage";

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/finance/statement" element={<FinancialStatementPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  fetchState.data = undefined;
  fetchState.isLoading = true;
  fetchState.isError = false;
  fetchState.error = null;
});

describe("the statement page", () => {
  it("reads the project the link names", () => {
    localStorage.setItem("selectedProjectId", "45");
    open("/finance/statement?projectId=46");
    expect(fetched.at(-1)).toBe("projects/46/financial-position/");
  });

  it("falls back to the selected project", () => {
    localStorage.setItem("selectedProjectId", "45");
    open("/finance/statement");
    expect(fetched.at(-1)).toBe("projects/45/financial-position/");
  });

  // The route no longer checks the selected project's permissions, so the
  // server's answer about the linked project is what the reader sees.
  it("says a refusal is a refusal", () => {
    fetchState.isLoading = false;
    fetchState.isError = true;
    fetchState.error = { status: 403 };
    open("/finance/statement?projectId=46");
    expect(screen.getByText("This statement is not visible to your role")).toBeInTheDocument();
  });

  it("says when the linked project cannot be found", () => {
    fetchState.isLoading = false;
    fetchState.isError = true;
    fetchState.error = { status: 404 };
    open("/finance/statement?projectId=46");
    expect(screen.getByText("This project could not be found")).toBeInTheDocument();
  });

  it("does not present an outage as a refusal", () => {
    fetchState.isLoading = false;
    fetchState.isError = true;
    fetchState.error = { status: 500 };
    open("/finance/statement?projectId=46");
    expect(screen.getByText("The financial position could not be loaded")).toBeInTheDocument();
  });

  it("says so when neither the link nor the browser names a project", () => {
    fetchState.isLoading = false;
    open("/finance/statement");
    expect(screen.getByText("This link does not name a project")).toBeInTheDocument();
  });
});

/**
 * The statement emailed after a certificate or payment links to
 * /finance/statement?projectId=…, which need not be the project selected in
 * this browser.
 */
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const fetched: string[] = [];
vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => {
    fetched.push(url);
    return { data: undefined, isLoading: true, isError: false };
  },
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
});

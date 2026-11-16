/**
 * A refused grace date shows the server's reason, through the real `patchData`
 * (review finding F11, 13 Nov 2026). Only axios itself is replaced.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}));
vi.mock("axios", () => ({ default: { create: () => http } }));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

import { InvoiceGraceControl } from "../InvoiceGraceControl";

describe("InvoiceGraceControl", () => {
  it("shows why the server refused the grace date", async () => {
    http.patch.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 400"), {
        response: { status: 400, data: { error: "The grace date must be after the invoice's due date." } },
      }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InvoiceGraceControl invoice={{ id: 7, status: "issued", graceUntil: null } as never} />
      </QueryClientProvider>,
    );

    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: "2026-11-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("The grace date must be after the invoice's due date."),
    );
  });
});

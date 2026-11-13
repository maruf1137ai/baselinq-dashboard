import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPost = vi.fn();
vi.mock("@/lib/Api", () => ({ postData: (...a: unknown[]) => mockPost(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CertificateDocumentSection } from "../CertificateDocumentSection";

const posted = {
  id: 48,
  pcNumber: "PC-004",
  certificateUrl: "/certificates/pc/abc",
  sharedAt: null,
  sharedWith: [],
  shareRecipients: ["employer@example.test", "contractor@example.test"],
};

const draw = (entry: any, canSend = true) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CertificateDocumentSection entry={entry} canSend={canSend} />
    </QueryClientProvider>,
  );

beforeEach(() => mockPost.mockReset().mockResolvedValue({ sentTo: ["employer@example.test"], failed: [] }));

describe("CertificateDocumentSection", () => {
  it("opens the shareable certificate in a new tab", () => {
    draw(posted);
    const link = screen.getByRole("link", { name: /Open certificate/ });
    expect(link).toHaveAttribute("href", "/certificates/pc/abc");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/Not sent yet. Certifying sends it to the employer's and contractor's email/)).toBeInTheDocument();
  });

  it("sends to the parties it was pre-filled with, as entered", async () => {
    draw(posted);
    fireEvent.click(screen.getByRole("button", { name: /Send to the parties/ }));
    expect(screen.getByLabelText("Recipients")).toHaveValue("employer@example.test, contractor@example.test");
    fireEvent.change(screen.getByLabelText("Recipients"), { target: { value: "employer@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost.mock.calls[0][0]).toEqual({
      url: "tasks/payment-certificates/48/share/",
      data: { recipients: ["employer@example.test"] },
    });
  });

  it("says who it was sent to and when", () => {
    draw({ ...posted, sharedAt: "2026-11-10T10:00:00Z", sharedWith: ["employer@example.test"] });
    expect(screen.getByText(/Sent to employer@example.test/)).toBeInTheDocument();
  });

  it("offers no Send without the permission", () => {
    draw(posted, false);
    expect(screen.queryByRole("button", { name: /Send to the parties/ })).not.toBeInTheDocument();
  });

  it("offers to create the link for a certificate posted before links existed", async () => {
    mockPost.mockResolvedValueOnce({ certificateUrl: "/certificates/pc/new" });
    draw({ ...posted, certificateUrl: null });
    expect(screen.getByText(/posted before shareable links existed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create shareable link" }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith({ url: "tasks/payment-certificates/48/certificate-link/", data: {} }),
    );
  });
});

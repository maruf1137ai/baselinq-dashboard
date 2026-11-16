/**
 * The certificate drawer is in the project's currency.
 *
 * Every money field carried a literal "R", and the currency picker offered
 * only ZAR, USD, EUR and GBP. On a Rwandan-franc project the picker had no
 * RWF option, so it showed "ZAR" over a certificate that would be saved in
 * RWF, and every amount field said rand.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  postData: vi.fn(() => Promise.resolve({})),
  registerS3TaskAttachment: vi.fn(),
}));
vi.mock("@/hooks/useMilestones", () => ({ useMilestones: () => ({ data: [] }) }));
vi.mock("@/hooks/useS3Upload", () => ({
  useS3Upload: () => ({ entries: [], upload: vi.fn(), remove: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/components/S3AttachmentSection", () => ({ S3AttachmentSection: () => null }));

import { CreatePCDrawer } from "@/components/finance/createPCDrawer";

let projectCurrency = "ZAR";

function route(url: string) {
  if (url.startsWith("tasks/payment-certificates/defaults/")) {
    return Promise.resolve({
      originalContractValue: 100000,
      currentContractValue: 100000,
      previouslyCertified: 0,
      retentionRatePct: 0,
      vatRatePct: 15,
      currency: projectCurrency,
      nextPcNumber: "PC-001",
    });
  }
  return Promise.resolve({ count: 0, next: null, results: [] });
}

beforeEach(() => {
  sessionStorage.clear();
  fetchData.mockReset();
  fetchData.mockImplementation(route);
});

const renderDrawer = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CreatePCDrawer isOpen onClose={vi.fn()} projectId="9" />
    </QueryClientProvider>,
  );

/** The symbol rendered beside a money field. */
const affixOf = (input: HTMLElement) => input.previousElementSibling?.textContent?.trim();

describe("certificate drawer currency", () => {
  it("labels money fields with the project's currency, not a literal R", async () => {
    projectCurrency = "USD";
    renderDrawer();

    const field = await screen.findByLabelText("Unfixed materials delivered but not yet incorporated");
    await waitFor(() => expect(affixOf(field)).toBe("US$"));
  });

  it("still shows R on a rand project", async () => {
    projectCurrency = "ZAR";
    renderDrawer();

    const field = await screen.findByLabelText("Unfixed materials delivered but not yet incorporated");
    await waitFor(() => expect(affixOf(field)).toBe("R"));
  });

  it("shows a currency outside the old four, and does not offer a different one", async () => {
    projectCurrency = "RWF";
    renderDrawer();

    const field = await screen.findByLabelText("Unfixed materials delivered but not yet incorporated");
    await waitFor(() => expect(affixOf(field)).toBe("RWF"));
    // The picker had no RWF option, so it displayed "ZAR" over an RWF value.
    expect(screen.getByLabelText(/^Currency/)).toHaveTextContent(/^RWF$/);
    // Locked to the project: there is no picker that could save a certificate
    // in a currency the project's figures are not in.
    expect(screen.queryByRole("combobox", { name: /currency/i })).toBeNull();
  });

  it("does not restore another currency from a draft saved when it could be picked", async () => {
    projectCurrency = "ZAR";
    sessionStorage.setItem("taskDraft:PC:9", JSON.stringify({ currencyOverride: "USD" }));
    renderDrawer();

    const field = await screen.findByLabelText("Unfixed materials delivered but not yet incorporated");
    await waitFor(() => expect(affixOf(field)).toBe("R"));
    expect(screen.getByLabelText(/^Currency/)).toHaveTextContent(/^ZAR$/);
  });
});

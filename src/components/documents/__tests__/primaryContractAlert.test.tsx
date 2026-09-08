/**
 * `visibleToCurrentUser` — combined at the call site (Index.tsx) from
 * `canEditProject && canViewDocuments`, since the button's destination
 * (`/documents`) is gated on `document.view` (App.tsx) independently of
 * whether the viewer can edit the project record. Before that combination,
 * a user who could edit the project but lacked `document.view` got a button
 * that would 403 on click.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const getPrimaryContractMock = vi.fn();

vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/lib/Api", () => ({ getPrimaryContract: (...args: unknown[]) => getPrimaryContractMock(...args) }));

import { PrimaryContractAlert } from "../PrimaryContractAlert";

function draw(visibleToCurrentUser?: boolean) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PrimaryContractAlert projectId="1" visibleToCurrentUser={visibleToCurrentUser} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigateMock.mockReset();
  getPrimaryContractMock.mockReset();
  getPrimaryContractMock.mockResolvedValue({ primary_contract: null });
});

describe("PrimaryContractAlert visibility", () => {
  it("renders the alert when visible and no primary contract is set", async () => {
    draw(true);
    await waitFor(() => expect(screen.getByText("Upload contract")).toBeInTheDocument());
  });

  it("renders nothing, and never even queries, when visibleToCurrentUser is false", async () => {
    draw(false);
    // Give any stray microtask a chance to run before asserting silence.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Upload contract")).not.toBeInTheDocument();
    expect(getPrimaryContractMock).not.toHaveBeenCalled();
  });

  it("defaults to visible when the prop is omitted", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PrimaryContractAlert projectId="1" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Upload contract")).toBeInTheDocument());
  });
});

/**
 * `visibleToCurrentUser` — the banner's "Upload now" button deep-links to
 * /documents/upload, a route gated on document.upload (App.tsx). Before this
 * prop existed the banner showed to any user with a non-null `role` (i.e.
 * "a professional, not a client"), regardless of whether they actually held
 * document.upload — a strictly wider audience than the permission the
 * button's own destination requires.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCurrentUserMock = vi.fn();
const useInsuranceStatusMock = vi.fn();

vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => useCurrentUserMock() }));
vi.mock("@/hooks/useInsuranceStatus", () => ({ useInsuranceStatus: () => useInsuranceStatusMock() }));

import { InsuranceBanner } from "../InsuranceBanner";

function draw(visibleToCurrentUser?: boolean) {
  render(
    <MemoryRouter>
      <InsuranceBanner visibleToCurrentUser={visibleToCurrentUser} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useCurrentUserMock.mockReset();
  useInsuranceStatusMock.mockReset();
  useCurrentUserMock.mockReturnValue({ data: { role: { code: "SE" } } });
  useInsuranceStatusMock.mockReturnValue({
    data: { satisfied: false, folderId: "42" },
    isLoading: false,
  });
  localStorage.setItem("selectedProjectId", "1");
});

describe("InsuranceBanner visibility", () => {
  it("renders when visibleToCurrentUser is true (or omitted — defaults true)", () => {
    draw(true);
    expect(screen.getByText("Upload now")).toBeInTheDocument();
  });

  it("renders nothing when visibleToCurrentUser is false, even though every other precondition is met", () => {
    draw(false);
    expect(screen.queryByText("Upload now")).not.toBeInTheDocument();
  });

  it("still hides for a client (no role), regardless of visibleToCurrentUser", () => {
    useCurrentUserMock.mockReturnValue({ data: { role: null } });
    draw(true);
    expect(screen.queryByText("Upload now")).not.toBeInTheDocument();
  });
});

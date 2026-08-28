/**
 * Roles & Permissions — the area/part browser renders and switches.
 *
 * This page is UI-only (every value comes from lib/rolesPermissionsMock.ts),
 * so there is no data behaviour worth asserting. What IS worth guarding is
 * that it renders at all: the page derives `areaRows` at render time by
 * calling `matchesFilter`, which calls `valueFor` — three `const` arrow
 * functions in one component body. Order them wrong and `.filter()` invokes a
 * binding still in its temporal dead zone, which throws on mount. TypeScript
 * does not catch it, because the reference sits inside a closure it cannot
 * prove is called immediately, and neither `tsc --noEmit` nor `vite build`
 * executes a component. Only mounting it does.
 *
 * The second assertion covers the same hazard on the other axis: switching
 * area re-derives all of it against a different `parts` array.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// DashboardLayout pulls the sidebar, auth and project queries behind it. None
// of that is what this page is about, so it renders as a passthrough.
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import RolesPermissions from "../RolesPermissions";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/rolesPermissionsMock";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/roles-permissions"]}>
      <RolesPermissions />
    </MemoryRouter>,
  );

describe("Roles & Permissions", () => {
  it("mounts and opens on the first area with its parts expanded", () => {
    renderPage();

    const first = PERMISSION_GROUPS[0];

    // The rail is the only thing that names the open area.
    const rail = screen.getByRole("navigation", { name: /permission areas/i });
    expect(
      within(rail).getByRole("button", { name: new RegExp(first.title) }),
    ).toHaveAttribute("aria-current", "true");

    // Every part of the open area is on screen, each with its explanation.
    for (const part of first.parts) {
      expect(screen.getByRole("heading", { level: 3, name: part.title })).toBeInTheDocument();
      expect(screen.getByText(part.explain)).toBeInTheDocument();
    }

    // ...and every permission in it, by its plain-English label.
    for (const p of first.permissions) {
      expect(screen.getByText(p.label)).toBeInTheDocument();
    }
  });

  it("switches area from the rail without losing the parts structure", async () => {
    const user = userEvent.setup();
    renderPage();

    const target = PERMISSION_GROUPS.find((g) => g.key === "finance")!;
    const rail = screen.getByRole("navigation", { name: /permission areas/i });
    await user.click(within(rail).getByRole("button", { name: new RegExp(target.title) }));

    expect(
      within(rail).getByRole("button", { name: new RegExp(target.title) }),
    ).toHaveAttribute("aria-current", "true");
    for (const part of target.parts) {
      expect(screen.getByRole("heading", { level: 3, name: part.title })).toBeInTheDocument();
    }

    // The area we left is gone — this is a swap, not an accordion.
    const gone = PERMISSION_GROUPS[0].parts[0];
    expect(screen.queryByRole("heading", { level: 3, name: gone.title })).toBeNull();
  });

  it("keeps every permission reachable through exactly one part", () => {
    const inParts = PERMISSION_GROUPS.flatMap((g) => g.parts.flatMap((p) => p.permissions));
    expect(inParts).toHaveLength(ALL_PERMISSIONS.length);
    expect(new Set(inParts.map((p) => p.code)).size).toBe(ALL_PERMISSIONS.length);
  });
});

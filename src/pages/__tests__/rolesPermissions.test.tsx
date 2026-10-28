/**
 * Roles & Permissions — the parts that are easy to get quietly wrong.
 *
 * Three things are worth pinning here, and none of them is layout.
 *
 * 1. The page renders at all. It derives its rows during render from several
 *    hooks and a couple of `const` arrow functions in one component body; get
 *    the order wrong and `.map()` invokes a binding still in its temporal dead
 *    zone. TypeScript does not catch it — the reference sits inside a closure
 *    it cannot prove runs immediately — and neither `tsc` nor `vite build`
 *    executes a component. Only mounting it does.
 *
 * 2. Three-layer resolution. The whole reason this page exists is to say WHICH
 *    layer decided an answer, and to flag a later layer reversing an earlier
 *    one. That logic mirrors the backend's, so it gets its own tests rather
 *    than being assumed correct because the page looks right.
 *
 * 3. Only what changed is sent. The save is a diff. Sending the untouched
 *    permissions too would write a project override for every row, quietly
 *    converting a project that inherits its defaults into one holding a frozen
 *    copy of them — which then stops tracking the organisation.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveFromLayers, type RoleMatrix } from "@/hooks/useRolePermissions";

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const PERMISSIONS = [
  {
    id: 1,
    code: "finance.view",
    group: "finance",
    subgroup: "Cost Ledger",
    label: "See the finance area",
    description: "Open Finance and read the Cost Ledger.",
    is_system: true,
    is_project_scoped: true,
  },
  {
    id: 2,
    code: "finance.approve_certificate",
    group: "finance",
    subgroup: "Payment Certificates",
    label: "Approve or reject a payment certificate",
    description: "The decision step.",
    is_system: true,
    is_project_scoped: true,
  },
  // Three task creates, so the "Create tasks (general access)" parent has
  // something to aggregate. Two start granted, one denied — the partial state.
  {
    id: 10,
    code: "task.rfi.create",
    group: "task",
    subgroup: "RFI",
    label: "Raise an RFI",
    description: "Ask a formal question.",
    is_system: true,
    is_project_scoped: true,
  },
  {
    id: 11,
    code: "task.si.create",
    group: "task",
    subgroup: "SI",
    label: "Issue a Site Instruction",
    description: "Instruct the contractor.",
    is_system: true,
    is_project_scoped: true,
  },
  {
    id: 12,
    code: "task.vo.create",
    group: "task",
    subgroup: "VO",
    label: "Create a Variation Order",
    description: "Start a contract change.",
    is_system: true,
    is_project_scoped: true,
  },
  // The catch-all. It must never render as a row of its own.
  {
    id: 13,
    code: "task.create",
    group: "task",
    subgroup: "RFI",
    label: "Create tasks (general access)",
    description: "Legacy catch-all.",
    is_system: true,
    is_project_scoped: true,
  },
  {
    id: 3,
    code: "project.create",
    group: "project",
    subgroup: "Creating & Editing",
    label: "Create a new project",
    description: "Applies account-wide.",
    is_system: true,
    is_project_scoped: false,
  },
];

const ROLE = {
  id: 7,
  code: "QS",
  name: "Quantity Surveyor",
  description: null,
  is_system: true,
  organization: null,
  is_active: true,
};

const MATRIX: RoleMatrix = {
  role: ROLE,
  orgMatrix: { "finance.view": true, "finance.approve_certificate": true },
  projectOverrides: { "finance.approve_certificate": false },
  layers: {
    global: {
      "finance.view": true,
      "finance.approve_certificate": true,
      "task.rfi.create": true,
      "task.si.create": true,
      "task.vo.create": false,
    },
    org: {},
    // The reversal: granted globally, revoked on THIS project.
    project: { "finance.approve_certificate": false },
  },
  updatedBy: {},
};

const saveMutate = vi.fn().mockResolvedValue({});

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canEditSettings: true }),
}));

vi.mock("@/hooks/useSelectedProject", () => ({
  useSelectedProjectId: () => "42",
  default: () => "42",
}));

vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn().mockResolvedValue({ teamMembers: [] }),
}));

vi.mock("@/hooks/useRolePermissions", async (importOriginal) => {
  // resolveFromLayers is pure and is one of the things under test — keep the
  // real one and stub only the network.
  const actual = await importOriginal<typeof import("@/hooks/useRolePermissions")>();
  return {
    ...actual,
    usePermissionCatalogue: () => ({ data: PERMISSIONS, isLoading: false }),
    useRoles: () => ({ data: [ROLE], isLoading: false }),
    useRoleMatrix: () => ({ data: MATRIX, isLoading: false, isError: false }),
    useSaveRoleMatrix: () => ({ mutateAsync: saveMutate, isPending: false }),
    useResetProjectOverrides: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDuplicateRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

import RolesPermissions from "../RolesPermissions";

/* The page fetches role holders with its own useQuery, so it needs a client
   the way it has one in the app. Retries off and no cache between tests, so a
   failure surfaces immediately instead of being retried into a timeout. */
const renderPage = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/roles-permissions"]}>
        <RolesPermissions />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => saveMutate.mockClear());

/** Open one area by name. The page opens on whichever sorts first, so any test
 *  about a specific area has to say so rather than assume. */
const openArea = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  const rail = await screen.findByRole("navigation", { name: /permission areas/i });
  await user.click(within(rail).getByRole("button", { name }));
};

/* ── Resolution ───────────────────────────────────────────────────────────── */

describe("three-layer resolution", () => {
  it("uses the global default when nothing overrides it", () => {
    const r = resolveFromLayers(MATRIX, "finance.view");
    expect(r.effective).toBe(true);
    expect(r.origin).toBe("global");
    expect(r.conflict).toBe(false);
  });

  it("lets a project override win, and flags it as a reversal", () => {
    const r = resolveFromLayers(MATRIX, "finance.approve_certificate");
    expect(r.effective).toBe(false);
    expect(r.origin).toBe("project");
    expect(r.conflict).toBe(true);
  });

  it("treats a permission absent from every layer as denied, not granted", () => {
    const r = resolveFromLayers(MATRIX, "never.set.anywhere");
    expect(r.effective).toBe(false);
    expect(r.global).toBeNull();
    expect(r.conflict).toBe(false);
  });

  it("does not call a same-value override a conflict", () => {
    const agreeing: RoleMatrix = {
      ...MATRIX,
      layers: { global: { "a.b": true }, org: {}, project: { "a.b": true } },
    };
    expect(resolveFromLayers(agreeing, "a.b").conflict).toBe(false);
    expect(resolveFromLayers(agreeing, "a.b").origin).toBe("project");
  });
});

/* ── Rendering ────────────────────────────────────────────────────────────── */

describe("Roles & Permissions", () => {
  it("mounts and shows an area's parts with their plain-English wording", async () => {
    const user = userEvent.setup();
    renderPage();
    await openArea(user, /Finance/);

    expect(
      await screen.findByRole("heading", { level: 3, name: "Cost Ledger" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Payment Certificates" }),
    ).toBeInTheDocument();
    expect(screen.getByText("See the finance area")).toBeInTheDocument();
    expect(screen.getByText("Open Finance and read the Cost Ledger.")).toBeInTheDocument();
  });

  it("switches area from the rail", async () => {
    const user = userEvent.setup();
    renderPage();

    const rail = await screen.findByRole("navigation", { name: /permission areas/i });
    await user.click(within(rail).getByRole("button", { name: /Project/ }));

    expect(
      await screen.findByRole("heading", { level: 3, name: "Creating & Editing" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Cost Ledger" })).toBeNull();
  });

  it("cannot toggle a permission that is not project-scoped", async () => {
    const user = userEvent.setup();
    renderPage();

    const rail = await screen.findByRole("navigation", { name: /permission areas/i });
    await user.click(within(rail).getByRole("button", { name: /Project/ }));

    const toggle = await screen.findByRole("switch", { name: /Create a new project/i });
    expect(toggle).toBeDisabled();
  });
});

/* ── Saving ───────────────────────────────────────────────────────────────── */

describe("saving", () => {
  it("sends only what changed, scoped to the selected project", async () => {
    const user = userEvent.setup();
    renderPage();
    await openArea(user, /Finance/);

    const toggle = await screen.findByRole("switch", { name: /See the finance area/i });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(saveMutate).toHaveBeenCalledTimes(1));
    expect(saveMutate).toHaveBeenCalledWith({
      roleId: ROLE.id,
      projectId: "42",
      // finance.approve_certificate was untouched and must not be sent —
      // doing so would write an override for a value nobody changed.
      changes: [{ code: "finance.view", granted: false }],
    });
  });

  it("stops counting a change once it is toggled back to where it started", async () => {
    const user = userEvent.setup();
    renderPage();
    await openArea(user, /Finance/);

    const toggle = await screen.findByRole("switch", { name: /See the finance area/i });
    await user.click(toggle);
    expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText(/unsaved change/i)).toBeNull();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });
});

/* ── The "Create tasks (general access)" parent ───────────────────────────── */

describe("the create-everything control", () => {
  const openTasks = (user: ReturnType<typeof userEvent.setup>) => openArea(user, /Tasks/);

  it("shows as partly selected when only some types are granted", async () => {
    const user = userEvent.setup();
    renderPage();
    await openTasks(user);

    const master = await screen.findByRole("checkbox", { name: /create every type/i });
    // Two of three on — neither checked nor unchecked, and a switch could not
    // have said so.
    expect(master).toHaveAttribute("data-state", "indeterminate");
    expect(screen.getByText(/2 of 3 types/i)).toBeInTheDocument();
  });

  it("turns every create on in one click", async () => {
    const user = userEvent.setup();
    renderPage();
    await openTasks(user);

    await user.click(await screen.findByRole("checkbox", { name: /create every type/i }));

    for (const label of [
      /Raise an RFI/i,
      /Issue a Site Instruction/i,
      /Create a Variation Order/i,
    ]) {
      expect(screen.getByRole("switch", { name: label })).toBeChecked();
    }
    expect(screen.getByText(/3 of 3 types/i)).toBeInTheDocument();
  });

  it("counts only the types it actually changed", async () => {
    /*
     * Two of three were already on, so switching all on is ONE change. Counting
     * three would send project overrides for two permissions nobody touched.
     */
    const user = userEvent.setup();
    renderPage();
    await openTasks(user);

    await user.click(await screen.findByRole("checkbox", { name: /create every type/i }));

    expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();
  });

  it("clears back to nothing unsaved when switched off again", async () => {
    const user = userEvent.setup();
    renderPage();
    await openTasks(user);

    const master = await screen.findByRole("checkbox", { name: /create every type/i });
    await user.click(master); // all on  — 1 change
    await user.click(master); // all off — 2 changes (the two that were on)

    expect(screen.getByText(/2 unsaved changes/i)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Raise an RFI/i })).not.toBeChecked();
  });

  it("never renders the superseded catch-all as its own row", async () => {
    const user = userEvent.setup();
    renderPage();
    await openTasks(user);

    await screen.findByRole("checkbox", { name: /create every type/i });
    // The parent's own label is on the control; task.create must not also
    // appear as a switch, or the two could be set to contradict each other.
    expect(
      screen.queryByRole("switch", { name: /Create tasks \(general access\)/i }),
    ).toBeNull();
  });
});

/**
 * Behaviour lock: the homepage (`/`, `pages/Index.tsx`), as clients use it today.
 *
 * The page is rendered whole, with every request answered by a fake API, so
 * the test sees the same screen a user sees. It checks what is on that screen
 * and what a user can do with it. It does not snapshot the DOM: the
 * assertions name the headings, figures and controls that matter, so a change
 * of styling will not break them but a change of behaviour will.
 *
 * If one of these fails, the screen a client sees has changed. That may be
 * intended. If so, update the test in the same PR and say so in the PR body.
 */
import React from "react";
import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A whole page renders in each test. On a busy machine that can take longer
// than Testing Library's one-second default, so give it more room.
configure({ asyncUtilTimeout: 5_000 });
vi.setConfig({ testTimeout: 20_000 });

// Dates are shown in the viewer's time zone. Clients are in South Africa, so
// the tests read the page as a South African browser would, whatever the
// machine running them is set to.
vi.hoisted(() => {
  process.env.TZ = "Africa/Johannesburg";
});

// ── A fake API ────────────────────────────────────────────────────────────
//
// Every network function in `@/lib/Api` is replaced. `fetchData` answers from
// the route table below; anything else rejects, so a request this file does
// not expect can never reach a real server.

type Handler = (url: string) => unknown;

const server = vi.hoisted(() => ({
  routes: [] as [RegExp, (url: string) => unknown][],
  requested: [] as string[],
}));

vi.mock("@/lib/Api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/Api")>();
  const pure = new Set(["validateFile", "toSafeHeaderFilename"]);
  const mocked: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(actual)) {
    mocked[name] =
      typeof value === "function" && !pure.has(name)
        ? vi.fn(async () => {
            throw new Error(`unexpected API call: ${name}`);
          })
        : value;
  }
  const via = (url: string) => {
    server.requested.push(url);
    const hit = server.routes.find(([re]) => re.test(url));
    if (!hit) throw new Error(`unexpected GET ${url}`);
    return hit[1](url);
  };
  mocked.fetchData = vi.fn(async (url: string) => via(url));
  // These two do not go through `fetchData`; they are answered from the same
  // table under the URL they request.
  mocked.getProfile = vi.fn(async () => via("auth/profile/"));
  mocked.getPrimaryContract = vi.fn(async (id: string) => via(`projects/${id}/primary-contract/`));
  return mocked;
});

// The sidebar and header are not part of this screen.
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Index from "@/pages/Index";

// ── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-15T10:00:00Z");
const PROJECT_ID = "1";
const ME = { id: 7, name: "Pat Agent", email: "pat@example.test", account_type: "individual", role: { id: 1, name: "Principal Agent", code: "PA" } };

const PROJECT = {
  id: 1,
  name: "Hatfield Street Refurbishment",
  projectNumber: "PRJ-001",
  contractValue: 10_000_000,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  userId: 99,
};

/** A principal agent: sees money and risk, can certify, can edit the project. */
const PA_PERMISSIONS = {
  "finance.view": true,
  "finance.edit": true,
  "finance.approve_certificate": true,
  "finance.post_certificate": true,
  "compliance.view": true,
  "programme.view": true,
  "document.view": true,
  "document.upload": true,
  "project.edit": true,
};

/** A contractor: no finance, no compliance. */
const CONTRACTOR_PERMISSIONS = {
  "programme.view": true,
  "document.view": true,
};

const person = (userId: number, name: string) => ({ userId, name });

const TASKS = [
  {
    id: 101,
    taskId: 101,
    taskType: "RFI",
    status: "in review",
    assignedTo: [person(7, "Pat Agent")],
    assignedBy: person(9, "Sam Builder"),
    created_at: "2026-06-01T08:00:00Z",
    task: {
      subject: "Confirm beam size at grid C",
      status: "Sent for Review",
      priority: "High",
      description: "Drawing S-201 and S-305 disagree.",
      dueDate: "2026-06-12T12:00:00Z",
      updatedAt: "2026-06-14T08:00:00Z",
    },
  },
  {
    id: 102,
    taskId: 102,
    taskType: "SI",
    status: "todo",
    assignedTo: [person(7, "Pat Agent")],
    assignedBy: person(8, "Lee Architect"),
    created_at: "2026-06-10T08:00:00Z",
    task: {
      subject: "Relocate the DB board",
      status: "Issued",
      priority: "Medium",
      dueDate: "2026-06-18T12:00:00Z",
      updatedAt: "2026-06-10T08:00:00Z",
    },
  },
  {
    id: 103,
    taskId: 103,
    taskType: "VO",
    status: "todo",
    assignedTo: [person(9, "Sam Builder")],
    assignedBy: person(7, "Pat Agent"),
    created_at: "2026-06-05T08:00:00Z",
    task: { subject: "Extra boundary wall", status: "Submitted", updatedAt: "2026-06-05T08:00:00Z" },
  },
  {
    id: 104,
    taskId: 104,
    taskType: "RFI",
    status: "done",
    assignedTo: [person(7, "Pat Agent")],
    assignedBy: person(9, "Sam Builder"),
    created_at: "2026-05-01T08:00:00Z",
    task: { subject: "Paint colour for the lobby", status: "Closed", dueDate: "2026-05-10T12:00:00Z", updatedAt: "2026-05-09T08:00:00Z" },
  },
];

const CERTIFICATES = [
  { id: 1, pcNumber: "PC-001", certificateDate: "2026-04-20", claimAmount: 1_000_000, retentionAmount: 50_000, workflowState: "posted", postedAt: "2026-04-21T09:00:00Z" },
  // Submitted and waiting to be certified. `availableTransitions` is what the
  // server says THIS user may do to THIS certificate (tasks/pc_workflow.py).
  { id: 2, pcNumber: "PC-002", certificateDate: "2026-06-10", claimAmount: 500_000, retentionAmount: 25_000, workflowState: "submitted", availableTransitions: ["approve"] },
];

const VARIATION_RECORDS = [
  { id: 31, projectId: 1, voNumber: "VO-001", status: "Approved", grandTotal: 250_000, signedAt: "2026-03-01T09:00:00Z", approvedAt: "2026-03-01T09:00:00Z", updatedAt: "2026-03-01T09:00:00Z" },
];

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

/** Every request the homepage makes, answered as an ordinary healthy project. */
function healthyRoutes(permissions: Record<string, boolean>): [RegExp, Handler][] {
  return [
    [/^auth\/profile\/$/, () => ME],
    [/^permissions\/effective\//, () => ({ projectId: 1, roleCode: "PA", permissions })],
    [/^projects\/\?userId=/, () => page([PROJECT])],
    [/^projects\/1\/tasks\/$/, () => ({ tasks: TASKS })],
    [/^meetings\/\?project_id=1/, () => page([])],
    [/^projects\/1\/time-bars\/$/, () => ({ time_bars: [] })],
    [/^projects\/1\/milestones\/$/, () => []],
    [/^projects\/1\/milestones\/phase-costs\//, () => ({ milestones: [], totalContractCost: 0, currency: "ZAR" })],
    [/^projects\/1\/milestones\/discipline-access\//, () => ({ ownDiscipline: "construction", fullVisibility: false, canViewOther: false })],
    [/^projects\/1\/risk-signals\/$/, () => ({ signals: [] })],
    [/^documents\/obligations\//, () => ({ obligations: [] })],
    [/^projects\/1\/primary-contract\/$/, () => ({ primary_contract: { id: 5, file_name: "pba.pdf", name: "JBCC PBA", document_role: "primary_contract", uploaded_at: null, s3_key: null } })],
    [/^documents\/insurance-status\//, () => ({ satisfied: true })],
    [/^documents\/\?project_id=1/, () => page([])],
    [/^tasks\/payment-certificates\/\?projectId=1/, () => page(CERTIFICATES)],
    [/^tasks\/tasks\/\?taskType=VO&project=1/, () => page([])],
    [/^tasks\/variation-orders\//, () => page(VARIATION_RECORDS)],
    [/^projects\/1\/payments\/$/, () => ({ certificates: [] })],
    [/^cost-ledger\/summary\//, () => ({ manualCreditsTotal: 0, manualDebitsTotal: 0 })],
  ];
}

/** Replace some routes, keep the rest. */
function withRoutes(base: [RegExp, Handler][], overrides: [RegExp, Handler][]) {
  const keys = new Set(overrides.map(([re]) => re.source));
  return [...overrides, ...base.filter(([re]) => !keys.has(re.source))];
}

const failing: Handler = () => {
  throw new Error("HTTP error! status: 500");
};

function renderHome(routes: [RegExp, Handler][]) {
  server.routes = routes;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/create-project" element={<p>create project page</p>} />
          <Route path="/tasks/:id" element={<p>task page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Wait until the page has left its loading state. */
const loaded = () => screen.findByRole("heading", { name: "My actions" });

/** The panel whose heading has this name. */
function panel(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { name });
  const section = heading.closest("section") ?? heading.parentElement?.parentElement;
  if (!section) throw new Error(`no panel for ${name}`);
  return section as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  localStorage.clear();
  localStorage.setItem("selectedProjectId", PROJECT_ID);
  server.requested = [];
});

afterEach(() => {
  vi.useRealTimers();
});


/** Text with every run of whitespace (including the non-breaking spaces in rand figures) as one space. */
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const pageText = (container: HTMLElement) => norm(container.textContent);

// ── A principal agent on a healthy project ───────────────────────────────

describe("homepage: principal agent, healthy project", () => {
  it("shows the title and every main section", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My actions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What needs you" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Contract watch" })).toBeInTheDocument();
    // The status band's zones, in order.
    const zones = ["Time", "Money", "Change", "Construction", "Professional"];
    for (const z of zones) expect(screen.getByText(z, { selector: "p" })).toBeInTheDocument();
  });

  it("shows the project summary strip with the money figures formatted as rand", async () => {
    const { container } = renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const strip = screen.getByRole("heading", { name: PROJECT.name }).closest("section")!;
    const text = norm(strip.textContent);
    expect(text).toContain("PRJ-001");
    expect(text).toContain("199 days remaining");
    // Contract sum R10m + one signed, approved variation of R250k = R10.25m.
    // Certified counts posted certificates only (PC-001); PC-002 is still submitted.
    expect(text).toContain(
      "Budget R 10 250 000,00 · Certified R 1 000 000,00 (10%) · Remaining R 9 250 000,00",
    );
    expect(text).toContain("2 open actions");
    expect(pageText(container)).not.toContain("nothing certified yet");
  });

  it("lists my open tasks, overdue first, each linking to the task", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const mine = panel("My actions");
    expect(norm(mine.textContent)).toContain("1 overdue · 2 assigned to you");

    const rows = within(mine).getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(norm(rows[0].textContent)).toContain("RFI: Confirm beam size at grid C");
    expect(norm(rows[0].textContent)).toContain("High");
    expect(norm(rows[0].textContent)).toContain("Drawing S-201 and S-305 disagree.");
    expect(norm(rows[0].textContent)).toContain("3 days overdue · was due 12 June 2026");
    expect(rows[0]).toHaveAttribute("href", "/tasks/101");

    expect(norm(rows[1].textContent)).toContain("SI: Relocate the DB board");
    expect(norm(rows[1].textContent)).toContain("Medium");
    expect(norm(rows[1].textContent)).toContain("Due in 3 days · 18 June 2026");
    expect(rows[1]).toHaveAttribute("href", "/tasks/102");

    // Assigned to someone else, or already closed: not mine to do.
    expect(within(mine).queryByText(/Extra boundary wall/)).not.toBeInTheDocument();
    expect(within(mine).queryByText(/Paint colour for the lobby/)).not.toBeInTheDocument();
  });

  it("opens the task when a row in My actions is clicked", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    fireEvent.click(within(panel("My actions")).getAllByRole("link")[0]);
    expect(await screen.findByText("task page")).toBeInTheDocument();
  });

  it("shows recent activity newest first, dated dd/mm/yyyy, each linking to its task", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const feed = panel("Recent activity");
    expect(norm(feed.textContent)).toContain("4 most recently updated");
    const rows = within(feed).getAllByRole("link");
    expect(rows.map((r) => r.getAttribute("href"))).toEqual([
      "/tasks/101",
      "/tasks/102",
      "/tasks/103",
      "/tasks/104",
    ]);
    expect(norm(rows[0].textContent)).toContain("RFI: Confirm beam size at grid C");
    expect(norm(rows[0].textContent)).toContain("14/06/2026");
    expect(norm(rows[3].textContent)).toContain("RFI: Paint colour for the lobby");
    expect(norm(rows[3].textContent)).toContain("09/05/2026");
  });

  it("shows the contract watch tabs with their counts, Needs you first", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const tabs = within(screen.getByRole("tablist", { name: "Contract watch" })).getAllByRole("tab");
    expect(tabs.map((t) => norm(t.textContent))).toEqual(["Needs you1", "Risk0", "Meetings0"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("offers the certificate waiting on this user, linking to it in Finance", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const row = screen.getByRole("link", { name: /Certify PC-002/ });
    expect(row).toHaveAttribute("href", "/finance?tab=Payment%20Certificates&pc=2");
  });

  it("switches the contract watch to another list when its tab is clicked", async () => {
    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    fireEvent.click(screen.getByRole("tab", { name: /Meetings/ }));
    expect(screen.getByRole("tab", { name: /Meetings/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("link", { name: /Certify PC-002/ })).not.toBeInTheDocument();
  });

  it("shows contract time, money and change in the status band", async () => {
    const { container } = renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const text = pageText(container);
    expect(text).toContain("199 daysuntil contract completion");
    expect(text).toContain("01 Jan 2026");
    expect(text).toContain("31 Dec 2026");
    expect(text).toContain("R 1 000 000,00certified — 10% of R 10 250 000,00");
    expect(text).toContain("R 9 250 000,00 still to certify");
    expect(text).toContain("R 250 000,00 approved (1)");
    expect(screen.getByRole("link", { name: "Programme" })).toHaveAttribute("href", "/programme");
  });

  it("shows the setup reminder with its percentage and a Complete setup action", async () => {
    const { container } = renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    const text = pageText(container);
    expect(text).toContain("14%");
    expect(text).toContain("Project setup 1 of 7 · still to add");
    expect(screen.getByRole("button", { name: "Complete setup" })).toBeInTheDocument();
    // Each missing field is a button that opens setup at that field.
    expect(screen.getByRole("button", { name: "a budget" })).toBeInTheDocument();
  });

  it("hides the setup reminder when dismissed, and remembers that for this project", async () => {
    const first = renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Hide setup reminders" }));
    expect(screen.queryByText(/Project setup/)).not.toBeInTheDocument();
    first.unmount();

    renderHome(healthyRoutes(PA_PERMISSIONS));
    await loaded();
    expect(screen.queryByText(/Project setup/)).not.toBeInTheDocument();
  });
});

describe("homepage: setup preconditions", () => {
  const noContract: [RegExp, Handler] = [/^projects\/1\/primary-contract\/$/, () => ({ primary_contract: null })];
  const noInsurance: [RegExp, Handler] = [/^documents\/insurance-status\//, () => ({ satisfied: false, folderId: null })];

  it("asks a project editor to upload the contract and the insurance certificate when they are missing", async () => {
    renderHome(withRoutes(healthyRoutes(PA_PERMISSIONS), [noContract, noInsurance]));
    await loaded();
    expect(await screen.findByText(/No primary contract set/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload contract" })).toBeInTheDocument();
    expect(screen.getByText("Upload your professional insurance certificate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload now" })).toBeInTheDocument();
  });

  it("does not show those reminders to a user who cannot act on them", async () => {
    renderHome(withRoutes(healthyRoutes(CONTRACTOR_PERMISSIONS), [noContract, noInsurance]));
    await loaded();
    expect(screen.queryByText(/No primary contract set/)).not.toBeInTheDocument();
    expect(screen.queryByText("Upload your professional insurance certificate")).not.toBeInTheDocument();
  });
});

// ── A contractor: no finance, no compliance ───────────────────────────────

describe("homepage: contractor without finance or compliance access", () => {
  it("shows no money anywhere on the page", async () => {
    const { container } = renderHome(healthyRoutes(CONTRACTOR_PERMISSIONS));
    await loaded();
    const text = pageText(container);
    expect(text).not.toMatch(/R\s?\d/);
    expect(text).not.toContain("Budget");
    expect(screen.queryByRole("link", { name: /Certify PC-002/ })).not.toBeInTheDocument();
  });

  it("never requests the money or risk endpoints", async () => {
    renderHome(healthyRoutes(CONTRACTOR_PERMISSIONS));
    await loaded();
    const asked = server.requested.join("\n");
    expect(asked).not.toMatch(/payment-certificates/);
    expect(asked).not.toMatch(/variation-orders/);
    expect(asked).not.toMatch(/taskType=VO/);
    expect(asked).not.toMatch(/\/payments\//);
    expect(asked).not.toMatch(/cost-ledger/);
    expect(asked).not.toMatch(/risk-signals/);
    expect(asked).not.toMatch(/obligations/);
  });

  it("is not offered the Risk tab", async () => {
    renderHome(healthyRoutes(CONTRACTOR_PERMISSIONS));
    await loaded();
    const tabs = within(screen.getByRole("tablist", { name: "Contract watch" })).getAllByRole("tab");
    expect(tabs.map((t) => norm(t.textContent))).toEqual(["Needs you0", "Meetings0"]);
  });

  it("still sees their own assigned tasks, which carry no money", async () => {
    renderHome(healthyRoutes(CONTRACTOR_PERMISSIONS));
    await loaded();
    expect(within(panel("My actions")).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByText("2 open actions")).toBeInTheDocument();
  });

  it("sees the setup reminder but is not offered Complete setup", async () => {
    renderHome(healthyRoutes(CONTRACTOR_PERMISSIONS));
    await loaded();
    expect(screen.getByText(/still to add/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete setup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "a budget" })).not.toBeInTheDocument();
  });
});

// ── Empty, loading and error states ───────────────────────────────────────

describe("homepage: empty project", () => {
  it("says plainly that nothing is assigned and nothing has happened", async () => {
    const { container } = renderHome(
      withRoutes(healthyRoutes(PA_PERMISSIONS), [
        [/^projects\/1\/tasks\/$/, () => ({ tasks: [] })],
        [/^tasks\/payment-certificates\/\?projectId=1/, () => page([])],
        [/^tasks\/variation-orders\//, () => page([])],
      ]),
    );
    await loaded();
    expect(screen.getByText("Nothing is assigned to you")).toBeInTheDocument();
    expect(screen.getByText("No activity recorded yet")).toBeInTheDocument();
    expect(screen.getByText("Nothing is waiting on you.")).toBeInTheDocument();
    expect(screen.getByText("0 open actions")).toBeInTheDocument();
    const text = pageText(container);
    expect(text).toContain("Budget R 10 000 000,00 · Remaining R 10 000 000,00 · nothing certified yet");
    expect(text).toContain("Nothing certified yet");
    expect(text).toContain("No variations raised");
  });
});

describe("homepage: loading", () => {
  it("shows a loader, and no panels, while the tasks are still being read", async () => {
    renderHome(
      withRoutes(healthyRoutes(PA_PERMISSIONS), [
        [/^projects\/1\/tasks\/$/, () => new Promise(() => {})],
      ]),
    );
    expect(await screen.findByText("Reading what needs you")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "My actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recent activity" })).not.toBeInTheDocument();
  });
});

describe("homepage: errors", () => {
  it("names the source that failed, offers Try again, and does not claim the list is empty", async () => {
    renderHome(
      withRoutes(healthyRoutes(PA_PERMISSIONS), [[/^projects\/1\/tasks\/$/, failing]]),
    );
    await loaded();
    expect(
      screen.getByText("Could not load your tasks. Anything outstanding there is missing from the queue below."),
    ).toBeInTheDocument();
    expect(screen.getByText("Your tasks could not be read")).toBeInTheDocument();
    expect(screen.queryByText("Nothing is assigned to you")).not.toBeInTheDocument();

    const before = server.requested.filter((u) => u === "projects/1/tasks/").length;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(server.requested.filter((u) => u === "projects/1/tasks/").length).toBeGreaterThan(before),
    );
  });

  it("states a total outage instead of an empty page when nothing could be read", async () => {
    renderHome(
      withRoutes(healthyRoutes(CONTRACTOR_PERMISSIONS), [
        [/^projects\/1\/tasks\/$/, failing],
        [/^meetings\/\?project_id=1/, failing],
        [/^projects\/1\/time-bars\/$/, failing],
        [/^projects\/\?userId=/, failing],
        [/^projects\/1\/milestones\/$/, failing],
      ]),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "This project's data could not be loaded" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/None of this project's data could be loaded, so nothing on this page can be shown/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nothing is assigned to you")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("homepage: no project", () => {
  it("offers to create the first project when the user has none", async () => {
    localStorage.removeItem("selectedProjectId");
    renderHome(withRoutes(healthyRoutes(PA_PERMISSIONS), [[/^projects\/\?userId=/, () => page([])]]));
    expect(await screen.findByRole("heading", { level: 1, name: "No projects yet" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create your first project" }));
    expect(await screen.findByText("create project page")).toBeInTheDocument();
  });

  it("asks the user to choose a project when they have some but none is selected", async () => {
    localStorage.removeItem("selectedProjectId");
    renderHome(healthyRoutes(PA_PERMISSIONS));
    expect(
      await screen.findByRole("heading", { level: 1, name: "No project selected" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose a project to see what is waiting on you.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create your first project" })).not.toBeInTheDocument();
  });
});

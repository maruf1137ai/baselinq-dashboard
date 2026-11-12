/**
 * Behaviour lock: the task board (`/tasks`, `pages/Task.tsx`), as clients use it today.
 *
 * The board is rendered whole, with every request answered by a fake API. The
 * assertions name the columns, cards, counts and controls a user relies on.
 * There is no DOM snapshot, so a styling change will not break these tests,
 * but a change in what the board shows or offers will.
 *
 * Deliberately NOT covered: dragging a card between columns. On main a drag
 * can close an RFI/SI/GI/IC/DC through `update-entity/` with no permission
 * check. That is a known hole being fixed, so it must not be locked in here.
 *
 * If one of these fails, the board a client sees has changed. That may be
 * intended. If so, update the test in the same PR and say so in the PR body.
 */
import React from "react";
import { configure, fireEvent, render, screen, within } from "@testing-library/react";
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
  mocked.getProfile = vi.fn(async () => via("auth/profile/"));
  // Writes are answered but never asserted on: see the note at the top.
  mocked.postData = vi.fn(async () => ({}));
  return mocked;
});

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The create form is its own screen. Here it only matters which one opens.
vi.mock("@/components/header/CreateRequestDialog", () => ({
  default: ({ open, selectedType }: { open: boolean; selectedType: string }) =>
    open ? <div role="dialog" aria-label="create form">{selectedType}</div> : null,
}));

import Task from "@/pages/Task";

// ── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-15T10:00:00Z");
const ME = { id: 7, name: "Pat Agent", email: "pat@example.test", account_type: "individual", role: { id: 1, name: "Principal Agent", code: "PA" } };
const pat = { userId: 7, name: "Pat Agent", role: "Principal Agent" };
const sam = { userId: 9, name: "Sam Builder", role: "Contractor" };
const lee = { userId: 8, name: "Lee Architect", role: "Architect" };

const day = 86_400_000;
const inDays = (n: number) => new Date(NOW.getTime() + n * day).toISOString();

/**
 * One task as `projects/{id}/tasks/` returns it. Priority and discipline are
 * always set: when they are missing the board fills in placeholder values,
 * and this file does not lock those in.
 */
function task(over: {
  id: number;
  type: string;
  number: string;
  subject: string;
  status: string;
  entityStatus: string;
  dueDate?: string | null;
  dueDateIsDefault?: boolean;
  assignedTo?: typeof pat[];
  assignedBy?: typeof pat;
  responseBy?: typeof pat[];
  priority?: string;
  discipline?: string;
}) {
  const numberField = `${over.type.toLowerCase()}Number`;
  return {
    id: over.id,
    taskId: over.id,
    taskType: over.type,
    status: over.status,
    dueDate: over.dueDate ?? null,
    dueDateIsDefault: over.dueDateIsDefault ?? false,
    assignedTo: over.assignedTo ?? [],
    assignedBy: over.assignedBy ?? null,
    responseBy: over.responseBy ?? [],
    created_at: "2026-06-01T08:00:00Z",
    responses: [],
    task: {
      [numberField]: over.number,
      subject: over.subject,
      status: over.entityStatus,
      priority: over.priority ?? "Medium",
      discipline: over.discipline ?? "Structural",
      attachments: [],
    },
  };
}

const TASKS = [
  // Open, assigned to me, due in ten days.
  task({ id: 101, type: "RFI", number: "RFI-004", subject: "Confirm beam size at grid C", status: "todo", entityStatus: "Sent for Review", dueDate: inDays(10), assignedTo: [pat], assignedBy: sam, priority: "High", discipline: "Structural" }),
  // Open, raised by me, two days overdue.
  task({ id: 102, type: "SI", number: "SI-002", subject: "Relocate the DB board", status: "todo", entityStatus: "Issued", dueDate: inDays(-2), assignedTo: [sam], assignedBy: pat, priority: "Critical", discipline: "MEP" }),
  // Under review, I am only copied in.
  task({ id: 103, type: "VO", number: "VO-003", subject: "Extra boundary wall", status: "in review", entityStatus: "Submitted", dueDate: inDays(20), assignedTo: [lee], assignedBy: sam, responseBy: [pat], priority: "Low", discipline: "Civil" }),
  // Resolved, assigned to me.
  task({ id: 104, type: "RFI", number: "RFI-001", subject: "Paint colour for the lobby", status: "done", entityStatus: "Closed", dueDate: "2026-05-10T12:00:00Z", assignedTo: [pat], assignedBy: sam }),
  // Open, nothing to do with me.
  task({ id: 105, type: "GI", number: "GI-001", subject: "Survey pegs on the east boundary", status: "todo", entityStatus: "Sent", dueDate: inDays(30), assignedTo: [lee], assignedBy: sam }),
  // Open, assigned to me, due date filled in from the SLA table (not chosen by a user).
  task({ id: 106, type: "RFI", number: "RFI-007", subject: "Fire door rating", status: "todo", entityStatus: "Sent for Review", dueDate: inDays(12), dueDateIsDefault: true, assignedTo: [pat], assignedBy: sam }),
];

const ALL_CREATE = {
  "task.si.create": true,
  "task.vo.create": true,
  "task.rfi.create": true,
  "task.gi.create": true,
};

function routes(opts: {
  permissions?: Record<string, boolean>;
  tasks?: Handler;
  notifications?: unknown[];
} = {}): [RegExp, Handler][] {
  return [
    [/^auth\/profile\/$/, () => ME],
    [/^permissions\/effective\//, () => ({ projectId: 1, roleCode: "PA", permissions: opts.permissions ?? ALL_CREATE })],
    [/^projects\/1\/tasks\/$/, opts.tasks ?? (() => ({ tasks: TASKS }))],
    [/^notifications\/\?/, () => opts.notifications ?? []],
  ];
}

function renderBoard(table: [RegExp, Handler][]) {
  server.routes = table;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/tasks"]}>
        <Routes>
          <Route path="/tasks" element={<Task />} />
          <Route path="/tasks/:id" element={<p>task page</p>} />
          <Route path="/help/tasks" element={<p>workflow reference page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** The column whose heading has this name. */
function column(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 2, name });
  return heading.parentElement!.parentElement!.parentElement as HTMLElement;
}

/** The count printed beside a column's heading. */
const countOf = (name: string) =>
  norm(screen.getByRole("heading", { level: 2, name }).nextElementSibling?.textContent);

/** The task codes on the cards in a column, top to bottom. */
const codesIn = (name: string) =>
  within(column(name))
    .queryAllByText(/^(RFI|SI|VO|GI|DC|IC|CPI)-\d+$/)
    .map((el) => el.textContent);

/** The card showing this task code. */
const card = (code: string) => screen.getByText(code).closest(".p-3") as HTMLElement;

/** Wait until the board has loaded its tasks. */
const loaded = () => screen.findByText("RFI-004");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  localStorage.clear();
  localStorage.setItem("selectedProjectId", "1");
  server.requested = [];
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("task board: layout", () => {
  it("shows the title, the workflow reference link and the three columns", async () => {
    renderBoard(routes());
    await loaded();
    expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Workflow reference/ })).toHaveAttribute("href", "/help/tasks");
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Open", "Under Review", "Resolved"]);
  });

  it("shows the filter bar with My Tasks, All Tasks and one chip per document type", async () => {
    renderBoard(routes());
    await loaded();
    for (const label of ["My Tasks", "All Tasks", "All", "VO", "RFI", "SI", "GI", "IC", "Claim", "CPI", "Filters"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });
});

describe("task board: which tasks are shown", () => {
  it("starts on My Tasks: tasks I am assigned, raised or copied in on", async () => {
    renderBoard(routes());
    await loaded();
    expect(codesIn("Open")).toEqual(["RFI-004", "SI-002", "RFI-007"]);
    expect(codesIn("Under Review")).toEqual(["VO-003"]);
    expect(codesIn("Resolved")).toEqual(["RFI-001"]);
    expect(countOf("Open")).toBe("3");
    expect(countOf("Under Review")).toBe("1");
    expect(countOf("Resolved")).toBe("1");
    // Nothing to do with me.
    expect(screen.queryByText("GI-001")).not.toBeInTheDocument();
  });

  it("shows every task on All Tasks", async () => {
    renderBoard(routes());
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "All Tasks" }));
    expect(codesIn("Open")).toEqual(["RFI-004", "SI-002", "GI-001", "RFI-007"]);
    expect(countOf("Open")).toBe("4");
    expect(countOf("Under Review")).toBe("1");
    expect(countOf("Resolved")).toBe("1");
  });

  it("narrows to one document type when its chip is clicked, and back with All", async () => {
    renderBoard(routes());
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "All Tasks" }));
    fireEvent.click(screen.getByRole("button", { name: "RFI" }));
    expect(codesIn("Open")).toEqual(["RFI-004", "RFI-007"]);
    expect(codesIn("Under Review")).toEqual([]);
    expect(codesIn("Resolved")).toEqual(["RFI-001"]);
    expect(countOf("Under Review")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(countOf("Open")).toBe("4");
  });
});

describe("task board: what a card shows", () => {
  it("shows the document number, title, priority and discipline", async () => {
    renderBoard(routes());
    await loaded();
    const c = norm(card("RFI-004").textContent);
    expect(c).toContain("Confirm beam size at grid C");
    expect(c).toContain("High");
    expect(c).toContain("Structural");
  });

  it("shows a due date more than a week away as a date", async () => {
    renderBoard(routes());
    await loaded();
    expect(norm(card("RFI-004").textContent)).toContain("25 Jun 2026");
  });

  it("shows no date when the due date came from the SLA table rather than a user", async () => {
    renderBoard(routes());
    await loaded();
    expect(norm(card("RFI-007").textContent)).not.toMatch(/\d{2} \w{3} \d{4}/);
  });

  it("flags an overdue task on the card and on its column", async () => {
    renderBoard(routes());
    await loaded();
    const c = norm(card("SI-002").textContent);
    expect(c).toContain("2d late");
    expect(c).toContain("2d overdue");
    expect(within(column("Open")).getByText("1 breached")).toBeInTheDocument();
  });

  it("does not count resolved tasks as breached", async () => {
    renderBoard(routes());
    await loaded();
    expect(within(column("Resolved")).queryByText(/breached/)).not.toBeInTheDocument();
  });

  it("shows the people on a card as initials", async () => {
    renderBoard(routes());
    await loaded();
    // Raised by Sam Builder, assigned to Pat Agent.
    const c = card("RFI-004").parentElement!;
    expect(within(c).getByText("SB")).toBeInTheDocument();
    expect(within(c).getByText("PA")).toBeInTheDocument();
  });

  it("opens the task when a card is clicked", async () => {
    renderBoard(routes());
    await loaded();
    fireEvent.click(screen.getByText("Confirm beam size at grid C"));
    expect(await screen.findByText("task page")).toBeInTheDocument();
  });

  it("badges a card with its unread notifications", async () => {
    renderBoard(
      routes({
        notifications: [
          { _id: "n1", type: "task_updated", title: "RFI-004 updated", body: "", data: { taskId: 101 }, link: "/tasks/101", is_read: false },
          { _id: "n2", type: "task_updated", title: "RFI-004 reply", body: "", data: { taskId: 101 }, link: "/tasks/101", is_read: false },
        ],
      }),
    );
    await loaded();
    const wrapper = card("RFI-004").closest(".relative") as HTMLElement;
    expect(await within(wrapper).findByText("2")).toBeInTheDocument();
  });
});

describe("task board: creating a task", () => {
  it("offers every type the user may create, in the order SI, VO, RFI, GI", async () => {
    renderBoard(routes());
    await loaded();
    const adds = screen.getAllByRole("button", { name: "Add task" });
    expect(adds).toHaveLength(3);
    fireEvent.click(adds[0]);
    const dialog = await screen.findByRole("dialog", { name: "Select Request Type" });
    const options = within(dialog).getAllByText(/^(SI|VO|RFI|GI|DC|IC|CPI) - /).map((el) => el.textContent);
    expect(options).toEqual([
      "SI - Site Instruction",
      "VO - Variation Order",
      "RFI - Request for Information",
      "GI - General Instruction",
    ]);
  });

  it("offers only the types this user's role may create", async () => {
    renderBoard(routes({ permissions: { "task.rfi.create": true } }));
    await loaded();
    fireEvent.click(screen.getAllByRole("button", { name: "Add task" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Select Request Type" });
    const options = within(dialog).getAllByText(/^(SI|VO|RFI|GI|DC|IC|CPI) - /).map((el) => el.textContent);
    expect(options).toEqual(["RFI - Request for Information"]);
  });

  it("opens the form for the chosen type", async () => {
    renderBoard(routes());
    await loaded();
    fireEvent.click(screen.getAllByRole("button", { name: "Add task" })[0]);
    fireEvent.click(await screen.findByText("RFI - Request for Information"));
    expect(await screen.findByRole("dialog", { name: "create form" })).toHaveTextContent(
      "RFI - Request for Information",
    );
  });

  it("offers no Add task button to a user who may create nothing", async () => {
    renderBoard(routes({ permissions: {} }));
    await loaded();
    expect(screen.queryByRole("button", { name: "Add task" })).not.toBeInTheDocument();
  });
});

describe("task board: empty, loading and no project", () => {
  it("shows three empty columns with zero counts when the project has no tasks", async () => {
    renderBoard(routes({ tasks: () => ({ tasks: [] }) }));
    expect(await screen.findByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(countOf("Open")).toBe("0");
    expect(countOf("Under Review")).toBe("0");
    expect(countOf("Resolved")).toBe("0");
  });

  it("shows a loader while the tasks are being read", async () => {
    renderBoard(routes({ tasks: () => new Promise(() => {}) }));
    expect(await screen.findByText("Fetching task board")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Open" })).not.toBeInTheDocument();
  });

  it("asks the user to choose a project when none is selected, and requests no tasks", async () => {
    localStorage.removeItem("selectedProjectId");
    renderBoard(routes());
    expect(await screen.findByText("No project selected")).toBeInTheDocument();
    expect(screen.getByText("Choose a project from the sidebar to view its task board.")).toBeInTheDocument();
    expect(server.requested.some((u) => u.includes("/tasks/"))).toBe(false);
  });
});

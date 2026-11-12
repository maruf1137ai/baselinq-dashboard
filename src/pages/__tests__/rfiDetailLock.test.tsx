/**
 * Behaviour lock: the RFI detail view (`/tasks/:taskId`, `pages/TaskDetails.tsx`
 * showing an RFI), as clients use it today.
 *
 * The page is rendered whole, with every request answered by a fake API. The
 * assertions name the document fields, replies, timeline and controls a user
 * relies on. There is no DOM snapshot, so a styling change will not break
 * these tests, but a change in what the page shows or offers will.
 *
 * Deliberately NOT covered, because they are known holes being fixed:
 *  - How a reply is saved. Today the browser rewrites the whole replies array
 *    (author and date are editable, and concurrent replies are lost). These
 *    tests check that the reply box is offered, never what it sends.
 *  - Who may close or move the RFI beyond its originator. Only "the person
 *    who raised it is offered Close out" and "a professional who did not is
 *    not" are locked.
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

const writes = vi.hoisted(() => ({ patch: [] as unknown[] }));

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
  mocked.getProject = vi.fn(async (id: string) => via(`projects/${id}/`));
  // Opening a task marks its notifications read. Answered, never asserted.
  mocked.postData = vi.fn(async () => ({}));
  // Recorded so a test can prove nothing was saved. Never answered with data.
  mocked.patchData = vi.fn(async (args: unknown) => {
    writes.patch.push(args);
    return null;
  });
  return mocked;
});

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import TaskDetails from "@/pages/TaskDetails";

// ── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-15T10:00:00Z");

const PAT = { id: 7, name: "Pat Agent", email: "pat@example.test", account_type: "individual", role: { id: 1, name: "Principal Agent", code: "PA" } };
const SAM = { id: 9, name: "Sam Builder", email: "sam@example.test", account_type: "individual", role: { id: 2, name: "Contractor", code: "CONTRACTOR" } };

const chip = (userId: string, name: string, role: string) => ({ userId, name, email: `${name.split(" ")[0].toLowerCase()}@example.test`, role });

/** An RFI as `tasks/tasks/{id}/` returns it: raised by Sam, to Pat, Lee copied in. */
function rfi(over: { status?: string; responses?: unknown[]; dueDateIsDefault?: boolean } = {}) {
  const status = over.status ?? "Sent for Review";
  return {
    taskType: "RFI",
    taskId: "101",
    projectId: "1",
    status: status === "Closed" ? "done" : "todo",
    assignedBy: { userId: "9", role: "Contractor", name: "Sam Builder" },
    assignedTo: [chip("7", "Pat Agent", "Principal Agent")],
    responseBy: [chip("8", "Lee Architect", "Architect")],
    responses: over.responses ?? [],
    due_date: "2026-06-22",
    dueDate: "2026-06-22",
    due_date_is_default: over.dueDateIsDefault ?? false,
    dueDateIsDefault: over.dueDateIsDefault ?? false,
    task: {
      _id: 55,
      id: 55,
      rfiNumber: "RFI-004",
      subject: "Confirm beam size at grid C",
      question: "Drawings S-201 and S-305 disagree on the beam at grid C. Which governs?",
      discipline: "Structural",
      priority: "High",
      status,
      dueDate: "2026-06-22",
      createdAt: "2026-06-10T08:00:00Z",
      raisedBy: { userId: "9", name: "Sam Builder" },
      attachments: [],
      task: {
        id: 101,
        projectId: "1",
        taskType: "RFI",
        objectId: 55,
        status: status === "Closed" ? "done" : "todo",
        assignedByUserId: "9",
        assigned_to: [chip("7", "Pat Agent", "Principal Agent")],
        cc_users: [chip("8", "Lee Architect", "Architect")],
      },
    },
  };
}

const REPLIES = [
  { id: "r1", sender: "Pat Agent", senderId: "7", role: "Principal Agent", content: "<p>Use S-305. S-201 is superseded.</p>", date: "2026-06-12T09:00:00Z" },
  { id: "r2", sender: "Sam Builder", senderId: "9", role: "Contractor", content: "<p>Noted, thank you.</p>", date: "2026-06-13T09:00:00Z" },
];

const AUDITS = [
  { id: 1, action: "rfi_created", description: "", createdByName: "Sam Builder", createdBy: { name: "Sam Builder" }, created_at: "2026-06-10T08:00:00Z" },
];

function routes(opts: {
  user?: typeof PAT;
  roleCode?: string;
  permissions?: Record<string, boolean>;
  task?: Handler;
  audits?: unknown[];
} = {}): [RegExp, Handler][] {
  return [
    [/^auth\/profile\/$/, () => opts.user ?? PAT],
    [/^permissions\/effective\//, () => ({ projectId: 1, roleCode: opts.roleCode ?? "PA", permissions: opts.permissions ?? {} })],
    [/^tasks\/tasks\/101\/$/, opts.task ?? (() => rfi())],
    [/^tasks\/tasks\/101\/audits\//, () => opts.audits ?? []],
    [/^projects\/1\/team-members\/$/, () => ({ teamMembers: [] })],
    [/^projects\/1\/tasks\/$/, () => ({ tasks: [] })],
    [/^projects\/1\/$/, () => ({ id: 1, name: "Hatfield Street Refurbishment", projectNumber: "PRJ-001" })],
    [/^tasks\/entity-references\//, () => ({ outgoing: [], incoming: [] })],
    [/^tasks\/request-task-info\//, () => ({ results: [] })],
  ];
}

function renderRfi(table: [RegExp, Handler][]) {
  server.routes = table;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/tasks/101"]}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Wait until the RFI itself is on screen. */
const loaded = () => screen.findByRole("heading", { level: 1, name: "Confirm beam size at grid C" });

/** The value printed against a label in the document header. */
function field(label: string): string {
  const dt = screen.getByText(label, { selector: "dt" });
  return norm(dt.nextElementSibling?.textContent);
}

/** The card under a right-hand heading such as "Decision Timeline". */
function sideCard(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 3, name });
  return heading.parentElement!.parentElement as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  localStorage.clear();
  localStorage.setItem("selectedProjectId", "1");
  server.requested = [];
  writes.patch = [];
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("RFI detail: the document", () => {
  it("shows the type, title, number, status and due date in the header", async () => {
    renderRfi(routes());
    await loaded();
    expect(screen.getByText("RFI", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("#RFI-004")).toBeInTheDocument();
    expect(screen.getAllByText("Sent for Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Due 22 Jun 2026")).toBeInTheDocument();
  });

  it("labels an SLA-default due date as an escalation date, not a due date", async () => {
    renderRfi(routes({ task: () => rfi({ dueDateIsDefault: true }) }));
    await loaded();
    expect(screen.getByText("Escalate by 22 Jun 2026")).toBeInTheDocument();
    expect(screen.queryByText("Due 22 Jun 2026")).not.toBeInTheDocument();
  });

  it("shows who it is from, to and copied to, with their project roles", async () => {
    renderRfi(routes());
    await loaded();
    expect(field("From:")).toContain("Sam Builder (Contractor)");
    expect(field("To:")).toContain("Pat Agent (Principal Agent)");
    expect(field("CC:")).toContain("Lee Architect (Architect)");
  });

  it("shows the date issued, discipline, subject, date required and the question", async () => {
    renderRfi(routes());
    await loaded();
    expect(field("Date Issued:")).toContain("10 Jun 2026");
    expect(field("Discipline:")).toBe("Structural");
    expect(field("Subject:")).toBe("Confirm beam size at grid C");
    expect(field("Date required:")).toBe("22 Jun 2026");
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.getByText("Drawings S-201 and S-305 disagree on the beam at grid C. Which governs?"),
    ).toBeInTheDocument();
  });

  it("offers Back, Task help (for RFIs) and Print / Export", async () => {
    renderRfi(routes());
    await loaded();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Task help" })).toHaveAttribute("href", "/help/tasks#rfi");
    expect(screen.getByRole("button", { name: "Print / Export" })).toBeInTheDocument();
  });
});

describe("RFI detail: decision timeline and audit trail", () => {
  it("shows the five RFI stages in order, with the current one marked In progress", async () => {
    renderRfi(routes());
    await loaded();
    const timeline = sideCard("Decision Timeline");
    const stages = within(timeline).getAllByRole("listitem").map((li) => norm(li.textContent));
    expect(stages).toEqual([
      "Draft",
      "Sent for ReviewIn progress",
      "Further Info Required",
      "Response Provided",
      "Closed",
    ]);
  });

  it("shows an empty audit trail as such", async () => {
    renderRfi(routes());
    await loaded();
    expect(within(sideCard("Audit Trail")).getByText("No activity recorded yet")).toBeInTheDocument();
  });

  it("lists audit entries, naming who did what", async () => {
    renderRfi(routes({ audits: AUDITS }));
    await loaded();
    const trail = sideCard("Audit Trail");
    await waitFor(() => expect(norm(trail.textContent)).toContain("Sam Builder"));
    expect(norm(trail.textContent)).toContain("10 Jun 2026");
    expect(norm(trail.textContent)).toContain("created a Request for Information #RFI-004");
    expect(within(trail).queryByText("No activity recorded yet")).not.toBeInTheDocument();
  });
});

describe("RFI detail: replies", () => {
  it("lists existing replies oldest first, with a total", async () => {
    renderRfi(routes({ task: () => rfi({ status: "Response Provided", responses: REPLIES }) }));
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: "Replies" })).toBeInTheDocument();
    expect(screen.getByText("2 Total")).toBeInTheDocument();
    const first = screen.getByText("Use S-305. S-201 is superseded.");
    const second = screen.getByText("Noted, thank you.");
    // Oldest first: the first reply comes before the second in the page.
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("offers the reply box on an open RFI, replying as the signed-in user", async () => {
    renderRfi(routes());
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: "Add a reply" })).toBeInTheDocument();
    expect(screen.getByText("Replying as Pat Agent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Reply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze with AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link doc" })).toBeInTheDocument();
    expect(screen.getByText("Attach file")).toBeInTheDocument();
  });

  it("saves nothing when Submit Reply is pressed with an empty reply", async () => {
    renderRfi(routes());
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Submit Reply" }));
    // Give any (wrong) save a chance to start.
    await new Promise((r) => setTimeout(r, 50));
    expect(writes.patch).toEqual([]);
  });

  it("shows the RFI as locked, with no reply box, once it is closed", async () => {
    renderRfi(routes({ task: () => rfi({ status: "Closed", responses: REPLIES }) }));
    await loaded();
    expect(screen.getByText("Task Locked")).toBeInTheDocument();
    expect(
      screen.getByText("This task has been approved and is now closed. No further responses or edits are allowed."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add a reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close out" })).not.toBeInTheDocument();
    // The replies stay readable.
    expect(screen.getByText("2 Total")).toBeInTheDocument();
  });
});

describe("RFI detail: actions by role", () => {
  it("offers the person who raised it Close out, and tells them a reply is awaited", async () => {
    renderRfi(routes({ user: SAM, roleCode: "CONTRACTOR" }));
    await loaded();
    expect(screen.getByRole("button", { name: "Close out" })).toBeInTheDocument();
    expect(screen.getByText("Awaiting response from the assigned member.")).toBeInTheDocument();
  });

  it("does not offer Close out to the professional it was sent to", async () => {
    renderRfi(routes({ user: PAT, roleCode: "PA" }));
    await loaded();
    expect(screen.queryByRole("button", { name: "Close out" })).not.toBeInTheDocument();
    expect(screen.queryByText("Awaiting response from the assigned member.")).not.toBeInTheDocument();
  });

  it("offers escalation to a Site Instruction only with the escalate permission", async () => {
    const without = renderRfi(routes({ user: PAT, roleCode: "PA", permissions: {} }));
    await loaded();
    expect(screen.queryByRole("button", { name: /Action/ })).not.toBeInTheDocument();
    without.unmount();

    renderRfi(routes({ user: PAT, roleCode: "PA", permissions: { "task.rfi.escalate_to_si": true } }));
    await loaded();
    const action = await screen.findByRole("button", { name: /Action/ });
    fireEvent.pointerDown(action, { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "Escalate to Site Instruction" })).toBeInTheDocument();
  });
});

describe("RFI detail: loading and errors", () => {
  it("shows a loader while the RFI is being read", async () => {
    renderRfi(routes({ task: () => new Promise(() => {}) }));
    expect(await screen.findByText("Processing task intelligence")).toBeInTheDocument();
  });

  it("says the task was not found when it cannot be read", async () => {
    renderRfi(
      routes({
        task: () => {
          throw new Error("HTTP error! status: 404");
        },
      }),
    );
    expect(await screen.findByText("Task not found")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Reply" })).not.toBeInTheDocument();
  });
});

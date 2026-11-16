/**
 * Dragging a card on the task board never changes a record's status.
 *
 * On main a drop on another column sent a status to update-entity/ (which
 * could close an RFI, SI, GI, IC or claim with none of its own checks) and
 * posted a "status_change" message. Now a cross-column drop saves nothing,
 * leaves the card where it was and points to the record's own actions.
 *
 * dnd-kit's pointer sensors do not run in jsdom, so DndContext is replaced by
 * a shell that hands its handlers to the test; the handlers are the board's
 * own.
 */
import React from "react";
import { act, configure, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ asyncUtilTimeout: 5_000 });
vi.setConfig({ testTimeout: 20_000 });

const h = vi.hoisted(() => ({
  dnd: {} as Record<string, (e: any) => any>,
  patchData: null as any,
  postData: null as any,
  toast: { info: null as any, error: null as any, success: null as any },
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children, onDragStart, onDragOver, onDragEnd }: any) => {
      h.dnd = { onDragStart, onDragOver, onDragEnd };
      return <div>{children}</div>;
    },
  };
});

vi.mock("sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sonner")>();
  h.toast.info = vi.fn();
  h.toast.error = vi.fn();
  h.toast.success = vi.fn();
  return { ...actual, toast: Object.assign(vi.fn(), h.toast) };
});

const ME = { id: 7, name: "Pat Agent", email: "pat@example.test", role: { id: 1, name: "Principal Agent", code: "PA" } };
const pat = { userId: 7, name: "Pat Agent" };
const TASKS = [
  {
    id: 101, taskId: 101, taskType: "RFI", status: "todo", assignedTo: [pat], responseBy: [], responses: [],
    created_at: "2026-06-01T08:00:00Z",
    task: { rfiNumber: "RFI-004", subject: "Beam size", status: "Sent for Review", priority: "High", discipline: "Structural", attachments: [] },
  },
  {
    id: 102, taskId: 102, taskType: "SI", status: "todo", assignedTo: [pat], responseBy: [], responses: [],
    created_at: "2026-06-01T08:00:00Z",
    task: { siNumber: "SI-002", subject: "DB board", status: "Issued", priority: "High", discipline: "MEP", attachments: [] },
  },
];

vi.mock("@/lib/Api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/Api")>();
  h.patchData = vi.fn(async () => ({}));
  h.postData = vi.fn(async () => ({}));
  const get = async (url: string) => {
    if (url === "auth/profile/") return ME;
    if (url.startsWith("permissions/effective/")) return { permissions: { "task.rfi.create": true } };
    if (url === "projects/1/tasks/") return { tasks: TASKS };
    if (url.startsWith("notifications/")) return [];
    throw new Error(`unexpected GET ${url}`);
  };
  return {
    ...actual,
    fetchData: vi.fn(get),
    getProfile: vi.fn(() => get("auth/profile/")),
    patchData: h.patchData,
    postData: h.postData,
    putData: vi.fn(async () => {
      throw new Error("unexpected PUT");
    }),
  };
});

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Task from "@/pages/Task";

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/tasks"]}>
        <Routes>
          <Route path="/tasks" element={<Task />} />
          <Route path="/tasks/:id" element={<p>task page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const column = (name: string) =>
  screen.getByRole("heading", { level: 2, name }).parentElement!.parentElement!.parentElement as HTMLElement;
const codesIn = (name: string) =>
  within(column(name)).queryAllByText(/^(RFI|SI)-\d+$/).map((el) => el.textContent);

/** A full drag of `id` onto `overId`, through the board's own handlers. */
async function drag(id: number, overId: string | number) {
  const rect = { top: 0, height: 10 };
  await act(async () => {
    h.dnd.onDragStart({ active: { id } });
  });
  await act(async () => {
    h.dnd.onDragOver({ active: { id, rect: { current: { translated: rect } } }, over: { id: overId, rect } });
  });
  await act(async () => {
    await h.dnd.onDragEnd({ active: { id }, over: { id: overId } });
  });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("selectedProjectId", "1");
  h.patchData.mockClear();
  h.postData.mockClear();
  h.toast.info.mockClear();
  h.toast.success.mockClear();
});

describe("task board: dragging between columns", () => {
  it.each(["done", "inReview"])("a drop on %s changes no status and posts no message", async (target) => {
    renderBoard();
    await screen.findByText("RFI-004");
    await drag(101, target);

    expect(h.patchData).not.toHaveBeenCalled();
    expect(h.postData).not.toHaveBeenCalled();
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(codesIn("Open")).toEqual(["RFI-004", "SI-002"]);
    expect(codesIn("Resolved")).toEqual([]);
    expect(codesIn("Under Review")).toEqual([]);
  });

  it("says why, and offers to open the record", async () => {
    renderBoard();
    await screen.findByText("RFI-004");
    await drag(101, "done");

    expect(h.toast.info).toHaveBeenCalledTimes(1);
    const [message, opts] = h.toast.info.mock.calls[0];
    expect(message).toMatch(/does not change its status/);
    expect(message).toContain("RFI-004");
    expect(opts.action.label).toBe("Open RFI-004");
    await act(async () => opts.action.onClick());
    expect(screen.getByText("task page")).toBeInTheDocument();
  });

  it("a drop on a card in another column is refused the same way", async () => {
    renderBoard();
    await screen.findByText("RFI-004");
    // Hovering a column must not move the card into it mid-drag.
    await act(async () => {
      h.dnd.onDragStart({ active: { id: 101 } });
    });
    await act(async () => {
      h.dnd.onDragOver({ active: { id: 101, rect: { current: { translated: null } } }, over: { id: "done", rect: {} } });
    });
    expect(codesIn("Open")).toEqual(["RFI-004", "SI-002"]);
    await act(async () => {
      await h.dnd.onDragEnd({ active: { id: 101 }, over: { id: "inReview" } });
    });
    expect(h.patchData).not.toHaveBeenCalled();
  });

  it("reorders within a column on screen, saving nothing", async () => {
    renderBoard();
    await screen.findByText("RFI-004");
    await drag(101, 102);
    expect(codesIn("Open")).toEqual(["SI-002", "RFI-004"]);
    expect(h.patchData).not.toHaveBeenCalled();
    expect(h.toast.info).not.toHaveBeenCalled();
  });
});

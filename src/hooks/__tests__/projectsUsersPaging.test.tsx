/**
 * Project and user lists show every row, not the first page of them.
 *
 * `projects/`, `auth/users/` and `tasks/tasks/` are paged by the server at
 * twenty. The project picker, the sidebar's switcher, `useProjects` and the
 * team pickers read one response, so a user's 21st project never appeared and
 * the 21st user could not be added to a team. (`page_size=500` was sent, but
 * the server ignored it.)
 */
import React from "react";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  // The read `useProjects` used before: one response, the first page.
  getProjects: () => fetchData("projects/"),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProfile: vi.fn(),
  orgInviteMember: vi.fn(),
  getPresignedUrl: vi.fn(),
  uploadFileToPresignedUrl: vi.fn(),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ data: { id: 7, role: { code: "CLIENT" } }, isLoading: false }),
}));
vi.mock("@/hooks/useProjectsHealth", () => ({ useProjectsHealth: () => ({ healthMap: new Map() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAllPages, pageUrl } from "@/hooks/useAllPages";
import { useProjects } from "@/hooks/useProjects";
import SelectProject from "@/pages/account/SelectProject";

const project = (id: number) => ({ id, _id: String(id), name: `Project ${id}`, location: "" });
const ROWS = Array.from({ length: 25 }, (_, i) => project(i + 1));

/** A DRF page of twenty, as the server answers whatever page_size is sent. */
function serve(url: string) {
  const n = Number(new URLSearchParams(url.split("?")[1] ?? "").get("page") || "1");
  return Promise.resolve({
    count: 25,
    next: n === 1 ? "http://api/next" : null,
    previous: null,
    results: n === 1 ? ROWS.slice(0, 20) : ROWS.slice(20),
  });
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  fetchData.mockReset();
  fetchData.mockImplementation(serve);
  localStorage.clear();
});

describe("pageUrl", () => {
  it("adds the paging parameters with ? or &", () => {
    expect(pageUrl("auth/users/", 2)).toBe("auth/users/?page_size=200&page=2");
    expect(pageUrl("projects/?userId=7", 1)).toBe("projects/?userId=7&page_size=200&page=1");
  });
});

describe("useAllPages", () => {
  it("walks every page and asks for the largest page the server allows", async () => {
    const { result } = renderHook(() => useAllPages<{ id: number }>("auth/users/"), { wrapper: wrapper(newClient()) });
    await waitFor(() => expect(result.current.data?.rows).toHaveLength(25));
    expect(result.current.data?.truncated).toBe(false);
    expect(fetchData).toHaveBeenCalledWith("auth/users/?page_size=200&page=1");
    expect(fetchData).toHaveBeenCalledWith("auth/users/?page_size=200&page=2");
  });

  it("is refreshed by the invalidations keyed on the list URL", async () => {
    const client = newClient();
    const { result } = renderHook(() => useAllPages("projects/?userId=7"), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.data?.rows).toHaveLength(25));
    fetchData.mockClear();
    await client.invalidateQueries({ queryKey: ["projects/?userId=7"] });
    await waitFor(() => expect(fetchData).toHaveBeenCalledWith("projects/?userId=7&page_size=200&page=1"));
  });

  it("asks for nothing without a URL", () => {
    renderHook(() => useAllPages(null), { wrapper: wrapper(newClient()) });
    expect(fetchData).not.toHaveBeenCalled();
  });
});

describe("useProjects", () => {
  it("returns every project, not the first twenty", async () => {
    const { result } = renderHook(() => useProjects(), { wrapper: wrapper(newClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(25);
  });
});

describe("Select project", () => {
  it("offers the user's 21st project", async () => {
    render(<SelectProject />, { wrapper: wrapper(newClient()) });
    expect(await screen.findByText("Project 25")).toBeInTheDocument();
    expect(screen.getByText("Project 21")).toBeInTheDocument();
  });

  it("says the projects couldn't be loaded, rather than 'No projects yet'", async () => {
    fetchData.mockImplementation(() => Promise.reject(new Error("HTTP error! status: 500")));
    render(<SelectProject />, { wrapper: wrapper(newClient()) });
    expect(await screen.findByRole("alert")).toHaveTextContent("Your projects couldn't be loaded.");
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
  });
});

/**
 * The Documents page shows how many documents a tab really holds, and loads
 * the rest on request.
 *
 * `documents/` is paged by the server. The page read the first response only,
 * so with 45 drawings the tab badge said 20, the header said "20 documents",
 * and drawings 21–45 were nowhere in the tree, with nothing on screen to say
 * so. Each tab now asks for its own rows, takes its count from the server's
 * `count`, and offers "Load more" until every row is on screen.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  deleteData: vi.fn(),
  postData: vi.fn(),
  patchData: vi.fn(),
}));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/documents/PrimaryContractCard", () => ({ PrimaryContractCard: () => null }));
vi.mock("@/components/documents/AskRegulationsDrawer", () => ({ AskRegulationsDrawer: () => null }));
vi.mock("@/components/documents/IssueRegisterModal", () => ({ IssueRegisterModal: () => null }));
vi.mock("@/components/documents/VersionUploadModal", () => ({ VersionUploadModal: () => null }));
vi.mock("@/components/documents/RenameDocumentDialog", () => ({ RenameDocumentDialog: () => null }));
vi.mock("@/hooks/useDocumentUnreadNotifications", () => ({
  useDocumentUnreadNotifications: () => ({ unreadByDocId: {} }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ canUploadDocument: false }) }));
// The trees are their own components; here they only report how many
// documents they were handed.
const Tree = ({ tab, documents }: { tab: string; documents: unknown[] }) => (
  <div data-testid={`tree-${tab}`}>{documents.length}</div>
);
vi.mock("@/components/documents/ContractsTree", () => ({
  ContractsTree: (p: { documents: unknown[] }) => <Tree tab="contracts" documents={p.documents} />,
}));
vi.mock("@/components/documents/FoldersView", () => ({
  FoldersView: (p: { tab: string; documents: unknown[] }) => <Tree tab={p.tab} documents={p.documents} />,
}));

import Documents from "@/pages/Documents";

const drawing = (i: number) => ({ _id: String(i), name: `Drawing ${i}`, type: "Drawing", folderTab: "drawings" });
const DRAWINGS = Array.from({ length: 45 }, (_, i) => drawing(i + 1));

const page = (rows: unknown[], count: number, next: boolean) => ({
  count,
  next: next ? "http://api/next" : null,
  previous: null,
  results: rows,
});

/** 45 drawings, served twenty to a page; one contract; no other documents. */
function serve(url: string) {
  if (url.startsWith("documents/user-capabilities/")) return Promise.resolve({ documentTypes: [] });
  if (url.startsWith("documents/folders/")) return Promise.resolve([]);
  const params = new URLSearchParams(url.split("?")[1]);
  const n = Number(params.get("page") || "1");
  if (params.get("search")) return Promise.resolve(page(DRAWINGS.slice(0, 3), 3, false));
  switch (params.get("category")) {
    case "drawings":
      return Promise.resolve(page(DRAWINGS.slice((n - 1) * 20, n * 20), 45, n * 20 < 45));
    case "contracts":
      return Promise.resolve(page([{ _id: "c1", name: "PBA", type: "Contract", folderTab: "contracts" }], 1, false));
    default:
      return Promise.resolve(page([], 0, false));
  }
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Documents />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const openDrawings = async () => {
  fireEvent.mouseDown(await screen.findByRole("tab", { name: /Drawings/ }));
  fireEvent.click(screen.getByRole("tab", { name: /Drawings/ }));
};

beforeEach(() => {
  fetchData.mockReset();
  fetchData.mockImplementation(serve);
  localStorage.setItem("selectedProjectId", "9");
});

describe("Documents paging", () => {
  it("asks each tab for its own rows, a large page at a time", async () => {
    renderPage();
    await waitFor(() => expect(fetchData).toHaveBeenCalledWith(expect.stringContaining("category=drawings")));
    const urls = fetchData.mock.calls.map(([u]) => u as string).filter((u) => u.startsWith("documents/?"));
    for (const tab of ["contracts", "drawings", "documents"]) {
      expect(urls.some((u) => u.includes(`category=${tab}`) && u.includes("page_size=200") && u.includes("page=1"))).toBe(true);
    }
  });

  it("badges a tab with the server's count, not the rows on the first page", async () => {
    renderPage();
    const tab = await screen.findByRole("tab", { name: /Drawings/ });
    await waitFor(() => expect(within(tab).getByText("45")).toBeInTheDocument());
  });

  it("says how many are shown and loads the rest on request", async () => {
    renderPage();
    await openDrawings();

    expect(await screen.findByText("20 of 45 documents", { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId("tree-drawings")).toHaveTextContent("20");
    expect(screen.getByText("45 documents")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByTestId("tree-drawings")).toHaveTextContent("40"));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByTestId("tree-drawings")).toHaveTextContent("45"));

    // Everything is on screen: no footer, no button.
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("keeps a tab whose documents failed to load from looking empty", async () => {
    fetchData.mockImplementation((url: string) =>
      url.includes("category=drawings") ? Promise.reject(new Error("500")) : serve(url),
    );
    renderPage();
    await openDrawings();

    expect(await screen.findByText("Documents couldn't be loaded.")).toBeInTheDocument();
    expect(screen.queryByTestId("tree-drawings")).not.toBeInTheDocument();

    fetchData.mockImplementation(serve);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByTestId("tree-drawings")).toHaveTextContent("20"));
  });

  it("counts search results with the server's total", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Search by name, ref, or type"), { target: { value: "Drawing" } });
    expect(await screen.findByText("3 results")).toBeInTheDocument();
  });
});

/**
 * Part 15: AI screens polish.
 *   - a citation chip for a clause in the user's own document opens that document at the clause's page;
 *     a clause that isn't there, or a standard-form reference, is not a link
 *   - 👍 / 👎 is saved on the server (POST ai_analysis/feedback/), only once the answer has a server id
 *   - answers render GitHub-flavoured markdown (tables) and links open safely in a new tab
 *   - the document drawer's Regenerate replaces the answer instead of adding a duplicate question
 *   - Linq shows its error card (with Try again) when a chat can't be loaded, never an empty screen
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  postData: vi.fn(), fetchData: vi.fn(), getPresignedUrl: vi.fn(), uploadFileToPresignedUrl: vi.fn(),
}));
vi.mock("@/lib/Api", () => api);
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/WorkSpace/ChatSidebar", () => ({ ChatSidebar: () => null }));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => ({ data: { id: 1, name: "Test User" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { AnswerFeedback } from "../AnswerFeedback";
import { AIMarkdown } from "../AIMarkdown";
import { CitationPill } from "../CitationPill";
import { citationHref } from "@/types/citation";
import { AskRegulationsDrawer } from "@/components/documents/AskRegulationsDrawer";
import { Route, Routes } from "react-router-dom";
import AiWorkSpace from "@/pages/AiWorkSpace";

const source = (over: Record<string, unknown> = {}) => ({
  clause_number: "17.1", clause_title: "Variations", page_number: 4, similarity: 0.9, excerpt: "The architect may…",
  document_name: "Main Contract", verification: "verified" as const, document_id: 12, ...over,
});

beforeEach(() => {
  api.postData.mockReset();
  api.fetchData.mockReset();
  // jsdom has no element.scrollTo (the drawer scrolls to the newest answer)
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  Element.prototype.scrollIntoView = vi.fn() as unknown as typeof Element.prototype.scrollIntoView;
});

describe("citation links", () => {
  it("opens the document at the clause's page", () => {
    render(<MemoryRouter><CitationPill source={source()} /></MemoryRouter>);
    expect(screen.getByTestId("citation-link")).toHaveAttribute("href", "/documents/12?page=4&clause=17.1");
  });

  it("is not a link for a clause that isn't in the user's documents, a standard form, or an old source", () => {
    expect(citationHref(source({ verification: "not_found" }))).toBeNull();
    expect(citationHref(source({ is_reference: true }))).toBeNull();
    expect(citationHref(source({ document_id: undefined }))).toBeNull();
    render(<CitationPill source={source({ verification: "not_found", document_id: null })} />);
    expect(screen.queryByTestId("citation-link")).toBeNull();
  });
});

describe("answer feedback", () => {
  it("saves the vote on the server", async () => {
    api.postData.mockResolvedValue({ ok: true, rating: -1 });
    render(<AnswerFeedback surface="task_chat" targetId={42} />);
    fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Not helpful" })).toHaveAttribute("aria-pressed", "true"));
    expect(api.postData).toHaveBeenCalledWith({
      url: "ai_analysis/feedback/", data: { surface: "task_chat", target_id: "42", rating: -1 },
    });
  });

  it("is hidden until the answer has a server id", () => {
    const { container } = render(<AnswerFeedback surface="linq_chat" targetId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AIMarkdown", () => {
  it("renders tables and opens links safely", () => {
    render(<AIMarkdown>{"| Item | Rate |\n|---|---|\n| Steel | R32/kg |\n\n[spec](https://example.com)"}</AIMarkdown>);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "R32/kg" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "spec" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("document drawer regenerate", () => {
  it("replaces the latest answer and sends no new question", async () => {
    localStorage.setItem("selectedProjectId", "47");
    api.fetchData.mockResolvedValue({
      messages: [
        { id: 4, role: "user", content: "Who may vary the works?", sources: [] },
        { id: 5, role: "assistant", content: "First answer.", sources: [] },
      ],
    });
    api.postData.mockResolvedValue({ messageId: 6, reply: "Better answer.", sources: [], replaced: true });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AskRegulationsDrawer isOpen onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText("First answer.");
    fireEvent.click(screen.getByRole("button", { name: "Regenerate this answer" }));
    await screen.findByText("Better answer.");
    expect(screen.queryByText("First answer.")).toBeNull();
    expect(screen.getAllByText("Who may vary the works?")).toHaveLength(1);
    expect(api.postData).toHaveBeenCalledWith({
      url: "documents/47/chat-with-documents/", data: { regenerate: true, projectId: "47" },
    });
  });
});

describe("Linq chat that can't be loaded", () => {
  it("shows the error card with Try again (the chat area stays open)", async () => {
    const notFound = Object.assign(new Error("Request failed with status code 404"), {
      response: { status: 404, data: { error: "task_not_found", message: "This task doesn't exist or you don't have access to it." } },
    });
    api.fetchData.mockRejectedValue(notFound);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/ai-workspace/rfi/244"]}>
          <Routes><Route path="/ai-workspace/:taskTypeSlug/:taskId" element={<AiWorkSpace />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const card = await screen.findByTestId("chat-init-error");
    expect(card).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Hello! I've analyzed");
  });
});

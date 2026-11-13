/**
 * QA BUG-03: a Site Engineer (document.view only) saw "Unset" on the primary
 * contract card and could remove the designation every AI analysis anchors
 * on. Unset now needs document.manage; Replace needs document.upload AND
 * document.manage, because uploading a primary contract also designates it.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const perms = { canUploadDocument: false, canManageFolders: false };

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => perms }));
vi.mock("@/lib/Api", () => ({
  getPrimaryContract: async () => ({
    primary_contract: { id: 12, file_name: "contract.pdf", name: "JBCC contract", document_role: "primary_contract", uploaded_at: null },
  }),
  uploadProjectDocument: vi.fn(),
  setProjectDocumentRole: vi.fn(),
  validateFile: () => ({ valid: true }),
}));

import { PrimaryContractCard } from "../PrimaryContractCard";

function draw() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PrimaryContractCard projectId="47" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  perms.canUploadDocument = false;
  perms.canManageFolders = false;
});

describe("PrimaryContractCard actions follow document permissions", () => {
  it("shows neither Unset nor Replace to a view-only role", async () => {
    draw();
    await waitFor(() => expect(screen.getByText("JBCC contract")).toBeInTheDocument());
    expect(screen.queryByText("Unset")).not.toBeInTheDocument();
    expect(screen.queryByText("Replace")).not.toBeInTheDocument();
  });

  it("an uploader without document.manage cannot replace or unset", async () => {
    perms.canUploadDocument = true;
    draw();
    await waitFor(() => expect(screen.getByText("JBCC contract")).toBeInTheDocument());
    expect(screen.queryByText("Unset")).not.toBeInTheDocument();
    expect(screen.queryByText("Replace")).not.toBeInTheDocument();
  });

  it("a manager with upload rights sees both", async () => {
    perms.canUploadDocument = true;
    perms.canManageFolders = true;
    draw();
    await waitFor(() => expect(screen.getByText("Unset")).toBeInTheDocument());
    expect(screen.getByText("Replace")).toBeInTheDocument();
  });
});

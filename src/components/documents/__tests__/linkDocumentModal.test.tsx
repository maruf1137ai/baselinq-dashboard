/**
 * The document page passes the links it already has as {type, itemId} and a
 * linking flag; the modal ignored both, so an already-linked task could be
 * selected again and Link pressed twice mid-request.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useFetch", () => ({
  default: () => ({
    data: {
      tasks: [
        { taskType: "VO", taskId: 65, status: "Open", task: { subject: "Extra piling" } },
        { taskType: "RFI", taskId: 1, status: "Open", task: { subject: "Slab level" } },
      ],
    },
    isLoading: false,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LinkDocumentModal } from "../LinkDocumentModal";

describe("LinkDocumentModal", () => {
  it("treats a task already linked by type and id as linked", () => {
    render(
      <LinkDocumentModal isOpen onClose={() => {}} onLink={() => {}} alreadyLinked={[{ type: "VO", itemId: 65 }]} />,
    );
    // Only the RFI can be ticked; the linked VO shows a tick, not a checkbox.
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("waits while a link is in flight", () => {
    render(<LinkDocumentModal isOpen onClose={() => {}} onLink={() => {}} isLinking />);
    expect(screen.getByRole("button", { name: "Linking…" })).toBeDisabled();
  });
});

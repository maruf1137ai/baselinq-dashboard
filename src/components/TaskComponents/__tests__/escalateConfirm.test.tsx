/**
 * Escalating asks first (QA BUG-18).
 *
 * RFI → SI and SI → VO raise a new formal document and cannot be undone from
 * the page, and they fired on the first click of a menu item. Now a dialog
 * names what will be created, and nothing is sent until Confirm.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn(async (_request: { url: string; data: unknown }) => ({ display: "SI-010" }));

vi.mock("@/hooks/usePost", () => ({ usePost: () => ({ mutateAsync: post }) }));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => ({ data: { id: 1 } }) }));
vi.mock("@/hooks/useEffectivePermissions", () => ({
  useEffectivePermissions: () => ({
    data: { roleCode: "ARCH", permissions: { "task.rfi.escalate_to_si": true } },
    isLoading: false,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WernerTaskActions } from "@/components/TaskComponents/WernerTaskActions";

const draw = (onChanged = vi.fn()) =>
  render(
    <MemoryRouter>
      <WernerTaskActions taskType="RFI" taskId={1} entityId={6} projectId={47} onChanged={onChanged} />
    </MemoryRouter>,
  );

beforeEach(() => post.mockClear());

describe("escalating an RFI to a Site Instruction", () => {
  it("asks for confirmation instead of escalating on the menu click", async () => {
    const user = userEvent.setup();
    draw();
    await user.click(screen.getByRole("button", { name: /Action/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Escalate to Site Instruction" }));

    expect(await screen.findByText("Escalate to Site Instruction?")).toBeInTheDocument();
    expect(screen.getByText(/raises a new Site Instruction linked to this RFI/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends nothing on Cancel", async () => {
    const user = userEvent.setup();
    draw();
    await user.click(screen.getByRole("button", { name: /Action/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Escalate to Site Instruction" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(post).not.toHaveBeenCalled();
  });

  it("escalates once, on Confirm", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    draw(onChanged);
    await user.click(screen.getByRole("button", { name: /Action/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Escalate to Site Instruction" }));
    await user.click(await screen.findByRole("button", { name: "Escalate to Site Instruction" }));

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toMatchObject({
      url: "tasks/chain-escalate/",
      data: { from_type: "rfi", from_id: 6, to_type: "si" },
    });
    expect(onChanged).toHaveBeenCalled();
  });
});

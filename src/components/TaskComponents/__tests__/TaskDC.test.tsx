/**
 * Issuing a delay claim's notice asks for the date of AWARENESS as well as
 * the date notice was given. JBCC cl 23.4.2 and 26.5 run from awareness; the
 * clocks used to start from the notice date, the act they exist to prompt.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const postData = vi.fn();
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/Api", () => ({ postData: (args: unknown) => postData(args) }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { TaskDC } from "../TaskDC";

const fields = (over: Record<string, unknown> = {}) => ({
  entityId: 12, description: "Late steel", noticeDate: null, awarenessDate: null, ...over,
});

beforeEach(() => {
  postData.mockReset();
  postData.mockResolvedValue({});
  Object.values(toastMock).forEach((f) => f.mockReset());
});

describe("issuing the notice", () => {
  it("cannot be issued without the date of awareness", () => {
    render(<TaskDC formFields={fields()} />);
    fireEvent.change(screen.getByLabelText("Date notice was given"), { target: { value: "2026-09-15" } });
    expect(screen.getByRole("button", { name: "Issue Notice" })).toBeDisabled();
  });

  it("sends both dates", async () => {
    const onRefresh = vi.fn();
    render(<TaskDC formFields={fields()} onRefresh={onRefresh} />);
    fireEvent.change(screen.getByLabelText("Date the contractor became aware"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Date notice was given"), { target: { value: "2026-09-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue Notice" }));

    await waitFor(() => expect(postData).toHaveBeenCalledWith({
      url: "tasks/claims/12/issue-notice/",
      data: { notice_date: "2026-09-15", awareness_date: "2026-09-01" },
    }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("refuses awareness after the notice", () => {
    render(<TaskDC formFields={fields()} />);
    fireEvent.change(screen.getByLabelText("Date the contractor became aware"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Date notice was given"), { target: { value: "2026-09-15" } });
    expect(screen.getByText("The date of awareness cannot be after the date notice was given.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue Notice" })).toBeDisabled();
  });

  it("shows the server's reason about awareness", async () => {
    postData.mockRejectedValue({ response: { data: { awareness_date: "Required." } } });
    render(<TaskDC formFields={fields()} />);
    fireEvent.change(screen.getByLabelText("Date the contractor became aware"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Date notice was given"), { target: { value: "2026-09-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue Notice" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Required."));
  });
});

describe("once issued", () => {
  it("states both dates", () => {
    render(<TaskDC formFields={fields({ noticeDate: "2026-09-15", awarenessDate: "2026-09-01" })} />);
    expect(screen.getByText(/Aware 01 Sept? 2026 · Notice given on 15 Sept? 2026/)).toBeInTheDocument();
  });
});

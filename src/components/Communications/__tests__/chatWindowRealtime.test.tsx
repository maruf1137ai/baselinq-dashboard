/**
 * When the chat window refetches, and why each of those moments exists.
 *
 * The socket carries a ping and nothing else — `{event, channel_id}` from
 * channel/consumers.py — so every message the user sees arrives through
 * `fetchMessages()`. That makes "when do we fetch" the whole correctness
 * story of real-time chat here, and none of it was covered.
 *
 * The healthy-socket poll moved from 20s to 120s. That is only safe because
 * of the two catch-up moments below; without them the same change is silent
 * message loss for up to two minutes. So these are not incidental tests of a
 * refactor, they are the thing that makes the refactor legitimate:
 *
 *  1. **On connect.** A socket that has just come up has by definition missed
 *     whatever happened while it was down — pings fired during the outage
 *     were delivered to nobody. `onopen` previously only changed the poll
 *     cadence, which the 20s tick hid.
 *
 *  2. **On tab focus.** A slept laptop leaves a dead TCP connection with no
 *     FIN, so `onclose` can be minutes late, and background tabs have their
 *     timers throttled so the poll is not really running either. Both failure
 *     modes end with the reader looking at a stale conversation that appears
 *     current.
 */
import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async () => []),
  postData: vi.fn(async () => ({})),
  deleteData: vi.fn(async () => ({})),
  getPresignedUrl: vi.fn(async () => ({})),
  uploadFileToPresignedUrl: vi.fn(async () => ({})),
}));
vi.mock("@/lib/ws", () => ({ getWsBase: () => "ws://test" }));

import { fetchData } from "@/lib/Api";
import ChatWindow from "@/components/Communications/chatWindow";

/** A socket we drive by hand — nothing here connects to anything. */
class FakeSocket {
  static last: FakeSocket | null = null;
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.last = this;
  }
  close() {
    this.readyState = FakeSocket.CLOSED;
  }
  /** Drive the handshake the way a real server would. */
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  drop() {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }
}

/** Messages-endpoint calls only — the component reads other URLs too. */
const messageFetches = () =>
  (fetchData as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
    (c) => typeof c[0] === "string" && (c[0] as string).includes("/messages/"),
  ).length;

function renderWindow() {
  return render(<ChatWindow channel={{ id: 7, name: "site" }} />);
}

describe("chat window refetch moments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access", "test-token");
    FakeSocket.last = null;
    vi.stubGlobal("WebSocket", FakeSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("fetches once when the channel opens", async () => {
    renderWindow();
    await waitFor(() => expect(messageFetches()).toBeGreaterThan(0));
  });

  it("opens a socket for the channel it is showing", async () => {
    renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());
    expect(FakeSocket.last!.url).toContain("/ws/channels/7/");
  });

  it("catches up when the socket connects", async () => {
    // The load-bearing one. Without this, raising the healthy-socket poll to
    // 120s means anything sent during an outage stays invisible for 2 minutes.
    renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());

    const before = messageFetches();
    await act(async () => {
      FakeSocket.last!.open();
    });

    await waitFor(() => expect(messageFetches()).toBeGreaterThan(before));
  });

  it("catches up again after the socket drops and reconnects", async () => {
    renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());
    await act(async () => {
      FakeSocket.last!.open();
    });

    await act(async () => {
      FakeSocket.last!.drop();
    });
    const before = messageFetches();

    // The reconnect timer is backed off; simulate the socket coming back.
    await act(async () => {
      FakeSocket.last!.open();
    });

    await waitFor(() => expect(messageFetches()).toBeGreaterThan(before));
  });

  it("fetches on a ping, because the ping carries no message data", async () => {
    renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());
    await act(async () => {
      FakeSocket.last!.open();
    });

    const before = messageFetches();
    await act(async () => {
      FakeSocket.last!.onmessage?.();
    });

    await waitFor(() => expect(messageFetches()).toBeGreaterThan(before));
  });

  it("catches up when the tab becomes visible again", async () => {
    renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());
    await act(async () => {
      FakeSocket.last!.open();
    });

    const before = messageFetches();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(messageFetches()).toBeGreaterThan(before));
  });

  it("stops fetching once the window unmounts", async () => {
    const { unmount } = renderWindow();
    await waitFor(() => expect(FakeSocket.last).not.toBeNull());
    await act(async () => {
      FakeSocket.last!.open();
    });

    unmount();
    const after = messageFetches();

    // A listener left on `document` would keep firing against an unmounted
    // tree — React logs a state-update warning and the request is wasted.
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(messageFetches()).toBe(after);
  });
});

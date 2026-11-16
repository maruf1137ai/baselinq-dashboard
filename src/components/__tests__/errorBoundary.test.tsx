/**
 * A render error must never leave a blank page. The boundary shows a calm
 * error screen with Reload and Go home, logs the error, and, inside the
 * dashboard layout, keeps the sidebar working and clears itself on navigation.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "../ErrorBoundary";

// The real sidebar, header and banner fetch data; they are not under test.
// The sidebar keeps one link so the test can navigate the way a user would.
vi.mock("../DashboardSidebar", () => ({
  DashboardSidebar: () => (
    <nav aria-label="Sidebar">
      <Link to="/fine">Go to a working page</Link>
    </nav>
  ),
}));
vi.mock("../DashboardHeader", () => ({ DashboardHeader: () => <header>Header</header> }));
vi.mock("../BillingLockBanner", () => ({ BillingLockBanner: () => null }));
vi.mock("@/hooks/useProjectCurrency", () => ({ useProjectCurrency: () => "ZAR" }));

import { DashboardLayout } from "../DashboardLayout";

function Crash(): JSX.Element {
  throw new Error("boom");
}

let consoleError: ReturnType<typeof vi.spyOn>;
const realLocation = window.location;
const reload = vi.fn();
const assign = vi.fn();
// jsdom reports every error React rethrows as "Uncaught"; mark it handled.
const swallowWindowError = (event: ErrorEvent) => event.preventDefault();

beforeEach(() => {
  window.addEventListener("error", swallowWindowError);
  // React logs every caught render error; keep the output readable.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  // jsdom implements neither reload nor assign.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, reload, assign },
  });
});

afterEach(() => {
  window.removeEventListener("error", swallowWindowError);
  consoleError.mockRestore();
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  reload.mockReset();
  assign.mockReset();
});

describe("ErrorBoundary", () => {
  it("shows the error screen instead of a blank page", () => {
    const { container } = render(
      <ErrorBoundary variant="app">
        <Crash />
      </ErrorBoundary>,
    );

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong on this page");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go home" })).toBeInTheDocument();
  });

  it("logs the error to the console", () => {
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );

    const logged = consoleError.mock.calls.find((args) => String(args[0]).startsWith("[ErrorBoundary]"));
    expect(logged).toBeDefined();
    expect(logged?.[1]).toBeInstanceOf(Error);
    expect((logged?.[1] as Error).message).toBe("boom");
  });

  it("Reload reloads the page and Go home loads the home page", () => {
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Go home" }));
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("renders its children again when the reset key changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/broken">
        <Crash />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/fine">
        <p>Working page</p>
      </ErrorBoundary>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Working page")).toBeInTheDocument();
  });

  it("renders its children untouched when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("DashboardLayout", () => {
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/broken"
            element={
              <DashboardLayout>
                <Crash />
              </DashboardLayout>
            }
          />
          <Route
            path="/fine"
            element={
              <DashboardLayout>
                <p>Working page</p>
              </DashboardLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows the error inside the page and keeps the sidebar and header", () => {
    renderAt("/broken");

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Something went wrong on this page");
    expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("clears the error when the user moves to another page", () => {
    renderAt("/broken");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Go to a working page" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Working page")).toBeInTheDocument();
  });
});

/**
 * Catches a render error and shows a calm error screen in its place, so a
 * crash never leaves the user looking at a blank page.
 *
 * Two places use it:
 *   - main.tsx wraps the whole app. It catches anything, including a crash in
 *     the header, the sidebar or the providers.
 *   - DashboardLayout wraps each page's content in PageErrorBoundary, keyed
 *     on the URL path. A crash there keeps the sidebar and header usable, and
 *     moving to another page clears the error.
 *
 * What it does with the error: logs it to the console. There is no Sentry (or
 * other error-reporting service) in this frontend yet; when one is added,
 * report from `componentDidCatch` below.
 *
 * Error boundaries catch errors thrown while rendering, in lifecycle methods
 * and in a lazy chunk that fails to load. They do not catch errors in event
 * handlers or in promises; those still need their own toast.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, Home, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * When this value changes, a caught error is cleared and the children are
   * rendered again. DashboardLayout passes the URL path, so navigating away
   * from a broken page shows the next page instead of the error.
   */
  resetKey?: unknown;
  /** "app" fills the window; "page" fills the content area beside the sidebar. */
  variant?: "app" | "page";
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] A page crashed while rendering:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen variant={this.props.variant ?? "page"} />;
    }
    return this.props.children;
  }
}

/**
 * The page-level boundary used by DashboardLayout: the error screen sits
 * beside a working sidebar and header, and a new URL path clears it (which
 * matters where one page component serves many paths, such as /tasks/:taskId
 * or the Settings pages).
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname} variant="page">
      {children}
    </ErrorBoundary>
  );
}

/**
 * The screen itself. It uses no router, query or context hooks, so it renders
 * even when the crash happened above every provider. "Go home" is a full page
 * load for the same reason, and because it also discards whatever state broke.
 */
export function ErrorScreen({ variant = "page" }: { variant?: "app" | "page" }) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center bg-background p-6 text-center ${
        variant === "app" ? "min-h-screen" : "h-full min-h-[320px]"
      }`}
    >
      <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="mb-2 text-lg font-medium text-foreground">Something went wrong on this page</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Anything you had already saved is safe. Reload the page to try again, or go back to the home page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => window.location.reload()}>
          <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Reload
        </Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          <Home className="mr-2 h-4 w-4" aria-hidden="true" />
          Go home
        </Button>
      </div>
    </div>
  );
}

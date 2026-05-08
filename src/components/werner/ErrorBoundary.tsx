/**
 * Werner spec rev H — local error boundary for the new task pages.
 *
 * Without this, any unhandled render error in RFIDetailV2 (or its
 * children) renders a blank white page with no UX clue and no console
 * trace visible to the user. With it, we show the error message and
 * stack so we can fix the issue fast.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class WernerErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console so the dev tools network tab + react devtools
    // both surface the trace.
    // eslint-disable-next-line no-console
    console.error("[Werner page render error]", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-3xl mx-auto">
          <div className="border border-red-200 bg-red-50 rounded-md p-5 text-sm">
            <h2 className="text-red-800 font-semibold text-base mb-2">
              Page failed to render
            </h2>
            <p className="text-red-700 mb-3">
              {this.state.error.message || "Unknown error"}
            </p>
            {this.state.error.stack && (
              <pre className="text-xs text-red-900 bg-white border border-red-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
            <p className="text-xs text-red-600 mt-3">
              Open the browser dev tools console for the full trace.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

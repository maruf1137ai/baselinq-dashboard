/**
 * Vitest global setup.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `vitest.config.ts` has declared `setupFiles: ["./src/test/setup.ts"]` for as
 * long as it has existed, and the file did not. Vitest fails to load a suite
 * whose setup file is missing, so EVERY test file errored before it ran — the
 * suite was not failing, it was never executing. Nothing in CI caught it
 * because no workflow runs `npm test` at all.
 *
 * All the dependencies were already installed. Only this file was absent.
 */
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unmount anything a test rendered. Without this, components persist between
// tests and queries like getByRole match a node from a previous test — which
// fails in a way that points at the wrong test.
afterEach(() => {
  cleanup();
});

// jsdom implements neither of these, and both are used by the app. Radix
// (dialogs, sheets, dropdowns) reads matchMedia on mount, so without the stub
// every component rendering a modal surface throws before its assertion runs.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),      // deprecated, still called by some libraries
    removeListener: vi.fn(),   // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Radix positions floating elements with ResizeObserver.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Used by virtualised lists and scroll-into-view behaviour.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

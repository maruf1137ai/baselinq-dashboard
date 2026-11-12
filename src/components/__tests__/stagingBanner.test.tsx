/**
 * The staging banner must appear on staging builds only. Showing it in
 * production would tell real users their data is fake.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StagingBanner } from "../StagingBanner";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("StagingBanner", () => {
  it("shows on a staging build", () => {
    vi.stubEnv("VITE_APP_ENV", "staging");
    render(<StagingBanner />);
    expect(screen.getByRole("note", { name: "Environment" })).toHaveTextContent(
      "STAGING · anonymised data",
    );
  });

  it.each(["production", "development", ""])("renders nothing when VITE_APP_ENV is %j", (env) => {
    vi.stubEnv("VITE_APP_ENV", env);
    const { container } = render(<StagingBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

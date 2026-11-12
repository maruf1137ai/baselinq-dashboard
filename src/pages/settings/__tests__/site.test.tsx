/**
 * Site settings read and write the project's latitude and longitude. They
 * read and sent a `coordinates` field the API does not have, so a saved pin
 * was never shown and a moved pin was never saved.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
// One array for every render, as React Query returns: a fresh array each time
// would re-run the page's effect on every render.
const PROJECTS = [
  { _id: "46", name: "Rosebank Link", location: "Oxford Road", latitude: "-26.14560000", longitude: "28.04360000" },
];
vi.mock("@/hooks/useProjects", () => ({
  useProjects: () => ({ data: PROJECTS, isLoading: false }),
  useUpdateProject: () => ({ mutate, isPending: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ canEditProject: true }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/LocationMap", () => ({
  LocationMap: ({
    coordinates,
    onLocationChange,
  }: {
    coordinates: { lat: number; lng: number };
    onLocationChange: (lat: number, lng: number) => void;
  }) => (
    <div>
      <span data-testid="pin">{`${coordinates.lat},${coordinates.lng}`}</span>
      <button type="button" onClick={() => onLocationChange(-26.123456789, 28.987654321)}>Move pin</button>
    </div>
  ),
}));

import Site from "../Site";

beforeEach(() => {
  mutate.mockReset();
  localStorage.setItem("selectedProjectId", "46");
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ display_name: "Somewhere" }) })));
});

describe("Site settings", () => {
  it("shows the saved pin from latitude and longitude", () => {
    render(<Site />);
    expect(screen.getByTestId("pin")).toHaveTextContent("-26.1456,28.0436");
  });

  it("saves a moved pin as latitude and longitude, to eight decimals", () => {
    render(<Site />);
    fireEvent.click(screen.getByRole("button", { name: "Move pin" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Details" }));
    const [payload] = mutate.mock.calls[0];
    expect(payload).toMatchObject({ latitude: -26.12345679, longitude: 28.98765432 });
    expect(payload).not.toHaveProperty("coordinates");
  });
});

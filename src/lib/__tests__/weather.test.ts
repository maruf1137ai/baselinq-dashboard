/**
 * The OpenWeather key comes from the build environment. Without one the
 * helper must not call the API at all: no request with an empty key, no
 * error, just "no weather".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCurrentWeather, getOpenWeatherKey, isWeatherConfigured } from "../weather";

const fetchMock = vi.fn();

const okResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("without VITE_OPENWEATHER_API_KEY", () => {
  it.each(["", "   "])("does not call the API when the key is %j, and returns null", async (key) => {
    vi.stubEnv("VITE_OPENWEATHER_API_KEY", key);
    expect(isWeatherConfigured()).toBe(false);
    await expect(fetchCurrentWeather(-26.2, 28.04)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("with VITE_OPENWEATHER_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_OPENWEATHER_API_KEY", "test-key");
  });

  it("requests metric weather for the point, with the key from the environment", async () => {
    const body = { cod: 200, name: "Johannesburg", main: { temp: 21, feels_like: 20, humidity: 40 } };
    fetchMock.mockResolvedValue(okResponse(body));

    await expect(fetchCurrentWeather("-26.2", "28.04")).resolves.toEqual(body);

    expect(getOpenWeatherKey()).toBe("test-key");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.openweathermap.org/data/2.5/weather");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: "-26.2",
      lon: "28.04",
      units: "metric",
      appid: "test-key",
    });
  });

  it("returns null when OpenWeather rejects the request", async () => {
    fetchMock.mockResolvedValue(okResponse({ cod: 401, message: "Invalid API key" }, false));
    await expect(fetchCurrentWeather(1, 2)).resolves.toBeNull();
  });

  it("returns null when the network request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchCurrentWeather(1, 2)).resolves.toBeNull();
  });
});

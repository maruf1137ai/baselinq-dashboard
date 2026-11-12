/**
 * OpenWeather current conditions, shared by the navbar and the Create Project
 * location check.
 *
 * The API key comes from VITE_OPENWEATHER_API_KEY at build time. It used to be
 * hard-coded in both callers. Without a key, weather is simply not shown: no
 * request is made and callers get `null`, the same neutral state as "no
 * location".
 */

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

export interface CurrentWeather {
  name: string;
  cod: number | string;
  weather?: { main: string; description: string }[];
  main: { temp: number; feels_like: number; humidity: number };
  wind?: { speed: number };
  visibility?: number;
}

/** The configured key, or `undefined` when the build has none. */
export function getOpenWeatherKey(): string | undefined {
  const key = import.meta.env.VITE_OPENWEATHER_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export const isWeatherConfigured = (): boolean => getOpenWeatherKey() !== undefined;

/**
 * Current weather at a point, in metric units. Returns `null`, without calling
 * the API, when no key is configured. Also `null` when the request fails:
 * weather is optional context, so a failed lookup hides it rather than
 * interrupting the page.
 */
export async function fetchCurrentWeather(
  lat: number | string,
  lon: number | string,
): Promise<CurrentWeather | null> {
  const appid = getOpenWeatherKey();
  if (!appid) return null;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    units: "metric",
    appid,
  });
  try {
    const res = await fetch(`${OPENWEATHER_URL}?${params}`);
    const data = await res.json();
    if (!res.ok || String(data?.cod) !== "200") return null;
    return data as CurrentWeather;
  } catch {
    return null;
  }
}

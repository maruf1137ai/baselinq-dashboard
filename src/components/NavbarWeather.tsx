import { useState, useEffect, useRef } from "react";
import { useProjects } from "@/hooks/useProjects";

const OWM_KEY = "8dda08a209080b44cdc3566edffcfbc4";

const CONDITION_LABEL: Record<string, string> = {
  Clear: "Sunny",
  Clouds: "Cloudy",
  Rain: "Rainy",
  Drizzle: "Drizzle",
  Thunderstorm: "Stormy",
  Snow: "Snowy",
  Mist: "Misty",
  Fog: "Foggy",
  Haze: "Hazy",
  Dust: "Dusty",
  Sand: "Sandy",
  Ash: "Ash",
  Squall: "Squall",
  Tornado: "Tornado",
};

const CONDITION_ICON: Record<string, string> = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Snow: "❄️",
  Mist: "🌫️",
  Fog: "🌫️",
  Haze: "🌫️",
  Dust: "💨",
  Sand: "💨",
  Ash: "🌋",
  Squall: "💨",
  Tornado: "🌪️",
};

const fetchWeatherByCoords = async (lat: number, lon: number) => {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`
  );
  const data = await res.json();
  if (!res.ok || (String(data.cod) !== "200" && data.cod !== 200)) return null;
  return data;
};

const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    );
    const results = await res.json();
    if (!results?.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
};

const NavbarWeather = () => {
  const [weather, setWeather] = useState<any>(null);
  const [hovered, setHovered] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem("selectedProjectId")
  );
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = projects.find((p: any) => p._id === selectedProjectId);

  useEffect(() => {
    const handleProjectChange = () => {
      setSelectedProjectId(localStorage.getItem("selectedProjectId"));
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  const fetchByGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const data = await fetchWeatherByCoords(coords.latitude, coords.longitude);
        if (data) setWeather(data);
      },
      () => {}
    );
  };

  useEffect(() => {
    if (projectsLoading) return;
    const run = async () => {
      if (currentProject?.coordinates?.lat && currentProject?.coordinates?.lng) {
        const data = await fetchWeatherByCoords(
          currentProject.coordinates.lat,
          currentProject.coordinates.lng
        );
        if (data) { setWeather(data); return; }
      }
      if (currentProject?.location) {
        const coords = await geocodeAddress(currentProject.location);
        if (coords) {
          const data = await fetchWeatherByCoords(coords.lat, coords.lon);
          if (data) { setWeather(data); return; }
        }
      }
      fetchByGeolocation();
    };
    run();
  }, [currentProject, projectsLoading]);

  if (!weather) return null;

  const main = weather.weather?.[0]?.main ?? "";
  const description = weather.weather?.[0]?.description ?? "";
  const icon = CONDITION_ICON[main] ?? "🌡️";
  const condition = CONDITION_LABEL[main] ?? main;
  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const humidity = weather.main.humidity;
  const windSpeed = Math.round(weather.wind?.speed ?? 0);
  const visibility = weather.visibility ? Math.round(weather.visibility / 1000) : null;

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Inline display */}
      <div className="flex items-center gap-1.5 text-sm cursor-default select-none">
        <span>{icon}</span>
        <span className="font-medium">{weather.name}</span>
        <span className="text-muted-foreground">•</span>
        <span>{condition}</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-medium">{temp}°C</span>
      </div>

      {/* Hover popup */}
      {hovered && (
        <div
          ref={popupRef}
          className="absolute top-8 left-0 z-50 bg-white border border-border rounded-xl shadow-lg p-4 w-56 text-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-medium text-foreground">{weather.name}</p>
              <p className="text-muted-foreground capitalize text-xs">{description}</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature</span>
              <span className="font-medium">{temp}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Feels like</span>
              <span className="font-medium">{feelsLike}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Humidity</span>
              <span className="font-medium">{humidity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wind</span>
              <span className="font-medium">{windSpeed} m/s</span>
            </div>
            {visibility !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility</span>
                <span className="font-medium">{visibility} km</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavbarWeather;

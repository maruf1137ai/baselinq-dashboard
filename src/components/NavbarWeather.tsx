import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import WeatherAIAnalysisModal from "./WeatherAIAnalysisModal";

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
  const [open, setOpen] = useState(false); // click-pinned popup (stays open until dismissed)
  const [aiOpen, setAiOpen] = useState(false);
  const [fromProjectLocation, setFromProjectLocation] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem("selectedProjectId")
  );
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = projects.find((p: any) => p._id === selectedProjectId);

  useEffect(() => {
    const handleProjectChange = () => {
      setSelectedProjectId(localStorage.getItem("selectedProjectId"));
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  // While the popup is pinned open, dismiss it on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (projectsLoading) return;
    const run = async () => {
      if (currentProject?.coordinates?.lat && currentProject?.coordinates?.lng) {
        const data = await fetchWeatherByCoords(
          currentProject.coordinates.lat,
          currentProject.coordinates.lng
        );
        if (data) { setWeather(data); setFromProjectLocation(true); return; }
      }
      if (currentProject?.location) {
        const coords = await geocodeAddress(currentProject.location);
        if (coords) {
          const data = await fetchWeatherByCoords(coords.lat, coords.lon);
          if (data) { setWeather(data); setFromProjectLocation(true); return; }
        }
      }
      // No project location — don't show weather
      setWeather(null);
      setFromProjectLocation(false);
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
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Inline display — click to pin the popup open */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 text-sm cursor-pointer select-none appearance-none border-0 bg-transparent p-0 text-inherit"
      >
        <span>{icon}</span>
        <span className="font-medium">{weather.name}</span>
        <span className="text-muted-foreground">•</span>
        <span>{condition}</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-medium">{temp}°C</span>
      </button>

      {/* Popup — shown on hover, or pinned open after a click */}
      {(open || hovered) && (
        <div
          ref={popupRef}
          className="absolute top-8 left-0 z-50 bg-white border border-border rounded-xl shadow-lg p-4 w-56 text-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-medium text-foreground">{weather.name}</p>
              <p className="text-muted-foreground capitalize text-xs">{description}</p>
              {fromProjectLocation && (
                <p className="text-[10px] text-primary/70 mt-0.5">Site weather</p>
              )}
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
          {fromProjectLocation && (
            <button
              type="button"
              onClick={() => { setOpen(false); setHovered(false); setAiOpen(true); }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Analyze with AI
            </button>
          )}
        </div>
      )}

      {currentProject && (
        <WeatherAIAnalysisModal
          open={aiOpen}
          onOpenChange={setAiOpen}
          project={currentProject}
        />
      )}
    </div>
  );
};

export default NavbarWeather;

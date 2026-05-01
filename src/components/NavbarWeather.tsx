import React, { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";

const OWM_KEY = "8dda08a209080b44cdc3566edffcfbc4";

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem("selectedProjectId")
  );

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
      // 1. Project has saved coordinates — best case
      if (currentProject?.coordinates?.lat && currentProject?.coordinates?.lng) {
        const data = await fetchWeatherByCoords(
          currentProject.coordinates.lat,
          currentProject.coordinates.lng
        );
        if (data) { setWeather(data); return; }
      }

      // 2. Project has a location address — geocode it to lat/lon
      if (currentProject?.location) {
        const coords = await geocodeAddress(currentProject.location);
        if (coords) {
          const data = await fetchWeatherByCoords(coords.lat, coords.lon);
          if (data) { setWeather(data); return; }
        }
      }

      // 3. Browser geolocation fallback
      fetchByGeolocation();
    };

    run();
  }, [currentProject, projectsLoading]);

  if (!weather) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
      <span>{weather.name}</span>
      <span>•</span>
      <span>{Math.round(weather.main.temp)}°C</span>
    </div>
  );
};

export default NavbarWeather;

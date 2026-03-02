import React, { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";

const NavbarWeather = () => {
  const [weather, setWeather] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem("selectedProjectId")
  );

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = projects.find((p: any) => p._id === selectedProjectId);

  // Listen for project changes
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
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geoUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`;
          const response = await fetch(geoUrl);
          const data = await response.json();
          if (!response.ok || String(data.cod) !== "200" && data.cod !== 200) return;
          setWeather(data);
        } catch {
          // silently fail
        }
      },
      () => {} // silently fail if user denies location
    );
  };

  useEffect(() => {
    const fetchWeather = async () => {
      if (projectsLoading) return;

      try {
        // Priority 1: Use project coordinates if available
        if (currentProject?.coordinates) {
          const { lat, lng } = currentProject.coordinates;
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`
          );
          const data = await response.json();
          if (!response.ok || String(data.cod) !== "200" && data.cod !== 200) { fetchByGeolocation(); return; }
          setWeather(data);
          return;
        }

        // Priority 2: Use project location name if available
        if (currentProject?.location) {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(currentProject.location)}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`
          );
          const data = await response.json();
          if (!response.ok || String(data.cod) !== "200" && data.cod !== 200) {
            // Location name not found — fall back to geolocation silently
            fetchByGeolocation();
            return;
          }
          setWeather(data);
          return;
        }

        // Priority 3: Fallback to geolocation
        fetchByGeolocation();
      } catch {
        fetchByGeolocation();
      }
    };

    fetchWeather();
  }, [currentProject, projectsLoading]);

  const locationLabel = currentProject?.location || weather?.name;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
      {weather && (
        <>
          {locationLabel && <span>{locationLabel}</span>}
          <span>•</span>
          <span>{Math.round(weather.main.temp)}°C</span>
        </>
      )}
    </div>
  );
};

export default NavbarWeather;

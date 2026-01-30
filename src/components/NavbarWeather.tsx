import React, { useState, useEffect } from "react";
import { useProjects } from "@/supabse/hook/useProject";

const NavbarWeather = () => {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const currentProject = projects.find((p: any) => p.id === selectedProjectId);

  useEffect(() => {
    const fetchWeather = async () => {
      if (projectsLoading) return;

      try {
        let url = "";

        // Priority 1: Use project coordinates if available
        if (currentProject?.coordinates) {
          const { lat, lng } = currentProject.coordinates;
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`;
        }
        // Priority 2: Use project location name if available
        else if (currentProject?.location) {
          url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(currentProject.location)}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`;
        }
        // Priority 3: Fallback to geolocation
        else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const geoUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=8dda08a209080b44cdc3566edffcfbc4`;
              const response = await fetch(geoUrl);
              if (!response.ok) throw new Error("Failed to fetch weather");
              const data = await response.json();
              setWeather(data);
            },
            () => setError("Unable to get location")
          );
          return;
        } else {
          setError("No project location set and geolocation not supported");
          return;
        }

        if (url) {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch weather");
          const data = await response.json();
          setWeather(data);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchWeather();
  }, [currentProject, projectsLoading]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
      {error && <span>{error}</span>}
      {!error && !weather && <span>Loading...</span>}
      {weather && (
        <>
          <span>{weather.name}</span>
          <span>•</span>
          <span>{Math.round(weather.main.temp)}°C</span>
          {/* <span>{weather.weather[0].icon && <img 
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`} 
            alt={weather.weather[0].description} 
            style={{ width: "60px" }}
          />}</span> */}
        </>
      )}
    </div>
  );
};

export default NavbarWeather;

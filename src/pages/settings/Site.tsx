import { useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

const Site = () => {
  const { data: projects = [], isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    localStorage.getItem("selectedProjectId") || ""
  );
  const [currentProject, setCurrentProject] = useState<any>(null);
  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject();

  const [siteAddress, setSiteAddress] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: -33.9249, lng: 18.4241 });
  const [isDirty, setIsDirty] = useState(false);
  const [weatherFeed, setWeatherFeed] = useState(() => {
    const saved = localStorage.getItem("weatherFeed");
    return saved !== null ? saved === "true" : false;
  });

  useEffect(() => {
    const handleProjectChange = () => {
      setSelectedProjectId(localStorage.getItem("selectedProjectId") || "");
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const project = projects.find((p: any) => p._id === selectedProjectId);
    setCurrentProject(project);
    if (project) {
      setSiteAddress(project.location || "");
      if (project.coordinates) setCoordinates(project.coordinates);
    }
    setIsDirty(false);
  }, [projects, isLoading, selectedProjectId]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data.display_name) setSiteAddress(data.display_name);
    } catch {
      // user can type manually
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    reverseGeocode(lat, lng);
    setIsDirty(true);
  };

  const handleWeatherFeedToggle = (checked: boolean) => {
    setWeatherFeed(checked);
    localStorage.setItem("weatherFeed", String(checked));
    window.dispatchEvent(new CustomEvent("weather-feed-change", { detail: checked }));
    toast.success(`Weather feed ${checked ? "enabled" : "disabled"}`);
  };

  const handleSave = () => {
    if (!currentProject) {
      toast.error("No project selected");
      return;
    }
    updateProject(
      { id: currentProject._id, name: currentProject.name, location: siteAddress, coordinates },
      {
        onSuccess: () => {
          toast.success("Site settings saved");
          setCurrentProject((prev: any) => ({ ...prev, location: siteAddress, coordinates }));
          setIsDirty(false);
        },
        onError: (error: any) => {
          toast.error(`Failed to save: ${error.message}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
        <AwesomeLoader message="Coordinating Site Data" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">Site Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage site location, photos, and environmental settings.
          </p>
        </div>
        {isDirty && (
          <Button
            onClick={handleSave}
            disabled={isUpdatingProject}
            className="bg-primary text-white hover:opacity-90 rounded-lg h-9 px-4 font-normal"
          >
            {isUpdatingProject ? "Saving..." : "Save Details"}
          </Button>
        )}
      </div>

      {/* Map */}
      <div className="mb-6">
        <LocationMap coordinates={coordinates} onLocationChange={handleLocationChange} />
        <div className="mt-2 px-4 py-3 bg-muted rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            Click on the map or drag the marker to set site coordinates
          </p>
        </div>
      </div>

      {/* Site Information */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-sm font-normal text-foreground mb-6">Site Information</h3>

        <div className="mb-6">
          <label className="block text-sm font-normal text-foreground mb-2">Site Address</label>
          <Input
            value={siteAddress}
            onChange={(e) => { setSiteAddress(e.target.value); setIsDirty(true); }}
            placeholder="123 Main Street, Cape Town, South Africa"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground/50 mt-1">
            Auto-filled when you pin a location on the map. Editable.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-normal text-foreground mb-2">
            Coordinates (Lat, Long)
          </label>
          <Input
            value={coordinates.lat && coordinates.lng ? `${coordinates.lat}, ${coordinates.lng}` : ""}
            readOnly
            placeholder="Set via map"
            className="w-full bg-muted cursor-default text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground/50 mt-1">
            Updated automatically when you move the map marker.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <h4 className="text-sm font-normal text-foreground">Weather Feed</h4>
            <p className="text-sm text-muted-foreground mt-1">Show real-time weather data in header</p>
          </div>
          <Switch checked={weatherFeed} onCheckedChange={handleWeatherFeedToggle} />
        </div>
      </div>
    </div>
  );
};

export default Site;

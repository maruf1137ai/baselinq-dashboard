import { useProjects, useUpdateProject } from "@/supabse/hook/useProject";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";

const Site = () => {
  const { data: projects = [], isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    localStorage.getItem("selectedProjectId") || ""
  );
  const [currentProject, setCurrentProject] = useState<any>(null);
  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject();

  // Form states
  const [siteAddress, setSiteAddress] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: -33.9249, lng: 18.4241 });
  const [weatherFeed, setWeatherFeed] = useState(() => {
    const saved = localStorage.getItem("weatherFeed");
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (isLoading) return;
    const project = projects.find((p: any) => p.id === selectedProjectId);
    setCurrentProject(project);

    if (project) {
      setSiteAddress(project.location || "");
      if (project.coordinates) {
        // Assuming location is stored as {lat, lng} or similar format
        setCoordinates(project.coordinates);
      }
    }
  }, [projects, isLoading, selectedProjectId]);

  // Handle weather feed toggle
  const handleWeatherFeedToggle = (checked: boolean) => {
    setWeatherFeed(checked);
    localStorage.setItem("weatherFeed", JSON.stringify(checked));
    toast.success(`Weather feed ${checked ? "enabled" : "disabled"}`);
    window.location.reload();
  };

  // Handle coordinate input change
  const handleCoordinateChange = (value: string) => {
    const parts = value.split(",").map(s => s.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCoordinates({ lat, lng });
      }
    }
  };

  // Save location updates
  const handleSaveLocation = (newCoordinates?: { lat: number; lng: number }) => {
    if (!currentProject) {
      toast.error("No project selected");
      return;
    }

    const coordsToSave = newCoordinates || coordinates;

    const updatedData = {
      id: currentProject.id,
      location: siteAddress,
      coordinates: coordsToSave,
    };

    updateProject(updatedData, {
      onSuccess: () => {
        toast.success("Site location updated successfully");
        setCurrentProject((prev: any) => ({
          ...prev,
          location: siteAddress,
          coordinates: coordsToSave,
        }));
      },
      onError: (error: any) => {
        toast.error(`Failed to update location: ${error.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-[23px] text-[#1A1A1A] mb-2">Site Settings</h2>
      <p className="text-[#6B7280] text-base mb-6">
        Manage site location, photos, and environmental settings.
      </p>

      {/* Map Container */}
      <div className="mb-6">
        <LocationMap 
          coordinates={coordinates} 
          onLocationChange={(lat, lng) => {
            const newCoords = { lat, lng };
            setCoordinates(newCoords);
            handleSaveLocation(newCoords);
          }}
        />
        <div className="mt-2 px-4 py-3 bg-gray-50 rounded-lg border border-[#EAEAEA]">
          <p className="text-sm text-gray-600">
            Click on the map or drag the marker to set site coordinates
          </p>
        </div>
      </div>

      {/* Site Information */}
      <div className="bg-white rounded-lg border border-[#EAEAEA] p-6">
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-6">Site Information</h3>

        {/* Site Address */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Site Address
          </label>
          <Input
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            onBlur={() => handleSaveLocation()}
            placeholder="123 Main Street, Cape Town, South Africa"
            className="w-full"
          />
        </div>

        {/* Coordinates */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Coordinates (Lat, Long)
          </label>
          <Input
            value={`${coordinates.lat}, ${coordinates.lng}`}
            onChange={(e) => handleCoordinateChange(e.target.value)}
            onBlur={() => handleSaveLocation()}
            placeholder="-33.9249, 18.4241"
            className="w-full bg-[#F9FAFB]"
          />
        </div>

        {/* Weather Feed Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EAEAEA]">
          <div>
            <h4 className="text-base font-medium text-[#1A1A1A]">Weather Feed</h4>
            <p className="text-sm text-[#6B7280] mt-1">
              Show real-time weather data in header
            </p>
          </div>
          <Switch
            checked={weatherFeed}
            onCheckedChange={handleWeatherFeedToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default Site;

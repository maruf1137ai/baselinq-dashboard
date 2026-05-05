import { useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { MapPin, Lock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const Site = () => {
  const { canEditProject } = usePermissions();
  const { data: projects = [], isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    localStorage.getItem("selectedProjectId") || ""
  );
  const [currentProject, setCurrentProject] = useState<any>(null);
  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject();

  const [siteAddress, setSiteAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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
      if (project.coordinates?.lat && project.coordinates?.lng) {
        setCoordinates(project.coordinates);
        setHasLocation(true);
      } else if (project.location) {
        setHasLocation(true);
        // No saved coordinates — geocode the location string to place the map correctly
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(project.location)}`
        )
          .then((r) => r.json())
          .then((results) => {
            if (results?.length) {
              setCoordinates({
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
              });
            }
          })
          .catch(() => {});
      } else {
        setCoordinates(null);
        setHasLocation(false);
      }
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
    if (!canEditProject) return;
    setCoordinates({ lat, lng });
    setHasLocation(true);
    reverseGeocode(lat, lng);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!canEditProject) return;
    if (!currentProject) {
      toast.error("No project selected");
      return;
    }
    updateProject(
      { id: currentProject._id, name: currentProject.name, location: siteAddress, coordinates: coordinates ?? undefined },
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
        {canEditProject ? (
          isDirty && (
            <Button
              onClick={handleSave}
              disabled={isUpdatingProject}
              className="bg-primary text-white hover:opacity-90 rounded-lg h-9 px-4 font-normal"
            >
              {isUpdatingProject ? "Saving..." : "Save Details"}
            </Button>
          )
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border text-muted-foreground text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-only access</span>
          </div>
        )}
      </div>

      {/* No location banner */}
      {!hasLocation && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-normal text-amber-800">No site location added</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Click anywhere on the map below to pin your project site. The address will auto-fill, and site weather in the navigation bar will update to reflect your project location.
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="mb-6">
        <LocationMap
          coordinates={coordinates ?? { lat: -33.9249, lng: 18.4241 }}
          onLocationChange={handleLocationChange}
        />
        <div className="mt-2 px-4 py-3 bg-muted rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            {hasLocation
              ? "Click on the map or drag the marker to update site coordinates"
              : "Click anywhere on the map to set your project site location"}
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
            readOnly={!canEditProject}
            onChange={(e) => { if (!canEditProject) return; setSiteAddress(e.target.value); setIsDirty(true); }}
            placeholder="123 Main Street, Cape Town, South Africa"
            className={`w-full ${!canEditProject ? "bg-slate-50/50 cursor-not-allowed" : ""}`}
          />
          <p className="text-xs text-muted-foreground/50 mt-1">
            Auto-filled when you pin a location on the map. Editable.
          </p>
        </div>

        <div>
          <label className="block text-sm font-normal text-foreground mb-2">
            Coordinates (Lat, Long)
          </label>
          <Input
            value={coordinates ? `${coordinates.lat}, ${coordinates.lng}` : ""}
            readOnly
            placeholder="Set via map"
            className="w-full bg-muted cursor-default text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground/50 mt-1">
            Updated automatically when you move the map marker.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Site;

/**
 * LocationPickerMap
 *
 * Reusable location input with:
 *  - Nominatim address search autocomplete (free, no API key)
 *  - Leaflet map with draggable / clickable pin
 *  - Reverse geocode on pin move to update the address string
 *
 * Design: map position is driven by INTERNAL state so it updates immediately
 * on suggestion select / pin drag, without waiting for parent state propagation.
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Fix default Leaflet marker icons ─────────────────────────────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = { lat: -29.0, lng: 25.0 };
const DEFAULT_ZOOM   = 5;
const PINNED_ZOOM    = 14;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// ── MapMover — child inside MapContainer that imperatively pans/zooms ─────────
function MapMover({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng, zoom });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.lat !== lat || prev.lng !== lng || prev.zoom !== zoom) {
      prevRef.current = { lat, lng, zoom };
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, zoom, map]);

  return null;
}

// ── Click-to-pin handler ───────────────────────────────────────────────────────
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Nominatim helpers ──────────────────────────────────────────────────────────
async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  return res.json();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LocationPickerMapProps {
  location: string;
  latitude: string;
  longitude: string;
  readOnly?: boolean;
  mapHeight?: number;
  onChange?: (location: string, lat: string, lng: string) => void;
}

export function LocationPickerMap({
  location,
  latitude,
  longitude,
  readOnly = false,
  mapHeight = 280,
  onChange,
}: LocationPickerMapProps) {
  // ── Internal map state (not driven by props on every render) ─────────────────
  const parseCoords = (lat: string, lng: string) =>
    lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    () => parseCoords(latitude, longitude)
  );

  // Sync pin whenever parent supplies new coordinates (e.g. project data loaded from API)
  useEffect(() => {
    const next = parseCoords(latitude, longitude);
    setPin((prev) => {
      if (prev?.lat === next?.lat && prev?.lng === next?.lng) return prev;
      return next;
    });
  }, [latitude, longitude]);

  // ── Search state ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState(location);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query text when parent supplies a new location string
  useEffect(() => {
    setQuery((prev) => (prev === location ? prev : location));
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────────
  const triggerSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchNominatim(q);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch { /* silent */ }
      finally { setIsSearching(false); }
    }, 400);
  };

  // Round to 8 d.p. so the string never exceeds DB max_digits=12
  const fmtCoord = (n: number) => n.toFixed(8);

  // Typing — update text only, do NOT clear the pin
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    triggerSearch(q);
    // Only notify parent of text change; leave lat/lng untouched while typing
    onChange?.(q, pin ? fmtCoord(pin.lat) : "", pin ? fmtCoord(pin.lng) : "");
  };

  // Enter key → select first suggestion immediately
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Suggestion selected → move pin + update text
  const handleSelectSuggestion = (result: NominatimResult) => {
    const newPin = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setPin(newPin);
    setQuery(result.display_name);
    setSuggestions([]);
    setShowDropdown(false);
    onChange?.(result.display_name, fmtCoord(newPin.lat), fmtCoord(newPin.lng));
  };

  // Pin dragged or map clicked → reverse geocode
  const handlePinMove = async (lat: number, lng: number) => {
    if (readOnly) return;
    const newPin = { lat, lng };
    setPin(newPin);
    setIsReverseGeocoding(true);
    try {
      const address = await reverseGeocode(lat, lng);
      setQuery(address);
      onChange?.(address, fmtCoord(lat), fmtCoord(lng));
    } catch {
      onChange?.(query, fmtCoord(lat), fmtCoord(lng));
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleClear = () => {
    setPin(null);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    onChange?.("", "", "");
  };

  // ── Map display ───────────────────────────────────────────────────────────────
  const mapCenter = pin ?? DEFAULT_CENTER;
  const mapZoom   = pin ? PINNED_ZOOM : DEFAULT_ZOOM;

  return (
    <div ref={containerRef} className="space-y-2">

      {/* Search input */}
      {!readOnly && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none z-10" />
          <input
            className="w-full h-12 pl-10 pr-10 rounded-[10px] text-sm outline-none transition-all bg-[#f5f6f8] border border-[#e2e5ea] text-[#111827] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
            placeholder="Search address or city…"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            autoComplete="off"
          />
          {(isSearching || isReverseGeocoding) ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] animate-spin" />
          ) : pin ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-red-500 transition-colors"
              title="Clear location"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Autocomplete dropdown — z-[1001] to sit above Leaflet tile/control panes */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-[1001] left-0 right-0 top-[calc(100%+4px)] bg-white border border-[#e2e5ea] rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                  className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-[#f5f6f8] transition-colors border-b border-[#f0f0f0] last:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#9ca3af] mt-0.5 shrink-0" />
                  <span className="text-[13px] text-[#374151] leading-snug line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Read-only address display */}
      {readOnly && location && (
        <div className="flex items-center gap-2 px-3.5 h-10 bg-slate-50/50 rounded-lg border border-border text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0 text-primary" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Map */}
      <div
        className={cn(
          "rounded-xl overflow-hidden border border-[#e2e5ea]",
          readOnly && "pointer-events-none opacity-90"
        )}
        style={{ height: mapHeight }}
      >
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={mapZoom}
          scrollWheelZoom={!readOnly}
          className="h-full w-full"
          zoomControl={!readOnly}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapMover lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} />
          {pin && (
            <Marker
              position={[pin.lat, pin.lng]}
              draggable={!readOnly}
              eventHandlers={readOnly ? {} : {
                dragend(e) {
                  const pos = (e.target as L.Marker).getLatLng();
                  handlePinMove(pos.lat, pos.lng);
                },
              }}
            />
          )}
          {!readOnly && <MapClickHandler onPick={handlePinMove} />}
        </MapContainer>
      </div>

      {/* Helper / coords line */}
      {!readOnly && (
        <p className="text-[11px] text-[#9ca3af]">
          {pin
            ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — drag the pin or click the map to adjust`
            : "Search for an address above, or click the map to drop a pin"}
        </p>
      )}
    </div>
  );
}

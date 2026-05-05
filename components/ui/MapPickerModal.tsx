"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJsonPolygon } from "@/types";

type PickerMode = "point" | "polygon";

interface Props {
  initialLat?: number | null;
  initialLng?: number | null;
  /** Pre-existing polygon to display in polygon mode. */
  initialPolygon?: GeoJsonPolygon | null;
  addressHint?: string;
  title?: string;
  /** When true, shows a mode toggle so the user can draw a polygon. */
  allowPolygon?: boolean;
  /**
   * Called when the user saves. Always receives lat/lng (centroid for polygon).
   * `polygon` is non-null when the user drew a polygon; null when cleared or in point mode.
   */
  onSave: (lat: number, lng: number, polygon?: GeoJsonPolygon | null) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

const LEAFLET_VERSION = "1.9.4";
const DEFAULT_LAT = 59.9139;
const DEFAULT_LNG = 10.7522;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&countrycodes=no&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "no" } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function polygonCentroid(pts: [number, number][]): { lat: number; lng: number } {
  const lat = pts.reduce((s, [la]) => s + la, 0) / pts.length;
  const lng = pts.reduce((s, [, ln]) => s + ln, 0) / pts.length;
  return { lat, lng };
}

function ptsToGeoJson(pts: [number, number][]): GeoJsonPolygon {
  // GeoJSON uses [lng, lat]; ring must close (first === last)
  const ring: [number, number][] = [
    ...pts.map(([lat, lng]) => [lng, lat] as [number, number]),
    [pts[0][1], pts[0][0]],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

/** Derive polygon vertices [[lat, lng]] from a stored GeoJsonPolygon. */
function geojsonToPts(poly: GeoJsonPolygon): [number, number][] {
  const ring = poly.coordinates[0];
  // Skip the closing duplicate point
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

export default function MapPickerModal({
  initialLat,
  initialLng,
  initialPolygon,
  addressHint,
  title = "Velg posisjon i kart",
  allowPolygon = false,
  onSave,
  onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const leafletLoaded = useRef(false);

  // Point mode state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Polygon mode state
  const [mode, setMode] = useState<PickerMode>(
    allowPolygon && initialPolygon ? "polygon" : "point"
  );
  const [polygonPts, setPolygonPts] = useState<[number, number][]>(
    initialPolygon ? geojsonToPts(initialPolygon) : []
  );
  // Stable refs for event handlers (avoid stale closures)
  const modeRef = useRef<PickerMode>(mode);
  const polygonPtsRef = useRef<[number, number][]>(polygonPts);
  modeRef.current = mode;
  polygonPtsRef.current = polygonPts;

  // Leaflet layers for polygon drawing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polygonLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertexLayersRef = useRef<any[]>([]);

  // ── Helpers ────────────────────────────────────────────────
  function redrawPolygon(pts: [number, number][]) {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove old polygon layer
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    // Remove old vertex markers
    for (const v of vertexLayersRef.current) map.removeLayer(v);
    vertexLayersRef.current = [];

    if (pts.length === 0) return;

    // Vertex circles
    for (let i = 0; i < pts.length; i++) {
      const [lat, lng] = pts[i];
      const circle = L.circleMarker([lat, lng], {
        radius: i === 0 ? 7 : 5,
        color: "#1d4ed8",
        fillColor: i === 0 ? "#93c5fd" : "#2563eb",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);
      vertexLayersRef.current.push(circle);
    }

    // Polygon fill (needs ≥3 pts)
    if (pts.length >= 3) {
      polygonLayerRef.current = L.polygon(pts, {
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.2,
        weight: 2,
        dashArray: "5,4",
      }).addTo(map);
    } else if (pts.length >= 2) {
      // Just a line while fewer than 3 points
      polygonLayerRef.current = L.polyline(pts, {
        color: "#2563eb",
        weight: 2,
        dashArray: "5,4",
      }).addTo(map);
    }
  }

  function clearPolygon() {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (L && map) {
      if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
      for (const v of vertexLayersRef.current) map.removeLayer(v);
      vertexLayersRef.current = [];
    }
    setPolygonPts([]);
    polygonPtsRef.current = [];
  }

  // ── Map initialisation ─────────────────────────────────────
  async function initMap() {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    let startLat = initialLat ?? DEFAULT_LAT;
    let startLng = initialLng ?? DEFAULT_LNG;
    let zoom = initialLat != null ? 16 : 13;

    if (initialLat == null && addressHint) {
      const geo = await geocodeAddress(addressHint);
      if (geo) { startLat = geo.lat; startLng = geo.lng; zoom = 17; }
    }

    const map = L.map(mapRef.current).setView([startLat, startLng], zoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Initial point marker
    if (initialLat != null && initialLng != null && !initialPolygon) {
      markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
    }

    // Initial polygon
    if (initialPolygon) {
      const pts = geojsonToPts(initialPolygon);
      redrawPolygon(pts);
      if (pts.length >= 3) {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    // Unified click handler — reads mode from ref to avoid stale closure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      if (modeRef.current === "point") {
        setCoords({ lat, lng });
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
      } else {
        // Polygon mode: append vertex
        const next: [number, number][] = [...polygonPtsRef.current, [lat, lng]];
        polygonPtsRef.current = next;
        setPolygonPts(next);
        redrawPolygon(next);
      }
    });
  }

  useEffect(() => {
    if (window.L && !leafletLoaded.current) {
      leafletLoaded.current = true;
      setTimeout(initMap, 50);
      return;
    }
    if (leafletLoaded.current) return;

    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId; link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
      script.onload = () => { leafletLoaded.current = true; setTimeout(initMap, 50); };
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) { clearInterval(check); leafletLoaded.current = true; setTimeout(initMap, 50); }
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Mode switch ────────────────────────────────────────────
  function switchMode(next: PickerMode) {
    if (next === "point") {
      clearPolygon();
    } else {
      // Switching to polygon: remove point marker
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }
    setMode(next);
    modeRef.current = next;
  }

  // ── Save handler ───────────────────────────────────────────
  function handleSave() {
    if (mode === "point" && coords) {
      onSave(coords.lat, coords.lng, null);
    } else if (mode === "polygon" && polygonPts.length >= 3) {
      const centroid = polygonCentroid(polygonPts);
      onSave(centroid.lat, centroid.lng, ptsToGeoJson(polygonPts));
    }
  }

  const canSave =
    (mode === "point" && coords != null) ||
    (mode === "polygon" && polygonPts.length >= 3);

  // ── Footer status text ─────────────────────────────────────
  const statusText = mode === "point"
    ? (coords ? `${coords.lat.toFixed(6)}°N, ${coords.lng.toFixed(6)}°Ø` : "Klikk i kartet for å sette posisjon")
    : (polygonPts.length === 0
        ? "Klikk i kartet for å legge til hjørner"
        : polygonPts.length < 3
          ? `${polygonPts.length} punkt${polygonPts.length === 1 ? "" : "er"} — legg til minst ${3 - polygonPts.length} til`
          : `${polygonPts.length} hjørner`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 id="map-modal-title" className="font-semibold text-gray-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Lukk kart"
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xl leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle — only when polygon is allowed */}
        {allowPolygon && (
          <div className="flex gap-1 px-4 pt-3 pb-1">
            <button
              onClick={() => switchMode("point")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition border ${
                mode === "point"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              📍 Punkt
            </button>
            <button
              onClick={() => switchMode("polygon")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition border ${
                mode === "polygon"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              ⬡ Polygon
            </button>
          </div>
        )}

        {/* Map */}
        <div ref={mapRef} style={{ height: 400, width: "100%" }} aria-label="Interaktivt kart" />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400 min-w-0 truncate">
            {statusText}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            {mode === "polygon" && polygonPts.length > 0 && (
              <button
                onClick={clearPolygon}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Slett
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-xl disabled:opacity-40 hover:bg-brand-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {mode === "polygon" ? "Lagre polygon" : "Lagre posisjon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

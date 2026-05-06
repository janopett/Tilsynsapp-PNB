"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJsonPolygon } from "@/types";

type PickerMode = "point" | "polygon";

interface Props {
  initialLat?: number | null;
  initialLng?: number | null;
  initialPolygon?: GeoJsonPolygon | null;
  addressHint?: string;
  title?: string;
  allowPolygon?: boolean;
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
  return {
    lat: pts.reduce((s, [la]) => s + la, 0) / pts.length,
    lng: pts.reduce((s, [, ln]) => s + ln, 0) / pts.length,
  };
}

function ptsToGeoJson(pts: [number, number][]): GeoJsonPolygon {
  const ring: [number, number][] = [
    ...pts.map(([lat, lng]) => [lng, lat] as [number, number]),
    [pts[0][1], pts[0][0]],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

function geojsonToPts(poly: GeoJsonPolygon): [number, number][] {
  return poly.coordinates[0].slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeVertexIcon(L: any, isFirst: boolean): any {
  const size = isFirst ? 14 : 10;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${isFirst ? "#bfdbfe" : "#2563eb"};
      border:2.5px solid #1d4ed8;
      border-radius:50%;
      box-sizing:border-box;
      cursor:move;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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

  // Point mode
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Polygon mode
  const [mode, setMode] = useState<PickerMode>(
    allowPolygon && initialPolygon ? "polygon" : "point"
  );
  const [polygonPts, setPolygonPts] = useState<[number, number][]>(
    initialPolygon ? geojsonToPts(initialPolygon) : []
  );
  const modeRef = useRef<PickerMode>(mode);
  const polygonPtsRef = useRef<[number, number][]>(polygonPts);
  modeRef.current = mode;
  polygonPtsRef.current = polygonPts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polygonLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertexMarkersRef = useRef<any[]>([]);

  // ── Shape-only redraw (no markers) ─────────────────────────
  function redrawShape(pts: [number, number][]) {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
    if (pts.length >= 3) {
      polygonLayerRef.current = L.polygon(pts, {
        color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.18,
        weight: 2, dashArray: "5,4",
      }).addTo(map);
    } else if (pts.length >= 2) {
      polygonLayerRef.current = L.polyline(pts, {
        color: "#2563eb", weight: 2, dashArray: "5,4",
      }).addTo(map);
    }
  }

  // ── Add one vertex with a draggable marker ──────────────────
  function addVertex(lat: number, lng: number) {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const idx = polygonPtsRef.current.length;
    const marker = L.marker([lat, lng], {
      icon: makeVertexIcon(L, idx === 0),
      draggable: true,
      zIndexOffset: 200,
    });

    marker.on("drag", (e: { latlng: { lat: number; lng: number } }) => {
      const { lat: la, lng: ln } = e.latlng;
      const updated: [number, number][] = [...polygonPtsRef.current];
      updated[idx] = [la, ln];
      polygonPtsRef.current = updated;
      setPolygonPts([...updated]);
      redrawShape(updated);
    });

    marker.addTo(map);
    vertexMarkersRef.current.push(marker);

    const newPts: [number, number][] = [...polygonPtsRef.current, [lat, lng]];
    polygonPtsRef.current = newPts;
    setPolygonPts(newPts);
    redrawShape(newPts);
  }

  // ── Clear everything ────────────────────────────────────────
  function clearAll() {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (L && map) {
      if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
      for (const m of vertexMarkersRef.current) map.removeLayer(m);
      vertexMarkersRef.current = [];
    }
    polygonPtsRef.current = [];
    setPolygonPts([]);
  }

  // ── Set crosshair cursor on the map container ───────────────
  function setCursor(cur: "crosshair" | "") {
    const map = mapInstanceRef.current;
    if (map) map.getContainer().style.cursor = cur;
  }

  // ── Map initialisation ──────────────────────────────────────
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

    // Point marker
    if (initialLat != null && initialLng != null && !initialPolygon) {
      markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
    }

    // Restore initial polygon with draggable markers
    if (initialPolygon) {
      const pts = geojsonToPts(initialPolygon);
      for (const [la, ln] of pts) addVertex(la, ln);
      if (pts.length >= 3) {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
      setCursor("crosshair");
    }

    if (modeRef.current === "polygon") setCursor("crosshair");

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
        addVertex(lat, lng);
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Mode switch ─────────────────────────────────────────────
  function switchMode(next: PickerMode) {
    if (next === "point") {
      clearAll();
      setCursor("");
    } else {
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      setCursor("crosshair");
    }
    setMode(next);
    modeRef.current = next;
  }

  // ── Save ────────────────────────────────────────────────────
  function handleSave() {
    if (mode === "point" && coords) {
      onSave(coords.lat, coords.lng, null);
    } else if (mode === "polygon" && polygonPts.length >= 3) {
      const c = polygonCentroid(polygonPts);
      onSave(c.lat, c.lng, ptsToGeoJson(polygonPts));
    }
  }

  const canSave =
    (mode === "point" && coords != null) ||
    (mode === "polygon" && polygonPts.length >= 3);

  const statusText =
    mode === "point"
      ? (coords ? `${coords.lat.toFixed(6)}°N, ${coords.lng.toFixed(6)}°Ø` : "Klikk i kartet for å sette posisjon")
      : polygonPts.length === 0
        ? "Klikk i kartet for å legge til hjørner"
        : polygonPts.length < 3
          ? `${polygonPts.length} punkt${polygonPts.length === 1 ? "" : "er"} — legg til minst ${3 - polygonPts.length} til`
          : `${polygonPts.length} hjørner — dra punkter for å justere`;

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

        <div ref={mapRef} style={{ height: 400, width: "100%" }} aria-label="Interaktivt kart" />

        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400 min-w-0 truncate">
            {statusText}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            {mode === "polygon" && polygonPts.length > 0 && (
              <button
                onClick={clearAll}
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

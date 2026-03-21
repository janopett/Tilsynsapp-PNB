"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  initialLat?: number | null;
  initialLng?: number | null;
  addressHint?: string;
  title?: string;
  onSave: (lat: number, lng: number) => void;
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

export default function MapPickerModal({
  initialLat,
  initialLng,
  addressHint,
  title = "Velg posisjon i kart",
  onSave,
  onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const leafletLoaded = useRef(false);

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

    if (initialLat != null && initialLng != null) {
      markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on("click", (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setCoords({ lat: clickLat, lng: clickLng });
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
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
      const checkLoaded = setInterval(() => {
        if (window.L) { clearInterval(checkLoaded); leafletLoaded.current = true; setTimeout(initMap, 50); }
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

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
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300
                       text-xl leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            ✕
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ height: 400, width: "100%" }} aria-label="Interaktivt kart" />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {coords
              ? `${coords.lat.toFixed(6)}°N, ${coords.lng.toFixed(6)}°Ø`
              : "Klikk i kartet for å sette posisjon"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl
                         text-gray-700 dark:text-slate-300
                         hover:bg-gray-50 dark:hover:bg-slate-700 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Avbryt
            </button>
            <button
              onClick={() => coords && onSave(coords.lat, coords.lng)}
              disabled={!coords}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-xl
                         disabled:opacity-40 hover:bg-brand-700 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Lagre posisjon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

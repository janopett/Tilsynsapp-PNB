"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  initialLat?: number | null;
  initialLng?: number | null;
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
const DEFAULT_LAT = 59.9139; // Oslo
const DEFAULT_LNG = 10.7522;

export default function MapPickerModal({
  initialLat,
  initialLng,
  title = "Velg posisjon i kart",
  onSave,
  onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const leafletLoaded = useRef(false);

  useEffect(() => {
    function initMap() {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      const lat = initialLat ?? DEFAULT_LAT;
      const lng = initialLng ?? DEFAULT_LNG;

      const map = L.map(mapRef.current).setView([lat, lng], 13);

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

    if (window.L && !leafletLoaded.current) {
      leafletLoaded.current = true;
      // Small delay to ensure the div is rendered
      setTimeout(initMap, 50);
      return;
    }

    if (leafletLoaded.current) return;

    // Load Leaflet CSS
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const scriptId = "leaflet-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
      script.onload = () => {
        leafletLoaded.current = true;
        setTimeout(initMap, 50);
      };
      document.head.appendChild(script);
    } else {
      // Script tag exists but may already be loaded
      const checkLoaded = setInterval(() => {
        if (window.L) {
          clearInterval(checkLoaded);
          leafletLoaded.current = true;
          setTimeout(initMap, 50);
        }
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ height: 400, width: "100%" }} />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {coords
              ? `${coords.lat.toFixed(6)}°N, ${coords.lng.toFixed(6)}°Ø`
              : "Klikk i kartet for å sette posisjon"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Avbryt
            </button>
            <button
              onClick={() => coords && onSave(coords.lat, coords.lng)}
              disabled={!coords}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-xl disabled:opacity-40 hover:bg-brand-700 transition"
            >
              Lagre posisjon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

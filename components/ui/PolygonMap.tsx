"use client";

import { useEffect, useRef } from "react";
import type { GeoJsonPolygon } from "@/types";

interface Props {
  polygon: GeoJsonPolygon;
  height?: number;
}

declare global {
  interface Window {
    L: any;
  }
}

const LEAFLET_VERSION = "1.9.4";

export default function PolygonMap({ polygon, height = 280 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || !mapRef.current) return;

    function initMap() {
      if (!window.L || !mapRef.current || initialised.current) return;
      initialised.current = true;

      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Convert GeoJSON [lng, lat] → Leaflet [lat, lng]
      const ring = polygon.coordinates[0];
      const latLngs: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);

      const poly = L.polygon(latLngs, {
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.25,
        weight: 2.5,
      }).addTo(map);

      map.fitBounds(poly.getBounds(), { padding: [32, 32] });
    }

    if (window.L) {
      setTimeout(initMap, 50);
      return;
    }

    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
      script.onload = () => setTimeout(initMap, 50);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check);
          setTimeout(initMap, 50);
        }
      }, 100);
    }
  }, [polygon]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%" }}
      className="rounded-xl overflow-hidden border border-blue-200"
      aria-label="Tilsynsområde kart"
    />
  );
}

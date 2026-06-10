"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    L: any;
  }
}

export interface MapPoint {
  lat: number;
  lng: number;
  num: number;
  id: string;
  title: string;
  status: "ok" | "deviation" | "not_checked";
}

const STATUS_COLOR: Record<string, string> = {
  ok: "#16a34a",
  deviation: "#dc2626",
  not_checked: "#6b7280",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  deviation: "Avvik",
  not_checked: "Ikke relevant",
};

const LEAFLET_VERSION = "1.9.4";

export default function CheckpointOverviewMap({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  function initMap() {
    if (!mapRef.current || !window.L || initialized.current) return;
    initialized.current = true;
    const L = window.L;

    const map = L.map(mapRef.current, { scrollWheelZoom: false });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const latLngs: [number, number][] = [];

    for (const pt of points) {
      const color = STATUS_COLOR[pt.status] ?? "#6b7280";
      const icon = L.divIcon({
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${pt.num}</div>`,
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -16],
      });

      L.marker([pt.lat, pt.lng], { icon })
        .bindPopup(`<strong>${pt.num}. ${pt.id}</strong><br>${pt.title}`)
        .addTo(map);

      latLngs.push([pt.lat, pt.lng]);
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 17);
    } else {
      map.fitBounds(latLngs, { padding: [40, 40] });
    }
  }

  useEffect(() => {
    if (points.length === 0) return;

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
    const existing = document.getElementById(scriptId);
    if (existing) {
      const poll = setInterval(() => {
        if (window.L) {
          clearInterval(poll);
          setTimeout(initMap, 50);
        }
      }, 100);
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
      script.onload = () => setTimeout(initMap, 50);
      document.head.appendChild(script);
    }
  }, []);

  if (points.length === 0) return null;

  return (
    <div className="mb-8 print:break-inside-avoid">
      <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
        Kart — registrerte posisjoner ({points.length})
      </h2>

      <div
        ref={mapRef}
        style={{ height: 320 }}
        className="rounded-xl overflow-hidden border border-gray-200 mb-3"
        aria-label="Oversiktskart med registrerte posisjoner"
      />

      {/* Legend */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100">
            <th className="pb-1 font-medium w-6">#</th>
            <th className="pb-1 font-medium w-20">ID</th>
            <th className="pb-1 font-medium">Sjekkpunkt</th>
            <th className="pb-1 font-medium w-20 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {points.map((pt) => (
            <tr key={pt.num} className="border-b border-gray-100">
              <td className="py-1 pr-2 font-bold" style={{ color: STATUS_COLOR[pt.status] }}>
                {pt.num}
              </td>
              <td className="py-1 pr-2 font-mono text-gray-500">{pt.id}</td>
              <td className="py-1 text-gray-700">{pt.title}</td>
              <td className="py-1 text-right" style={{ color: STATUS_COLOR[pt.status] }}>
                {STATUS_LABEL[pt.status]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

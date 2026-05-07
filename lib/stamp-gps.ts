/**
 * Browser-only: extract GPS from image EXIF and stamp a location label onto the image.
 * Falls back to navigator.geolocation if EXIF has no GPS data.
 * Uses Canvas API — must only be called from client-side code.
 */

export interface ExifGps {
  latitude: number;
  longitude: number;
  source: "exif" | "geolocation";
}

/**
 * Read GPS coordinates from file EXIF, with fallback to browser geolocation.
 * Returns null only if both methods fail or are unavailable.
 */
export async function extractGps(file: File): Promise<ExifGps | null> {
  // --- 1. Try EXIF ---
  if (file.type.startsWith("image/")) {
    try {
      const exifrModule = await import("exifr");
      const parse: ((input: File, opts: object) => Promise<Record<string, number> | null | undefined>) =
        exifrModule.parse ?? (exifrModule as unknown as { default: { parse: typeof exifrModule.parse } }).default?.parse;

      if (typeof parse === "function") {
        const output = await parse(file, { gps: true });
        if (output?.latitude != null && output?.longitude != null) {
          return {
            latitude: output.latitude,
            longitude: output.longitude,
            source: "exif",
          };
        }
      }
    } catch {
      // exifr unavailable or file has no EXIF
    }
  }

  // --- 2. Fallback: browser geolocation ---
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 60_000,
          enableHighAccuracy: true,
        })
      );
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        source: "geolocation",
      };
    } catch {
      // Permission denied or unavailable
    }
  }

  return null;
}

/**
 * Reverse-geocode coordinates to a short address string using Nominatim.
 * Returns null if the lookup fails or no meaningful address is found.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=no&zoom=18`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      address?: Record<string, string>;
      display_name?: string;
    };
    if (!data.address) return null;

    const a = data.address;
    const road = a.road ?? a.pedestrian ?? a.path ?? a.footway ?? "";
    const houseNo = a.house_number ?? "";
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";

    let label = road;
    if (houseNo) label += ` ${houseNo}`;
    if (city) label += label ? `, ${city}` : city;

    return label || (data.display_name?.split(",")[0] ?? null);
  } catch {
    return null;
  }
}

/**
 * Draw a location label (address or coordinate fallback) onto the image and return a JPEG blob.
 * If the image cannot be loaded via canvas, returns the original file unchanged.
 */
export function stampGpsOnImage(
  file: File,
  lat: number,
  lng: number,
  addressLabel?: string | null
): Promise<{ blob: Blob; ext: string; type: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: file, ext: file.name.split(".").pop() ?? "jpg", type: file.type });
        return;
      }

      ctx.drawImage(img, 0, 0);

      const text = addressLabel
        ? addressLabel
        : (() => {
            const latDir = lat >= 0 ? "N" : "S";
            const lngDir = lng >= 0 ? "Ø" : "V";
            return `${Math.abs(lat).toFixed(5)}° ${latDir}  ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
          })();

      // Font size: ~2.2% of image width, clamped 18–64px
      const fontSize = Math.max(18, Math.min(Math.round(img.naturalWidth * 0.022), 64));
      const padding = Math.round(fontSize * 0.55);
      const margin = Math.round(fontSize * 0.8);

      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const textW = ctx.measureText(text).width;
      const boxW = textW + padding * 2;
      const boxH = fontSize + padding * 1.4;
      const boxX = margin;
      const boxY = img.naturalHeight - boxH - margin;
      const radius = boxH / 2;

      // Rounded pill background
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(boxX + radius, boxY);
      ctx.lineTo(boxX + boxW - radius, boxY);
      ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + radius, radius);
      ctx.lineTo(boxX + boxW, boxY + boxH - radius);
      ctx.arcTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH, radius);
      ctx.lineTo(boxX + radius, boxY + boxH);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - radius, radius);
      ctx.lineTo(boxX, boxY + radius);
      ctx.arcTo(boxX, boxY, boxX + radius, boxY, radius);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // White text
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(text, boxX + padding, boxY + padding + fontSize * 0.85);

      canvas.toBlob(
        (blob) => resolve({ blob: blob ?? file, ext: "jpg", type: "image/jpeg" }),
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, ext: file.name.split(".").pop() ?? "jpg", type: file.type });
    };

    img.src = objectUrl;
  });
}

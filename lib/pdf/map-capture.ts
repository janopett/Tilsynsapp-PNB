/**
 * Client-side OSM tile map capture utilities.
 * Draws OSM tiles onto a <canvas> with pin markers, then exports as JPEG.
 * Runs entirely in the browser — no server-side map service required.
 */

function lon2tileFrac(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tileFrac(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

const TILE_SUBDOMAINS = ["a", "b", "c"] as const;

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const sub = TILE_SUBDOMAINS[Math.abs(x + y) % TILE_SUBDOMAINS.length];
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  });
}

function drawAttribution(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(canvasW - 148, canvasH - 18, 148, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("© OpenStreetMap contributors", canvasW - 146, canvasH - 5);
}

/** Capture a single-point map centred at (lat, lng) with a red pin. */
export async function captureMapImage(
  lat: number,
  lng: number,
  zoom = 19,
  grid = 3
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const TILE_SIZE = 256;
  const radius = Math.floor(grid / 2);

  const xFrac = lon2tileFrac(lng, zoom);
  const yFrac = lat2tileFrac(lat, zoom);
  const centerTileX = Math.floor(xFrac);
  const centerTileY = Math.floor(yFrac);

  const pinX = (xFrac - (centerTileX - radius)) * TILE_SIZE;
  const pinY = (yFrac - (centerTileY - radius)) * TILE_SIZE;

  const canvasPx = grid * TILE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvasPx;
  canvas.height = canvasPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#e8e0d8";
  ctx.fillRect(0, 0, canvasPx, canvasPx);

  const tilePromises: Array<Promise<void>> = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      const px = (dx + radius) * TILE_SIZE;
      const py = (dy + radius) * TILE_SIZE;
      tilePromises.push(
        loadTile(zoom, tx, ty).then((img) => {
          if (img) ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
        })
      );
    }
  }
  await Promise.all(tilePromises);

  const R = 10;
  ctx.beginPath();
  ctx.arc(pinX, pinY, R, 0, Math.PI * 2);
  ctx.fillStyle = "#DC2626";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  drawAttribution(ctx, canvasPx, canvasPx);

  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

export interface OverviewPoint {
  lat: number;
  lng: number;
  num: number;
  status: "ok" | "deviation" | "not_checked";
}

const PIN_COLOR: Record<string, string> = {
  ok: "#16a34a",
  deviation: "#dc2626",
  not_checked: "#6b7280",
};

/**
 * Capture an overview map showing multiple numbered, colour-coded pins.
 * Automatically selects a zoom level that fits all points.
 */
export async function captureOverviewMapImage(
  points: OverviewPoint[]
): Promise<string | null> {
  if (typeof document === "undefined" || points.length === 0) return null;

  const TILE_SIZE = 256;
  const MAX_TILES = 5;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Find the highest zoom where all points fit within MAX_TILES in both axes
  let zoom = 17;
  while (zoom > 10) {
    const txMin = Math.floor(lon2tileFrac(minLng, zoom));
    const txMax = Math.floor(lon2tileFrac(maxLng, zoom));
    const tyMin = Math.floor(lat2tileFrac(maxLat, zoom)); // note: y increases downward
    const tyMax = Math.floor(lat2tileFrac(minLat, zoom));
    if (txMax - txMin < MAX_TILES && tyMax - tyMin < MAX_TILES) break;
    zoom--;
  }

  // Tile range with 1-tile padding
  const tileXMin = Math.floor(lon2tileFrac(minLng, zoom)) - 1;
  const tileXMax = Math.floor(lon2tileFrac(maxLng, zoom)) + 1;
  const tileYMin = Math.floor(lat2tileFrac(maxLat, zoom)) - 1;
  const tileYMax = Math.floor(lat2tileFrac(minLat, zoom)) + 1;

  const tilesX = tileXMax - tileXMin + 1;
  const tilesY = tileYMax - tileYMin + 1;
  const canvasW = tilesX * TILE_SIZE;
  const canvasH = tilesY * TILE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#e8e0d8";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Fetch all tiles in parallel
  const tilePromises: Array<Promise<void>> = [];
  for (let ty = tileYMin; ty <= tileYMax; ty++) {
    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      const px = (tx - tileXMin) * TILE_SIZE;
      const py = (ty - tileYMin) * TILE_SIZE;
      tilePromises.push(
        loadTile(zoom, tx, ty).then((img) => {
          if (img) ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
        })
      );
    }
  }
  await Promise.all(tilePromises);

  // Draw numbered, colour-coded pins
  const R = 14;
  for (const pt of points) {
    const pinX = (lon2tileFrac(pt.lng, zoom) - tileXMin) * TILE_SIZE;
    const pinY = (lat2tileFrac(pt.lat, zoom) - tileYMin) * TILE_SIZE;
    const color = PIN_COLOR[pt.status] ?? "#6b7280";

    ctx.beginPath();
    ctx.arc(pinX, pinY, R, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(pt.num), pinX, pinY);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  drawAttribution(ctx, canvasW, canvasH);

  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

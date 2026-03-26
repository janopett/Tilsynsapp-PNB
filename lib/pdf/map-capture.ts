/**
 * Client-side OSM tile map capture utility.
 * Draws a grid of OpenStreetMap tiles onto a <canvas> with a pin marker,
 * then exports as a base64 PNG data URL.
 *
 * Runs entirely in the browser — no server-side external HTTP required.
 * OSM tiles are already loaded by Leaflet in the map picker, so they are
 * often cached by the browser.
 */

/** Convert longitude to fractional tile X at the given zoom level. */
function lon2tileFrac(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

/** Convert latitude to fractional tile Y at the given zoom level. */
function lat2tileFrac(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

/** OSM tile subdomains — mirrors what Leaflet uses for load balancing. */
const TILE_SUBDOMAINS = ["a", "b", "c"] as const;

/**
 * Load a single OSM tile as an HTMLImageElement.
 * Uses crossOrigin="anonymous" so the canvas is not tainted.
 * Resolves with null on error (missing / CORS / network failure).
 */
function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  // Cycle through subdomains exactly as Leaflet does — also distributes CDN load.
  const sub = TILE_SUBDOMAINS[Math.abs(x + y) % TILE_SUBDOMAINS.length];
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  });
}

/**
 * Capture a map tile grid centred at the given coordinates and return a
 * base64 PNG data URL suitable for embedding in a PDF.
 *
 * @param lat  - Latitude
 * @param lng  - Longitude
 * @param zoom - OSM zoom level (default 17 = street/building level)
 * @param grid - Number of tiles on each side of the grid (default 3 → 3×3)
 */
export async function captureMapImage(
  lat: number,
  lng: number,
  zoom = 20,
  grid = 3
): Promise<string | null> {
  if (typeof document === "undefined") return null; // guard against SSR

  const TILE_SIZE = 256;
  const radius = Math.floor(grid / 2); // 1 for 3×3

  const xFrac = lon2tileFrac(lng, zoom);
  const yFrac = lat2tileFrac(lat, zoom);
  const centerTileX = Math.floor(xFrac);
  const centerTileY = Math.floor(yFrac);

  // Pin position in canvas pixels (offset from canvas top-left)
  const pinX = (xFrac - (centerTileX - radius)) * TILE_SIZE;
  const pinY = (yFrac - (centerTileY - radius)) * TILE_SIZE;

  const canvasPx = grid * TILE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = canvasPx;
  canvas.height = canvasPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fill background so blank tiles don't leave transparent gaps
  ctx.fillStyle = "#e8e0d8";
  ctx.fillRect(0, 0, canvasPx, canvasPx);

  // Fetch and draw all tiles in parallel
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

  // Draw red pin marker at exact coordinate position
  const R = 10;
  ctx.beginPath();
  ctx.arc(pinX, pinY, R, 0, Math.PI * 2);
  ctx.fillStyle = "#DC2626";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // White inner dot
  ctx.beginPath();
  ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // OSM attribution (required by tile usage policy)
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(canvasPx - 148, canvasPx - 18, 148, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("© OpenStreetMap contributors", canvasPx - 146, canvasPx - 5);

  try {
    return canvas.toDataURL("image/png");
  } catch {
    // Canvas tainted (CORS) — return null so the fallback text is shown
    return null;
  }
}

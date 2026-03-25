/**
 * Fetches a static map image from OpenStreetMap's staticmap service.
 * Returns a PNG buffer with a marker at the given coordinates, or null on failure.
 */
export async function fetchStaticMapImage(
  latitude: number,
  longitude: number,
  options?: {
    /** Map zoom level. 15 = neighbourhood, 17 = street/building level. Default: 15 */
    zoom?: number;
    /** Image width in pixels. Default: 600 */
    width?: number;
    /** Image height in pixels. Default: 400 */
    height?: number;
  }
): Promise<Buffer | null> {
  const zoom = options?.zoom ?? 15;
  const width = options?.width ?? 600;
  const height = options?.height ?? 400;

  // staticmap.openstreetmap.de is a free community static map service (no API key required).
  const url =
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${latitude},${longitude}` +
    `&zoom=${zoom}` +
    `&size=${width}x${height}` +
    `&maptype=mapnik` +
    `&markers=${latitude},${longitude},red-pushpin`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Tilsynsapp-PNB/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn("[MapImage] Static map fetch failed", { status: res.status, url });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.info("[MapImage] Static map fetched", { latitude, longitude, zoom, bytes: buf.length });
    return buf;
  } catch (err) {
    console.warn("[MapImage] Static map fetch error (non-fatal)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

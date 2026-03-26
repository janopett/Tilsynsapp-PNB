/**
 * Fetches a static map image from Kartverket's WMS service (openwms.statkart.no).
 * Returns a PNG buffer centered at the given coordinates, or null on failure.
 *
 * The same service is used in the HTML inspection report page — it is reliable
 * and provides high-quality Norwegian topographic maps.
 */
export async function fetchStaticMapImage(
  latitude: number,
  longitude: number,
  options?: {
    /**
     * Half-height of the map in degrees latitude.
     * Smaller = more zoomed in. Default: 0.0018 (~200 m → street/building level).
     */
    radiusLat?: number;
    /** Image width in pixels. Default: 600 */
    width?: number;
    /** Image height in pixels. Default: 300 */
    height?: number;
  }
): Promise<Buffer | null> {
  const width = options?.width ?? 600;
  const height = options?.height ?? 300;
  const dLat = options?.radiusLat ?? 0.0018;
  // dLon scales with the image aspect ratio so the map isn't stretched
  const dLon = dLat * (width / height);

  // WMS 1.3.0 with EPSG:4326 uses BBOX order: minLat,minLon,maxLat,maxLon
  const bbox = `${latitude - dLat},${longitude - dLon},${latitude + dLat},${longitude + dLon}`;
  const url =
    `https://openwms.statkart.no/skwms1/wms.topo4?SERVICE=WMS&REQUEST=GetMap` +
    `&VERSION=1.3.0&LAYERS=topo4_WMS&STYLES=&CRS=EPSG:4326` +
    `&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}&FORMAT=image/png`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Tilsynsapp-PNB/1.0" },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      console.warn("[MapImage] Kartverket WMS fetch failed", { status: res.status });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.info("[MapImage] Kartverket WMS fetched", { latitude, longitude, bytes: buf.length });
    return buf;
  } catch (err) {
    console.warn("[MapImage] Map fetch error (non-fatal)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

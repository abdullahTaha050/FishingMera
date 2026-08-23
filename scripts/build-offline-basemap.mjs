import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const endpoint = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const output = resolve(process.argv[2] ?? "apps/mobile/assets/sakarya-kocaeli-basemap.json");
const bbox = "40.95,29.95,41.35,31.65";
const query = `[out:json][timeout:180];(
  way["natural"="coastline"](${bbox});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"](${bbox});
  node["place"~"^(city|town|village|hamlet)$"](${bbox});
);out geom;`;

const result = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "MeraOfflineBasemapBuilder/0.1 (development extract)" },
  body: new URLSearchParams({ data: query }),
  signal: AbortSignal.timeout(240_000)
});
if (!result.ok) throw new Error(`OVERPASS_${result.status}`);
const payload = await result.json();

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let split = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points.at(-1));
    if (distance > maxDistance) { maxDistance = distance; split = index; }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)];
  return [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)];
}

const features = [];
for (const element of payload.elements ?? []) {
  if (element.type === "node" && element.tags?.place && element.tags?.name) {
    features.push({
      type: "Feature",
      id: `n${element.id}`,
      properties: { kind: "place", class: element.tags.place, name: element.tags.name },
      geometry: { type: "Point", coordinates: [Number(element.lon.toFixed(5)), Number(element.lat.toFixed(5))] }
    });
    continue;
  }
  if (element.type !== "way" || !Array.isArray(element.geometry)) continue;
  const kind = element.tags?.natural === "coastline" ? "coastline" : element.tags?.highway ? "road" : null;
  if (!kind) continue;
  const raw = element.geometry.map((point) => [Number(point.lon), Number(point.lat)]);
  const coordinates = simplify(raw, kind === "coastline" ? 0.00008 : 0.00018)
    .map(([longitude, latitude]) => [Number(longitude.toFixed(5)), Number(latitude.toFixed(5))]);
  if (coordinates.length < 2) continue;
  features.push({
    type: "Feature",
    id: `w${element.id}`,
    properties: { kind, class: element.tags?.highway ?? "coastline", name: element.tags?.name ?? null },
    geometry: { type: "LineString", coordinates }
  });
}

const collection = {
  type: "FeatureCollection",
  metadata: {
    name: "Sakarya–Kocaeli bundled offline basemap",
    bounds: [29.95, 40.95, 31.65, 41.35],
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap contributors via Overpass API",
    license: "ODbL-1.0",
    attributionUrl: "https://www.openstreetmap.org/copyright"
  },
  features
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(collection)}\n`, "utf8");
const bytes = Buffer.byteLength(JSON.stringify(collection));
process.stdout.write(`Wrote ${features.length} features (${bytes} bytes) to ${output}\n`);

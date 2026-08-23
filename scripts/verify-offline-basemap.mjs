import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const expectedSha256 = "729171b256531279313224f10e3f2fe79764a08751c4882b9fa21033c5d4a590";
const fileUrl = new URL("../apps/mobile/assets/sakarya-kocaeli-basemap.json", import.meta.url);
const bytes = await readFile(fileUrl);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (sha256 !== expectedSha256) throw new Error(`BASEMAP_CHECKSUM_MISMATCH:${sha256}`);

const data = JSON.parse(bytes.toString("utf8"));
if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("BASEMAP_INVALID_GEOJSON");
const counts = data.features.reduce((result, feature) => {
  const kind = feature?.properties?.kind ?? "unknown";
  result[kind] = (result[kind] ?? 0) + 1;
  return result;
}, {});
if ((counts.road ?? 0) < 10_000 || (counts.coastline ?? 0) < 50 || (counts.place ?? 0) < 300) throw new Error(`BASEMAP_COVERAGE_TOO_SMALL:${JSON.stringify(counts)}`);
if (data.metadata?.license !== "ODbL-1.0" || !String(data.metadata?.source).includes("OpenStreetMap") || data.metadata?.attributionUrl !== "https://www.openstreetmap.org/copyright") throw new Error("BASEMAP_ATTRIBUTION_MISSING");
console.log(`Offline basemap verified: ${data.features.length} features; sha256 ${sha256}`);

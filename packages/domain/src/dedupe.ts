import type { Spot } from "@mera/types";
import { haversineDistanceKm } from "./geo";

function normalizedName(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(balik|balık|merasi|merası|kiyi|kıyı)\b/g, "")
    .replace(/[^a-z0-9ğüşöçı]+/g, " ")
    .trim();
}

function bigrams(value: string): Set<string> {
  const compact = ` ${normalizedName(value)} `;
  return new Set(Array.from({ length: Math.max(0, compact.length - 1) }, (_, index) => compact.slice(index, index + 2)));
}

export function nameSimilarity(left: string, right: string): number {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

export function likelySameSpot(left: Spot, right: Spot): boolean {
  if (left.district.toLocaleLowerCase("tr-TR") !== right.district.toLocaleLowerCase("tr-TR")) return false;
  const distanceM = haversineDistanceKm(left.coordinates, right.coordinates) * 1000;
  const namesLeft = [left.canonicalName, ...left.localNames];
  const namesRight = [right.canonicalName, ...right.localNames];
  const similarity = Math.max(...namesLeft.flatMap((a) => namesRight.map((b) => nameSimilarity(a, b))));
  return distanceM <= 250 && similarity >= 0.58;
}


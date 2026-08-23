import type { Coordinates } from "@mera/types";

const EARTH_RADIUS_KM = 6371.0088;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radiansValue: number) => (radiansValue * 180) / Math.PI;

export function normalizeDegrees(value: number): number {
  return (value % 360 + 360) % 360;
}

export function shortestAngleDelta(from: number, to: number): number {
  return (normalizeDegrees(to - from + 180) - 180);
}

export function smoothHeadingDegrees(
  previous: number,
  next: number,
  options: { alpha?: number; deadband?: number; maxStep?: number } = {}
): number {
  const { alpha = 0.22, deadband = 1.5, maxStep = 30 } = options;
  const delta = shortestAngleDelta(previous, next);
  if (Math.abs(delta) <= deadband) return normalizeDegrees(previous);
  const boundedDelta = Math.max(-maxStep, Math.min(maxStep, delta));
  return normalizeDegrees(previous + boundedDelta * alpha);
}

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const latDelta = radians(to.latitude - from.latitude);
  const lonDelta = radians(to.longitude - from.longitude);
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function initialBearingDegrees(from: Coordinates, to: Coordinates): number {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const lonDelta = radians(to.longitude - from.longitude);
  const y = Math.sin(lonDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function compassLabelTr(bearing: number): string {
  const labels = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"];
  return labels[Math.round(((bearing % 360) + 360) % 360 / 45) % 8]!;
}

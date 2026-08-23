import type { Coordinates } from "@mera/types";
import { smoothHeadingDegrees } from "@mera/domain";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";

export const HENDEK_DEMO_LOCATION: Coordinates = { latitude: 40.799, longitude: 30.748 };

export function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (): Promise<Coordinates | null> => {
    setLoading(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      setPermission(result.status);
      if (result.status !== Location.PermissionStatus.GRANTED) return null;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(next);
      setAccuracy(position.coords.accuracy ?? null);
      return next;
    } finally { setLoading(false); }
  }, []);
  return { coordinates, accuracy, permission, loading, request };
}

export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  const filteredHeading = useRef<number | null>(null);
  const lastUpdateAt = useRef(0);
  useEffect(() => {
    let mounted = true;
    let headingSubscription: Location.LocationSubscription | undefined;
    let magnetometerSubscription: { remove: () => void } | undefined;
    samples.current = [];
    filteredHeading.current = null;
    lastUpdateAt.current = 0;
    const publish = (next: number, nextAccuracy: number) => {
      const now = Date.now();
      if (now - lastUpdateAt.current < 180) return;
      lastUpdateAt.current = now;
      filteredHeading.current = filteredHeading.current === null ? next : smoothHeadingDegrees(filteredHeading.current, next);
      setHeading(filteredHeading.current);
      setAccuracy(nextAccuracy);
    };
    Location.watchHeadingAsync((value) => {
      if (!mounted) return;
      const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      publish(next, value.accuracy);
    }).then((subscription) => { headingSubscription = subscription; }).catch(() => {
      Magnetometer.setUpdateInterval(250);
      magnetometerSubscription = Magnetometer.addListener(({ x, y }) => {
        const raw = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        samples.current = [...samples.current.slice(-4), raw];
        const sin = samples.current.reduce((sum, item) => sum + Math.sin(item * Math.PI / 180), 0);
        const cos = samples.current.reduce((sum, item) => sum + Math.cos(item * Math.PI / 180), 0);
        publish((Math.atan2(sin, cos) * 180 / Math.PI + 360) % 360, 0);
      });
    });
    return () => { mounted = false; headingSubscription?.remove(); magnetometerSubscription?.remove(); };
  }, []);
  return { heading, accuracy, needsCalibration: accuracy !== null && accuracy < 2 };
}

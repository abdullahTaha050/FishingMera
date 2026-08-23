import type { Coordinates } from "@mera/types";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";

export const HENDEK_DEMO_LOCATION: Coordinates = { latitude: 40.799, longitude: 30.748 };

export function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async () => {
    setLoading(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      setPermission(result.status);
      if (result.status !== Location.PermissionStatus.GRANTED) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setAccuracy(position.coords.accuracy ?? null);
    } finally { setLoading(false); }
  }, []);
  return { coordinates, accuracy, permission, loading, request };
}

export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  useEffect(() => {
    let mounted = true;
    let headingSubscription: Location.LocationSubscription | undefined;
    let magnetometerSubscription: { remove: () => void } | undefined;
    Location.watchHeadingAsync((value) => {
      if (!mounted) return;
      const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      setHeading(next); setAccuracy(value.accuracy);
    }).then((subscription) => { headingSubscription = subscription; }).catch(() => {
      Magnetometer.setUpdateInterval(250);
      magnetometerSubscription = Magnetometer.addListener(({ x, y }) => {
        const raw = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        samples.current = [...samples.current.slice(-4), raw];
        const sin = samples.current.reduce((sum, item) => sum + Math.sin(item * Math.PI / 180), 0);
        const cos = samples.current.reduce((sum, item) => sum + Math.cos(item * Math.PI / 180), 0);
        setHeading((Math.atan2(sin, cos) * 180 / Math.PI + 360) % 360); setAccuracy(0);
      });
    });
    return () => { mounted = false; headingSubscription?.remove(); magnetometerSubscription?.remove(); };
  }, []);
  return { heading, accuracy, needsCalibration: accuracy !== null && accuracy < 2 };
}

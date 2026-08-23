import { compassLabelTr, haversineDistanceKm, initialBearingDegrees, normalizeDegrees, shortestAngleDelta } from "@mera/domain";
import type { Coordinates, Spot } from "@mera/types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Animated, StyleSheet, Text, View } from "react-native";
import { Button, Card, Loading, Screen, Title } from "@/components";
import { getSpot, getVehicleLocation, saveVehicleLocation, trackEvent } from "@/db";
import { useCurrentLocation, useHeading } from "@/location";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

export default function CompassScreen() {
  const { spotId, target: initialTarget } = useLocalSearchParams<{ spotId?: string; target?: string }>(); const state = useAppState(); const location = useCurrentLocation(); const sensor = useHeading();
  const requestLocation = location.request;
  const [spot, setSpot] = useState<Spot | null>(null); const [vehicle, setVehicle] = useState<(Coordinates & { accuracy?: number; savedAt: string }) | null>(null); const [target, setTarget] = useState(initialTarget === "vehicle" ? "vehicle" : "spot");
  const [arrowRotation] = useState(() => new Animated.Value(0));
  useEffect(() => { void requestLocation(); }, [requestLocation]);
  useEffect(() => { if (state.db) void trackEvent(state.db, "navigation_compass_opened", { target: initialTarget === "vehicle" ? "vehicle" : "spot" }); }, [state.db, initialTarget]);
  useEffect(() => { if (state.db) { if (spotId) void getSpot(state.db, spotId).then(setSpot); void getVehicleLocation(state.db).then(setVehicle); } }, [state.db, spotId]);
  const destination = target === "vehicle" ? vehicle : spot?.coordinates; const bearing = useMemo(() => location.coordinates && destination ? normalizeDegrees(initialBearingDegrees(location.coordinates, destination)) : null, [location.coordinates, destination]); const distance = useMemo(() => location.coordinates && destination ? haversineDistanceKm(location.coordinates, destination) : null, [location.coordinates, destination]);
  useEffect(() => {
    if (bearing === null || sensor.heading === null) return;
    const desired = normalizeDegrees(bearing - sensor.heading);
    arrowRotation.stopAnimation((current) => {
      const targetRotation = current + shortestAngleDelta(current, desired);
      Animated.timing(arrowRotation, { toValue: targetRotation, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) arrowRotation.setValue(normalizeDegrees(targetRotation));
      });
    });
  }, [arrowRotation, bearing, sensor.heading]);
  const animatedRotation = arrowRotation.interpolate({ inputRange: [-720, 720], outputRange: ["-720deg", "720deg"] });
  if (!state.ready) return <Loading />;
  async function park() { if (!state.db || !location.coordinates) return Alert.alert("GPS konumu bekleniyor"); await saveVehicleLocation(state.db, location.coordinates.latitude, location.coordinates.longitude, location.accuracy ?? undefined); const saved = await getVehicleLocation(state.db); setVehicle(saved); Alert.alert("Araç konumu cihazda kaydedildi", "Bu konum buluta gönderilmez ve internet olmadan kullanılabilir."); }
  return <Screen><View style={styles.content}><Title>{target === "vehicle" ? "Arabaya dön" : spot?.canonicalName ?? "Pusula"}</Title><Card><View style={styles.compass}><Animated.View style={[styles.arrow, sensor.needsCalibration && styles.arrowUnreliable, { transform: [{ rotate: animatedRotation }] }]}><Text style={styles.arrowText}>▲</Text></Animated.View><Text style={styles.direction}>{bearing === null ? "GPS bekleniyor" : `${compassLabelTr(bearing)} · ${Math.round(bearing)}°`}</Text><Text style={styles.distance}>{distance === null ? "—" : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</Text><Text style={styles.meta}>GPS doğruluğu: {location.accuracy ? `±${Math.round(location.accuracy)} m` : "bilinmiyor"} · Pusula: {sensor.heading === null ? "bekleniyor" : `${Math.round(sensor.heading)}°`}</Text></View></Card>
    {sensor.needsCalibration && <Card><Text style={styles.warning}>Pusula doğruluğu düşük. Telefonu sekiz çizerek kalibre et ve metal/mıknatıslardan uzaklaş.</Text></Card>}
    <Text style={styles.disclaimer}>Ok yalnızca kuş uçuşu yönü gösterir. Yol, geçiş izni veya güvenli rota bildiğini iddia etmez.</Text>
    <Button title="Arabamı burada bıraktım" variant="secondary" onPress={park} />{vehicle && <Button title="Arabaya dönüşü göster" variant={target === "vehicle" ? "primary" : "secondary"} onPress={() => setTarget("vehicle")} />}{spot && target === "vehicle" && <Button title="Merayı tekrar göster" variant="secondary" onPress={() => setTarget("spot")} />}
  </View></Screen>;
}
const styles = StyleSheet.create({ content: { flex: 1, padding: spacing.md, gap: spacing.md }, compass: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm }, arrow: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.moss, alignItems: "center", justifyContent: "center" }, arrowUnreliable: { opacity: 0.45 }, arrowText: { color: colors.primary, fontSize: 72, lineHeight: 80 }, direction: { color: colors.ink, fontSize: 22, fontWeight: "900" }, distance: { color: colors.water, fontSize: 30, fontWeight: "900" }, meta: { color: colors.muted, textAlign: "center" }, warning: { color: colors.warning, fontWeight: "800", lineHeight: 21 }, disclaimer: { color: colors.danger, fontWeight: "800", lineHeight: 20 } });

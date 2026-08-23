import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { SPECIES } from "@mera/config";
import type { BeginnerSuitability, Coordinates, PublicationLevel, SpeciesId, Spot } from "@mera/types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Label, Screen, Title } from "@/components";
import { accountStatus } from "@/auth";
import { saveUserSpot } from "@/db";
import { useCurrentLocation } from "@/location";
import { fallbackMapStyle } from "@/map";
import { BundledBasemapLayers } from "@/mapLayers";
import { pickLocalPhoto, recoverPendingLocalPhoto, type LocalPhoto } from "@/photos";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

const publicationOptions: [PublicationLevel, string, string][] = [
  ["PRIVATE", "Özel", "Kesin konum yalnızca hesabında kalır."],
  ["APPROXIMATE", "Yaklaşık paylaş", "Sunucu genel görünümde yaklaşık 1–1,5 km belirsizlik uygular."],
  ["PUBLIC", "Açık paylaş", "Kesin koordinat topluluğa gösterilir."]
];
const coastlines: [Spot["coastlineType"], string][] = [["BEACH", "Kumsal"], ["ROCK", "Kayalık"], ["BREAKWATER", "Mendirek"], ["HARBOUR", "Liman"], ["RIVER_MOUTH", "Dere ağzı"], ["MIXED", "Karışık"], ["UNKNOWN", "Bilmiyorum"]];
const accessTypes: [Spot["accessType"], string][] = [["WALK", "Yürüyerek"], ["VEHICLE", "Araçla"], ["MIXED", "Karma"], ["UNKNOWN", "Bilmiyorum"]];
const suitabilityOptions: [BeginnerSuitability, string][] = [["SUITABLE", "Acemiye uygun"], ["CAUTION", "Dikkatli"], ["UNSUITABLE", "Uygun değil"], ["UNKNOWN", "Bilmiyorum"]];

export default function NewSpotScreen() {
  const state = useAppState(); const location = useCurrentLocation();
  const [name, setName] = useState(""); const [note, setNote] = useState(""); const [parkingNotes, setParkingNotes] = useState(""); const [walkingDistance, setWalkingDistance] = useState(""); const [hazards, setHazards] = useState("");
  const [publicationLevel, setPublicationLevel] = useState<PublicationLevel>("PRIVATE"); const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(null); const [targetSpecies, setTargetSpecies] = useState<SpeciesId[]>([state.targetSpecies]); const [coastlineType, setCoastlineType] = useState<Spot["coastlineType"]>("UNKNOWN"); const [accessType, setAccessType] = useState<Spot["accessType"]>("UNKNOWN"); const [beginnerSuitability, setBeginnerSuitability] = useState<BeginnerSuitability>("UNKNOWN"); const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  useEffect(() => { void recoverPendingLocalPhoto().then((photo) => { if (photo) setPhotos((current) => [...current, photo].slice(0, 3)); }); }, []);
  const marker = useMemo(() => ({ type: "FeatureCollection" as const, features: selectedCoordinates ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [selectedCoordinates.longitude, selectedCoordinates.latitude] } }] : [] }), [selectedCoordinates]);
  function toggleSpecies(speciesId: SpeciesId) { setTargetSpecies((current) => current.includes(speciesId) ? current.filter((item) => item !== speciesId) : [...current, speciesId]); }
  async function currentLocation() { const coordinates = await location.request(); if (coordinates) setSelectedCoordinates(coordinates); }
  async function addPhoto(source: "camera" | "library") { try { const photo = await pickLocalPhoto(source); if (photo) setPhotos((current) => [...current, photo].slice(0, 3)); } catch { Alert.alert("Fotoğraf eklenemedi", "İzinleri ve depolama alanını kontrol et."); } }
  async function save() {
    if (!state.db || !selectedCoordinates) return Alert.alert("Konum gerekli", "GPS konumunu kullan veya haritada bir noktaya dokun.");
    if (name.trim().length < 2) return Alert.alert("Mera adı gerekli");
    if (targetSpecies.length === 0) return Alert.alert("En az bir hedef tür seç");
    const walkingDistanceM = walkingDistance ? Number(walkingDistance) : undefined;
    if (walkingDistanceM !== undefined && (!Number.isFinite(walkingDistanceM) || walkingDistanceM < 0)) return Alert.alert("Yürüme mesafesini kontrol et");
    if (publicationLevel !== "PRIVATE") {
      const account = await accountStatus();
      if (!account.configured || account.isAnonymous) return Alert.alert("Kalıcı hesap gerekli", "Yaklaşık veya açık paylaşım için Profil ekranında e-posta koduyla hesabını yükselt. Özel kayıt hesap olmadan kaydedilebilir.");
    }
    const id = await saveUserSpot(state.db, { canonicalName: name, latitude: selectedCoordinates.latitude, longitude: selectedCoordinates.longitude, publicationLevel, targetSpecies, coastlineType, accessType, beginnerSuitability, parkingNotes, walkingDistanceM, knownHazards: hazards.split("\n").map((item) => item.trim()).filter(Boolean), photos, note });
    await state.reload(); router.replace({ pathname: "/spot/[id]", params: { id } });
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Title>Kendi meranı kaydet</Title><Text style={styles.subtle}>Kayıt internet olmadan yapılır. Varsayılan “Özel” seçim kesin koordinatını topluluğa açmaz.</Text>
    <Card><Label>Konum</Label><View style={styles.mapWrap}><Map style={styles.map} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? fallbackMapStyle} onPress={(event) => { const [longitude, latitude] = event.nativeEvent.lngLat; setSelectedCoordinates({ latitude, longitude }); }}><Camera initialViewState={{ center: selectedCoordinates ? [selectedCoordinates.longitude, selectedCoordinates.latitude] : [30.45, 41.08], zoom: selectedCoordinates ? 12 : 7.2 }} />{!process.env.EXPO_PUBLIC_MAP_STYLE_URL && <BundledBasemapLayers />}<GeoJSONSource id="new-spot-marker" data={marker}><Layer id="new-spot-circle" type="circle" paint={{ "circle-radius": 9, "circle-color": colors.primary, "circle-stroke-color": colors.white, "circle-stroke-width": 3 }} /></GeoJSONSource></Map></View><Text style={styles.value}>{selectedCoordinates ? `${selectedCoordinates.latitude.toFixed(5)}, ${selectedCoordinates.longitude.toFixed(5)}${location.accuracy ? ` · GPS ±${Math.round(location.accuracy)} m` : ""}` : "Haritada noktaya dokun veya GPS kullan"}</Text><Button title={location.loading ? "Konum alınıyor…" : "Şu anki konumumu kullan"} variant="secondary" disabled={location.loading} onPress={currentLocation} /></Card>
    <Card><Label>Mera adı</Label><TextInput style={styles.input} value={name} onChangeText={setName} maxLength={160} placeholder="Örn. dere ağzının doğusu" placeholderTextColor={colors.muted} /><Label>Balık türleri</Label><View style={styles.wrap}>{SPECIES.map((species) => <Button key={species.id} title={species.nameTr} variant={targetSpecies.includes(species.id) ? "primary" : "secondary"} onPress={() => toggleSpecies(species.id)} />)}</View></Card>
    <Card><Label>Kıyı tipi</Label><OptionButtons options={coastlines} value={coastlineType} onChange={setCoastlineType} /><Label>Erişim</Label><OptionButtons options={accessTypes} value={accessType} onChange={setAccessType} /><Label>Acemi uygunluğu</Label><OptionButtons options={suitabilityOptions} value={beginnerSuitability} onChange={setBeginnerSuitability} /></Card>
    <Card><Label>Park / yürüme / riskler</Label><TextInput style={styles.input} value={parkingNotes} onChangeText={setParkingNotes} maxLength={500} placeholder="Park bilgisi" placeholderTextColor={colors.muted} /><TextInput style={styles.input} value={walkingDistance} onChangeText={setWalkingDistance} keyboardType="number-pad" placeholder="Yürüme mesafesi (metre)" placeholderTextColor={colors.muted} /><TextInput style={[styles.input, styles.multiline]} value={hazards} onChangeText={setHazards} multiline maxLength={1000} placeholder="Her tehlikeyi yeni satıra yaz" placeholderTextColor={colors.muted} /><TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} maxLength={500} multiline placeholder="Arazi ve kişisel not" placeholderTextColor={colors.muted} /></Card>
    <Card><Label>Fotoğraflar · en fazla 3</Label><View style={styles.photoRow}>{photos.map((photo) => <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />)}</View><View style={styles.row}><Button title="Kamerayı aç" variant="secondary" onPress={() => addPhoto("camera")} /><Button title="Galeriden seç" variant="secondary" onPress={() => addPhoto("library")} /></View><Text style={styles.subtle}>EXIF konum bilgisi yeniden kodlama sırasında çıkarılır; fotoğraf bağlantı gelene kadar cihazda kalır.</Text></Card>
    <Card><Label>Gizlilik</Label>{publicationOptions.map(([value, title, description]) => <Pressable key={value} onPress={() => setPublicationLevel(value)} style={[styles.option, publicationLevel === value && styles.optionActive]}><View style={styles.radio}>{publicationLevel === value && <View style={styles.radioDot} />}</View><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.subtle}>{description}</Text></View></Pressable>)}</Card>
    <Card><Text style={styles.warning}>“Açık paylaş” seçilse bile kayıt topluluk kaydıdır; otomatik olarak doğrulanmış sayılmaz. Yasak, özel mülk ve güvenlik alanlarını paylaşma.</Text></Card><Button title="Cihazda kaydet" onPress={save} />
  </ScrollView></Screen>;
}

function OptionButtons<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (value: T) => void }) { return <View style={styles.wrap}>{options.map(([option, label]) => <Button key={option} title={label} variant={value === option ? "primary" : "secondary"} onPress={() => onChange(option)} />)}</View>; }
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, subtle: { color: colors.muted, lineHeight: 20 }, value: { color: colors.ink, fontSize: 16, fontWeight: "800" }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.surface, color: colors.ink, fontSize: 16 }, multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" }, option: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, optionActive: { borderColor: colors.primary, borderWidth: 2 }, optionTitle: { color: colors.ink, fontWeight: "900", fontSize: 16 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, warning: { color: colors.warning, fontWeight: "700", lineHeight: 21 }, wrap: { gap: spacing.sm }, row: { flexDirection: "row", gap: spacing.sm }, mapWrap: { height: 260, borderRadius: 12, overflow: "hidden" }, map: { flex: 1 }, photoRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }, photo: { width: 92, height: 92, borderRadius: 10 } });

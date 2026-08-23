import { SPECIES } from "@mera/config";
import type { ExperienceLevel, FishingType } from "@mera/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { accountStatus, requestExistingAccountOtp, requestGuestEmailOtp, verifyExistingAccountOtp, verifyGuestEmailOtp, type AccountStatus } from "@/auth";
import { Button, Card, Label, Loading, Screen } from "@/components";
import { retryBlockedAccountItems } from "@/db";
import { useAppState } from "@/store";
import { runSync } from "@/sync";
import { colors, spacing } from "@/theme";

const experienceLabels: Record<ExperienceLevel, string> = { FIRST_TIME: "İlk defa", BEGINNER: "Acemi", INTERMEDIATE: "Orta", EXPERIENCED: "Deneyimli" };
const fishingTypeLabels: Record<FishingType, string> = { SHORE: "Kıyı", BOAT: "Tekne", FRESHWATER: "Tatlı su" };

export default function ProfileScreen() {
  const [customDistance, setCustomDistance] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authFlow, setAuthFlow] = useState<"upgrade" | "signin">("upgrade");
  const state = useAppState();

  useEffect(() => { void accountStatus().then(setAccount); }, []);
  if (!state.ready) return <Loading />;

  async function sendOtp() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Geçerli bir e-posta gir");
    setAuthBusy(true);
    try {
      if (authFlow === "upgrade") await requestGuestEmailOtp(email);
      else await requestExistingAccountOtp(email);
      Alert.alert("Kod gönderildi", "E-postandaki 6 haneli kodu aşağıya gir.");
    } catch (error) {
      Alert.alert("Kod gönderilemedi", error instanceof Error ? error.message : "Bağlantıyı kontrol et.");
    } finally { setAuthBusy(false); }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp.trim())) return Alert.alert("6 haneli kodu gir");
    setAuthBusy(true);
    try {
      const next = authFlow === "upgrade" ? await verifyGuestEmailOtp(email, otp) : await verifyExistingAccountOtp(email, otp);
      setAccount(next);
      if (state.db) {
        await retryBlockedAccountItems(state.db);
        await runSync(state.db);
        await state.reload();
      }
      setOtp("");
      Alert.alert("Hesap hazır", "Yerel kayıtların aynı kullanıcı kimliğiyle korunur ve bekleyen paylaşımlar yeniden denenir.");
    } catch (error) {
      Alert.alert("Kod doğrulanamadı", error instanceof Error ? error.message : "Kodu ve bağlantıyı kontrol et.");
    } finally { setAuthBusy(false); }
  }

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Card><Label>Hesap ve veri devamlılığı</Label>
      {!account?.configured ? <Text style={styles.warning}>Cloud ortamı henüz yapılandırılmadı. Uygulama ve yerel kayıtlar çevrimdışı çalışmaya devam eder.</Text>
        : account && !account.isAnonymous ? <><Text style={styles.value}>Kalıcı hesap · {account.email}</Text><Text style={styles.subtle}>Aynı e-postayla başka cihazda tek kullanımlık kod alarak giriş yapabilirsin.</Text></>
        : <><Text style={styles.subtle}>Guest kayıtlarını kaybetmeden e-posta kimliği bağla; parola gerekmez. Paylaşılan mera ve herkese açık rapor için kalıcı hesap gerekir.</Text>
          <View style={styles.wrap}><Button title="Guest hesabı yükselt" variant={authFlow === "upgrade" ? "primary" : "secondary"} onPress={() => setAuthFlow("upgrade")} /><Button title="Mevcut hesaba gir" variant={authFlow === "signin" ? "primary" : "secondary"} onPress={() => setAuthFlow("signin")} /></View>
          <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor={colors.muted} />
          <Button title={authBusy ? "Bekle…" : "6 haneli kod gönder"} variant="secondary" disabled={authBusy} onPress={sendOtp} />
          <View style={styles.row}><TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="Doğrulama kodu" placeholderTextColor={colors.muted} /><Button title="Doğrula" disabled={authBusy} onPress={verifyOtp} /></View>
        </>}
    </Card>
    <Card><Label>Deneyim</Label><View style={styles.wrap}>{(Object.keys(experienceLabels) as ExperienceLevel[]).map((item) => <Button key={item} title={experienceLabels[item]} variant={state.experience === item ? "primary" : "secondary"} onPress={() => state.updatePreference("experience", item)} />)}</View></Card>
    <Card><Label>Av tipi</Label><View style={styles.wrap}>{(Object.keys(fishingTypeLabels) as FishingType[]).map((item) => <Button key={item} title={fishingTypeLabels[item]} variant={state.fishingType === item ? "primary" : "secondary"} onPress={() => state.updatePreference("fishing_type", item)} />)}</View><Text style={styles.subtle}>MVP önerileri kıyı avı için optimize edilmiştir; tekne/tatlı su seçimi profilinde saklanır ancak kıyı dışı öneri üretmez.</Text></Card>
    <Card><Label>Hedef balık</Label><View style={styles.wrap}>{SPECIES.map((item) => <Button key={item.id} title={item.nameTr} variant={state.targetSpecies === item.id ? "primary" : "secondary"} onPress={() => state.updatePreference("target_species", item.id)} />)}</View></Card>
    <Card><Label>Maksimum kuş uçuşu yarıçap</Label><View style={styles.wrap}>{[25, 50, 100, 150].map((item) => <Button key={item} title={`${item} km`} variant={state.maxDistanceKm === item ? "primary" : "secondary"} onPress={() => state.updatePreference("max_distance_km", String(item))} />)}</View><View style={styles.row}><TextInput style={styles.input} value={customDistance} onChangeText={setCustomDistance} keyboardType="number-pad" placeholder="Özel km (1–200)" placeholderTextColor={colors.muted} /><Button title="Uygula" variant="secondary" onPress={() => { const value = Number(customDistance); if (!Number.isInteger(value) || value < 1 || value > 200) return Alert.alert("1–200 km arasında tam sayı gir"); void state.updatePreference("max_distance_km", String(value)); }} /></View></Card>
    <Card><Label>Takımlarım</Label>{state.gearProfiles.map((gear) => <View key={gear.id} style={styles.gear}><Text style={styles.value}>{gear.name}{state.gear?.id === gear.id ? " · seçili" : ""}</Text><Text style={styles.subtle}>{gear.rodType ?? "?"} · {gear.rodLengthCm ?? "?"} cm · {gear.castingWeightMinG ?? "?"}–{gear.castingWeightMaxG ?? "?"} g · {gear.reelSize ?? "?"}</Text>{state.gear?.id !== gear.id && <Button title="Bu takımı kullan" variant="secondary" onPress={() => state.activateGear(gear.id)} />}</View>)}<Button title="Yeni takım ekle" variant="secondary" onPress={() => router.push({ pathname: "/onboarding", params: { mode: "gear" } })} /></Card>
    <Card><Label>Senkronizasyon</Label><Text style={styles.subtle}>Temel özellikler ve yerel kayıtlar hesap olmadan çalışır. Cloud yapılandırıldığında guest verileri de sahibiyle ilişkilendirilir.</Text><Button title="Şimdi senkronize et" variant="secondary" onPress={async () => { if (state.db) { await runSync(state.db); await state.reload(); } }} /></Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 }, wrap: { gap: spacing.sm }, row: { flexDirection: "row", gap: spacing.sm }, gear: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }, input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.ink, paddingHorizontal: 12, backgroundColor: colors.surface }, value: { color: colors.ink, fontSize: 18, fontWeight: "900" }, subtle: { color: colors.muted, lineHeight: 20 }, warning: { color: colors.warning, lineHeight: 21, fontWeight: "700" } });

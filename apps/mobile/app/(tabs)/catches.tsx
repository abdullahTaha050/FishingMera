import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Loading, Screen } from "@/components";
import { listCatchReports } from "@/db";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

type ReportRow = Awaited<ReturnType<typeof listCatchReports>>[number];
export default function CatchesScreen() {
  const state = useAppState(); const [reports, setReports] = useState<ReportRow[]>([]);
  useFocusEffect(useCallback(() => { if (state.db) void listCatchReports(state.db).then(setReports); }, [state.db]));
  if (!state.ready) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content}><Button title="Avı Kaydet" onPress={() => router.push("/catch/new")} />{reports.map((report) => { const spot = state.spots.find((item) => item.id === report.payload.spotId); const photos = Array.isArray(report.payload.photos) ? report.payload.photos as { uri?: string }[] : []; return <Card key={report.id}><View style={styles.row}>{photos[0]?.uri && <Image source={{ uri: photos[0].uri }} style={styles.photo} />}<View style={styles.summary}><Text style={styles.title}>{String(report.payload.targetSpecies ?? "Av raporu")}</Text><Text style={styles.subtle}>{spot?.canonicalName ?? "Mera seçilmedi"} · {String(report.payload.result ?? "")}</Text><Text style={styles.subtle}>{new Date(report.createdAt).toLocaleString("tr-TR")} · {String(report.payload.quantity ?? 0)} adet</Text><Text style={report.syncStatus === "SYNCED" ? styles.synced : styles.pending}>{report.syncStatus === "SYNCED" ? "Senkronize" : "Cihazda bekliyor"}</Text></View></View></Card>; })}{reports.length === 0 && <Card><Text style={styles.subtle}>Av raporları çevrimdışı oluşturulabilir; bağlantı gelince idempotent kuyrukla gönderilir.</Text></Card>}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, row: { flexDirection: "row", gap: spacing.sm }, summary: { flex: 1, gap: 4 }, photo: { width: 86, height: 86, borderRadius: 12, backgroundColor: colors.border }, title: { color: colors.ink, fontSize: 18, fontWeight: "900" }, subtle: { color: colors.muted }, pending: { color: colors.warning, fontWeight: "800" }, synced: { color: colors.moss, fontWeight: "800" } });

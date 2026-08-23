import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button, Card, Loading, Screen } from "@/components";
import { listCatchReports } from "@/db";
import { useAppState } from "@/store";
import { colors, spacing } from "@/theme";

type ReportRow = Awaited<ReturnType<typeof listCatchReports>>[number];
export default function CatchesScreen() {
  const state = useAppState(); const [reports, setReports] = useState<ReportRow[]>([]);
  useFocusEffect(useCallback(() => { if (state.db) void listCatchReports(state.db).then(setReports); }, [state.db]));
  if (!state.ready) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content}><Button title="Avı Kaydet" onPress={() => router.push("/catch/new")} />{reports.map((report) => <Card key={report.id}><Text style={styles.title}>{String(report.payload.targetSpecies ?? "Av raporu")}</Text><Text style={styles.subtle}>{new Date(report.createdAt).toLocaleString("tr-TR")} · {String(report.payload.result ?? "")}</Text><Text style={report.syncStatus === "SYNCED" ? styles.synced : styles.pending}>{report.syncStatus === "SYNCED" ? "Senkronize" : "Cihazda bekliyor"}</Text></Card>)}{reports.length === 0 && <Card><Text style={styles.subtle}>Av raporları çevrimdışı oluşturulabilir; bağlantı gelince idempotent kuyrukla gönderilir.</Text></Card>}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md }, title: { color: colors.ink, fontSize: 18, fontWeight: "900" }, subtle: { color: colors.muted }, pending: { color: colors.warning, fontWeight: "800" }, synced: { color: colors.moss, fontWeight: "800" } });


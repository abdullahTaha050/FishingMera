import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Label, Screen, Title } from "@/components";
import { colors, spacing } from "@/theme";

const sections = [
  ["Cihazda kalanlar", "Tercihler, takımlar, favoriler, araç konumu, çevrimdışı meralar, taslak raporlar ve fotoğraflar önce cihazdaki veritabanında tutulur."],
  ["Buluta gidenler", "Bulut yapılandırıldıysa hesap kimliği, senkronize edilen favori/takım/rapor/mera kayıtları ve seçtiğin fotoğraflar Supabase'e gönderilir. Özel mera koordinatları yalnız sahibine açıktır; yaklaşık konum paylaşımı kesin koordinatı yayımlamaz."],
  ["Konum", "Konum; yakındaki meraları sıralamak, mesafe/yön göstermek ve isteğinle araç konumunu kaydetmek için kullanılır. Kesin konum analitik olaylarına veya uygulama günlüklerine yazılmaz."],
  ["Fotoğraflar", "Seçtiğin görüntüler yüklemeden önce JPEG olarak yeniden kodlanır ve EXIF konum metadatası çıkarılır. Fotoğraf erişimi yalnız sen bir rapora veya meraya fotoğraf eklediğinde kullanılır."],
  ["Üçüncü taraflar", "Kimlik, veri ve özel dosyalar için Supabase; hava/deniz koşulları için Open-Meteo; doğrulanmamış yeni mera araştırması için sunucu üzerinden OpenAI kullanılır. OpenStreetMap verisi uygulamaya çevrimdışı bağlam olarak gömülüdür."],
  ["Kontrolün", "Profil ekranından HESABIMI SIL onayıyla cloud hesabını ve kişisel cloud verilerini kalıcı silebilir, aynı anda bu cihazdaki kişisel kayıtları temizleyebilirsin. Çevrimdışıysan cloud silme tamamlanana kadar yerel kayıtlar korunur."],
  ["Güvenlik ve sınırlar", "Mera bir navigasyon veya can güvenliği sistemi değildir. Güncel yasakları, hava/deniz durumunu ve fiziksel erişimi yerel resmi kaynaklardan kontrol et."]
] as const;

export default function PrivacyScreen() {
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Title>Gizlilik ve veri kullanımı</Title><Text style={styles.date}>Sürüm tarihi: 23 Ağustos 2026</Text></View>
    {sections.map(([title, body]) => <Card key={title}><Label>{title}</Label><Text style={styles.body}>{body}</Text></Card>)}
    <Text style={styles.note}>Mağaza yayını öncesinde veri sorumlusunun ticari unvanı, iletişim adresi ve yayımlanmış gizlilik politikası URL’si mağaza kaydına eklenecektir.</Text>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 }, header: { gap: spacing.xs }, date: { color: colors.muted }, body: { color: colors.ink, lineHeight: 22 }, note: { color: colors.muted, lineHeight: 20 } });

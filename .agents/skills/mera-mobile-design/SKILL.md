---
name: mera-mobile-design
description: Mera mobil uygulamasında UI/UX tasarımı, yeniden tasarım, görsel ince ayar ve ekran doğrulaması için kullan. Ferah, native, outdoor/navigation hissi veren tasarım dilini uygular; onaylanmış referans ekranlarını kaynak kabul eder ve AI-template/broşür görünümünü engeller. Backend, deploy, Supabase, EAS veya sync işleri için kullanma.
---

# Mera Mobile Design Skill — v2

Bu skill yalnızca Mera mobil UI/UX görevlerinde kullanılır.
Repo kökündeki `AGENTS.md` içindeki acceptance ve çalışma kuralları ayrıca zorunludur.

## 1. Ürün karakteri
Mera:
- sakin
- ferah
- hızlı taranabilir
- outdoor/navigation odaklı
- güven veren
- acemi kullanıcıya açık
- native mobil uygulama hissinde

Mera değildir:
- AI dashboard
- broşür
- sosyal medya uygulaması
- kart içinde kart yığını
- renkli startup template
- “AI powered” pazarlama yüzeyi

## 2. Referanslar
UI değişikliğine başlamadan ilgili asset'i incele.

GOLD:
- `assets/reference_home_gold.png`
- `assets/reference_discover_gold.png`
- `assets/reference_compass_gold.png`

DIRECTION:
- `assets/reference_saved_direction.png`

STRUCTURE ONLY:
- `assets/reference_spot_detail_structure_only.png`

Spot Detail referansı yalnızca bilgi kategorileri içindir. Uzun metin, monoton kartlar ve broşür hissi KOPYALANMAZ.

## 3. Bilgi yoğunluğu
Scan-heavy alanlarda değerler tercihen 1–2 kelime olmalı.

Tercih:
- Balık → İstavrit
- Kıyı → Karma
- Seviye → Acemi
- Park → Var
- Risk → Kaygan taş
- Takım → Kısa çapari
- Ağırlık → 15 g

Kaçın:
- uzun açıklama cümleleri
- paragraf
- “Takımına ve seviyene uygun”
- “Genel olarak iyi şartlar”

## 4. Typography
- page title güçlü
- section title mevcut body’den belirgin biçimde daha tok
- card title daha güçlü
- metadata daha sessiz
- skor güçlü ama ekranı ele geçirmesin

Her şeyi bold yapma.

## 5. Spacing
Ritim: 4 / 8 / 12 / 16 / 24 / 32

Boşluk ve divider kullan.
Sığdırmak için font/padding ezme.

## 6. Kart/yüzey
Kart yalnızca ilişkili bilgiyi grupluyorsa kullan.

Kaçın:
- nested cards
- her satır ayrı kart
- her yerde shadow
- dev radius
- tüm ekran beyaz/mavi aynı yüzey

Kullanıcı “border kalsın, background transparent” derse arka plan gerçekten transparent olmalı.

## 7. Renk
Monoton navy/beyaz broşür görünümünden kaçın.

Semantic color:
- sea/wave → soft blue/cyan
- wind → soft blue-gray
- positive → soft green
- warning/risk → soft amber
- neutral → light neutral surface

Önerilen ana roller:
- primary ink `#0B2440`
- secondary `#5F7184`
- sea blue `#2D7DD2`
- teal `#147C8C`
- positive `#2E9D5B`
- warning `#D99026`

Gradient, neon, glassmorphism, emoji, AI sparkle yok.

## 8. Kaydet
Kalp kullanma.
Tek kavram: `Kaydet`
İkon: bookmark
Saved state: filled bookmark

## 9. Navigation
Ana tab:
- Bugün
- Keşfet
- Kaydedilenler
- Avlarım
- Profil

Keşfet içinde:
- Harita
- Liste

## 10. Ana Sayfa — GOLD
`reference_home_gold.png` onaylıdır.

Recommendation card:
- fotoğraf
- spot adı
- location + distance
- score
- wave
- wind
- recommended time
- bookmark

Açıklama cümlesi ekleme.

## 11. Keşfet — GOLD
`reference_discover_gold.png` onaylıdır.

Gerekli:
- visible search
- compact filters
- Harita/Liste
- Bu bölgede ara
- map-first
- cluster
- selected spot bottom sheet

Provenance:
- green → Doğrulanmış
- blue → Topluluk
- orange → Web'den bulundu

Web'den bulundu = verified değildir.

## 12. Doğrulanmış
Doğrulanmış = konum/varlık yeterli kanıtla teyit edilmiş.

Anlamına gelmez:
- bugün kesin balık var
- her koşulda güvenli
- erişim sürekli açık

Compact sheet:
- Doğrulanmış
- 3 kaynak
- 18 Ağu 2026
- Kaynakları gör

Secondary:
`Konum teyididir; balık veya güvenlik garantisi değildir.`

## 13. Spot Detail standardı
Amaç:
- broşür değil
- daha hafif
- daha app-like
- daha hızlı taranabilir
- semantik renkli
- az metinli

Hierarchy:
1. Hero
2. Spot adı
3. location + distance
4. score
5. verification
6. Quick Facts
7. Weather & Sea
8. Best Times
9. Risk/access
10. Sticky actions

### Quick Facts
Örnek:
- Balık → İstavrit
- Kıyı → Karma
- Seviye → Acemi
- Park → Var

User border isterse border kalsın; background transparent istenmişse beyaz yüzey ekleme.

### Weather & Sea
Kullanıcı 4 kart yan yana istiyorsa TAM OLARAK 4 kart tek satırda:
`Dalga | Rüzgâr | Deniz | Nem`

2x2 yapma.

Kartlar:
- eşit/uyumlu genişlik
- kompakt
- readable
- larger icons when requested
- semantic tinted surfaces

### Best Times
Kullanıcı 3 + 2 layout isterse tam olarak:
Row 1: 3
Row 2: 2

İkinci satırı görsel olarak dengeli hizala.
5 kutuyu zorla tek sıraya sıkıştırma.

### Sections removed by user
Kullanıcı `Takım`, `Notlarım`, `Yerel Raporlar` veya başka section'ı kaldır derse:
- render etme
- boş header bırakma
- boş spacing bırakma
- placeholder bırakma

### Risk/access
Kısa:
- Kaygan taş
- Akıntı
- Kolay erişim
- Park var

### Sticky actions
Öncelik:
1. Yol tarifi
2. Pusula
3. Kaydet

Offline indir secondary.

## 14. Pusula — GOLD
`reference_compass_gold.png` onaylıdır.

Sadece:
- target
- distance
- bearing
- compass
- GPS accuracy
- offline state
- car location / return

Weather, score, catches, promotion ekleme.

## 15. Screenshot acceptance
UI işi `AGENTS.md` screenshot gate geçmeden tamam değildir.

Akış:
1. user request -> checklist
2. implement
3. Fast Refresh
4. screenshot
5. every item verify
6. fix
7. repeat only as needed

Typecheck/lint görsel doğrulama değildir.

## 16. Kullanıcı ekranı açıyorsa
Kullanıcı ekranı kendisi açtığını söylediyse:
- ADB launch yok
- deep link yok
- navigation yok
- Metro restart yok
- app restart yok

Sadece:
- kod değiştir
- Fast Refresh bekle
- screenshot al
- doğrula

## 17. Localization
Mevcut i18n sistemini koru.
Hardcoded bypass yapma.
TR cihaz → Türkçe.
Unsupported locale → English fallback.

## 18. Accessibility/outdoor
- 44–48 px tap target
- güneşte okunabilirlik
- color-only status yok
- safe area
- Android system nav collision yok
- essential info truncate edilmez

## 19. Actions
Yol Tarifi:
external navigation app.

Pusula:
offline bearing utility, turn-by-turn değil.

Paylaş:
native share sheet.
Private coordinates silently share edilmez.

## 20. AI-UI anti-pattern check
Bitirmeden sor:
- her şey card mı?
- nested card var mı?
- çok fazla chip/pill var mı?
- her yüzey aynı mavi/beyaz mı?
- gereksiz icon circle var mı?
- gereksiz shadow var mı?
- screen brochure gibi mi?
- gradient/dekorasyon var mı?

Evet ise sadeleştir.

## 21. UI workflow
1. `AGENTS.md` oku
2. bu skill'i oku
3. ilgili asset'i incele
4. target screen'i incele
5. explicit user request'i checklist yap
6. yalnız requested scope'u değiştir
7. Fast Refresh
8. screenshot acceptance
9. eksikleri düzelt
10. targeted typecheck/lint
11. kısa özet
12. DUR

Yeni feature keşfetme.
Başka ekran redesign'a geçme.
EAS build başlatma.
Full E2E çalıştırma.

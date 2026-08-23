import type { SourceEvidence, SpeciesId, Spot } from "@mera/types";

const checkedAt = "2026-08-23T00:00:00Z";
const createdAt = "2026-08-23T00:00:00Z";

const osm = (kind: "node" | "way", id: number, title: string): SourceEvidence => ({
  url: `https://www.openstreetmap.org/${kind}/${id}`,
  title: `${title} — OpenStreetMap nesnesi`,
  accessedAt: checkedAt,
  evidenceType: "COORDINATE"
});

const web = (url: string, title: string, evidenceType: SourceEvidence["evidenceType"], publishedAt?: string): SourceEvidence => ({
  url,
  title,
  accessedAt: checkedAt,
  publishedAt,
  evidenceType
});

interface SeedInput {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  province: "Sakarya" | "Kocaeli" | "Düzce";
  district: string;
  coastlineType: Spot["coastlineType"];
  accessType?: Spot["accessType"];
  beginner?: Spot["beginnerSuitability"];
  hazards?: string[];
  warnings?: string[];
  prohibited?: Spot["prohibitedStatus"];
  verification?: Spot["verificationStatus"];
  confidence: number;
  species?: SpeciesId[];
  techniques?: string[];
  sources: SourceEvidence[];
  precision?: Spot["coordinatePrecision"];
  uncertaintyRadiusM?: number;
  localNames?: string[];
  terrain?: string;
  parkingNotes?: string;
}

function seed(input: SeedInput): Spot {
  return {
    id: input.id,
    canonicalName: input.name,
    localNames: input.localNames ?? [],
    coordinates: { latitude: input.latitude, longitude: input.longitude },
    coordinatePrecision: input.precision ?? "EXACT",
    uncertaintyRadiusM: input.uncertaintyRadiusM,
    province: input.province,
    district: input.district,
    country: "TR",
    coastlineType: input.coastlineType,
    accessType: input.accessType ?? "UNKNOWN",
    beginnerSuitability: input.beginner ?? "UNKNOWN",
    terrain: input.terrain ?? "Saha koşulları yerinde kontrol edilmeli",
    parkingNotes: input.parkingNotes,
    knownHazards: input.hazards ?? ["Karadeniz'de ani dalga ve akıntı değişimi olabilir"],
    accessWarnings: input.warnings ?? ["Kıyı erişimi ve güncel kısıtlar yerinde doğrulanmadı"],
    prohibitedStatus: input.prohibited ?? "UNKNOWN",
    targetSpecies: input.species ?? [],
    techniques: input.techniques ?? [],
    recommendedGearTags: [],
    sourceType: input.verification === "WEB_DISCOVERED" ? "WEB" : "GEOGRAPHIC",
    verificationStatus: input.verification ?? "POTENTIAL",
    confidenceScore: input.confidence,
    publicationLevel: "PUBLIC",
    sources: input.sources,
    createdAt,
    updatedAt: createdAt
  };
}

const kocaeliRegionalSpecies = web(
  "https://kocaeli.tarimorman.gov.tr/Belgeler/pdf_dosyalar_/Kocaeli%20%C4%B0l%20Tar%C4%B1m%20ve%20Orman%20M%C3%BCd%C3%BCrl%C3%BC%C4%9F%C3%BC%202025%20Y%C4%B1l%C4%B1%20Faaliyet%20Raporu.pdf",
  "Kocaeli İl Tarım ve Orman Müdürlüğü 2025 Faaliyet Raporu — Karadeniz kıyısı tür kayıtları",
  "FISHING",
  "2026-02-01"
);

export const SEED_SPOTS: Spot[] = [
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410001", name: "Karasu Sahili", latitude: 41.1031224, longitude: 30.7122799,
    province: "Sakarya", district: "Karasu", coastlineType: "BEACH", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.67,
    verification: "WEB_DISCOVERED", species: ["ISTAVRIT", "LUFER", "CINEKOP", "LEVREK", "ZARGANA"], techniques: ["Çapari", "Spin", "Surf"],
    sources: [osm("way", 310961004, "Karasu sahil"), web("https://yandex.com.tr/yaozet/how_to/karasu-ve-bumera-da-balik-tutma-meralari-rehberi-video-id1-qnSsC8eZ", "Karasu kıyı balık meraları video özeti", "FISHING")],
    warnings: ["Plaj kullanım yoğunluğu ve av yapılabilir alan gün/saat bazında kontrol edilmeli"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410002", name: "Karasu Büyükşehir Sahil Parkı Kıyısı", latitude: 41.1106588, longitude: 30.6924446,
    province: "Sakarya", district: "Karasu", coastlineType: "BEACH", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.46,
    sources: [osm("way", 391941024, "Karasu Büyükşehir Sahil Parkı")], parkingNotes: "Park çevresinde kamusal otopark olanakları değişebilir"
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410003", name: "Karasu Limanı Çevresi", latitude: 41.1213872, longitude: 30.6767518,
    province: "Sakarya", district: "Karasu", coastlineType: "HARBOUR", accessType: "UNKNOWN", beginner: "UNSUITABLE", prohibited: "SECURITY_AREA", confidence: 0.60,
    sources: [osm("way", 279612594, "Karasu Limanı")], hazards: ["Aktif ticari liman ve güvenlik sahası"], warnings: ["Önerilere kapalıdır; liman güvenlik sınırlarına girilmez"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410004", name: "Melenağzı Doğal Barınma Yeri", latitude: 41.0710349, longitude: 30.9698325,
    province: "Düzce", district: "Akçakoca", coastlineType: "RIVER_MOUTH", accessType: "MIXED", beginner: "CAUTION", confidence: 0.76,
    verification: "WEB_DISCOVERED", species: ["PALAMUT", "LEVREK"], techniques: ["Spin"],
    sources: [osm("node", 2800592847, "Melenağzı"), web("https://duzce.tarimorman.gov.tr/Belgeler/PLANVERAPOR/Duzce_Faaliyet_Raporu-2024.pdf", "Düzce İl Tarım ve Orman Müdürlüğü — Melenağzı doğal barınma yeri", "FISHING", "2025-10-01"), web("https://www.sakaryahaber.com/siyaset/sakarya/balikcilarin-yuzu-palamutla-guldu", "Melenağzı Balıkçı Barınağı palamut avı haberi", "FISHING", "2026-08-17")],
    hazards: ["Nehir ağzında güçlü ve değişken akıntı", "Mendirek ve tekne trafiği"], warnings: ["Tekne/barınak çalışma alanından uzak dur; kıyı avına açık bölüm yerinde kontrol edilmeli"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410005", name: "Paşalar Plajı Kıyı Bölgesi", latitude: 41.0757355, longitude: 31.0253650,
    province: "Düzce", district: "Akçakoca", coastlineType: "BEACH", accessType: "UNKNOWN", beginner: "UNKNOWN", confidence: 0.42,
    sources: [osm("node", 13429040826, "Paşalar Plajı")]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410006", name: "Karaburun Plajı Kıyı Bölgesi", latitude: 41.0729439, longitude: 31.0055840,
    province: "Düzce", district: "Akçakoca", coastlineType: "BEACH", accessType: "UNKNOWN", beginner: "UNKNOWN", confidence: 0.45,
    sources: [osm("way", 275434061, "Karaburun Plajı")]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410007", name: "Kalkın Plajı Kıyı Bölgesi", latitude: 41.0759400, longitude: 31.0442870,
    province: "Düzce", district: "Akçakoca", coastlineType: "BEACH", accessType: "UNKNOWN", beginner: "UNKNOWN", confidence: 0.42,
    sources: [osm("node", 13429040828, "Kalkın Plajı")]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410008", name: "Sardala Koyu", latitude: 41.1378669, longitude: 29.9591441,
    province: "Kocaeli", district: "Kandıra", coastlineType: "MIXED", accessType: "WALK", beginner: "UNSUITABLE", confidence: 0.48,
    sources: [osm("node", 11626627713, "Sardala Koyu"), web("https://www.kandira.bel.tr/icerik/tourism-guide", "Kandıra Belediyesi turizm rehberi", "ACCESS")],
    hazards: ["Issız/kayalık kıyı", "Ani dalga ve akıntı"], warnings: ["Erişim, özel mülkiyet ve av yapılabilirlik doğrulanmadı"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410009", name: "Bağırganlı Plajı Kıyı Bölgesi", latitude: 41.1341732, longitude: 30.0203976,
    province: "Kocaeli", district: "Kandıra", coastlineType: "MIXED", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.52,
    species: ["ISTAVRIT", "MEZGIT", "LEVREK"], sources: [osm("way", 242022215, "Bağırganlı Plajı"), kocaeliRegionalSpecies, web("https://kandira.gov.tr/kefken-limani", "Kandıra Kaymakamlığı — Bağırganlı kıyısı ve balıkçı barınağı", "ACCESS")]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410010", name: "Seyrek Koyu", latitude: 41.1363097, longitude: 30.1007507,
    province: "Kocaeli", district: "Kandıra", coastlineType: "MIXED", accessType: "WALK", beginner: "UNSUITABLE", confidence: 0.48,
    sources: [osm("node", 11595530725, "Seyrek Koyu"), web("https://www.kocaeli.bel.tr/kandira.html", "Kocaeli Büyükşehir Belediyesi Kandıra tanıtımı", "ACCESS")], hazards: ["Kayalık ve ıssız kıyı", "Falez/kenar düşme riski"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410011", name: "Sarısu Sahili", latitude: 41.1390916, longitude: 30.1490244,
    province: "Kocaeli", district: "Kandıra", coastlineType: "RIVER_MOUTH", accessType: "MIXED", beginner: "CAUTION", confidence: 0.50,
    sources: [osm("node", 9890460760, "Sarısu"), web("https://kandira.bel.tr/icerik/dogal-guzellikler", "Kandıra Belediyesi doğal güzellikler", "ACCESS")], hazards: ["Dere ağzında değişken akıntı", "Karadeniz dalgası"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410012", name: "Kerpe Koyu", latitude: 41.1535720, longitude: 30.1922191,
    province: "Kocaeli", district: "Kandıra", coastlineType: "MIXED", accessType: "MIXED", beginner: "CAUTION", confidence: 0.70,
    verification: "WEB_DISCOVERED", species: ["ISTAVRIT", "MEZGIT", "LEVREK", "PALAMUT"], techniques: ["Çapari", "Spin"],
    sources: [osm("node", 11626627712, "Kerpe Koyu"), web("https://oltaatlasi.com/meralar/kerpe-kiyilari/", "Kerpe Kıyıları balık avı rehberi", "FISHING", "2026-08-13")], warnings: ["Yüzme alanında av yapılmaz; yalnızca izinli kamusal kıyı cebi yerinde seçilmeli"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410013", name: "Kerpe Kayalıkları", latitude: 41.1595059, longitude: 30.1918369,
    province: "Kocaeli", district: "Kandıra", coastlineType: "ROCK", accessType: "WALK", beginner: "UNSUITABLE", confidence: 0.78,
    verification: "WEB_DISCOVERED", species: ["ISTAVRIT", "LUFER", "PALAMUT", "SARIKANAT"], techniques: ["Çapari", "Spin"], localNames: ["Kartal Kayaları"],
    sources: [osm("node", 5758432821, "Kerpe Kayalıkları"), web("https://kocaeliansiklopedisi.com/Default/MaddeDetay/853", "Kocaeli Ansiklopedisi — Kerpe Kayalıkları", "FISHING")], hazards: ["Falez ve kayalık zemin", "Islak kayada kayma", "Ani yükselen dalga"], warnings: ["Acemi kullanıcı önerilerine kapalı; gece kullanılmamalı"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410014", name: "Kumcağız Plajı Kıyı Bölgesi", latitude: 41.1630395, longitude: 30.2265433,
    province: "Kocaeli", district: "Kandıra", coastlineType: "BEACH", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.50,
    species: ["ISTAVRIT", "MEZGIT"], sources: [osm("node", 4385858891, "Kumcağız Plajı"), kocaeliRegionalSpecies], warnings: ["Yüzme sezonu ve kalabalık saatlerde av yapılabilirlik yerinde kontrol edilmeli"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410015", name: "Kefken Limanı Çevresi", latitude: 41.1685359, longitude: 30.2253353,
    province: "Kocaeli", district: "Kandıra", coastlineType: "HARBOUR", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.72,
    verification: "WEB_DISCOVERED", species: ["ISTAVRIT", "PALAMUT", "MEZGIT"], techniques: ["Çapari", "Spin"],
    sources: [osm("node", 4387190657, "Kefken Limanı"), web("https://kocaeliansiklopedisi.com/Default/MaddeDetay/875", "Kocaeli Ansiklopedisi — Kefken ve balıkçılık", "FISHING"), kocaeliRegionalSpecies],
    hazards: ["Aktif tekne trafiği", "Islak mendirek ve düşme riski"], warnings: ["Liman güvenlik/operasyon alanlarına girilmez; kıyıdan av izni yerinde doğrulanmalı"], prohibited: "UNKNOWN"
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410016", name: "Kovanağzı Koyu", latitude: 41.1772334, longitude: 30.2307068,
    province: "Kocaeli", district: "Kandıra", coastlineType: "MIXED", accessType: "WALK", beginner: "CAUTION", confidence: 0.49,
    species: ["ISTAVRIT", "MEZGIT"], sources: [osm("node", 11626627710, "Kovanağzı Koyu"), kocaeliRegionalSpecies, web("https://kandira.bel.tr/icerik/dogal-guzellikler", "Kandıra Belediyesi doğal güzellikler", "ACCESS")]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410017", name: "Kefken Plajı Kıyı Bölgesi", latitude: 41.1768907, longitude: 30.2323276,
    province: "Kocaeli", district: "Kandıra", coastlineType: "BEACH", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.50,
    species: ["ISTAVRIT", "MEZGIT"], sources: [osm("way", 237819154, "Kefken Plajı"), kocaeliRegionalSpecies], warnings: ["Yüzme alanında ve kalabalık saatlerde av yapılmaz"]
  }),
  seed({
    id: "0f5b9014-7bc4-4b0e-9ee4-0f1fbc410018", name: "Cebeci Sahili", latitude: 41.1882337, longitude: 30.2539718,
    province: "Kocaeli", district: "Kandıra", coastlineType: "BEACH", accessType: "VEHICLE", beginner: "CAUTION", confidence: 0.53,
    species: ["ISTAVRIT", "MEZGIT", "LEVREK"], sources: [osm("node", 14087581860, "Cebeci Sahil"), kocaeliRegionalSpecies, web("https://www.kocaeli.bel.tr/kandira.html", "Kocaeli Büyükşehir Belediyesi Kandıra tanıtımı", "ACCESS")], warnings: ["Yüzme sezonu, kamp ve kalabalık saatleri dikkate alınmalı"]
  })
];

export const SEED_VERSION = "sakarya-kocaeli-2026.08.23.1";


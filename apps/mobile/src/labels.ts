import { SPECIES } from "@mera/config";
import type { BeginnerSuitability, Spot, VerificationStatus } from "@mera/types";

export const verificationText: Record<VerificationStatus, string> = {
  VERIFIED: "Doğrulanmış",
  COMMUNITY: "Topluluk kaydı",
  WEB_DISCOVERED: "İnternet keşfi",
  POTENTIAL: "Potansiyel · doğrulanmadı"
};

export const beginnerSuitabilityText: Record<BeginnerSuitability, string> = {
  SUITABLE: "Uygun",
  CAUTION: "Dikkat gerekli",
  UNSUITABLE: "Uygun değil",
  UNKNOWN: "Bilinmiyor"
};

export const coastlineTypeText: Record<Spot["coastlineType"], string> = {
  BEACH: "Plaj",
  ROCK: "Kayalık",
  BREAKWATER: "Mendirek",
  HARBOUR: "Liman",
  RIVER_MOUTH: "Dere ağzı",
  MIXED: "Karma kıyı",
  UNKNOWN: "Kıyı tipi bilinmiyor"
};

export const accessTypeText: Record<Spot["accessType"], string> = {
  WALK: "Yürüyerek",
  VEHICLE: "Araçla",
  MIXED: "Araç ve yürüyüş",
  UNKNOWN: "Bilinmiyor"
};

export const safetyReasonText: Record<string, string> = {
  AREA_PROHIBITED: "Bu alanda avcılık yasak olarak işaretlenmiş.",
  HARBOUR_SECURITY_AREA: "Liman veya güvenlik alanı kısıtı var.",
  COORDINATE_NOT_EXACT: "Konum kesin olmadığı için sahadaki sınırlar doğrulanmalı.",
  ACCESS_CLOSED: "Erişim kapalı olarak bildirilmiş.",
  BEGINNER_UNSUITABLE: "Bu nokta acemi kullanıcı için uygun değil.",
  BEGINNER_RISKY_ROCKS: "Kayalık ve yürüyüş gerektiren erişim acemi kullanıcı için riskli.",
  WAVE_TOO_HIGH: "Dalga yüksekliği güvenlik sınırını aşıyor.",
  GUST_TOO_HIGH: "Rüzgâr hamlesi güvenlik sınırını aşıyor.",
  WAVE_CAUTION: "Dalga yüksekliği dikkat gerektiriyor.",
  GUST_CAUTION: "Rüzgâr hamlesi dikkat gerektiriyor.",
  PROHIBITION_UNKNOWN: "Güncel yasak ve izin durumu doğrulanmadı.",
  ACCESS_UNKNOWN: "Erişim durumu bilinmiyor.",
  SWIMMING_ZONE_SEASONAL_PROHIBITION: "Yüzme alanındaki dönemsel av yasağı bu tarihte geçerli.",
  SWIMMING_ZONE_STATUS_UNVERIFIED: "Yüzme alanı sınırı ve güncel yerel yasak durumu doğrulanmadan avlanma.",
  SAFETY_FLAGGED: "Güvenlik veya yasak durumu için dikkat işareti var."
};

export function safetyReasonTr(code: string): string {
  return safetyReasonText[code] ?? "Ayrıntısı henüz Türkçeleştirilmemiş bir güvenlik uyarısı var.";
}

export function speciesNameTr(value: unknown): string {
  return SPECIES.find((species) => species.id === value)?.nameTr ?? (typeof value === "string" && value ? value : "Av raporu");
}

export function catchResultTr(value: unknown): string {
  return ({ NONE: "Yok", LOW: "Az", MEDIUM: "Orta", GOOD: "İyi" } as Record<string, string>)[String(value)] ?? "Bilinmiyor";
}

export function syncStatusTr(value: string): string {
  return value === "SYNCED" ? "Senkronize" : value === "PROCESSING" ? "Gönderiliyor" : value === "BLOCKED" ? "İşlem gerekli" : "Cihazda bekliyor";
}

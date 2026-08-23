export function ageMinutes(timestamp: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 60_000));
}

export function stalenessLabelTr(timestamp?: string, now = new Date()): string {
  if (!timestamp) return "Güncel koşul verisi yok";
  const minutes = ageMinutes(timestamp, now);
  if (minutes < 15) return "Az önce güncellendi";
  if (minutes < 60) return `${minutes} dakika önce güncellendi`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce güncellendi`;
  return `${Math.floor(hours / 24)} gün önce güncellendi — eski veri`;
}


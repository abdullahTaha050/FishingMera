import type { RecentReportSummary, SpeciesId } from "@mera/types";

export interface CatchReportForSummary {
  spotId?: string;
  startedAt: string;
  targetSpecies?: string;
  caughtSpecies?: { speciesId?: string }[];
  quantity?: number;
  result?: string;
}

export function summarizeRecentReports(
  reports: CatchReportForSummary[],
  speciesId: SpeciesId,
  now: Date,
  windowDays = 90
): Map<string, RecentReportSummary> {
  const cutoff = now.getTime() - windowDays * 86_400_000;
  const summaries = new Map<string, RecentReportSummary>();
  for (const report of reports) {
    const reportTime = new Date(report.startedAt).getTime();
    if (!report.spotId || !Number.isFinite(reportTime) || reportTime < cutoff || reportTime > now.getTime()) continue;
    const relatesToSpecies = report.targetSpecies === speciesId || report.caughtSpecies?.some((item) => item.speciesId === speciesId);
    if (!relatesToSpecies) continue;
    const positive = Number(report.quantity ?? 0) > 0 || ["LOW", "MEDIUM", "GOOD"].includes(report.result ?? "NONE");
    const existing = summaries.get(report.spotId);
    summaries.set(report.spotId, {
      speciesId,
      reportCount: (existing?.reportCount ?? 0) + 1,
      positiveCount: (existing?.positiveCount ?? 0) + Number(positive),
      lastReportedAt: !existing?.lastReportedAt || report.startedAt > existing.lastReportedAt ? report.startedAt : existing.lastReportedAt
    });
  }
  return summaries;
}

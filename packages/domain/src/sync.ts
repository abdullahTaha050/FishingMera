export function retryDelayMs(attempt: number, random = Math.random()): number {
  const base = Math.min(15 * 60_000, 2 ** Math.max(0, attempt) * 1_000);
  return Math.round(base * (0.75 + random * 0.5));
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}


export const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

// When the 30-day trial launched. Users who joined earlier get their 30 days
// counted from this moment instead of from their first visit.
export const TRIAL_LAUNCH_AT = "2026-11-06T13:00:00.000Z";

export function trialStatus(createdAt: string, nowMs: number) {
  const startMs = Math.max(new Date(createdAt).getTime(), Date.parse(TRIAL_LAUNCH_AT));
  const untilMs = startMs + TRIAL_MS;
  return { active: untilMs > nowMs, untilMs };
}

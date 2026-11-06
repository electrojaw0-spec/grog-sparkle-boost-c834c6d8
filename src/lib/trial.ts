export const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

export function trialStatus(createdAt: string, nowMs: number) {
  const untilMs = new Date(createdAt).getTime() + TRIAL_MS;
  return { active: untilMs > nowMs, untilMs };
}
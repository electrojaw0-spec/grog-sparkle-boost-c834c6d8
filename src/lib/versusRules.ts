export const BATTLE_TIMES = [40, 60, 180] as const;
export const TIMED_OUT = -1;
export function battleSeconds(value: unknown): number {
  return BATTLE_TIMES.some((seconds) => seconds === value) ? Number(value) : 60;
}
export function secondsLeft(deadline: number | null, now = Date.now()): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function roundPoints(picks: [number, number], correct: number): [number, number] {
  if (picks[0] === TIMED_OUT && picks[1] === TIMED_OUT) return [0, 0];
  return [
    picks[0] === correct || picks[1] === TIMED_OUT ? 1 : 0,
    picks[1] === correct || picks[0] === TIMED_OUT ? 1 : 0,
  ];
}
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
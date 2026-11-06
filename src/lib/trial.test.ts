import { describe, expect, test } from "bun:test";
import { TRIAL_MS, trialStatus } from "./trial";

describe("one-month free trial", () => {
  const start = "2026-11-06T12:48:00.000Z";
  const startMs = Date.parse(start);
  test("lasts exactly 30 days", () => {
    expect(TRIAL_MS).toBe(2592000000);
    expect(trialStatus(start, startMs).untilMs).toBe(Date.parse("2026-12-06T12:48:00.000Z"));
  });
  test("remains active before expiry without restarting its clock", () => {
    expect(trialStatus(start, startMs + TRIAL_MS - 1)).toEqual({ active: true, untilMs: startMs + TRIAL_MS });
  });
  test("expires at the 30-day boundary", () => {
    expect(trialStatus(start, startMs + TRIAL_MS).active).toBe(false);
    expect(trialStatus(start, startMs + TRIAL_MS + 1).active).toBe(false);
  });
});
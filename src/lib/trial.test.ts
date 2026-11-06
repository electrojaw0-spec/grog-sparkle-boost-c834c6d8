import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TRIAL_LAUNCH_AT, TRIAL_MS, trialStatus } from "./trial";

describe("existing users at trial launch", () => {
  test("a device from August gets 30 days counted from the launch", () => {
    const launch = Date.parse(TRIAL_LAUNCH_AT);
    const r = trialStatus("2026-08-13T10:10:51.000Z", launch + 1000);
    assert.deepEqual(r, { active: true, untilMs: launch + TRIAL_MS });
    assert.equal(trialStatus("2026-08-13T10:10:51.000Z", launch + TRIAL_MS).active, false);
  });
});

describe("one-month free trial", () => {
  const start = "2026-11-08T12:48:00.000Z";
  const startMs = Date.parse(start);
  test("lasts exactly 30 days", () => {
    assert.equal(TRIAL_MS, 2592000000);
    assert.equal(trialStatus(start, startMs).untilMs, Date.parse("2026-12-08T12:48:00.000Z"));
  });
  test("remains active before expiry without restarting its clock", () => {
    assert.deepEqual(trialStatus(start, startMs + TRIAL_MS - 1), { active: true, untilMs: startMs + TRIAL_MS });
  });
  test("expires at the 30-day boundary", () => {
    assert.equal(trialStatus(start, startMs + TRIAL_MS).active, false);
    assert.equal(trialStatus(start, startMs + TRIAL_MS + 1).active, false);
  });
});
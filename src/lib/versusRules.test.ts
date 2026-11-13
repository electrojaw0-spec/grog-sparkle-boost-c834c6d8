import { describe, expect, it } from "vitest";
import { battleSeconds, roundPoints, secondsLeft } from "./versusRules";
describe("battle timing", () => {
  it.each([40, 60, 180])("allows the selected %i-second limit", (seconds) => {
    expect(battleSeconds(seconds)).toBe(seconds);
  });
  it("rejects other limits", () => expect(battleSeconds(20)).toBe(60));
  it("expires at the deadline and stays expired after reload", () => {
    expect(secondsLeft(40000, 39999)).toBe(1);
    expect(secondsLeft(40000, 40000)).toBe(0);
    expect(secondsLeft(40000, 80000)).toBe(0);
  });
  it("awards the opponent one point when player one times out", () => {
    expect(roundPoints([-1, 2], 0)).toEqual([0, 1]);
  });
  it("awards player one one point when player two times out", () => {
    expect(roundPoints([2, -1], 0)).toEqual([1, 0]);
  });
  it("does not double-score a correct answer and a timeout", () => {
    expect(roundPoints([0, -1], 0)).toEqual([1, 0]);
  });
  it("awards no points if neither player answers", () => {
    expect(roundPoints([-1, -1], 0)).toEqual([0, 0]);
  });
  it("keeps normal correct-answer scoring", () => {
    expect(roundPoints([0, 0], 0)).toEqual([1, 1]);
    expect(roundPoints([1, 2], 0)).toEqual([0, 0]);
  });
});
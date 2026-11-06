import { test } from "node:test";
import assert from "node:assert/strict";
import { tutorNeedsPayment } from "./tutorAccess";

test("does not demand payment while the month trial is being checked", () => {
  assert.equal(tutorNeedsPayment(false, false, 7), false);
});
test("active trial or subscriber keeps access after seven messages", () => {
  assert.equal(tutorNeedsPayment(true, true, 7), false);
});
test("expired access requires payment after seven messages", () => {
  assert.equal(tutorNeedsPayment(true, false, 7), true);
});
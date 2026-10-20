import assert from "node:assert/strict";
import test from "node:test";
import { formatUsd } from "../src/lib/formatting";

test("USD amounts use a stable dollar-first format isolated from Arabic text direction", () => {
  assert.equal(formatUsd(13.44), "\u2066$13.44\u2069");
  assert.equal(formatUsd(-0.72), "\u2066-$0.72\u2069");
  assert.equal(formatUsd(0), "\u2066$0.00\u2069");
});

test("invalid or missing currency values render as zero instead of breaking the dashboard", () => {
  assert.equal(formatUsd(undefined), "\u2066$0.00\u2069");
  assert.equal(formatUsd(Number.NaN), "\u2066$0.00\u2069");
});

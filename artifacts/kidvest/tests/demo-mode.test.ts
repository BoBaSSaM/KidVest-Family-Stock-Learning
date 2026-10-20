import assert from "node:assert/strict";
import test from "node:test";
import { demoEnabled } from "../src/lib/demo-mode";

test("public demos are enabled when Vercel has no demo flag", () => {
  assert.equal(demoEnabled({}), true);
});

test("public demos can be explicitly disabled", () => {
  assert.equal(demoEnabled({ ENABLE_DEMO: "false" }), false);
});

test("an explicit enable value keeps demo mode available", () => {
  assert.equal(demoEnabled({ ENABLE_DEMO: "true" }), true);
});

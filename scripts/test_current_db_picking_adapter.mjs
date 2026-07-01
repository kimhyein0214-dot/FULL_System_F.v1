import assert from "node:assert/strict";
import { parseItemOrderIndex } from "../src/adapters/currentDbPickingAdapter.mjs";

assert.equal(parseItemOrderIndex("1_20260630135518-43275540327_[1]", 99), 1);
assert.equal(parseItemOrderIndex("1_20260630135518-43275540327_[12]", 99), 12);
assert.equal(parseItemOrderIndex("202606290001_(3)", 99), 3);
assert.equal(parseItemOrderIndex("202606290001_4", 99), 4);

assert.equal(parseItemOrderIndex("20260629220844-14945378375", 99), null);
assert.equal(parseItemOrderIndex("525_2026062942712671", 99), null);
assert.equal(parseItemOrderIndex("", 99), null);

console.log("current DB picking adapter tests passed");

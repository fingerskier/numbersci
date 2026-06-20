import { test } from "node:test";
import assert from "node:assert/strict";
import { startAndWidth, kaprekarSteps } from "../src/kaprekar.js";

test("startAndWidth: string token width is token length (leading zeros)", () => {
  assert.deepEqual(startAndWidth("00000001"), { value: 1, width: 8 });
});

test("startAndWidth: number width is digit count", () => {
  assert.deepEqual(startAndWidth(852), { value: 852, width: 3 });
});

test("startAndWidth: negative throws", () => {
  assert.throws(() => startAndWidth(-5), /non-negative/);
});

test("3524 reaches 6174 and is fixed in 4 steps", () => {
  const { steps, ending } = kaprekarSteps("3524");
  assert.equal(ending, "fixed");
  assert.equal(steps.length, 4);
  assert.equal(steps[steps.length - 1].diff, 6174);
  assert.deepEqual(steps[0], { desc: 5432, asc: 2345, diff: 3087 });
});

test("27 (width 2) ends in a cycle", () => {
  const { ending } = kaprekarSteps("27");
  assert.equal(ending, "cycle");
});

test("1111 collapses to zero", () => {
  const { steps, ending } = kaprekarSteps("1111");
  assert.equal(ending, "zero");
  assert.equal(steps.length, 1);
  assert.equal(steps[0].diff, 0);
});

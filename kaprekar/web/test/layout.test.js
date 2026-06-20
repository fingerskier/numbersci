import { test } from "node:test";
import assert from "node:assert/strict";
import { pathGraph } from "../src/graph.js";
import { layoutPath, NODE_R } from "../src/layout.js";
import { basinGraph } from "../src/graph.js";
import { layoutBasin } from "../src/layout.js";

function finite(n) { return Number.isFinite(n); }

test("layoutPath 3524: coords finite, in bounds, self-loop flagged", () => {
  const l = layoutPath(pathGraph("3524"));
  assert.equal(l.nodes.length, 4);
  for (const n of l.nodes) {
    assert.ok(finite(n.x) && finite(n.y));
    assert.ok(n.x >= 0 && n.x <= l.w);
    assert.ok(n.y >= 0 && n.y <= l.h);
  }
  const self = l.edges.find(e => e.from === 6174 && e.to === 6174);
  assert.equal(self.kind, "self");
});

test("layoutPath 27: cycle edges flagged", () => {
  const l = layoutPath(pathGraph("27"));
  assert.ok(l.edges.every(e => finite(e.x1) && finite(e.y1) && finite(e.x2) && finite(e.y2)));
  assert.ok(l.edges.some(e => e.kind === "cycle"));
});

test("NODE_R is a positive number", () => {
  assert.ok(NODE_R > 0);
});

test("layoutBasin: deterministic finite coords in bounds", () => {
  const l = layoutBasin(basinGraph(["3524", "6174", "8352"]));
  assert.ok(l.nodes.length >= 1);
  for (const n of l.nodes) {
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(n.x >= 0 && n.x <= l.w && n.y >= 0 && n.y <= l.h);
  }
  for (const e of l.edges)
    assert.ok([e.x1, e.y1, e.x2, e.y2].every(Number.isFinite));
});

test("layoutBasin: same input gives identical coords (deterministic)", () => {
  const a = layoutBasin(basinGraph(["3524", "6174"]));
  const b = layoutBasin(basinGraph(["3524", "6174"]));
  assert.deepEqual(a.nodes, b.nodes);
});

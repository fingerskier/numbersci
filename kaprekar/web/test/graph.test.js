import { test } from "node:test";
import assert from "node:assert/strict";
import { pathGraph, basinGraph } from "../src/graph.js";

test("pathGraph 3524: 4 nodes, self-loop terminal at 6174", () => {
  const g = pathGraph("3524");
  assert.deepEqual(g.nodes.map(n => n.value), [3524, 3087, 8352, 6174]);
  assert.equal(g.edges.length, 4);
  assert.deepEqual(g.edges[g.edges.length - 1], { from: 6174, to: 6174 });
  assert.deepEqual(g.terminal, { kind: "fixed", members: [6174] });
  assert.equal(g.width, 4);
});

test("pathGraph 27: cycle members in order", () => {
  const g = pathGraph("27");
  assert.equal(g.terminal.kind, "cycle");
  assert.deepEqual(g.terminal.members, [27, 45, 9, 81, 63]);
  assert.deepEqual(g.edges[g.edges.length - 1], { from: 63, to: 27 });
});

test("pathGraph 1111: zero terminal", () => {
  const g = pathGraph("1111");
  assert.deepEqual(g.nodes.map(n => n.value), [1111, 0]);
  assert.deepEqual(g.terminal, { kind: "zero", members: [0] });
});

test("pathGraph preserves padded width", () => {
  const g = pathGraph("0081");
  assert.equal(g.width, 4);
  assert.equal(g.nodes[0].padded, "0081");
});

test("basinGraph: two starts share the 6174 attractor", () => {
  const b = basinGraph(["3524", "6174"]);
  assert.equal(b.width, 4);
  assert.equal(b.attractors.length, 1);
  assert.deepEqual(b.attractors[0], { kind: "fixed", members: [6174] });
  assert.equal(b.truncated, false);
  assert.equal(b.shown, b.total);
  assert.ok(b.nodes.some(n => n.value === 6174));
});

test("basinGraph: mixed-width tokens coerce to max width", () => {
  const b = basinGraph(["5", "852"]);
  assert.equal(b.width, 3);
  assert.ok(b.nodes.every(n => n.padded.length === 3));
});

test("basinGraph: cap truncates with a flag", () => {
  const starts = Array.from({ length: 300 }, (_, i) => String(1000 + i));
  const b = basinGraph(starts, { cap: 20 });
  assert.equal(b.truncated, true);
  assert.ok(b.shown <= 20);
  assert.ok(b.total > 20);
  // attractor members are retained even when capped
  for (const a of b.attractors)
    for (const m of a.members)
      assert.ok(b.nodes.some(n => n.value === m));
});

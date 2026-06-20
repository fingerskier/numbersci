import { test } from "node:test";
import assert from "node:assert/strict";
import { pathGraph } from "../src/graph.js";

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

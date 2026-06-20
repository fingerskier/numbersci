import { test } from "node:test";
import assert from "node:assert/strict";
import { pathGraph } from "../src/graph.js";
import { layoutPath } from "../src/layout.js";
import { renderSVG } from "../src/render.js";

function count(str, re) { return (str.match(re) || []).length; }

test("renderSVG: one circle per node, one arrow per edge", () => {
  const layout = layoutPath(pathGraph("3524"));
  const svg = renderSVG(layout);
  assert.ok(svg.startsWith("<svg"));
  assert.equal(count(svg, /<circle/g), layout.nodes.length);
  assert.equal(count(svg, /marker-end="url\(#arrow\)"/g), layout.edges.length);
});

test("renderSVG: terminal node carries the terminal class", () => {
  const svg = renderSVG(layoutPath(pathGraph("3524")));
  assert.ok(svg.includes("node terminal"));
});

test("renderSVG: labels show padded values", () => {
  const svg = renderSVG(layoutPath(pathGraph("0081")));
  assert.ok(svg.includes(">0081<"));
});

test("renderSVG: escapes special chars in node labels (innerHTML XSS sink)", () => {
  const layout = {
    w: 120, h: 120, terminal: { kind: "fixed", members: [] },
    nodes: [{ value: 1, padded: "<&>", x: 30, y: 30 }],
    edges: [],
  };
  const svg = renderSVG(layout);
  assert.ok(svg.includes("&lt;&amp;&gt;"), "label should be HTML-escaped");
  assert.ok(!svg.includes("><&><"), "raw unescaped label must not appear");
});

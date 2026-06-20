// Headless verification of the data app.js computes & renders.
// Not a unit test (kept out of `node --test` glob: *.check.mjs).
// Imports the REAL logic modules; re-implements app.js's parse + stat
// expressions VERBATIM so we verify exactly what the browser would show.
import assert from "node:assert";
import { kaprekarSteps } from "../src/kaprekar.js";
import { pathGraph, basinGraph } from "../src/graph.js";
import { layoutPath, layoutBasin } from "../src/layout.js";
import { renderSVG } from "../src/render.js";

// ---- verbatim from app.js ----
function parseBasinStarts(text) {
  text = text.trim();
  const m = text.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const lo = Math.min(+m[1], +m[2]);
    const hi = Math.max(+m[1], +m[2]);
    const out = [];
    for (let i = lo; i <= hi; i++) out.push(String(i));
    return out;
  }
  return text.split(",").map(s => s.trim()).filter(Boolean);
}
function loadFromHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("basin")) return { mode: "basin", value: params.get("basin") };
  if (params.has("n")) return { mode: "single", value: params.get("n") };
  return null;
}
function singleStats(token) {
  const { steps, ending } = kaprekarSteps(token);
  const graph = pathGraph(token);
  const svg = renderSVG(layoutPath(graph));
  const kernel =
    ending === "cycle" ? graph.terminal.members.join(" → ")
    : ending === "zero" ? "0 (repdigit)"
    : graph.terminal.members[0];
  return { steps: steps.length, ending, width: graph.width, kernel, svg };
}
function basinStats(text) {
  const starts = parseBasinStarts(text);
  const graph = basinGraph(starts, { cap: 400 });
  const svg = renderSVG(layoutBasin(graph));
  return {
    ending: graph.attractors.map(a => a.kind).join(", "),
    width: graph.width,
    kernel: graph.attractors.map(a => a.members.join("→")).join("  |  "),
    truncated: graph.truncated, shown: graph.shown, total: graph.total, svg,
  };
}
// ---- end verbatim ----

const circles = svg => (svg.match(/<circle/g) || []).length;
const ok = (name, cond) => { assert.ok(cond, name); console.log("  ok  " + name); };

// Case: 3524 -> fixed 6174 in 4 steps, width 4
let s = singleStats("3524");
ok("3524 steps=4", s.steps === 4);
ok("3524 ending=fixed", s.ending === "fixed");
ok("3524 width=4", s.width === 4);
ok("3524 kernel=6174", s.kernel === 6174);
ok("3524 svg renders circles", circles(s.svg) >= 4);
ok("3524 svg has terminal node", s.svg.includes("node terminal"));
ok("3524 svg has arrow marker", s.svg.includes("url(#arrow)"));

// Case: 27 -> cycle
s = singleStats("27");
ok("27 ending=cycle", s.ending === "cycle");
ok("27 kernel lists members with arrows", s.kernel.includes("→"));
console.log("     27 cycle members: " + s.kernel);

// Case: 1111 -> zero
s = singleStats("1111");
ok("1111 ending=zero", s.ending === "zero");
ok("1111 kernel=0 (repdigit)", s.kernel === "0 (repdigit)");

// Case: 00000001 -> width 8
s = singleStats("00000001");
ok("00000001 width=8", s.width === 8);

// Case: -5 (number) and "-5" (token) -> throws (error path)
let threw = false;
try { singleStats("-5"); } catch { threw = true; }
ok("\"-5\" token throws (inline error path)", threw);

// Basin: 1-99
let b = basinStats("1-99");
ok("basin 1-99 has attractors", b.ending.length > 0);
ok("basin 1-99 width=2", b.width === 2);
ok("basin 1-99 renders svg circles", circles(b.svg) > 0);
console.log("     basin 1-99: ending=" + b.ending + " kernel=" + b.kernel +
            " truncated=" + b.truncated + " shown=" + b.shown + "/" + b.total);

// Basin parse: list form
assert.deepStrictEqual(parseBasinStarts("12,34,56"), ["12", "34", "56"]);
ok("parseBasinStarts list form", true);
assert.deepStrictEqual(parseBasinStarts("99-1").length, 99); // order-agnostic
ok("parseBasinStarts reversed range", true);

// Hash round-trip
assert.deepStrictEqual(loadFromHash("#n=3524"), { mode: "single", value: "3524" });
assert.deepStrictEqual(loadFromHash("#basin=1-99"), { mode: "basin", value: "1-99" });
ok("loadFromHash n= and basin=", true);

console.log("\nALL APP-PIPELINE CHECKS PASSED");

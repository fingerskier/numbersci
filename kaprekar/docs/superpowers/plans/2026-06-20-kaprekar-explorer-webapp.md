# Kaprekar Explorer Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-dependency static web app that visualizes the path from a starting number to its Kaprekar kernel (fixed point) or cycle, as a directed SVG graph, plus a stats panel, shareable URL, and basin overlay.

**Architecture:** Pure client-side ES modules under `kaprekar/web/`. Pure-logic modules (`kaprekar`, `graph`, `layout`, `render`) import into both the browser and Node's `node:test` runner, so the math and layout are TDD'd. `app.js` wires the DOM. No build step, no runtime deps.

**Tech Stack:** Vanilla JavaScript (ES modules), SVG, `node:test` for tests, served locally via `python -m http.server`, deployable to GitHub Pages.

## Global Constraints

- Zero runtime dependencies; zero build step. No CDN scripts.
- Base 10 only. Width is derived from the start token (string preserves leading zeros, e.g. `"00000001"` → width 8); never passed separately. Mirrors `generate.py`.
- Negative start values throw an `Error`.
- All pure-logic modules must be importable under Node (no DOM references in `kaprekar.js`, `graph.js`, `layout.js`, `render.js`).
- Tests run with `node --test web/test/` and must pass (red/green TDD; no skipping).
- Layout output must be deterministic (no `Math.random`, no time).
- Basin node count is capped (default 400) with an explicit truncation banner — never silently truncate.
- Commit after each task.

---

### Task 1: Scaffold + Kaprekar routine (`kaprekar.js`)

**Files:**
- Create: `kaprekar/package.json`
- Create: `kaprekar/web/src/kaprekar.js`
- Test: `kaprekar/web/test/kaprekar.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `startAndWidth(start: string|number) -> { value: number, width: number }`
  - `kaprekarSteps(start: string|number) -> { steps: Array<{desc:number, asc:number, diff:number}>, ending: "fixed"|"cycle"|"zero" }`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "kaprekar-explorer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test web/test/"
  }
}
```

- [ ] **Step 2: Write the failing test**

`kaprekar/web/test/kaprekar.test.js`:

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test web/test/kaprekar.test.js`
Expected: FAIL — cannot find module `../src/kaprekar.js`.

- [ ] **Step 4: Write minimal implementation**

`kaprekar/web/src/kaprekar.js`:

```js
// Kaprekar routine, fixed-width. Port of generate.py.

export function startAndWidth(start) {
  let value, width;
  if (typeof start === "string") {
    width = start.length;
    value = parseInt(start, 10);
  } else {
    value = start;
    width = String(start).length;
  }
  if (!Number.isFinite(value)) throw new Error("start must be a number");
  if (value < 0) throw new Error("start must be non-negative");
  return { value, width };
}

export function kaprekarSteps(start) {
  const { value, width } = startAndWidth(start);
  const seen = new Map(); // value -> step index of first appearance
  const steps = [];
  let n = value;

  while (!seen.has(n)) {
    seen.set(n, steps.length);
    const s = String(n).padStart(width, "0"); // hold digit count fixed
    const chars = [...s].sort();               // ascending digit chars
    const asc = parseInt(chars.join(""), 10);
    const desc = parseInt(chars.slice().reverse().join(""), 10);
    const diff = desc - asc;
    steps.push({ desc, asc, diff });
    if (diff === 0) return { steps, ending: "zero" }; // repdigit collapse
    n = diff;
  }

  const ending = seen.get(n) === steps.length - 1 ? "fixed" : "cycle";
  return { steps, ending };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test web/test/kaprekar.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add kaprekar/package.json kaprekar/web/src/kaprekar.js kaprekar/web/test/kaprekar.test.js
git commit -m "feat(web): Kaprekar routine module with parity tests"
```

---

### Task 2: Path graph model (`pathGraph`)

**Files:**
- Create: `kaprekar/web/src/graph.js`
- Test: `kaprekar/web/test/graph.test.js`

**Interfaces:**
- Consumes: `startAndWidth`, `kaprekarSteps` from `kaprekar.js`.
- Produces:
  - `pathGraph(start: string|number) -> { nodes: Array<{value:number, padded:string}>, edges: Array<{from:number, to:number}>, terminal: {kind:"fixed"|"cycle"|"zero", members:number[]}, ending: string, width: number }`

- [ ] **Step 1: Write the failing test**

`kaprekar/web/test/graph.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/test/graph.test.js`
Expected: FAIL — cannot find module `../src/graph.js`.

- [ ] **Step 3: Write minimal implementation**

`kaprekar/web/src/graph.js`:

```js
import { startAndWidth, kaprekarSteps } from "./kaprekar.js";

export function pathGraph(start) {
  const { value, width } = startAndWidth(start);
  const { steps, ending } = kaprekarSteps(start);

  // Trajectory of values: start, then each diff.
  const values = [value];
  for (const { diff } of steps) values.push(diff);

  // Unique nodes in order of first appearance.
  const nodes = [];
  const seen = new Set();
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      nodes.push({ value: v, padded: String(v).padStart(width, "0") });
    }
  }

  // Consecutive hops, deduped.
  const edges = [];
  const edgeSeen = new Set();
  for (let i = 0; i < values.length - 1; i++) {
    const from = values[i], to = values[i + 1];
    const key = from + "->" + to;
    if (!edgeSeen.has(key)) { edgeSeen.add(key); edges.push({ from, to }); }
  }

  // Terminal description.
  let terminal;
  if (ending === "zero") {
    terminal = { kind: "zero", members: [0] };
  } else if (ending === "fixed") {
    terminal = { kind: "fixed", members: [values[values.length - 1]] };
  } else {
    const repeat = values[values.length - 1];
    const startIdx = values.indexOf(repeat);
    terminal = { kind: "cycle", members: values.slice(startIdx, values.length - 1) };
  }

  return { nodes, edges, terminal, ending, width };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/test/graph.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add kaprekar/web/src/graph.js kaprekar/web/test/graph.test.js
git commit -m "feat(web): pathGraph node-link model"
```

---

### Task 3: Basin graph model (`basinGraph`)

**Files:**
- Modify: `kaprekar/web/src/graph.js` (add `basinGraph`)
- Test: `kaprekar/web/test/graph.test.js` (append cases)

**Interfaces:**
- Consumes: `startAndWidth`, `kaprekarSteps` (already imported), `pathGraph` (same module).
- Produces:
  - `basinGraph(starts: Array<string|number>, opts?: {cap?: number}) -> { nodes: Array<{value:number, padded:string}>, edges: Array<{from:number, to:number}>, attractors: Array<{kind:string, members:number[]}>, width: number, total: number, shown: number, truncated: boolean }`

- [ ] **Step 1: Write the failing test (append to `graph.test.js`)**

```js
import { basinGraph } from "../src/graph.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/test/graph.test.js`
Expected: FAIL — `basinGraph` is not exported.

- [ ] **Step 3: Write minimal implementation (append to `graph.js`)**

```js
export function basinGraph(starts, { cap = 400 } = {}) {
  const norm = starts.map(startAndWidth);
  const width = Math.max(1, ...norm.map(n => n.width));
  const pad = v => String(v).padStart(width, "0");

  const next = new Map();          // value -> next value (out-degree 1)
  const allValues = new Set();
  const attractors = [];
  const attractorKey = new Set();

  for (const { value } of norm) {
    const g = pathGraph(pad(value)); // force the shared width via padded token
    for (const node of g.nodes) allValues.add(node.value);
    for (const e of g.edges) if (!next.has(e.from)) next.set(e.from, e.to);
    const key = g.terminal.members.slice().sort((a, b) => a - b).join(",");
    if (!attractorKey.has(key)) {
      attractorKey.add(key);
      attractors.push(g.terminal);
    }
  }

  const total = allValues.size;
  let keep = allValues;
  let truncated = false;

  if (total > cap) {
    truncated = true;
    const preds = new Map();
    for (const [from, to] of next) {
      if (!preds.has(to)) preds.set(to, []);
      preds.get(to).push(from);
    }
    keep = new Set();
    const queue = [];
    for (const a of attractors)
      for (const m of a.members) { keep.add(m); queue.push(m); }
    while (queue.length && keep.size < cap) {
      const v = queue.shift();
      for (const p of (preds.get(v) || [])) {
        if (!keep.has(p)) {
          keep.add(p);
          queue.push(p);
          if (keep.size >= cap) break;
        }
      }
    }
  }

  const nodes = [...keep].map(v => ({ value: v, padded: pad(v) }));
  const edges = [];
  for (const [from, to] of next)
    if (keep.has(from) && keep.has(to)) edges.push({ from, to });

  return { nodes, edges, attractors, width, total, shown: nodes.length, truncated };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/test/graph.test.js`
Expected: PASS (7 tests total in file).

- [ ] **Step 5: Commit**

```bash
git add kaprekar/web/src/graph.js kaprekar/web/test/graph.test.js
git commit -m "feat(web): basinGraph union model with node cap"
```

---

### Task 4: Path layout (`layoutPath`)

**Files:**
- Create: `kaprekar/web/src/layout.js`
- Test: `kaprekar/web/test/layout.test.js`

**Interfaces:**
- Consumes: `pathGraph` output shape (from `graph.js`).
- Produces:
  - `layoutPath(graph) -> { nodes: Array<{value:number, padded:string, x:number, y:number}>, edges: Array<{from:number, to:number, kind:"line"|"self"|"cycle", x1:number, y1:number, x2:number, y2:number}>, w:number, h:number, terminal: object }`
  - module constant `NODE_R = 22` (exported, reused by render).

- [ ] **Step 1: Write the failing test**

`kaprekar/web/test/layout.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathGraph } from "../src/graph.js";
import { layoutPath, NODE_R } from "../src/layout.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/test/layout.test.js`
Expected: FAIL — cannot find module `../src/layout.js`.

- [ ] **Step 3: Write minimal implementation**

`kaprekar/web/src/layout.js`:

```js
export const NODE_R = 22;
const GAP_X = 120, GAP_Y = 110, MARGIN = 48, COLS = 5;

function classifyEdge(from, to, terminalSet) {
  if (from === to) return "self";
  if (terminalSet.has(from) && terminalSet.has(to)) return "cycle";
  return "line";
}

export function layoutPath(graph) {
  const pos = new Map();
  const nodes = graph.nodes.map((node, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // serpentine rows so the chain reads continuously
    const c = row % 2 === 0 ? col : (COLS - 1 - col);
    const x = MARGIN + NODE_R + c * GAP_X;
    const y = MARGIN + NODE_R + row * GAP_Y;
    pos.set(node.value, { x, y });
    return { value: node.value, padded: node.padded, x, y };
  });

  const terminalSet = new Set(graph.terminal.members);
  const edges = graph.edges.map(e => {
    const a = pos.get(e.from), b = pos.get(e.to);
    return {
      from: e.from, to: e.to,
      kind: classifyEdge(e.from, e.to, terminalSet),
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    };
  });

  const rows = Math.max(1, Math.ceil(graph.nodes.length / COLS));
  const usedCols = Math.min(COLS, graph.nodes.length);
  const w = MARGIN * 2 + NODE_R * 2 + (Math.max(1, usedCols) - 1) * GAP_X;
  const h = MARGIN * 2 + NODE_R * 2 + (rows - 1) * GAP_Y;
  return { nodes, edges, w, h, terminal: graph.terminal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/test/layout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add kaprekar/web/src/layout.js kaprekar/web/test/layout.test.js
git commit -m "feat(web): layoutPath coordinate math"
```

---

### Task 5: Basin layout (`layoutBasin`)

**Files:**
- Modify: `kaprekar/web/src/layout.js` (add `layoutBasin`)
- Test: `kaprekar/web/test/layout.test.js` (append)

**Interfaces:**
- Consumes: `basinGraph` output shape.
- Produces:
  - `layoutBasin(graph) -> { nodes:[{value,padded,x,y}], edges:[{from,to,kind,x1,y1,x2,y2}], w, h, terminal:{kind:"basin",members:number[]}, attractors:array }`

- [ ] **Step 1: Write the failing test (append to `layout.test.js`)**

```js
import { basinGraph } from "../src/graph.js";
import { layoutBasin } from "../src/layout.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/test/layout.test.js`
Expected: FAIL — `layoutBasin` is not exported.

- [ ] **Step 3: Write minimal implementation (append to `layout.js`)**

```js
const RING = 140, R0 = 70, PAD = 48;

export function layoutBasin(graph) {
  const attractorSet = new Set();
  for (const a of graph.attractors)
    for (const m of a.members) attractorSet.add(m);

  // reverse edges: walk outward from attractors to assign BFS depth
  const preds = new Map();
  for (const e of graph.edges) {
    if (!preds.has(e.to)) preds.set(e.to, []);
    preds.get(e.to).push(e.from);
  }
  const depth = new Map();
  const queue = [];
  for (const m of attractorSet) { depth.set(m, 0); queue.push(m); }
  while (queue.length) {
    const v = queue.shift();
    for (const p of (preds.get(v) || [])) {
      if (!depth.has(p)) { depth.set(p, depth.get(v) + 1); queue.push(p); }
    }
  }
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);

  // group nodes by ring (stable order = node array order)
  const byDepth = new Map();
  for (const node of graph.nodes) {
    const d = depth.has(node.value) ? depth.get(node.value) : maxDepth + 1;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(node);
  }
  const ringCount = Math.max(maxDepth + 1, 1);
  const maxR = R0 + ringCount * RING;
  const cx = maxR + PAD, cy = maxR + PAD;

  const pos = new Map();
  const nodes = [];
  for (const [d, ring] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    ring.forEach((node, i) => {
      let x, y;
      if (d === 0 && ring.length === 1) {
        x = cx; y = cy;
      } else {
        const r = d === 0 ? R0 : R0 + d * RING;
        const ang = (2 * Math.PI * i) / ring.length;
        x = cx + r * Math.cos(ang);
        y = cy + r * Math.sin(ang);
      }
      pos.set(node.value, { x, y });
      nodes.push({ value: node.value, padded: node.padded, x, y });
    });
  }

  const edges = graph.edges.map(e => {
    const a = pos.get(e.from), b = pos.get(e.to);
    let kind = "line";
    if (e.from === e.to) kind = "self";
    else if (attractorSet.has(e.from) && attractorSet.has(e.to)) kind = "cycle";
    return { from: e.from, to: e.to, kind, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  });

  const w = cx + maxR + PAD, h = cy + maxR + PAD;
  return {
    nodes, edges, w, h,
    terminal: { kind: "basin", members: [...attractorSet] },
    attractors: graph.attractors,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/test/layout.test.js`
Expected: PASS (5 tests total in file).

- [ ] **Step 5: Commit**

```bash
git add kaprekar/web/src/layout.js kaprekar/web/test/layout.test.js
git commit -m "feat(web): layoutBasin radial layout"
```

---

### Task 6: SVG renderer (`render.js`)

**Files:**
- Create: `kaprekar/web/src/render.js`
- Test: `kaprekar/web/test/render.test.js`

**Interfaces:**
- Consumes: `layoutPath`/`layoutBasin` output, `NODE_R` from `layout.js`.
- Produces:
  - `renderSVG(layout) -> string` (a complete `<svg>...</svg>` string).

- [ ] **Step 1: Write the failing test**

`kaprekar/web/test/render.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/test/render.test.js`
Expected: FAIL — cannot find module `../src/render.js`.

- [ ] **Step 3: Write minimal implementation**

`kaprekar/web/src/render.js`:

```js
import { NODE_R } from "./layout.js";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const f = n => n.toFixed(1);

function edgeSvg(e) {
  if (e.kind === "self") {
    const x = e.x1, y = e.y1;
    const d = `M ${f(x - 8)} ${f(y - NODE_R)} C ${f(x - 46)} ${f(y - 78)}, ${f(x + 46)} ${f(y - 78)}, ${f(x + 8)} ${f(y - NODE_R)}`;
    return `<path class="edge self" d="${d}" fill="none" marker-end="url(#arrow)"/>`;
  }
  const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const x1 = e.x1 + ux * NODE_R, y1 = e.y1 + uy * NODE_R;
  const x2 = e.x2 - ux * NODE_R, y2 = e.y2 - uy * NODE_R;
  if (e.kind === "cycle") {
    const mx = (x1 + x2) / 2 - dy * 0.22, my = (y1 + y2) / 2 + dx * 0.22;
    return `<path class="edge cycle" d="M ${f(x1)} ${f(y1)} Q ${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" fill="none" marker-end="url(#arrow)"/>`;
  }
  return `<line class="edge line" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" marker-end="url(#arrow)"/>`;
}

export function renderSVG(layout) {
  const { nodes, edges, w, h, terminal } = layout;
  const termSet = new Set((terminal && terminal.members) || []);
  const defs =
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" ` +
    `markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  const edgesSvg = edges.map(edgeSvg).join("");
  const nodesSvg = nodes.map(n => {
    const cls = termSet.has(n.value) ? "node terminal" : "node";
    return `<g class="${cls}"><circle cx="${f(n.x)}" cy="${f(n.y)}" r="${NODE_R}"/>` +
      `<text x="${f(n.x)}" y="${f(n.y + 4)}" text-anchor="middle">${esc(n.padded)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}" ` +
    `class="kaprekar-graph">${defs}<g class="edges">${edgesSvg}</g>` +
    `<g class="nodes">${nodesSvg}</g></svg>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/test/render.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the whole suite**

Run: `cd kaprekar && node --test web/test/`
Expected: PASS — all files (kaprekar 6, graph 7, layout 5, render 3).

- [ ] **Step 6: Commit**

```bash
git add kaprekar/web/src/render.js kaprekar/web/test/render.test.js
git commit -m "feat(web): SVG renderer"
```

---

### Task 7: HTML shell, styles, and app wiring

**Files:**
- Create: `kaprekar/web/index.html`
- Create: `kaprekar/web/src/styles.css`
- Create: `kaprekar/web/src/app.js`

**Interfaces:**
- Consumes: `kaprekarSteps` (kaprekar.js), `pathGraph`/`basinGraph` (graph.js), `layoutPath`/`layoutBasin` (layout.js), `renderSVG` (render.js).
- Produces: the running app. No unit tests (DOM glue); verified manually in Step 5.

- [ ] **Step 1: Write `index.html`**

`kaprekar/web/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kaprekar Explorer</title>
  <link rel="stylesheet" href="src/styles.css" />
</head>
<body>
  <header>
    <h1>Kaprekar Explorer</h1>
    <p>Visualize the path from a number to its kernel or cycle.</p>
  </header>

  <form id="controls" onsubmit="return false">
    <select id="mode" aria-label="Mode">
      <option value="single">Single number</option>
      <option value="basin">Basin (many starts)</option>
    </select>
    <input id="input" type="text" placeholder="e.g. 3524 or 00000001"
           autocomplete="off" spellcheck="false" />
    <button id="run" type="submit">Explore</button>
  </form>

  <p id="error" role="alert" hidden></p>
  <p id="stat-banner" hidden></p>

  <main>
    <section id="stage" aria-label="Graph"></section>
    <aside id="stats">
      <dl>
        <dt>Steps</dt><dd id="stat-steps">—</dd>
        <dt>Ending</dt><dd id="stat-ending">—</dd>
        <dt>Kernel / cycle</dt><dd id="stat-kernel">—</dd>
        <dt>Width</dt><dd id="stat-width">—</dd>
      </dl>
    </aside>
  </main>

  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `styles.css`**

`kaprekar/web/src/styles.css`:

```css
:root {
  --bg: #0f1419; --panel: #1a2130; --ink: #e6edf3; --muted: #8b98a9;
  --node: #2b3a55; --node-stroke: #5b7fb0; --term: #d98c2b; --edge: #6b7a90;
}
* { box-sizing: border-box; }
body {
  margin: 0; font: 15px/1.5 system-ui, sans-serif;
  background: var(--bg); color: var(--ink);
}
header { padding: 20px 24px 0; }
header h1 { margin: 0; font-size: 22px; }
header p { margin: 4px 0 0; color: var(--muted); }
#controls {
  display: flex; gap: 8px; padding: 16px 24px; flex-wrap: wrap;
}
#controls select, #controls input, #controls button {
  font: inherit; padding: 8px 12px; border-radius: 8px;
  border: 1px solid #2c3645; background: var(--panel); color: var(--ink);
}
#controls input { flex: 1; min-width: 200px; }
#controls button { background: var(--node-stroke); border-color: var(--node-stroke); cursor: pointer; }
#error { color: #ff6b6b; margin: 0 24px; }
#error[hidden], #stat-banner[hidden] { display: none; }
#stat-banner { color: var(--term); margin: 0 24px; }
main { display: flex; gap: 16px; padding: 16px 24px; align-items: flex-start; flex-wrap: wrap; }
#stage { flex: 1; min-width: 320px; background: var(--panel); border-radius: 12px; padding: 12px; overflow: auto; }
#stage svg { width: 100%; height: auto; }
#stats { width: 220px; background: var(--panel); border-radius: 12px; padding: 12px 16px; }
#stats dl { margin: 0; display: grid; grid-template-columns: 1fr; gap: 2px 0; }
#stats dt { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; margin-top: 10px; }
#stats dd { margin: 0; font-variant-numeric: tabular-nums; word-break: break-word; }

.kaprekar-graph .node circle { fill: var(--node); stroke: var(--node-stroke); stroke-width: 2; }
.kaprekar-graph .node.terminal circle { fill: var(--term); stroke: #f4b860; }
.kaprekar-graph .node text { fill: var(--ink); font: 13px ui-monospace, monospace; }
.kaprekar-graph .edge { stroke: var(--edge); stroke-width: 2; }
.kaprekar-graph .edge.cycle { stroke: var(--term); }
.kaprekar-graph #arrow path { fill: var(--edge); }
```

- [ ] **Step 3: Write `app.js`**

`kaprekar/web/src/app.js`:

```js
import { kaprekarSteps } from "./kaprekar.js";
import { pathGraph, basinGraph } from "./graph.js";
import { layoutPath, layoutBasin } from "./layout.js";
import { renderSVG } from "./render.js";

const $ = sel => document.querySelector(sel);

function showError(msg) {
  const el = $("#error");
  el.textContent = msg || "";
  el.hidden = !msg;
}

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

function renderSingle(token) {
  const { steps, ending } = kaprekarSteps(token);
  const graph = pathGraph(token);
  $("#stage").innerHTML = renderSVG(layoutPath(graph));
  $("#stat-steps").textContent = steps.length;
  $("#stat-ending").textContent = ending;
  $("#stat-width").textContent = graph.width;
  $("#stat-kernel").textContent =
    ending === "cycle" ? graph.terminal.members.join(" → ")
    : ending === "zero" ? "0 (repdigit)"
    : graph.terminal.members[0];
  $("#stat-banner").hidden = true;
}

function renderBasin(text) {
  const starts = parseBasinStarts(text);
  if (!starts.length) { showError("Enter a range like 1-99 or a list like 12,34,56"); return; }
  const graph = basinGraph(starts, { cap: 400 });
  $("#stage").innerHTML = renderSVG(layoutBasin(graph));
  $("#stat-steps").textContent = "—";
  $("#stat-ending").textContent = graph.attractors.map(a => a.kind).join(", ");
  $("#stat-width").textContent = graph.width;
  $("#stat-kernel").textContent = graph.attractors.map(a => a.members.join("→")).join("  |  ");
  const banner = $("#stat-banner");
  if (graph.truncated) {
    banner.hidden = false;
    banner.textContent = `Showing ${graph.shown} of ${graph.total} nodes (capped).`;
  } else banner.hidden = true;
}

function run() {
  showError("");
  try {
    const value = $("#input").value;
    if ($("#mode").value === "basin") {
      renderBasin(value);
      location.hash = "basin=" + encodeURIComponent(value.trim());
    } else {
      const token = value.trim();
      if (!token) return;
      renderSingle(token);
      location.hash = "n=" + encodeURIComponent(token);
    }
  } catch (err) {
    showError(err && err.message ? err.message : String(err));
  }
}

function syncPlaceholder() {
  $("#input").placeholder =
    $("#mode").value === "basin" ? "1-99 or 12,34,56" : "e.g. 3524 or 00000001";
}

function loadFromHash() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (params.has("basin")) { $("#mode").value = "basin"; $("#input").value = params.get("basin"); }
  else if (params.has("n")) { $("#mode").value = "single"; $("#input").value = params.get("n"); }
}

window.addEventListener("DOMContentLoaded", () => {
  $("#run").addEventListener("click", run);
  $("#input").addEventListener("keydown", e => { if (e.key === "Enter") run(); });
  $("#mode").addEventListener("change", syncPlaceholder);
  loadFromHash();
  syncPlaceholder();
  if ($("#input").value) run();
  else { $("#input").value = "3524"; run(); } // default demo
});
```

- [ ] **Step 4: Start a local server**

Run: `cd kaprekar/web && python -m http.server 8000`
Expected: serving at `http://localhost:8000/`.

- [ ] **Step 5: Manual verification (in a browser)**

Confirm each:
- Load `http://localhost:8000/` → default `3524` renders a chain ending in a highlighted `6174` self-loop. Stats: Steps 4, Ending fixed, Kernel 6174, Width 4.
- Enter `27` → cycle ring of `27 45 9 81 63`; Ending cycle; Kernel/cycle lists members.
- Enter `1111` → two nodes into `0`; Ending zero.
- Enter `00000001` → Width 8.
- Enter `-5` → inline error, no crash.
- Switch to Basin, enter `1-99` → many paths into `495`-ish attractor; if capped, banner shows "Showing N of M nodes (capped)".
- Copy the URL after exploring `3524`, open in a new tab → same view reloads (`#n=3524`).

- [ ] **Step 6: Commit**

```bash
git add kaprekar/web/index.html kaprekar/web/src/styles.css kaprekar/web/src/app.js
git commit -m "feat(web): HTML shell, styles, and app wiring"
```

---

### Task 8: Web app README + deploy note

**Files:**
- Create: `kaprekar/web/README.md`
- Modify: `kaprekar/index.md` (add a short "Web app" pointer section)

**Interfaces:**
- Consumes: nothing. Documentation only.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Write `web/README.md`**

`kaprekar/web/README.md`:

```markdown
# Kaprekar Explorer (web)

Static, zero-dependency visualizer for Kaprekar's routine. Type a number
to see its path to a kernel (fixed point) or cycle as a directed graph.

## Run locally

ES modules need HTTP (not `file://`):

    cd kaprekar/web
    python -m http.server 8000
    # open http://localhost:8000/

## Test

    cd kaprekar
    node --test web/test/

## Features

- **Single:** type a number (leading zeros set the width, e.g. `00000001`).
- **Basin:** a range `1-99` or list `12,34,56`; all paths converge into the
  shared attractor(s). Node count is capped (400) with a truncation banner.
- **Stats:** steps, ending (fixed / cycle / zero), kernel or cycle members, width.
- **Shareable URL:** the current view is encoded in the URL hash.

## Layout

- `src/kaprekar.js` — the routine (port of `../generate.py`).
- `src/graph.js` — `pathGraph`, `basinGraph` node-link models.
- `src/layout.js` — pure SVG coordinate math.
- `src/render.js` — layout → SVG string.
- `src/app.js` — DOM wiring.

## Deploy

Static files; deployable to GitHub Pages from `kaprekar/web/`.
```

- [ ] **Step 2: Add a pointer to `index.md`**

Append to `kaprekar/index.md`:

```markdown

---

## Web app

An interactive visualizer lives in [`web/`](web/README.md): type a number
and see its path to the kernel/cycle as a directed graph. Run it with
`cd web && python -m http.server`, or open the deployed GitHub Pages build.
```

- [ ] **Step 3: Commit**

```bash
git add kaprekar/web/README.md kaprekar/index.md
git commit -m "docs(web): README and index.md pointer"
```

---

## Self-Review

**Spec coverage:**
- Static client-side, no build → Tasks 1–7 (vanilla ES modules). ✓
- Directed graph viz → Tasks 2, 4, 6. ✓
- Zero-dep hand-rolled SVG → Task 6. ✓
- Width from token / leading zeros / negative throws → Task 1. ✓
- Stats panel → Task 7 (`#stats`). ✓
- Shareable URL → Task 7 (`loadFromHash`/`location.hash`). ✓
- Basin overlay (shared width, union, cap + banner) → Tasks 3, 5, 7. ✓
- Endings fixed/cycle/zero → Tasks 1, 2. ✓
- Tests per module (node:test) → Tasks 1–6. ✓
- Deploy note → Task 8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; the only "—" strings are intentional empty-stat placeholders in the UI.

**Type consistency:**
- `pathGraph` → `{nodes:{value,padded}, edges:{from,to}, terminal:{kind,members}, ending, width}` consumed unchanged by `layoutPath`, `basinGraph`, and `app.js`.
- `layout*` → `{nodes:{value,padded,x,y}, edges:{from,to,kind,x1,y1,x2,y2}, w, h, terminal:{members}}` consumed unchanged by `renderSVG`.
- `basinGraph` → `{nodes, edges, attractors, width, total, shown, truncated}` consumed unchanged by `layoutBasin` and `app.js`.
- `NODE_R` defined in `layout.js`, imported by `render.js`. ✓
- Test counts cited in run-steps match the tests written. ✓
```

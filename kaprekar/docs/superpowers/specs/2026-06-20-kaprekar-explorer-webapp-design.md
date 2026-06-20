# Kaprekar Explorer — Web App Design

**Date:** 2026-06-20
**Project:** fingerskier/numbersci (kaprekar)
**Status:** Approved (brainstorming) — pending implementation plan

## Goal

A static web app to explore Kaprekar's routine by **visualizing the path
from a starting number to its kernel (fixed point) or cycle**. Primary
view is a directed graph: each unique value is a node, each edge points to
its next value; a fixed point renders as a self-loop, a cycle as a ring.

Reference implementation: `generate.py` (Python). The web app reimplements
the routine in JS; `generate.py` stays the canonical spec and parity oracle.

## Decisions (locked in brainstorming)

| Decision | Choice |
|---|---|
| Logic location | Pure client-side JS (no server, no build) |
| Primary viz | Directed graph (chain into terminal loop) |
| Rendering | Zero-dependency hand-rolled SVG |
| Extra features | Stats panel, shareable URL, basin overlay |
| Out of scope | Step-through animation; non-base-10; backend API |

## Architecture

Static ES-module app under `kaprekar/web/`. Zero runtime dependencies.
Pure-logic modules import into **both** the browser (`<script
type="module">`) and Node's built-in `node:test` runner, so the math and
layout are red/green TDD'd. Local dev served over HTTP (`python -m
http.server` — ES modules need a server, not `file://`). Production:
GitHub Pages.

### Directory layout

```
kaprekar/web/
  index.html
  src/
    kaprekar.js    # routine: startAndWidth, kaprekarSteps
    graph.js       # pathGraph, basinGraph (node-link model)
    layout.js      # layoutPath, layoutBasin (pure coord math)
    render.js      # renderSVG (layout -> SVG string)
    app.js         # DOM wiring, input, mode toggle, URL hash, stats
    styles.css
  test/
    kaprekar.test.js
    graph.test.js
    layout.test.js
    render.test.js
```

## Modules (one responsibility each)

### `kaprekar.js` — the routine (parity with generate.py)

- `startAndWidth(start)` → `{value, width}`.
  - String token → `width = token.length` (leading zeros count, e.g.
    `"00000001"` → width 8), `value = parseInt`.
  - Number → `width = digit count`, `value = number`.
  - Negative value → throws (mirrors Python `ValueError`).
- `kaprekarSteps(start)` → `{steps, ending}`.
  - `steps`: array of `{desc, asc, diff}` (numbers), one per iteration.
  - Each step: zero-pad current value to `width`, sort digits desc → `desc`,
    asc → `asc`, `diff = desc - asc`.
  - `ending`:
    - `"zero"` — `diff === 0` (repdigit collapse), returned immediately.
    - `"fixed"` — the repeated value first appeared on the immediately prior
      step (maps to itself).
    - `"cycle"` — repeated value first appeared earlier (loop length > 1).
  - Termination: a `seen` map `value → first step index`; stop when the next
    value is already in `seen`.

This mirrors `generate.py` line-for-line in behavior; tests assert parity.

### `graph.js` — node-link model

- `pathGraph(start)` → `{nodes, edges, terminal, ending, width}`.
  - `nodes`: ordered unique values along the trajectory, each `{value,
    padded}`.
  - `edges`: `{from, to}` for each hop (value → diff).
  - `terminal`: the fixed value, the ordered cycle members, or `0` (zero
    ending) — flagged so layout/render can draw the loop.
- `basinGraph(starts, {cap})` → `{nodes, edges, attractors, total,
  shown, truncated, width}`.
  - All `starts` normalized to one **shared width** (the max token width
    among inputs; documented in UI). Mixed widths are coerced to that width.
  - Computes the **union** of every start's trajectory → an in-tree (or
    forest) flowing into the attractor(s).
  - `cap` bounds node count (~400). When exceeded, includes nodes by BFS
    proximity to attractors, sets `truncated: true`, and reports `shown` vs
    `total`. No silent truncation.
  - `attractors`: one fixed value or cycle per connected component.

### `layout.js` — pure coordinate math

- `layoutPath(graph)` → `{nodes:[{value,x,y}], edges:[{from,to,kind}], w,
  h}`.
  - Chain laid left→right (wrapping rows if long).
  - Terminal: `kind:"self"` for a fixed point (self-loop arc), `kind:"cycle"`
    for ring edges among cycle members, `kind:"line"` otherwise.
- `layoutBasin(graph, {cap})` → same shape.
  - Attractor centered; predecessors fanned outward by BFS depth (radial or
    layered). Deterministic given input (no randomness).
- Pure functions returning data: no DOM, no SVG. Fully unit-testable
  (deterministic coords, no NaN, within `w`×`h` bounds).

### `render.js` — SVG generation

- `renderSVG(layout, opts)` → SVG string.
  - Nodes: `<circle>` + `<text>` label (padded value).
  - Edges: `<path>`/`<line>` with arrowhead marker; curved arcs for
    `self`/`cycle` kinds; terminal nodes styled distinctly.
- Pure string output → testable (assert expected circle/arrow counts,
  presence of terminal styling).

### `app.js` — wiring

- Single-number input + single/basin mode toggle.
- Pipeline: `input → kaprekar/graph → layout → render → #stage`.
- Stats panel populated from the `kaprekarSteps` result.
- URL hash sync: `#n=3524` (single) / `#basin=1-999` (basin). Hash is read
  on load and written on change so links reopen the exact view.

## Data flow

```
input ──▶ kaprekar.js / graph.js ──▶ layout.js ──▶ render.js ──▶ #stage (DOM)
                  │
                  └────────────────────────────────────▶ stats panel
input  ⇄  URL hash
```

## Stats panel

- Steps-to-converge (count).
- Ending type: `fixed` / `cycle` / `zero`.
- Kernel value (fixed) or ordered cycle members.
- Width in use.

## Error handling

- Non-numeric or negative input → inline message near the field; no crash,
  no render.
- Empty input → no-op.
- Single-path convergence is naturally bounded (routine converges quickly).
- Basin bounded by `cap` with the truncation banner.

## Testing (TDD, `node:test`, zero deps)

Order: write failing test → implement → green, per module.

- `kaprekar.test.js` — parity oracle cases:
  - `3524` → ending `fixed`, reaches `6174`, 4 steps.
  - `27` → ending `cycle`.
  - `1111` → ending `zero`.
  - `"00000001"` → width 8.
  - negative start → throws.
- `graph.test.js` — `pathGraph` nodes/edges/terminal correctness;
  `basinGraph` union size, attractor detection, cap + truncation flag.
- `layout.test.js` — deterministic coords, no NaN, in-bounds, loop edges
  carry the right `kind`.
- `render.test.js` — SVG contains expected circle count, arrowheads, and
  terminal styling.

## Deployment

Static files. Served locally via `python -m http.server` (ES modules
require HTTP). Deployable as-is to GitHub Pages from `kaprekar/web/`.

## Out of scope (YAGNI)

- Step-through play/pause animation.
- Bases other than 10.
- Any server/API or build tooling (bundler, transpiler).
- Persisting history beyond the URL hash.

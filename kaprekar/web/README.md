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
    npm test

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

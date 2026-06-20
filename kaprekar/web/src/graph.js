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

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

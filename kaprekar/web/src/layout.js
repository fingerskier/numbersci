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

  const terminalSet = new Set((graph.terminal && graph.terminal.members) || []);
  const edges = graph.edges.map(e => {
    const a = pos.get(e.from), b = pos.get(e.to);
    if (!a || !b) throw new Error(`layoutPath: edge ${e.from}->${e.to} references a node with no position`);
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

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

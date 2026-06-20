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

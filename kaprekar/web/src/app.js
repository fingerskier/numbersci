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

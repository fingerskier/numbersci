// Kaprekar routine, fixed-width. Port of generate.py.

export function startAndWidth(start) {
  let value, width;
  if (typeof start === "string") {
    value = parseInt(start, 10);
    if (!Number.isFinite(value)) throw new Error("start must be a number");
    if (value < 0) throw new Error("start must be non-negative");
    width = start.length;
  } else {
    value = start;
    if (!Number.isFinite(value)) throw new Error("start must be a number");
    if (value < 0) throw new Error("start must be non-negative");
    width = String(value).length;
  }
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

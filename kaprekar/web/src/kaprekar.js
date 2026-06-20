// Kaprekar routine, fixed-width. Port of generate.py.

// Beyond Number.MAX_SAFE_INTEGER (~16 digits) the digit subtraction loses
// precision and would diverge from generate.py's arbitrary-precision ints.
// Reject wider starts rather than silently return wrong digits.
const MAX_WIDTH = 15;

export function startAndWidth(start) {
  let value, width;
  if (typeof start === "string") {
    const token = start.trim();
    // Strict, mirroring Python int(): reject anything not all-digits.
    // parseInt would silently accept "12abc" -> 12 (and a wrong width), "0x1F" -> 0, etc.
    if (!/^\d+$/.test(token)) throw new Error("start must be a non-negative integer");
    value = parseInt(token, 10);
    width = token.length; // leading zeros count toward width
  } else {
    value = start;
    if (!Number.isFinite(value)) throw new Error("start must be a number");
    if (value < 0) throw new Error("start must be non-negative");
    if (!Number.isInteger(value)) throw new Error("start must be an integer");
    width = String(value).length;
  }
  if (width > MAX_WIDTH) throw new Error(`width ${width} exceeds the ${MAX_WIDTH}-digit precision limit`);
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

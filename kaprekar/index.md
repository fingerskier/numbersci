# The Kaprekar Process

Named for Indian mathematician **D. R. Kaprekar** (1949). A
deterministic routine on the digits of a number that, under fixed
digit-width, drives almost every starting value toward a **fixed
point** (a *Kaprekar constant*) or a short repeating **cycle**.

This repo (`generate.py`) runs the routine for numbers of arbitrary
digit-length and emits CSV.

---

## The Routine

Given a number with a fixed digit-width `w`:

1. Write the number with exactly `w` digits — **zero-pad** if short.
2. **Descending** sort of the digits → big number `D`.
3. **Ascending** sort of the digits → small number `A`.
4. **Subtract**: `diff = D - A`.
5. `diff` becomes the next number. Go to step 1.

Repeat until a value repeats. Width never changes — that fix-up
(zero-padding) is the whole game. Drop it and the routine drifts and
convergence breaks.

### Worked example — 3524 (width 4)

| step | desc | asc  | diff |
|-----:|-----:|-----:|-----:|
| 0    | 5432 | 2345 | 3087 |
| 1    | 8730 | 0378 | 8352 |
| 2    | 8532 | 2358 | 6174 |
| 3    | 7641 | 1467 | 6174 |

Hits **6174**, then maps to itself. Done.

---

## Endings

Three terminal outcomes:

- **`fixed`** — last `diff` maps to itself. A Kaprekar constant.
- **`cycle`** — enters a repeating loop of length > 1.
- **`zero`** — collapses to 0. Happens for **repdigits** (all digits
  same, e.g. `1111`): `D == A`, so `diff == 0` at once.

Detection: keep a `seen` map of `value → step index`. When the next
value is already seen, stop. If it first appeared on the **immediately
prior** step → `fixed`; otherwise → `cycle`. A `diff == 0` short-circuits
to `zero`.

---

## Kaprekar Constants by Width

The famous attractors:

| width | constant | notes |
|------:|---------:|-------|
| 3     | **495**  | all non-repdigit 3-digit numbers reach it |
| 4     | **6174** | "Kaprekar's constant" — all non-repdigit 4-digit numbers reach it (≤ 7 steps) |

For most **other** widths there is **no single constant** — the routine
lands in one of several cycles (or multiple fixed points) depending on
the start. E.g. width 2 has no fixed point; it cycles through
`(9 81 63 27 45 9 …)`-style loops. Width 5 has no single constant
either. This is why the tool reports `cycle` as a first-class outcome.

---

## Width Handling (this implementation)

Width is **always derived from the start token**, never passed
separately:

- **int** input → width = its digit count. `852` ⇒ width 3.
- **string** input → width = token length, so **leading zeros count**.
  `"00000001"` ⇒ width 8.

The CLI keeps argv as strings so leading zeros set width:

```
python generate.py 00000001 3524 852
```

No args → built-in demo starts: `3524, 852, 85310, 1111, 123456, 8730`.

---

## CSV Output

One row per step. Columns:

| column   | meaning |
|----------|---------|
| `start`  | normalized integer start value |
| `width`  | fixed digit-width for the run |
| `step`   | iteration index (0-based) |
| `desc`   | digits sorted descending |
| `asc`    | digits sorted ascending |
| `diff`   | `desc - asc` (next value) |
| `ending` | `fixed` / `cycle` / `zero` for the whole run |

`ending` is constant across all rows of one start — it describes how
that progression terminated.

---

## API

- `kaprekar_steps(start)` → `(steps, ending)`. `steps` is a list of
  `(desc, asc, diff)` ints.
- `progression_rows(start)` → list of dict rows (csv-ready).
- `write_csv(starts, out)` → writes header + all rows to file-like `out`.
- `_start_and_width(start)` → `(value, width)` normalizer.

Start must be non-negative; negative raises `ValueError`.

---

## Why It Converges (intuition)

`D - A` is divisible by 9 (digit sums equal, difference of permutations).
The map is non-expanding on the fixed-width digit space and the space is
finite — so every orbit must eventually repeat. The only question is
*which* attractor: a fixed point, a cycle, or zero.

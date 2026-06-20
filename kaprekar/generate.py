#!/usr/bin/env python3
"""
Kaprekar routine progressions for numbers of arbitrary digit-length.

Each step sorts the digits of the current value descending and ascending,
then subtracts (small from big). The difference becomes the next value.
The digit count is held fixed via zero-padding -- this is essential, or the
routine drifts and convergence breaks.

`width` is always gleaned from the digit-length of the start number.

Output is CSV: one row per step, with columns
    start,width,step,desc,asc,diff,ending
"""

from __future__ import annotations

import csv
import sys

FIELDNAMES = ["start", "width", "step", "desc", "asc", "diff", "ending"]


def kaprekar_steps(start: int):
    """
    Run Kaprekar's routine from `start`, padded to the digit-length of `start`.

    Returns (steps, ending):
      steps  = list of (desc, asc, diff) ints, one per iteration
      ending = "fixed" -> last diff maps to itself (a Kaprekar constant)
               "cycle" -> entered a repeating loop of length > 1
               "zero"  -> collapsed to 0 (repdigit input)
    """
    if start < 0:
        raise ValueError("start must be non-negative")
    width = len(str(start))

    seen: dict[int, int] = {}            # value -> step index of first appearance
    steps: list[tuple[int, int, int]] = []
    n = start

    while n not in seen:
        seen[n] = len(steps)
        s = str(n).zfill(width)          # pad so digit count stays fixed
        desc = int("".join(sorted(s, reverse=True)))
        asc = int("".join(sorted(s)))
        diff = desc - asc
        steps.append((desc, asc, diff))
        if diff == 0:                    # repdigit collapse
            return steps, "zero"
        n = diff

    ending = "fixed" if seen[n] == len(steps) - 1 else "cycle"
    return steps, ending


def progression_rows(start: int) -> list[dict]:
    """Return one dict row per step for `start`, ready for csv.DictWriter."""
    steps, ending = kaprekar_steps(start)
    width = len(str(start))
    return [
        {
            "start": start,
            "width": width,
            "step": i,
            "desc": desc,
            "asc": asc,
            "diff": diff,
            "ending": ending,
        }
        for i, (desc, asc, diff) in enumerate(steps)
    ]


def write_csv(starts, out) -> None:
    """Write CSV rows for each start in `starts` to file-like `out`."""
    writer = csv.DictWriter(out, fieldnames=FIELDNAMES)
    writer.writeheader()
    for start in starts:
        writer.writerows(progression_rows(start))


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        starts = [int(a) for a in sys.argv[1:]]
    else:
        starts = [3524, 852, 85310, 1111, 123456, 8730]
    write_csv(starts, sys.stdout)

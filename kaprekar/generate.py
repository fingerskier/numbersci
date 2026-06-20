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


def _start_and_width(start):
    """
    Normalize a start value into (int_value, width).

    `start` may be an int (width = its digit count) or a string token
    (width = the token length, so leading zeros like "00000001" set width 8).
    """
    if isinstance(start, str):
        width = len(start)
        value = int(start)
    else:
        value = start
        width = len(str(start))
    if value < 0:
        raise ValueError("start must be non-negative")
    return value, width


def kaprekar_steps(start):
    """
    Run Kaprekar's routine from `start`, padded to `width` digits.

    `start` may be an int or a string token; a string preserves leading
    zeros so e.g. "00000001" runs at width 8.

    Returns (steps, ending):
      steps  = list of (desc, asc, diff) ints, one per iteration
      ending = "fixed" -> last diff maps to itself (a Kaprekar constant)
               "cycle" -> entered a repeating loop of length > 1
               "zero"  -> collapsed to 0 (repdigit input)
    """
    start, width = _start_and_width(start)

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
    value, width = _start_and_width(start)
    steps, ending = kaprekar_steps(start)
    return [
        {
            "start": value,
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
        starts = sys.argv[1:]          # keep as strings so leading zeros set width
    else:
        starts = [3524, 852, 85310, 1111, 123456, 8730]
    write_csv(starts, sys.stdout)

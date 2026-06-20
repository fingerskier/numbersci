#!/usr/bin/env python3
"""
Kaprekar routine progressions for numbers of arbitrary digit-length.

Each step sorts the digits of the current value descending and ascending,
then subtracts (small from big). The difference becomes the next value.
The digit count is held fixed via zero-padding -- this is essential, or the
routine drifts and convergence breaks.

Notation (e.g. a 5-digit start):
    5:[85310,01358,83952]->[98532,23589,74943]->...
Each bracketed triple is [descending, ascending, difference].
"""

from __future__ import annotations


def kaprekar_steps(start: int, width: int | None = None):
    """
    Run Kaprekar's routine from `start`, padded to `width` digits
    (default: the digit-length of `start`).

    Returns (steps, ending):
      steps  = list of (desc, asc, diff) ints, one per iteration
      ending = "fixed" -> last diff maps to itself (a Kaprekar constant)
               "cycle" -> entered a repeating loop of length > 1
               "zero"  -> collapsed to 0 (repdigit input)
    """
    if width is None:
        width = len(str(start))
    if start < 0 or len(str(start)) > width:
        raise ValueError("start must be non-negative and fit within `width` digits")

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


def format_progression(start: int, width: int | None = None) -> str:
    """Render a progression in [desc,asc,diff]->... notation."""
    if width is None:
        width = len(str(start))
    steps, ending = kaprekar_steps(start, width)
    pad = lambda v: str(v).zfill(width)
    triples = [f"[{pad(d)},{pad(a)},{pad(x)}]" for (d, a, x) in steps]
    tag = {"fixed": "  (fixed point)",
           "cycle": "  (enters cycle)",
           "zero":  "  (collapses to 0)"}[ending]
    return f"{width}:" + "->".join(triples) + tag


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 2:
        start = int(sys.argv[1])
        width = int(sys.argv[2]) if len(sys.argv) >= 3 else None
        print(format_progression(start, width))
    else:
        demos = [
            (3524,   None),   # classic 4-digit -> 6174
            (852,    None),   # 3-digit -> 495
            (85310,  None),   # your 5-digit example
            (1111,   None),   # repdigit -> 0
            (123456, None),   # 6-digit
            (8730,   4),      # width override demo
        ]
        for start, width in demos:
            print(format_progression(start, width))

#!/usr/bin/env python3
"""Tests for generate.py."""

import csv
import io

import generate


def test_width_gleaned_from_start_length():
    # 852 -> width 3, classic 3-digit Kaprekar constant 495
    steps, ending = generate.kaprekar_steps(852)
    assert ending == "fixed"
    assert steps[-1][2] == 495


def test_width_gleaned_pads_leading_zero_start():
    # 8730 is 4 digits -> width 4 -> reaches 6174
    steps, ending = generate.kaprekar_steps(8730)
    assert ending == "fixed"
    assert steps[-1][2] == 6174


def test_csv_rows_one_per_step():
    rows = generate.progression_rows(852)
    assert rows[0] == {
        "start": 852,
        "width": 3,
        "step": 0,
        "desc": 852,
        "asc": 258,
        "diff": 594,
        "ending": "fixed",
    }
    # every row carries start/width/ending; step increments
    assert [r["step"] for r in rows] == list(range(len(rows)))
    assert all(r["start"] == 852 and r["width"] == 3 for r in rows)
    assert rows[-1]["diff"] == 495


def test_write_csv_emits_header_and_rows():
    buf = io.StringIO()
    generate.write_csv([852], buf)
    buf.seek(0)
    reader = list(csv.DictReader(buf))
    assert reader[0]["start"] == "852"
    assert reader[0]["width"] == "3"
    assert reader[-1]["diff"] == "495"


def test_width_from_literal_token_with_leading_zeros():
    # "00000001" is 8 chars -> width 8 -> desc 10000000
    rows = generate.progression_rows("00000001")
    assert rows[0]["width"] == 8
    assert rows[0]["start"] == 1
    assert rows[0]["desc"] == 10000000


def test_write_csv_multiple_starts():
    buf = io.StringIO()
    generate.write_csv([852, 3524], buf)
    buf.seek(0)
    reader = list(csv.DictReader(buf))
    starts = {r["start"] for r in reader}
    assert starts == {"852", "3524"}

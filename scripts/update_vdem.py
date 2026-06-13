#!/usr/bin/env python3
"""
Fetch V-Dem liberal democracy index (via Our World in Data's maintained CSV,
CC BY) for 2016..latest and write data/vdem.json:
  { "2016": { "United States": 81, ... }, ... }   (scores as 0-100)
Updates automatically when OWID/V-Dem release new years. Fails safe.
"""

import csv, io, json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from update_power import NAME_BY_ISO3

URL = "https://ourworldindata.org/grapher/liberal-democracy-index.csv"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "vdem.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
FROM_YEAR = 2016


def main():
    try:
        req = urllib.request.Request(URL, headers=UA)
        with urllib.request.urlopen(req, timeout=120) as r:
            text = r.read().decode("utf-8")
    except Exception as e:
        print("V-Dem fetch failed - leaving existing file untouched:", e)
        sys.exit(0)

    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 2:
        print("Empty CSV - leaving existing file untouched.")
        sys.exit(0)
    header = rows[0]
    # columns: Entity, Code, Year, <score column>
    try:
        i_code, i_year = header.index("Code"), header.index("Year")
    except ValueError:
        print("Unexpected header:", header)
        sys.exit(0)
    i_val = len(header) - 1

    out = {}
    for row in rows[1:]:
        if len(row) <= i_val:
            continue
        code, year, val = row[i_code], row[i_year], row[i_val]
        if not code or code not in NAME_BY_ISO3 or not val:
            continue
        try:
            y, v = int(year), float(val)
        except ValueError:
            continue
        if y < FROM_YEAR:
            continue
        out.setdefault(str(y), {})[NAME_BY_ISO3[code]] = round(v * 100, 1)

    if not out:
        print("No values parsed - leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"), sort_keys=True)
    years = sorted(out.keys())
    print("Wrote V-Dem libdem for", years[0], "-", years[-1],
          "(", len(out[years[-1]]), "countries latest )")


if __name__ == "__main__":
    main()

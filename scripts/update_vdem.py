#!/usr/bin/env python3
"""
Fetch two V-Dem metrics (via Our World in Data's maintained CSVs, CC BY) for
2016..latest and write data/vdem.json with both indices keyed by year:

  {
    "libdem": { "2016": { "United States": 81, ... }, ... },   # liberal democracy
    "freexp": { "2016": { "United States": 88, ... }, ... }    # freedom of expression
  }

Scores are rescaled from 0-1 to 0-100. Updates automatically when OWID/V-Dem
release new years. Fails safe: if a fetch breaks, the previous file is left
untouched and the other metric's update still happens.
"""

import csv, io, json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from update_power import NAME_BY_ISO3

SOURCES = [
    ("libdem", "https://ourworldindata.org/grapher/liberal-democracy-index.csv", "democracy"),
    ("freexp", "https://ourworldindata.org/grapher/freedom-of-expression-index.csv", "expression"),
]
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "vdem.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
FROM_YEAR = 2016


def fetch_metric(url, score_substr):
    """Returns { year_str: { country_name: score_0_100 } } or None on failure."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=120) as r:
            text = r.read().decode("utf-8")
    except Exception as e:
        print("fetch failed for", url, ":", e)
        return None

    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 2:
        print("empty CSV from", url)
        return None
    header = rows[0]
    try:
        i_code, i_year = header.index("Code"), header.index("Year")
    except ValueError:
        print("unexpected header:", header)
        return None
    # match the score column by substring so OWID column renames don't break us
    i_val = next((i for i, h in enumerate(header)
                  if score_substr in (h or "").lower()), -1)
    if i_val < 0:
        print("could not locate score column (looking for", repr(score_substr), ") in:", header)
        return None
    print("using column", i_val, "as score:", header[i_val], "from", url)

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
    return out


def main():
    # start from the previous file so a transient failure on one metric doesn't
    # wipe the other's prior values.
    bundle = {}
    if os.path.exists(OUT):
        try:
            with open(OUT) as f:
                prev = json.load(f)
            # migrate the old flat-by-year shape ({year: {country: score}}) to
            # the new nested shape — old files are libdem only.
            if prev and all(k.isdigit() for k in prev.keys()):
                bundle["libdem"] = prev
            elif isinstance(prev, dict):
                bundle.update(prev)
        except Exception as e:
            print("could not read existing vdem.json, starting fresh:", e)

    any_new = False
    for key, url, substr in SOURCES:
        data = fetch_metric(url, substr)
        if data:
            bundle[key] = data
            any_new = True
        else:
            print("keeping previous", key, "values" if key in bundle else "(none)")

    if not bundle:
        print("No values parsed and no prior file - nothing to write.")
        sys.exit(0)
    if not any_new and os.path.exists(OUT):
        print("No new data - leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump(bundle, f, separators=(",", ":"), sort_keys=True)

    for key in bundle:
        years = sorted(bundle[key].keys())
        if years:
            latest = years[-1]
            print("wrote", key, years[0], "-", latest,
                  "(", len(bundle[key][latest]), "countries latest )")


if __name__ == "__main__":
    main()

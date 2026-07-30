#!/usr/bin/env python3
"""
Fetch the V-Dem core indices (via Our World in Data's maintained CSVs, CC BY)
for 2016..latest and write data/vdem.json keyed by metric, then year:

  {
    "libdem":    { "2016": { "United States": 81, ... }, ... },  # liberal democracy
    "polyarchy": { "2016": { "United States": 86, ... }, ... },  # electoral democracy
    "partipdem": { ... },                                        # participatory
    "delibdem":  { ... },                                        # deliberative
    "egaldem":   { ... },                                        # egalitarian
    "freexp":    { ... },                                        # freedom of expression
    "regime":    { "2016": { "United States": 3, ... }, ... }    # regimes of the world
  }

Index scores are rescaled from 0-1 to 0-100 (they are interval scales, NOT
percentages or percentiles - the x100 is a rendering convenience only).

"regime" is categorical and passes through unscaled:
  0 closed autocracy · 1 electoral autocracy
  2 electoral democracy · 3 liberal democracy

Updates automatically when OWID/V-Dem release new years. Fails safe: if a fetch
breaks, the previous file is left untouched and every other metric still updates.
"""

import csv, io, json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from update_power import NAME_BY_ISO3

# (key, url, score-column substring, scale factor)
# The substring is matched against the CSV header to survive OWID column
# renames. Four of these files use a column containing "democracy", but each
# CSV has only one score column, so the match stays unambiguous within a file.
SOURCES = [
    ("libdem",    "https://ourworldindata.org/grapher/liberal-democracy-index.csv",       "liberal democracy",       100),
    ("polyarchy", "https://ourworldindata.org/grapher/electoral-democracy-index.csv",     "electoral democracy",     100),
    ("partipdem", "https://ourworldindata.org/grapher/participatory-democracy-index.csv", "participatory democracy", 100),
    ("delibdem",  "https://ourworldindata.org/grapher/deliberative-democracy-index.csv",  "deliberative democracy",  100),
    ("egaldem",   "https://ourworldindata.org/grapher/egalitarian-democracy-index.csv",   "egalitarian democracy",   100),
    ("freexp",    "https://ourworldindata.org/grapher/freedom-of-expression-index.csv",   "expression",              100),
    ("regime",    "https://ourworldindata.org/grapher/political-regime.csv",              "regime",                    1),
]

# Fallback substrings, tried in order if the primary substring misses. OWID has
# renamed these columns before (e.g. "Liberal democracy index" -> "libdem_vdem_owid").
FALLBACK_SUBSTRS = ["democracy", "index", "vdem"]
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "vdem.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
FROM_YEAR = 2016


def fetch_metric(url, score_substr, scale=100):
    """Returns { year_str: { country_name: value } } or None on failure.

    scale=100 rescales a 0-1 index to 0-100 and rounds to 1dp.
    scale=1 passes a categorical code straight through as an int.
    """
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
    # match the score column by substring so OWID column renames don't break us.
    # Entity/Code/Year are never the score; excluding them lets the generic
    # fallbacks ("index", "vdem") run without ever binding to a key column.
    SKIP = {"entity", "code", "year"}
    candidates = [i for i, h in enumerate(header) if (h or "").lower() not in SKIP]

    i_val = -1
    for substr in [score_substr] + FALLBACK_SUBSTRS:
        i_val = next((i for i in candidates
                      if substr in (header[i] or "").lower()), -1)
        if i_val >= 0:
            break
    # last resort: exactly one non-key column means it can only be the score
    if i_val < 0 and len(candidates) == 1:
        i_val = candidates[0]

    if i_val < 0:
        print("could not locate score column (looking for", repr(score_substr), ") in:", header)
        return None
    print("using column", i_val, "as score:", repr(header[i_val]), "from", url)

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
        out.setdefault(str(y), {})[NAME_BY_ISO3[code]] = (
            round(v * scale, 1) if scale != 1 else int(v)
        )
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
    for key, url, substr, scale in SOURCES:
        data = fetch_metric(url, substr, scale)
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

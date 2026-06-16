#!/usr/bin/env python3
"""
Pull real Strait of Hormuz / Strait of Malacca / Bab-el-Mandeb traffic from
IMF PortWatch, compute each metric as a % of a pre-war baseline
(1 Jan - 27 Feb 2026), and write data/energy/chokepoint_series.json in the
schema the Geostrat map expects. Source: IMF PortWatch, Daily Chokepoint
Transit Calls and Trade Volume Estimates. No API key. Pure standard library.

Metrics: all = n_total ; tanker = n_tanker (ship count) ;
tanker_capacity = capacity_tanker (best OIL-volume proxy).
For the oil story, lead with tanker / tanker_capacity, NOT all.
"""

import json
import os
import statistics
import datetime as dt
import urllib.parse
import urllib.request

BASE = ("https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/"
        "Daily_Chokepoints_Data/FeatureServer/0/query")

WANT = {"hormuz": "hormuz", "malacca": "malacca", "babelmandeb": "mandeb"}

BASELINE_START = dt.date(2026, 1, 1)
BASELINE_END = dt.date(2026, 2, 27)   # war begins 28 Feb 2026
FIELDS = ("all", "tanker", "tanker_capacity")


def fetch_all():
    rows, offset = [], 0
    while True:
        params = {
            "where": "date >= timestamp '2026-01-01 00:00:00'",
            "outFields": "date,portid,portname,n_total,n_tanker,capacity_tanker",
            "orderByFields": "date ASC",
            "resultOffset": offset,
            "resultRecordCount": 2000,
            "f": "json",
        }
        url = BASE + "?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=120) as r:
            data = json.load(r)
        feats = data.get("features", [])
        if not feats:
            break
        rows.extend(f["attributes"] for f in feats)
        if len(feats) < 2000:
            break
        offset += 2000
    return rows


def to_date(v):
    # PortWatch sometimes returns epoch-ms ints, sometimes ISO strings.
    if isinstance(v, (int, float)):
        return dt.datetime.utcfromtimestamp(v / 1000).date()
    if isinstance(v, str):
        return dt.date.fromisoformat(v[:10])
    raise TypeError("Unrecognized date value: %r" % (v,))


def build():
    rows = fetch_all()
    if not rows:
        raise SystemExit("No records returned - check the endpoint / date filter.")

    series = {k: [] for k in WANT}
    for a in rows:
        name = (a.get("portname") or "").lower()
        for key, needle in WANT.items():
            if needle in name:
                series[key].append({
                    "date": to_date(a["date"]).isoformat(),
                    "all": a.get("n_total"),
                    "tanker": a.get("n_tanker"),
                    "tanker_capacity": a.get("capacity_tanker"),
                })

    out = {"generated": dt.date.today().isoformat()}

    for key, recs in series.items():
        if not recs:
            out[key] = None
            print(f"WARNING: no records matched for '{key}'")
            continue
        recs.sort(key=lambda x: x["date"])

        def baseline(field):
            vals = [r[field] for r in recs
                    if r[field] is not None
                    and BASELINE_START <= dt.date.fromisoformat(r["date"]) <= BASELINE_END]
            return round(statistics.mean(vals), 1) if vals else None
        base = {f: baseline(f) for f in FIELDS}

        def pct(rec):
            res = {}
            for f in FIELDS:
                b, v = base[f], rec[f]
                res[f + "_pct"] = round(100 * v / b) if (b and v is not None and b > 0) else None
            return res

        latest = recs[-1]

        def at_offset(days):
            target = dt.date.fromisoformat(latest["date"]) - dt.timedelta(days=days)
            cand = [r for r in recs if dt.date.fromisoformat(r["date"]) <= target]
            return cand[-1] if cand else None
        m30, m60 = at_offset(30), at_offset(60)

        deltas = {
            "prewar": {"date": BASELINE_END.isoformat(),
                       "all_pct": 100, "tanker_pct": 100, "tanker_capacity_pct": 100},
            "minus60d": ({"date": m60["date"], **pct(m60)} if m60 else None),
            "minus30d": ({"date": m30["date"], **pct(m30)} if m30 else None),
            "latest": {"date": latest["date"], **pct(latest)},
        }
        out[key] = {"baseline": base, "series": recs, "deltas": deltas}

    os.makedirs("data/energy", exist_ok=True)
    with open("data/energy/chokepoint_series.json", "w") as f:
        json.dump(out, f, indent=2)

    print("\nWrote data/energy/chokepoint_series.json\n")
    print(f"{'chokepoint':12s} {'latest':>11s}   all%   tanker%   tankerCap%   (of pre-war baseline)")
    for key in WANT:
        if not out.get(key):
            continue
        d = out[key]["deltas"]["latest"]
        print(f"{key:12s} {d['date']:>11s}  {str(d['all_pct']):>4s}   {str(d['tanker_pct']):>6s}    "
              f"{str(d['tanker_capacity_pct']):>7s}")


if __name__ == "__main__":
    build()

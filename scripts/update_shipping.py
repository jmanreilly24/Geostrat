#!/usr/bin/env python3
"""
Fetch recent chokepoint transit counts from IMF PortWatch (free ArcGIS feature
service, updated weekly on Tuesdays) and write data/portwatch.json:
one point per chokepoint with its latest 7-day average daily transit calls.

Fails safe: on any trouble it leaves the existing file untouched.
"""

import json, os, sys, datetime, urllib.parse, urllib.request
from collections import defaultdict

SERVICE = ("https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/"
           "Daily_Chokepoints_Data/FeatureServer/0/query")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "portwatch.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
DAYS_BACK = 35


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    since = (datetime.date.today() - datetime.timedelta(days=DAYS_BACK)).isoformat()
   params = {
        "where": "1=1",
        "orderByFields": "date DESC",
        "outFields": "portid,portname,date,vessel_count_total",
        "outSR": "4326", "f": "json", "returnGeometry": "true",
        "resultRecordCount": "1000",
    }
    url = SERVICE + "?" + urllib.parse.urlencode(params)
    try:
        data = get(url)
    except Exception as e:
        print("PortWatch fetch failed — leaving existing file untouched:", e)
        sys.exit(0)

    feats = data.get("features") or []
    if not feats:
        print("No PortWatch rows returned — leaving existing file untouched.")
        print("Server said:", json.dumps(data)[:400])
        sys.exit(0)

    by_port = defaultdict(list)  # name -> list of (date_ms, count, x, y)
    for f in feats:
        a = f.get("attributes") or {}
        g = f.get("geometry") or {}
        name, d, c = a.get("portname"), a.get("date"), a.get("vessel_count_total")
        if name is None or d is None or c is None:
            continue
        by_port[name].append((d, float(c), g.get("x"), g.get("y")))

    out = []
    for name, rows in by_port.items():
        rows.sort(key=lambda r: r[0], reverse=True)
        last7 = rows[:7]
        calls = sum(r[1] for r in last7) / len(last7)
        x, y = last7[0][2], last7[0][3]
        if x is None or y is None:
            continue
        out.append({
            "type": "Feature",
            "properties": {"name": name, "calls": round(calls, 1)},
            "geometry": {"type": "Point",
                         "coordinates": [round(x, 3), round(y, 3)]}
        })

    if not out:
        print("Nothing aggregated — leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": out}, f,
                  separators=(",", ":"))
    print("Wrote", len(out), "chokepoints (7-day avg transits)")


if __name__ == "__main__":
    main()

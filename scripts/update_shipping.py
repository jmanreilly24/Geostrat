#!/usr/bin/env python3
"""IMF PortWatch chokepoint transits -> data/portwatch.json. Fails safe."""

import json, os, sys, urllib.parse, urllib.request
from collections import defaultdict

BASE = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/"
LOC = BASE + "PortWatch_chokepoints_database/FeatureServer/0/query"
DATA = BASE + "Daily_Chokepoints_Data/FeatureServer/0/query"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "portwatch.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}


def query(url, params):
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    # 1) chokepoint locations
    try:
        loc = query(LOC, {"where": "1=1", "outFields": "portid,portname",
                          "returnGeometry": "true", "outSR": "4326", "f": "json"})
    except Exception as e:
        print("Location fetch failed - leaving existing file untouched:", e)
        sys.exit(0)
    coords = {}
    for f in loc.get("features") or []:
        a, g = f.get("attributes") or {}, f.get("geometry") or {}
        if a.get("portid") and g.get("x") is not None:
            coords[a["portid"]] = (g["x"], g["y"], a.get("portname") or a["portid"])
    if not coords:
        print("No chokepoint locations - leaving existing file untouched.")
        print("Server said:", json.dumps(loc)[:300])
        sys.exit(0)

    # 2) recent transit rows (newest first; fall back to year/month filter)
    rows = []
    for params in (
        {"where": "1=1", "orderByFields": "date DESC",
         "outFields": "portid,date,n_total", "f": "json",
         "returnGeometry": "false", "resultRecordCount": "1000"},
        {"where": "year >= 2026", "outFields": "portid,date,n_total",
         "f": "json", "returnGeometry": "false", "resultRecordCount": "1000"},
    ):
        try:
            d = query(DATA, params)
            rows = d.get("features") or []
            if rows:
                break
            print("Empty result; server said:", json.dumps(d)[:300])
        except Exception as e:
            print("Data query failed:", e)
    if not rows:
        print("No transit rows - leaving existing file untouched.")
        sys.exit(0)

    by_port = defaultdict(list)
    for f in rows:
        a = f.get("attributes") or {}
        pid, d, c = a.get("portid"), a.get("date"), a.get("n_total")
        if pid is None or d is None or c is None:
            continue
        by_port[pid].append((d, float(c)))

    out = []
    for pid, recs in by_port.items():
        if pid not in coords:
            continue
        recs.sort(key=lambda r: r[0], reverse=True)
        last7 = recs[:7]
        calls = sum(r[1] for r in last7) / len(last7)
        x, y, name = coords[pid]
        out.append({"type": "Feature",
                    "properties": {"name": name, "calls": round(calls, 1)},
                    "geometry": {"type": "Point",
                                 "coordinates": [round(x, 3), round(y, 3)]}})

    if not out:
        print("Nothing aggregated - leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": out}, f,
                  separators=(",", ":"))
    print("Wrote", len(out), "chokepoints (7-day avg transits)")


if __name__ == "__main__":
    main()

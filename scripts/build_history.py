#!/usr/bin/env python3
"""
Build historical World Bank snapshots: data/history/power-YYYY.json for
2016..2025, same shape as power-index.json. Annual data (World Bank does not
publish 6-month indicator steps). Run once via the Action; re-run any time.
"""

import json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from update_power import INDICATORS, COMPOSITE_KEYS, NAME_BY_ISO3, UA  # reuse

BASE = ("https://api.worldbank.org/v2/country/all/indicator/{code}"
        "?format=json&per_page=400&date={year}")
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "data", "history")
YEARS = range(2016, 2026)


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_year(code, year):
    payload = get(BASE.format(code=code, year=year))
    rows = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
    vals, world = {}, None
    for row in rows or []:
        iso3, val = row.get("countryiso3code"), row.get("value")
        if val is None:
            continue
        if iso3 == "WLD":
            world = float(val)
        elif iso3 in NAME_BY_ISO3:
            vals[iso3] = float(val)
    if not world:
        world = sum(vals.values()) or 1.0
    return vals, world


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    for year in YEARS:
        raw, world, ok = {}, {}, 0
        for key, codes in INDICATORS.items():
            raw[key], world[key] = {}, 1.0
            for code in codes:
                try:
                    raw[key], world[key] = fetch_year(code, year)
                    ok += 1
                    print(year, key, "OK via", code,
                          "(%d countries)" % len(raw[key]))
                    break
                except Exception as e:
                    print(year, key, code, "failed:", e)
            else:
                print(year, key, "ALL candidates failed:", codes)
        out = {}
        for iso3, name in NAME_BY_ISO3.items():
            shares = []
            for k in COMPOSITE_KEYS:
                v = raw.get(k, {}).get(iso3)
                if v is not None and world.get(k):
                    shares.append(v / world[k])
            entry = {"iso3": iso3}
            if shares:
                entry["composite"] = round(sum(shares) / len(shares), 4)
            for k in ("gdp", "gdppc", "pop", "milex", "milper", "renew",
                      "gini", "trade", "tradeusd"):
                v = raw.get(k, {}).get(iso3)
                if v is not None:
                    entry[k] = round(v) if k != "trade" else round(v, 2)
            if len(entry) > 1:
                out[name] = entry
        path = os.path.join(OUTDIR, "power-%d.json" % year)
        with open(path, "w") as f:
            json.dump(out, f, separators=(",", ":"), sort_keys=True)
        print(year, ":", len(out), "countries,", ok, "indicators")


def portwatch_history():
    """Yearly avg daily transits per chokepoint -> data/history/portwatch-YYYY.json
    (PortWatch data begins 2019)."""
    import urllib.parse
    from collections import defaultdict
    base = ("https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/")
    locq = base + "PortWatch_chokepoints_database/FeatureServer/0/query"
    datq = base + "Daily_Chokepoints_Data/FeatureServer/0/query"
    try:
        loc = get(locq + "?" + urllib.parse.urlencode({
            "where": "1=1", "outFields": "portid,portname",
            "returnGeometry": "true", "outSR": "4326", "f": "json"}))
    except Exception as e:
        print("portwatch locations failed:", e)
        return
    coords = {}
    for f in loc.get("features") or []:
        a, g = f.get("attributes") or {}, f.get("geometry") or {}
        if a.get("portid") and g.get("x") is not None:
            coords[a["portid"]] = (g["x"], g["y"], a.get("portname") or a["portid"])
    for year in range(2019, 2026):
        sums = defaultdict(lambda: [0.0, 0])
        offset = 0
        while True:
            try:
                d = get(datq + "?" + urllib.parse.urlencode({
                    "where": "year = %d" % year,
                    "outFields": "portid,n_total", "f": "json",
                    "returnGeometry": "false",
                    "resultRecordCount": "2000", "resultOffset": str(offset)}))
            except Exception as e:
                print(year, "portwatch query failed:", e)
                break
            feats = d.get("features") or []
            for f in feats:
                a = f.get("attributes") or {}
                pid, c = a.get("portid"), a.get("n_total")
                if pid is None or c is None:
                    continue
                sums[pid][0] += float(c)
                sums[pid][1] += 1
            if len(feats) < 2000:
                break
            offset += 2000
        out = []
        for pid, sc in sums.items():
            if pid not in coords or not sc[1]:
                continue
            x, y, name = coords[pid]
            out.append({"type": "Feature",
                        "properties": {"name": name, "calls": round(sc[0] / sc[1], 1)},
                        "geometry": {"type": "Point",
                                     "coordinates": [round(x, 3), round(y, 3)]}})
        if out:
            path = os.path.join(OUTDIR, "portwatch-%d.json" % year)
            with open(path, "w") as f:
                json.dump({"type": "FeatureCollection", "features": out}, f,
                          separators=(",", ":"))
            print("portwatch", year, ":", len(out), "chokepoints")


if __name__ == "__main__":
    main()
    portwatch_history()

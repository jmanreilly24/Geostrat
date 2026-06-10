#!/usr/bin/env python3
"""Fetch GDELT GEO 2.0 news geography -> data/newspulse.geojson."""

import json, os, sys, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "newspulse.geojson")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
MAX_POINTS = 300

QUERY = "(conflict OR military OR airstrike OR \"border clash\" OR offensive OR sanctions OR missile OR ceasefire)"
URL = "https://api.gdeltproject.org/api/v2/geo/geo?query={q}&format=GeoJSON"


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    url = URL.format(q=urllib.parse.quote(QUERY))
    try:
        data = get(url)
    except Exception as e:
        print("GDELT fetch failed — leaving existing file untouched:", e)
        sys.exit(0)

    feats_in = (data or {}).get("features") or []
    rows = []
    for f in feats_in:
        geom = f.get("geometry") or {}
        if geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates")
        if not coords or len(coords) < 2:
            continue
        props = f.get("properties") or {}
        try:
            count = float(props.get("count", 1) or 1)
        except (TypeError, ValueError):
            count = 1
        rows.append((count, [round(float(coords[0]), 3), round(float(coords[1]), 3)],
                     props.get("name", "")))

    if not rows:
        print("No GDELT points parsed — leaving existing file untouched.")
        sys.exit(0)

    rows.sort(key=lambda r: r[0], reverse=True)
    rows = rows[:MAX_POINTS]
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature",
         "properties": {"count": round(c, 1), "name": name},
         "geometry": {"type": "Point", "coordinates": xy}}
        for c, xy, name in rows
    ]}
    with open(OUT, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print("Wrote", len(fc["features"]), "news-pulse points")


if __name__ == "__main__":
    main()

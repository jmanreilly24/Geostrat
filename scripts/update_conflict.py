#!/usr/bin/env python3
"""Fetch recent UCDP conflict events and write data/conflict.geojson."""

import json, math, os, sys, datetime, urllib.request, urllib.error

API = "https://ucdpapi.pcr.uu.se/api/gedevents/{ver}?pagesize=1000&page={page}"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "conflict.geojson")
DAYS_BACK = 365
MAX_PAGES = 150
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def candidate_versions():
    out, today = [], datetime.date.today()
    y, m = today.year, today.month
    for _ in range(8):
        out.append("{:02d}.0.{}".format(y % 100, m))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return out


def find_version():
    for ver in candidate_versions():
        try:
            data = get(API.format(ver=ver, page=1))
            if isinstance(data, dict) and data.get("Result"):
                print("Using UCDP version", ver, "TotalCount", data.get("TotalCount"))
                return ver
        except urllib.error.HTTPError as e:
            print("  version", ver, "->", e.code)
        except Exception as e:
            print("  version", ver, "->", e)
    return None


def fetch_all(ver):
    events, page = [], 1
    while page <= MAX_PAGES:
        data = get(API.format(ver=ver, page=page))
        rows = data.get("Result") or []
        if not rows:
            break
        events.extend(rows)
        total_pages = data.get("TotalPages") or 1
        if page >= total_pages:
            break
        page += 1
    print("Fetched", len(events), "raw events across", page, "page(s)")
    return events


def weight(deaths):
    d = max(0, int(deaths or 0))
    return round(min(10.0, 1.0 + 2.0 * math.log10(d + 1)), 2)


def to_geojson(events):
    cutoff = datetime.date.today() - datetime.timedelta(days=DAYS_BACK)
    feats = []
    for e in events:
        try:
            lat = float(e.get("latitude")); lng = float(e.get("longitude"))
        except (TypeError, ValueError):
            continue
        ds = (e.get("date_start") or "")[:10]
        try:
            if datetime.date.fromisoformat(ds) < cutoff:
                continue
        except ValueError:
            pass
        feats.append({
            "type": "Feature",
            "properties": {
                "weight": weight(e.get("best")),
                "date": ds,
                "country": e.get("country") or ""
            },
            "geometry": {"type": "Point",
                         "coordinates": [round(lng, 3), round(lat, 3)]}
        })
    return {"type": "FeatureCollection", "features": feats}


def main():
    ver = find_version()
    if not ver:
        print("No UCDP version found — leaving existing file untouched.")
        sys.exit(0)
    fc = to_geojson(fetch_all(ver))
    if not fc["features"]:
        print("No recent events parsed — leaving existing file untouched.")
        sys.exit(0)
    with open(OUT, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print("Wrote", len(fc["features"]), "features to data/conflict.geojson")


if __name__ == "__main__":
    main()

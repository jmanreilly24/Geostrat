#!/usr/bin/env python3
"""Download the latest UCDP Candidate Events CSV (free, static, no token) -> data/conflict.geojson."""

import csv, io, json, math, os, re, sys, datetime, urllib.request

DOWNLOADS = "https://ucdp.uu.se/downloads/"
FALLBACK = "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_4.csv"
PATTERN = re.compile(r"https://ucdp\.uu\.se/downloads/candidateged/GEDEvent_v[0-9_]+\.csv")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "conflict.geojson")
DAYS_BACK = 365
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}


def fetch_text(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8-sig", errors="replace")


def find_csv_url():
    try:
        hits = PATTERN.findall(fetch_text(DOWNLOADS))
        if hits:
            return hits[0]
    except Exception as e:
        print("Could not read download page, using fallback:", e)
    return FALLBACK


def weight(deaths):
    try:
        d = max(0, int(float(deaths or 0)))
    except (TypeError, ValueError):
        d = 0
    return round(min(10.0, 1.0 + 2.0 * math.log10(d + 1)), 2)


def main():
    url = find_csv_url()
    print("Downloading", url)
    try:
        text = fetch_text(url)
    except Exception as e:
        print("Download failed — leaving existing file untouched:", e)
        sys.exit(0)

    cutoff = datetime.date.today() - datetime.timedelta(days=DAYS_BACK)
    feats = []
    for row in csv.DictReader(io.StringIO(text)):
        try:
            lat = float(row.get("latitude")); lng = float(row.get("longitude"))
        except (TypeError, ValueError):
            continue
        ds = (row.get("date_start") or "")[:10]
        try:
            if datetime.date.fromisoformat(ds) < cutoff:
                continue
        except ValueError:
            pass
        feats.append({
            "type": "Feature",
            "properties": {"weight": weight(row.get("best")),
                           "date": ds, "country": row.get("country") or ""},
            "geometry": {"type": "Point",
                         "coordinates": [round(lng, 3), round(lat, 3)]}
        })

    if not feats:
        print("No recent events parsed — leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    print("Wrote", len(feats), "features to data/conflict.geojson")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Build a granular news-pulse snapshot from GDELT's GKG 2.0 data lake.

Previously this script targeted api/v2/geo/geo (retired -> 404) and the
fallback DOC ArtList path could only place one point per sourcecountry at
the country centroid. That isn't granular enough for a real news-pulse
layer.

The GKG file (refreshed every 15 minutes at data.gdeltproject.org/gdeltv2)
contains every monitored article with per-mention geocoded locations in
the V2EnhancedLocations field (Type#FullName#CountryCode#ADM1#ADM2#Lat#Long
#FeatureID#CharOffset). We filter rows to conflict-relevant themes,
extract every (lat, lng) mention, snap to a 0.5 deg grid for aggregation,
and emit the top-N busiest grid cells as GeoJSON points. Output goes to
data/newspulse.geojson, the same path the front end already loads.

Fails safe: any fetch / parse trouble leaves the previous file in place.
"""

import csv, io, json, os, sys, urllib.request, zipfile
from collections import Counter

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "newspulse.geojson")
LAST = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
MAX_POINTS = 600
GRID_DEG = 0.5    # snap lat/lng to half-degree cells for aggregation

# Conflict / security relevant theme prefixes. Each GKG row carries a
# semi-colon list of GDELT theme codes; if any matches one of these we keep
# the row. Add freely.
KEEP_THEMES = (
    "ARMEDCONFLICT", "WAR", "MILITARY", "TERROR", "TERRORISM",
    "PROTEST", "RIOT", "REBELLION", "UPRISING",
    "KILL", "DEATH", "CASUALTIES",
    "SANCTIONS", "BLOCKADE", "EMBARGO",
    "REFUGEE", "DISPLACEMENT",
    "MISSILE", "AIRSTRIKE", "DRONE", "BOMB",
    "SECURITY_SERVICES", "COUP", "ASSASSINATION",
    "MIL_WEAPONS", "CRISISLEX",
)


def http_get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read() if binary else r.read().decode("utf-8")


def latest_gkg_url():
    """Parse lastupdate.txt and return the gkg .zip URL of the most recent
    15-minute slice."""
    text = http_get(LAST)
    for line in text.splitlines():
        parts = line.strip().split()
        if len(parts) >= 3 and parts[2].endswith("gkg.csv.zip"):
            return parts[2]
    raise RuntimeError("no gkg URL in lastupdate.txt")


def parse_locations(field):
    """Yield (lat, lng) tuples from a V2EnhancedLocations field value."""
    if not field:
        return
    for loc in field.split(";"):
        f = loc.split("#")
        # type, fullname, ccode, adm1, adm2, lat, long, featureid, charoffset
        if len(f) < 7:
            continue
        try:
            lat = float(f[5]); lng = float(f[6])
        except (ValueError, IndexError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        if lat == 0 and lng == 0:
            # GDELT's "no location resolved" sentinel
            continue
        yield (lat, lng)


def matches_themes(field):
    if not field:
        return False
    for t in field.split(";"):
        # themes look like "ARMEDCONFLICT" or "ARMEDCONFLICT_COUNTRY_XYZ"
        head = t.split("_", 1)[0]
        if head in KEEP_THEMES:
            return True
    return False


def main():
    try:
        url = latest_gkg_url()
        print("fetching", url)
        blob = http_get(url, binary=True)
    except Exception as e:
        print("GKG fetch failed - leaving existing file untouched:", e)
        sys.exit(0)

    counts = Counter()
    rows_total = rows_kept = mentions_kept = 0
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            name = z.namelist()[0]
            with z.open(name) as fh:
                # GKG CSV is TSV-encoded; sometimes has odd embedded chars.
                reader = csv.reader(io.TextIOWrapper(fh, encoding="latin-1",
                                                    newline=""), delimiter="\t")
                for row in reader:
                    rows_total += 1
                    # column layout (0-indexed): 0=recordid 1=date 2=collid
                    # 3=sourcename 4=docid 5=v1counts 6=v2.1counts 7=v1themes
                    # 8=v2themes 9=v1locations 10=v2enhancedlocations
                    if len(row) < 11:
                        continue
                    if not matches_themes(row[7]) and not matches_themes(row[8]):
                        continue
                    rows_kept += 1
                    for lat, lng in parse_locations(row[10]):
                        # snap to 0.5 deg grid so nearby mentions collapse
                        key = (round(lat / GRID_DEG) * GRID_DEG,
                               round(lng / GRID_DEG) * GRID_DEG)
                        counts[key] += 1
                        mentions_kept += 1
    except Exception as e:
        print("GKG parse failed - leaving existing file untouched:", e)
        sys.exit(0)

    if not counts:
        print("no relevant mentions parsed - leaving existing file untouched.")
        sys.exit(0)

    top = counts.most_common(MAX_POINTS)
    feats = []
    for (lat, lng), c in top:
        feats.append({
            "type": "Feature",
            "properties": {"count": c},
            "geometry": {"type": "Point", "coordinates": [round(lng, 2), round(lat, 2)]},
        })

    fc = {"type": "FeatureCollection", "features": feats}
    with open(OUT, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(f"wrote {len(feats)} pulse points from {mentions_kept} mentions in "
          f"{rows_kept}/{rows_total} GKG rows")


if __name__ == "__main__":
    main()

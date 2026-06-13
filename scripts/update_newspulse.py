#!/usr/bin/env python3
"""
Fetch a GDELT news-pulse snapshot for a geopolitics query and write a slim
data/newspulse.geojson the map can drop straight onto the globe.

GDELT v2 GEO endpoint (api/v2/geo/geo) was retired (404), so we use the DOC
ArtList endpoint and aggregate articles by their `sourcecountry` field. The
points come from a per-country centroid table (rough land centers) so each
publishing country gets one bubble sized by article volume.

It's *media-attention* geography — where the outlets writing about a topic
are based, not ground truth — useful as a live pulse, noisy by nature.
Updated every few hours by a GitHub Action. Fails safe: on trouble it
leaves the previous file in place.
"""

import json, os, sys, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "newspulse.geojson")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}
MAX_RECORDS = 250

QUERY = ('(conflict OR military OR airstrike OR "border clash" OR offensive OR '
         'sanctions OR missile OR ceasefire OR protest)')
URL = ("https://api.gdeltproject.org/api/v2/doc/doc?query={q}"
       "&mode=ArtList&format=json&maxrecords={n}&timespan=1d")

# Country centroids (rough land center, lng/lat). Names match GDELT's
# sourcecountry field, which generally uses common English names. Names not
# in this table are dropped from the output. Add freely.
CENTROIDS = {
    "Afghanistan": (66, 34), "Albania": (20, 41), "Algeria": (3, 28),
    "Angola": (17, -12), "Argentina": (-65, -35), "Armenia": (45, 40),
    "Australia": (134, -25), "Austria": (14, 47), "Azerbaijan": (48, 40),
    "Bahrain": (50.5, 26), "Bangladesh": (90, 24), "Belarus": (28, 53),
    "Belgium": (4.5, 50.5), "Bolivia": (-65, -17), "Bosnia and Herzegovina": (18, 44),
    "Botswana": (24, -22), "Brazil": (-53, -10), "Brunei": (114.5, 4.5),
    "Bulgaria": (25, 43), "Burkina Faso": (-2, 12), "Cambodia": (105, 13),
    "Cameroon": (12, 6), "Canada": (-106, 57), "Chad": (19, 15),
    "Chile": (-71, -30), "China": (104, 35), "Colombia": (-72, 4),
    "Costa Rica": (-84, 10), "Croatia": (15, 45.5), "Cuba": (-78, 21),
    "Cyprus": (33, 35), "Czech Republic": (15.5, 50), "Czechia": (15.5, 50),
    "Denmark": (10, 56), "Djibouti": (43, 11.5), "Dominican Republic": (-70.5, 19),
    "Ecuador": (-78, -1), "Egypt": (30, 27), "El Salvador": (-89, 13.5),
    "Estonia": (26, 59), "Ethiopia": (40, 9), "Finland": (26, 64),
    "France": (2.5, 47), "Gabon": (12, -1), "Georgia": (43, 42),
    "Germany": (10.5, 51), "Ghana": (-1, 8), "Greece": (22, 39),
    "Guatemala": (-90.5, 15.5), "Guinea": (-10, 10), "Guyana": (-58, 5),
    "Haiti": (-72.5, 19), "Honduras": (-86.5, 15), "Hungary": (19, 47),
    "Iceland": (-19, 65), "India": (78, 21), "Indonesia": (118, -2),
    "Iran": (53, 32), "Iraq": (43.5, 33), "Ireland": (-8, 53),
    "Israel": (35, 31.5), "Italy": (12.5, 42), "Ivory Coast": (-5, 7.5),
    "Japan": (138, 36), "Jordan": (37, 31), "Kazakhstan": (68, 48),
    "Kenya": (38, 0.5), "Kosovo": (20.9, 42.6), "Kuwait": (47.5, 29.5),
    "Kyrgyzstan": (74, 41), "Laos": (103, 19), "Latvia": (25, 57),
    "Lebanon": (35.8, 33.9), "Liberia": (-9.5, 6.5), "Libya": (17, 26),
    "Lithuania": (24, 55.5), "Luxembourg": (6.1, 49.8),
    "Madagascar": (47, -19), "Malawi": (34, -13.5), "Malaysia": (109, 4),
    "Mali": (-4, 17), "Malta": (14.5, 35.9), "Mauritania": (-10, 20),
    "Mexico": (-102, 23), "Moldova": (28.5, 47), "Mongolia": (105, 46),
    "Montenegro": (19, 42.7), "Morocco": (-6, 32), "Mozambique": (35, -18),
    "Myanmar": (96, 21), "Namibia": (17, -22), "Nepal": (84, 28),
    "Netherlands": (5.5, 52), "New Zealand": (172, -41), "Nicaragua": (-85, 13),
    "Niger": (9, 17), "Nigeria": (8, 9.5), "North Korea": (127.5, 40),
    "North Macedonia": (21.7, 41.6), "Norway": (15, 64), "Oman": (56, 21),
    "Pakistan": (70, 30), "Palestine": (35.2, 31.9), "Panama": (-80, 9),
    "Papua New Guinea": (143, -6), "Paraguay": (-58, -23), "Peru": (-75, -10),
    "Philippines": (122, 13), "Poland": (19.5, 52), "Portugal": (-8, 39.5),
    "Qatar": (51.2, 25.3), "Romania": (25, 46), "Russia": (100, 60),
    "Rwanda": (30, -2), "Saudi Arabia": (45, 24), "Senegal": (-14.5, 14.5),
    "Serbia": (21, 44), "Sierra Leone": (-11.8, 8.5), "Singapore": (103.8, 1.4),
    "Slovakia": (19.5, 48.7), "Slovenia": (14.8, 46.1), "Somalia": (46, 5),
    "South Africa": (25, -29), "South Korea": (128, 36),
    "South Sudan": (31, 7), "Spain": (-3.5, 40), "Sri Lanka": (81, 7.5),
    "Sudan": (30, 16), "Sweden": (16, 62), "Switzerland": (8, 47),
    "Syria": (38, 35), "Taiwan": (121, 23.5), "Tajikistan": (71, 39),
    "Tanzania": (35, -6), "Thailand": (101, 15), "Togo": (1.2, 8.5),
    "Trinidad and Tobago": (-61.2, 10.7), "Tunisia": (9.5, 34),
    "Turkey": (35, 39), "Turkmenistan": (59, 40), "Uganda": (32, 1),
    "Ukraine": (32, 49), "United Arab Emirates": (54, 24),
    "United Kingdom": (-2, 54), "United States": (-98, 39),
    "Uruguay": (-56, -33), "Uzbekistan": (64, 41), "Venezuela": (-66, 7),
    "Vietnam": (107, 16), "Yemen": (48, 16), "Zambia": (28, -14),
    "Zimbabwe": (30, -19),
}

# Common GDELT-publishing aliases - any sourcecountry not exactly in
# CENTROIDS gets a second chance via this table.
ALIASES = {
    "USA": "United States", "US": "United States",
    "UK": "United Kingdom", "Burma": "Myanmar",
    "Korea, South": "South Korea", "Korea, North": "North Korea",
    "Cote d'Ivoire": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast",
    "Russian Federation": "Russia", "Vietnam ": "Vietnam",
    "DR Congo": "Democratic Republic of the Congo",
    "Democratic Republic of the Congo": "Democratic Republic of the Congo",
}
CENTROIDS["Democratic Republic of the Congo"] = (23, -3)
CENTROIDS["Republic of the Congo"] = (15, -1)


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    url = URL.format(q=urllib.parse.quote(QUERY), n=MAX_RECORDS)
    try:
        data = get(url)
    except Exception as e:
        print("GDELT fetch failed - leaving existing file untouched:", e)
        sys.exit(0)

    articles = (data or {}).get("articles") or []
    if not articles:
        print("No GDELT articles returned - leaving existing file untouched.")
        sys.exit(0)

    counts = {}
    for a in articles:
        name = (a.get("sourcecountry") or "").strip()
        if not name:
            continue
        if name not in CENTROIDS:
            name = ALIASES.get(name, name)
        if name not in CENTROIDS:
            continue
        counts[name] = counts.get(name, 0) + 1

    if not counts:
        print("None of the publishing countries are in the centroid table.")
        sys.exit(0)

    feats = []
    for name, c in sorted(counts.items(), key=lambda kv: -kv[1]):
        lng, lat = CENTROIDS[name]
        feats.append({
            "type": "Feature",
            "properties": {"count": c, "name": name},
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
        })

    fc = {"type": "FeatureCollection", "features": feats}
    with open(OUT, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(f"Wrote {len(feats)} country pulses from {len(articles)} articles")


if __name__ == "__main__":
    main()

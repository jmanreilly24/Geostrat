#!/usr/bin/env python3
"""
Pull free World Bank indicators and write data/power-index.json keyed by the
country names the map uses. For each country we store raw stats plus a CINC-style
composite (a country's average share of the world total across capability inputs).

Output shape (per country name):
  { "iso3": "...", "composite": 0.x,
    "gdp": ..., "gdppc": ..., "pop": ..., "milex": ..., "milper": ... }

No API key needed. Runs in a GitHub Action. Fails safe: on trouble, leaves the
existing file untouched.
"""

import json, os, sys, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "power-index.json")
BASE = "https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&per_page=400&mrnev=1"
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}

INDICATORS = {
    "gdp": "NY.GDP.MKTP.CD", "gdppc": "NY.GDP.PCAP.CD", "pop": "SP.POP.TOTL",
    "urb": "SP.URB.TOTL", "milex": "MS.MIL.XPND.CD", "milper": "MS.MIL.TOTL.P1",
}
COMPOSITE_KEYS = ["milex", "milper", "pop", "urb", "gdp"]

NAME_BY_ISO3 = {
    "USA": "United States", "CHN": "China", "RUS": "Russia", "IND": "India",
    "JPN": "Japan", "DEU": "Germany", "GBR": "United Kingdom", "FRA": "France",
    "BRA": "Brazil", "CAN": "Canada", "AUS": "Australia", "KOR": "South Korea",
    "IRN": "Iran", "SAU": "Saudi Arabia", "TUR": "Turkey", "ISR": "Israel",
    "EGY": "Egypt", "ZAF": "South Africa", "NGA": "Nigeria", "IDN": "Indonesia",
    "PAK": "Pakistan", "MEX": "Mexico", "ITA": "Italy", "ESP": "Spain",
    "POL": "Poland", "UKR": "Ukraine", "VNM": "Vietnam", "ARE": "United Arab Emirates",
    "ARG": "Argentina", "NLD": "Netherlands", "SWE": "Sweden", "NOR": "Norway",
    "QAT": "Qatar", "KAZ": "Kazakhstan", "ETH": "Ethiopia", "PHL": "Philippines",
    "THA": "Thailand", "MYS": "Malaysia", "SGP": "Singapore", "BGD": "Bangladesh",
    "IRQ": "Iraq", "DZA": "Algeria", "COL": "Colombia", "CHL": "Chile",
    "GRC": "Greece", "PRT": "Portugal", "CZE": "Czechia", "ROU": "Romania",
    "HUN": "Hungary", "AUT": "Austria", "CHE": "Switzerland", "BEL": "Belgium",
    "DNK": "Denmark", "FIN": "Finland", "IRL": "Ireland", "NZL": "New Zealand",
    "BLR": "Belarus", "UZB": "Uzbekistan", "AZE": "Azerbaijan", "MMR": "Myanmar",
    "MAR": "Morocco", "AGO": "Angola", "VEN": "Venezuela", "CUB": "Cuba"
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_indicator(code):
    """Return (per_iso3_value, world_total)."""
    payload = get(BASE.format(code=code))
    rows = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
    vals, world = {}, None
    for row in rows or []:
        iso3 = row.get("countryiso3code")
        val = row.get("value")
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
    raw, world = {}, {}
    ok = 0
    for key, code in INDICATORS.items():
        try:
            raw[key], world[key] = fetch_indicator(code)
            ok += 1
        except Exception as e:
            print("indicator", key, "failed:", e)
            raw[key], world[key] = {}, 1.0
    if ok == 0:
        print("All indicator fetches failed — leaving existing file untouched.")
        sys.exit(0)

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
        for k in ("gdp", "gdppc", "pop", "milex", "milper"):
            v = raw.get(k, {}).get(iso3)
            if v is not None:
                entry[k] = round(v)
        if len(entry) > 1:  # has at least one real value beyond iso3
            out[name] = entry

    if not out:
        print("No values computed — leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"), sort_keys=True)
    print("Wrote stats for", len(out), "countries from", ok, "indicators")


if __name__ == "__main__":
    main()

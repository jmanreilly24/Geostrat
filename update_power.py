#!/usr/bin/env python3
"""Pull World Bank indicators -> data/power-index.json (per-country stats + composite)."""

import json, os, sys, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "power-index.json")
BASE = "https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&per_page=400&mrnev=1"
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}

INDICATORS = {
    "gdp": "NY.GDP.MKTP.CD", "gdppc": "NY.GDP.PCAP.CD", "pop": "SP.POP.TOTL",
    "urb": "SP.URB.TOTL", "milex": "MS.MIL.XPND.CD", "milper": "MS.MIL.TOTL.P1",
    "renew": "EG.ELC.RNEW.ZS",  # renewable electricity, % of output (latest available)
}
COMPOSITE_KEYS = ["milex", "milper", "pop", "urb", "gdp"]

# World Bank iso3 -> the country name the map uses (Natural Earth spellings).
NAME_BY_ISO3 = {
    # North & Central America + Caribbean
    "USA": "United States", "CAN": "Canada", "MEX": "Mexico", "GTM": "Guatemala",
    "BLZ": "Belize", "HND": "Honduras", "SLV": "El Salvador", "NIC": "Nicaragua",
    "CRI": "Costa Rica", "PAN": "Panama", "CUB": "Cuba", "DOM": "Dominican Rep.",
    "HTI": "Haiti", "JAM": "Jamaica", "TTO": "Trinidad and Tobago", "BHS": "Bahamas",
    # South America
    "COL": "Colombia", "VEN": "Venezuela", "GUY": "Guyana", "SUR": "Suriname",
    "ECU": "Ecuador", "PER": "Peru", "BRA": "Brazil", "BOL": "Bolivia",
    "PRY": "Paraguay", "CHL": "Chile", "ARG": "Argentina", "URY": "Uruguay",
    # Western & Northern Europe
    "GBR": "United Kingdom", "IRL": "Ireland", "FRA": "France", "ESP": "Spain",
    "PRT": "Portugal", "DEU": "Germany", "NLD": "Netherlands", "BEL": "Belgium",
    "LUX": "Luxembourg", "CHE": "Switzerland", "AUT": "Austria", "ITA": "Italy",
    "NOR": "Norway", "SWE": "Sweden", "FIN": "Finland", "DNK": "Denmark", "ISL": "Iceland",
    # Central & Eastern Europe / Balkans
    "POL": "Poland", "CZE": "Czechia", "SVK": "Slovakia", "HUN": "Hungary",
    "ROU": "Romania", "BGR": "Bulgaria", "GRC": "Greece", "HRV": "Croatia",
    "SVN": "Slovenia", "BIH": "Bosnia and Herz.", "SRB": "Serbia", "MNE": "Montenegro",
    "MKD": "North Macedonia", "ALB": "Albania", "XKX": "Kosovo",
    "EST": "Estonia", "LVA": "Latvia", "LTU": "Lithuania", "BLR": "Belarus",
    "UKR": "Ukraine", "MDA": "Moldova", "RUS": "Russia", "CYP": "Cyprus", "MLT": "Malta",
    # Caucasus & Middle East
    "TUR": "Turkey", "GEO": "Georgia", "ARM": "Armenia", "AZE": "Azerbaijan",
    "SYR": "Syria", "LBN": "Lebanon", "ISR": "Israel", "PSE": "Palestine", "JOR": "Jordan",
    "IRQ": "Iraq", "IRN": "Iran", "SAU": "Saudi Arabia", "YEM": "Yemen", "OMN": "Oman",
    "ARE": "United Arab Emirates", "QAT": "Qatar", "BHR": "Bahrain", "KWT": "Kuwait",
    # North Africa & Horn
    "EGY": "Egypt", "LBY": "Libya", "TUN": "Tunisia", "DZA": "Algeria", "MAR": "Morocco",
    "ESH": "W. Sahara", "MRT": "Mauritania", "MLI": "Mali", "NER": "Niger", "TCD": "Chad",
    "SDN": "Sudan", "SSD": "S. Sudan", "ERI": "Eritrea", "DJI": "Djibouti",
    "ETH": "Ethiopia", "SOM": "Somalia",
    # West Africa
    "SEN": "Senegal", "GMB": "Gambia", "GNB": "Guinea-Bissau", "GIN": "Guinea",
    "SLE": "Sierra Leone", "LBR": "Liberia", "CIV": "Côte d'Ivoire", "GHA": "Ghana",
    "TGO": "Togo", "BEN": "Benin", "NGA": "Nigeria", "BFA": "Burkina Faso",
    "CPV": "Cabo Verde",
    # Central Africa
    "CMR": "Cameroon", "CAF": "Central African Rep.", "GNQ": "Eq. Guinea", "GAB": "Gabon",
    "COG": "Congo", "COD": "Dem. Rep. Congo", "AGO": "Angola",
    # East Africa
    "UGA": "Uganda", "KEN": "Kenya", "TZA": "Tanzania", "RWA": "Rwanda", "BDI": "Burundi",
    # Southern Africa
    "ZMB": "Zambia", "MWI": "Malawi", "MOZ": "Mozambique", "ZWE": "Zimbabwe",
    "BWA": "Botswana", "NAM": "Namibia", "ZAF": "South Africa", "LSO": "Lesotho",
    "SWZ": "eSwatini", "MDG": "Madagascar", "MUS": "Mauritius",
    # Central & South Asia
    "KAZ": "Kazakhstan", "UZB": "Uzbekistan", "TKM": "Turkmenistan", "TJK": "Tajikistan",
    "KGZ": "Kyrgyzstan", "AFG": "Afghanistan", "PAK": "Pakistan", "IND": "India",
    "NPL": "Nepal", "BTN": "Bhutan", "BGD": "Bangladesh", "LKA": "Sri Lanka",
    # East & Southeast Asia
    "CHN": "China", "MNG": "Mongolia", "PRK": "North Korea", "KOR": "South Korea",
    "JPN": "Japan", "TWN": "Taiwan", "MMR": "Myanmar", "THA": "Thailand", "LAO": "Laos",
    "VNM": "Vietnam", "KHM": "Cambodia", "MYS": "Malaysia", "SGP": "Singapore",
    "IDN": "Indonesia", "PHL": "Philippines", "BRN": "Brunei", "TLS": "Timor-Leste",
    # Oceania
    "AUS": "Australia", "NZL": "New Zealand", "PNG": "Papua New Guinea", "FJI": "Fiji",
    "SLB": "Solomon Is.",
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_indicator(code):
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
        for k in ("gdp", "gdppc", "pop", "milex", "milper", "renew"):
            v = raw.get(k, {}).get(iso3)
            if v is not None:
                entry[k] = round(v)
        if len(entry) > 1:
            out[name] = entry

    if not out:
        print("No values computed — leaving existing file untouched.")
        sys.exit(0)

    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"), sort_keys=True)
    print("Wrote stats for", len(out), "countries from", ok, "indicators")


if __name__ == "__main__":
    main()

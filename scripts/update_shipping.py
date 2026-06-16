#!/usr/bin/env python3
"""IMF PortWatch chokepoint transits.

Writes two files:
 1. data/portwatch.json           -> 7-day-avg call ring per chokepoint (live map layer)
 2. data/energy/chokepoint_series.json -> full daily series + baseline/delta block
    for Strait of Hormuz, Strait of Malacca, Bab el-Mandeb, 2026-01-01 -> present.

Both writes fail safe: if a fetch hiccups, the existing file on disk is left
untouched and the script exits 0.
"""

import datetime, json, os, sys, urllib.parse, urllib.request
from collections import defaultdict

BASE = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/"
LOC = BASE + "PortWatch_chokepoints_database/FeatureServer/0/query"
DATA = BASE + "Daily_Chokepoints_Data/FeatureServer/0/query"
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_PORTWATCH = os.path.join(ROOT, "data", "portwatch.json")
OUT_SERIES = os.path.join(ROOT, "data", "energy", "chokepoint_series.json")
UA = {"User-Agent": "geostrat-map/1.0 (GitHub Action)"}

# Map our slug -> portname substrings as exposed by PortWatch (we match
# case-insensitively against portname so small naming drift doesn't break us).
SERIES_TARGETS = {
    "hormuz":      ["Strait of Hormuz", "Hormuz"],
    "malacca":     ["Strait of Malacca", "Malacca"],
    "babelmandeb": ["Bab el-Mandeb Strait", "Bab el-Mandeb", "Bab-el-Mandeb"],
}
BASELINE_START = datetime.date(2026, 1, 1)
BASELINE_END = datetime.date(2026, 2, 27)


def query(url, params):
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def to_date(raw):
    """PortWatch returns epoch-ms ints. Tolerate ISO strings too."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        try:
            return datetime.date.fromtimestamp(raw / 1000.0)
        except Exception:
            return None
    if isinstance(raw, str):
        try:
            return datetime.date.fromisoformat(raw[:10])
        except Exception:
            return None
    return None


def fetch_locations():
    try:
        loc = query(LOC, {"where": "1=1", "outFields": "portid,portname",
                          "returnGeometry": "true", "outSR": "4326", "f": "json"})
    except Exception as e:
        print("Location fetch failed:", e)
        return {}
    coords = {}
    for f in loc.get("features") or []:
        a, g = f.get("attributes") or {}, f.get("geometry") or {}
        if a.get("portid") and g.get("x") is not None:
            coords[a["portid"]] = (g["x"], g["y"], a.get("portname") or a["portid"])
    return coords


def detect_metric_fields():
    """Probe one row to see which n_* breakdown fields the service exposes.
    Returns the subset of (n_tanker, n_container) actually present."""
    try:
        d = query(DATA, {"where": "1=1", "outFields": "*", "f": "json",
                         "returnGeometry": "false", "resultRecordCount": "1"})
    except Exception as e:
        print("Field probe failed:", e)
        return []
    rows = d.get("features") or []
    if not rows:
        return []
    keys = set((rows[0].get("attributes") or {}).keys())
    out = []
    if "n_tanker" in keys:
        out.append("n_tanker")
    if "n_container" in keys:
        out.append("n_container")
    return out


def fetch_rows(extra_fields):
    """Fetch all transit rows from BASELINE_START forward, paging until exhausted."""
    fields = ["portid", "date", "n_total"] + extra_fields
    all_rows = []
    offset = 0
    page = 2000
    where = "date >= TIMESTAMP '%s 00:00:00'" % BASELINE_START.isoformat()
    while True:
        try:
            d = query(DATA, {"where": where, "outFields": ",".join(fields),
                             "f": "json", "returnGeometry": "false",
                             "orderByFields": "date ASC",
                             "resultRecordCount": str(page),
                             "resultOffset": str(offset)})
        except Exception as e:
            print("Data query failed at offset", offset, ":", e)
            return None
        feats = d.get("features") or []
        all_rows.extend(feats)
        if len(feats) < page:
            break
        offset += page
        if offset > 50000:
            print("Bailing out after 50k rows (safety limit).")
            break
    return all_rows


def fetch_latest_rows():
    """Fallback path used by the live PortWatch ring layer: newest 1000 rows."""
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
                return rows
            print("Empty result; server said:", json.dumps(d)[:300])
        except Exception as e:
            print("Latest-row query failed:", e)
    return []


def write_portwatch(coords, rows):
    """Existing 7-day-avg ring layer (unchanged behavior)."""
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
        if not last7:
            continue
        calls = sum(r[1] for r in last7) / len(last7)
        x, y, name = coords[pid]
        out.append({"type": "Feature",
                    "properties": {"name": name, "calls": round(calls, 1)},
                    "geometry": {"type": "Point",
                                 "coordinates": [round(x, 3), round(y, 3)]}})
    if not out:
        print("portwatch.json: nothing aggregated, leaving existing file.")
        return
    with open(OUT_PORTWATCH, "w") as f:
        json.dump({"type": "FeatureCollection",
                   "fetched": datetime.date.today().isoformat(),
                   "features": out}, f, separators=(",", ":"))
    print("portwatch.json: wrote", len(out), "chokepoints.")


def pick_portids(coords):
    """Map our SERIES_TARGETS keys to PortWatch portids by name substring."""
    matches = {}
    for slug, needles in SERIES_TARGETS.items():
        for pid, (_, _, name) in coords.items():
            ln = (name or "").lower()
            if any(n.lower() in ln for n in needles):
                matches[slug] = pid
                break
    return matches


def build_series_block(daily, extra_fields):
    """daily: list of (date, n_total, n_tanker?, n_container?) sorted ascending.
    Returns the per-chokepoint block."""
    if not daily:
        return None

    # baseline: mean over Jan 1 - Feb 27 (inclusive)
    def metric_mean(getter):
        vals = [getter(r) for r in daily
                if BASELINE_START <= r[0] <= BASELINE_END and getter(r) is not None]
        return (sum(vals) / len(vals)) if vals else None

    baseline = {"all": metric_mean(lambda r: r[1])}
    if "n_tanker" in extra_fields:
        baseline["tanker"] = metric_mean(lambda r: r[2])
    if "n_container" in extra_fields:
        idx = 2 + (1 if "n_tanker" in extra_fields else 0)
        baseline["container"] = metric_mean(lambda r: r[idx])

    # series
    series = []
    for r in daily:
        row = {"date": r[0].isoformat(), "all": round(r[1], 1) if r[1] is not None else None}
        if "n_tanker" in extra_fields:
            row["tanker"] = round(r[2], 1) if r[2] is not None else None
        if "n_container" in extra_fields:
            idx = 2 + (1 if "n_tanker" in extra_fields else 0)
            row["container"] = round(r[idx], 1) if r[idx] is not None else None
        series.append(row)

    latest = daily[-1][0]
    minus30 = latest - datetime.timedelta(days=30)
    minus60 = latest - datetime.timedelta(days=60)

    def nearest(target):
        # find row with date == target, else nearest earlier date
        best = None
        for r in daily:
            if r[0] <= target:
                best = r
            else:
                break
        return best

    def pct_block(ref_date):
        r = nearest(ref_date)
        if not r:
            return {"date": "", "all_pct": 0, "tanker_pct": 0}
        out = {"date": r[0].isoformat()}
        ba = baseline.get("all")
        out["all_pct"] = round(100 * r[1] / ba) if ba else 0
        if "n_tanker" in extra_fields:
            bt = baseline.get("tanker")
            out["tanker_pct"] = round(100 * r[2] / bt) if bt else 0
        if "n_container" in extra_fields:
            bc = baseline.get("container")
            idx = 2 + (1 if "n_tanker" in extra_fields else 0)
            out["container_pct"] = round(100 * r[idx] / bc) if bc else 0
        return out

    deltas = {
        "prewar":   pct_block(BASELINE_END),
        "minus60d": pct_block(minus60),
        "minus30d": pct_block(minus30),
        "latest":   pct_block(latest),
    }

    return {"baseline": {k: round(v, 1) if v is not None else None
                          for k, v in baseline.items()},
            "series": series,
            "deltas": deltas}


def write_series(coords, extra_fields):
    target_pids = pick_portids(coords)
    if not target_pids:
        print("chokepoint_series.json: none of Hormuz/Malacca/Bab el-Mandeb "
              "matched PortWatch portnames -- skipping write.")
        return

    full_rows = fetch_rows(extra_fields)
    if not full_rows:
        print("chokepoint_series.json: no rows from 2026-01-01 onward.")
        return

    # group by port -> daily metrics
    by_port = defaultdict(list)
    for f in full_rows:
        a = f.get("attributes") or {}
        pid, dt_raw, tot = a.get("portid"), a.get("date"), a.get("n_total")
        if pid is None or dt_raw is None:
            continue
        d = to_date(dt_raw)
        if d is None or d < BASELINE_START:
            continue
        tup = [d, float(tot) if tot is not None else None]
        if "n_tanker" in extra_fields:
            v = a.get("n_tanker")
            tup.append(float(v) if v is not None else None)
        if "n_container" in extra_fields:
            v = a.get("n_container")
            tup.append(float(v) if v is not None else None)
        by_port[pid].append(tuple(tup))

    out = {"generated": datetime.date.today().isoformat(),
           "_baseline_window": "%s..%s" % (BASELINE_START.isoformat(),
                                            BASELINE_END.isoformat()),
           "_source": "IMF PortWatch (services9.arcgis.com Daily_Chokepoints_Data)"}
    any_filled = False
    for slug, pid in target_pids.items():
        recs = by_port.get(pid) or []
        recs.sort(key=lambda r: r[0])
        block = build_series_block(recs, extra_fields)
        if block:
            out[slug] = block
            any_filled = True

    if not any_filled:
        print("chokepoint_series.json: matched portids but no rows for any.")
        return

    os.makedirs(os.path.dirname(OUT_SERIES), exist_ok=True)
    with open(OUT_SERIES, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print("chokepoint_series.json: wrote",
          ", ".join(k for k in out if k in SERIES_TARGETS),
          "(metrics: all" +
          ("+tanker" if "n_tanker" in extra_fields else "") +
          ("+container" if "n_container" in extra_fields else "") + ")")


def main():
    coords = fetch_locations()
    if not coords:
        print("No chokepoint locations - leaving existing files untouched.")
        return

    # Live ring layer (existing behavior): use a small recent slice.
    latest_rows = fetch_latest_rows()
    if latest_rows:
        write_portwatch(coords, latest_rows)
    else:
        print("portwatch.json: no recent rows, leaving existing file.")

    # Time-series block for chart + map highlight
    extra_fields = detect_metric_fields()
    print("Metric fields available:", extra_fields or "(n_total only)")
    write_series(coords, extra_fields)


if __name__ == "__main__":
    main()

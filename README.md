# Geostrat

© 2026 [YOUR FULL LEGAL NAME]. All rights reserved — see LICENSE.md. — interactive geostrategic globe

An interactive 3D globe for viewing the world through toggleable strategic
layers: power tiers, alliance blocs, conflict density, classical-theory zones,
chokepoints, and more. Built to run anywhere with no server, no API keys, and
no paid services.

---

## How to look at it

The fastest way to see it live is **GitHub Pages** (free). Opening `index.html`
by double-clicking will *not* work — browsers block the map-data download from a
local file. Deploy steps are below.

- **Control rail (right):** toggle layers on and off.
- **Country fill** is a "choose one" group (only one can colour the map at a time).
- **Blocs, conflict, reference** layers stack freely on top.
- **Click any country** to see its classification and the exact name string the
  data files use for it.
- **Telemetry strip (bottom-left):** live coordinates, zoom, active-layer count,
  and the auto-spin toggle.

---

## How to edit it (no coding)

Everything you change day-to-day lives in the **`/data`** folder. You never need
to touch `app.js`. Each file has comments explaining the format.

| To change… | Edit this file |
|---|---|
| A country's power tier or agent/pivot role | `data/countries.js` → `COUNTRY_TIERS`, `COUNTRY_ROLES` |
| Who's in NATO / BRICS / EU | `data/countries.js` → `MEMBERSHIPS` |
| A country that won't colour in | `data/countries.js` → `NAME_ALIASES` (click the country to get its exact name) |
| Strait / chokepoint labels | `data/chokepoints.js` |
| Conflict hotspots (placeholder) | `data/conflict-sample.js` |
| Theory zones (Heartland, etc.) | `data/theory-zones.js` |

**Editing with an AI assistant:** paste the relevant `/data` file into the
assistant and say what you want changed (e.g. "add Vietnam as a middle power"
or "add the South China Sea as a chokepoint at 114°E, 12°N"). The files are
plain lists designed to be safe for that.

---

## How to publish (and keep old versions)

1. Create a free account at **github.com**.
2. Make a new repository (e.g. `geostrat-map`), set it to **Public**.
3. Upload the whole `geostrat-map` folder (drag-and-drop in the web uploader —
   no command line needed).
4. In the repo: **Settings → Pages → Source: `main` branch / root → Save**.
5. After a minute your map is live at `https://<your-username>.github.io/geostrat-map/`.

**Weekly updates + version history come for free:** every time you upload a
change, GitHub saves it as a permanent version. To revisit a past map, open the
repo's commit history and view or restore any earlier state. (Walk-through of
clicks available on request.)

---

## What's wired vs. what's next

This is the **v1 foundation**: the engine is built and every *render type* is
proven with real (if partial) data. Filling in the rest is mostly editing data.

### Built and working
- [x] 3D globe (+ flat view by zooming/rotating) with terrain hillshade & elevation
- [x] Country borders, click-to-inspect, telemetry, auto-spin
- [x] **Fill layer** — Power tier (hegemon → small)
- [x] **Fill layer** — Brzezinski agents / pivots
- [x] **Outline layers** — NATO, BRICS, EU (stackable)
- [x] **Heat layer** — violence density (sample data; mechanism complete)
- [x] **Zone layer** — Mackinder Heartland (approximate)
- [x] **Point/label layer** — chokepoints & straits
- [x] **Auto-updating UCDP conflict feed** (weekly GitHub Action → committed GeoJSON)
- [x] **Computed power fill** from World Bank indicators (weekly Action, CINC-style composite)
- [x] **GDELT news-pulse** live signal layer (parked: GDELT blocks server fetches; to be revived as an in-browser live layer)
- [x] **15 blocs** as stackable outlines, grouped Defense vs Economic/political
- [x] **Ally highlight on click** (derived from defense/economic blocs + bilateral pacts; edit ALLIANCE_CONFIG and BILATERAL_PACTS in data/countries.js)
- [x] **Shipping**: static major-routes layer (data/shipping-lanes.js, editable) + live PortWatch chokepoint traffic (weekly Action -> data/portwatch.json)
- [x] **Spykman Rimland** tan country fill (edit window.RIMLAND in data/countries.js)
- [x] **Nuclear weapons states** green hatch overlay (edit window.NUCLEAR)
- [x] **World Bank coverage expanded to ~165 countries**

### Next up (priority order)
- [ ] **Editorial interstate-tension layer** (your main goal) — heat + arcs you control
- [ ] **Flat equal-area export** (Equal Earth / Robinson) for article screenshots
- [ ] More fills: nuclear status, regime type, economic tier
- [ ] More zones: Spykman Rimland, shatterbelts, Cohen's realms
- [ ] Flow layers: trade, energy pipelines, Belt & Road, undersea cables, shipping lanes
- [ ] Context: population density, EEZs / maritime zones, disputed-territory overlay, regions
- [ ] Search box, share-a-view URLs, mobile polish

---

## Data sources (all free)

- **Country shapes:** Natural Earth via the `world-atlas` package (public domain)
- **Terrain/elevation:** AWS Terrain Tiles (Mazpen Terrarium, open)
- **Basemap:** CARTO dark (OpenStreetMap data, ODbL — attribution shown on map)
- **Conflict (planned):** UCDP Georeferenced Event Dataset, Uppsala University
  (open academic licence; monthly "Candidate" feed for near-real-time)

If a label font ever fails to appear, change `"Open Sans Regular"` in `app.js`
to `"Noto Sans Regular"`.

---

## Auto-updating conflict data (how it runs)

The violence heatmap refreshes itself via a free **GitHub Action** — no server.

- `scripts/update_conflict.py` fetches recent UCDP events and writes
  `data/conflict.geojson`.
- `.github/workflows/update-conflict.yml` runs it **every Monday** (and on demand)
  and commits the file if it changed. Each refresh is a dated commit, so you get
  the conflict map's history for free.
- The map loads `data/conflict.geojson` if present and falls back to the bundled
  sample if not.

**To switch it on after uploading:**
1. In your repo, open the **Actions** tab. If prompted, click to enable workflows.
2. Open **Update conflict data** → **Run workflow** to do the first run now
   (instead of waiting for Monday).
3. When it finishes (green check), it will have committed `data/conflict.geojson`.
   Refresh the map — the heat layer is now live UCDP data and relabels itself.

If a run fails, open it in the Actions tab and copy the log here — the script is
written to fail safely (it never overwrites good data), so the map keeps working
either way.

> Optional later: a free UCDP API token lifts the rate limits for heavier use;
> add it as a repo secret and we'll wire it in. Not needed for weekly updates.

---

## All three auto-updaters (Actions)

| Workflow | Runs | Writes | Source |
|---|---|---|---|
| Update conflict data | weekly (Mon) | `data/conflict.geojson` | UCDP |
| Update power index | weekly (Mon) | `data/power-index.json` | World Bank |
| Update news pulse | every 6 hours | `data/newspulse.geojson` | GDELT |

After uploading, switch them on once in the **Actions** tab (see below). Each
fails safe — if a fetch hiccups, it leaves the last good file in place, so the
map never breaks. The "Computed power (data)" fill and the "News pulse (GDELT)"
toggle show bundled placeholders until their first run.

To extend the computed-power coverage to more countries, add rows to
`NAME_BY_ISO3` in `scripts/update_power.py` (World-Bank iso3 code → the country
name the map uses).

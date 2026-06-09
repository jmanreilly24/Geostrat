# Geostrat — interactive geostrategic globe

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

### Next up (priority order)
- [ ] **Live UCDP feed** for the violence heatmap (auto-updating, monthly) — replaces the sample
- [ ] **Editorial interstate-tension layer** (your main goal) — heat + arcs you control
- [ ] **Flat equal-area export** (Equal Earth / Robinson) for article screenshots
- [ ] More blocs: CSTO, AUKUS, Five Eyes, QUAD, SCO, ASEAN, AU, GCC, Arab League, OAS, Mercosur, OPEC+, RCEP, CPTPP, Commonwealth, EAEU
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

# Geostrat

© 2026 [Jared Merson Reilly]. All rights reserved — see LICENSE.md. — interactive geostrategic globe

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

**Base globe & navigation**
- [x] MapLibre 3D globe + flat projection; toggle FLAT / SPIN; live telemetry strip
- [x] Terrain hillshade & true 3D topography (raster-dem + setTerrain)
- [x] BlueMarble satellite base layer (NASA EOSDIS GIBS)
- [x] Country borders, click-to-inspect, name-alias canonicalisation
- [x] Antimeridian polygon splitter (Russia / Fiji / Kiribati no longer smear)
- [x] Progressive enhancement: 50m world-atlas at boot, 10m swap on idle

**Country fills (choose one)**
- [x] Power tier (hegemon → small)
- [x] Brzezinski agents / pivots
- [x] Computed power from World Bank indicators (CINC-style composite)
- [x] Liberal democracy (V-Dem)
- [x] Freedom of expression (V-Dem)
- [x] Renewables share of total energy (World Bank EG.FEC.RNEW.ZS)
- [x] Military spending
- [x] Trade balance (% GDP)
- [x] Gini inequality
- [x] Majority religion
- [x] Active conflicts
- [x] US military footprint (~82 host countries / territories)
- [x] Top trade partner (US/China, year-aware via TRADE_PARTNER_CHANGES)

**Statistics overlay (proportional symbols or choropleth)**
- [x] Population, GDP, GDP/capita, military personnel, military spending, renewables, freedom of expression
- [x] Hollow amber rings over the active fill **or** repaint-as-choropleth toggle with per-metric color ramps

**Stackable outline / overlay layers**
- [x] 15 alliance/economic blocs, alphabetised, grouped Defense vs Economic/political
- [x] Nuclear weapons states (green diagonal hatch, intercontinental/regional borders, warhead labels)
- [x] Chokepoints & straits
- [x] Belt & Road corridors (solid = operational, dashed = planned, plus POIs)
- [x] Shipping lanes (major routes)
- [x] PortWatch chokepoint traffic (7-day avg daily transits)

**Classical theory zones (with info-icon tooltips: theorist, year, school, desc)**
- [x] Mackinder Heartland
- [x] Spykman Rimland + offshore (tan)
- [x] Island Chains (1st–3rd)
- [x] Cohen Shatterbelts
- [x] String of Pearls
- [x] River-delta flashpoints (Marshall)

**Resources (hatched basin polygons + named field dots)**
- [x] Oil — Middle East supergiants (Ghawar, Burgan, Rumaila, Kirkuk, Marun, Ahvaz, Gachsaran, Agha Jari, Azadegan, Yadavaran, etc.) + Permian, Bakken, North Sea, West Siberia, Orinoco, pre-salt Santos, Stabroek, Niger Delta, Bohai, Daqing, Tarim, Cantarell, Athabasca oil sands
- [x] Gas — South Pars/North Dome, Yamal, Galkynysh, Karachaganak, Marcellus, Haynesville, NW Shelf, Browse, Hassi R'Mel, Groningen, Krishna-Godavari, Rovuma LNG
- [x] Lithium — Atacama/Uyuni/Hombre Muerto/Olaroz triangle, Greenbushes, Pilgangoora, Qinghai/Tibet brines, Bikita, Manono, Thacker Pass
- [x] Copper — Chilean belt, Cerro Verde, Antamina, Oyu Tolgoi, Grasberg, Katanga & Zambian copperbelts, Kamoa-Kakula, Reko Diq
- [x] Iron ore — Pilbara/Hamersley, Carajás, Iron Quadrangle, Simandou, Kursk, Krivbas, Anshan
- [x] Rare earths — Bayan Obo, Sichuan, Mountain Pass, Mount Weld, Kvanefjeld, Lovozero
- [x] Uranium — Kazakh ISR, Athabasca, McArthur River, Arlit, Husab/Rössing, Olympic Dam
- [x] Cobalt — Katanga, Murrin Murrin, Sorowako, Norilsk

**Conflict & live signals**
- [x] Editorial conflict synopses + violence density heatmap (year-aware via sinceY/untilY)
- [x] Iran/Israel-Iran direct exchanges 2024–2025 + 12-Day War, Lebanon-Hezbollah 2024, Red Sea/Houthi maritime war
- [x] UCDP conflict feed (weekly GitHub Action → committed GeoJSON)
- [x] GDELT news-pulse — GKG 2.0 data-lake migration, granular geocoded mentions snapped to ~0.5° grid (6-hourly Action)
- [x] Precipitation radar (RainViewer, 10-min frames)

**Time slider**
- [x] YEAR 2000 → LIVE, year-aware lookups for fills, stats, traders, V-Dem, nuclear warheads, conflicts
- [x] Country stat-sheet refreshes on year change and shows the active map mode's indicator
- [x] World Bank forward-fill cache for publish lag (renewables, gini, milex)

**Interaction modes (on click)**
- [x] Ally highlight (defense + economic blocs + bilateral pacts)
- [x] Adversary highlight
- [x] Military bases (Lostfields/Vine 2021 host list)

**Data / ops**
- [x] World Bank coverage ~165 countries
- [x] Auto-updaters: conflict (UCDP, weekly), power index (World Bank, weekly), news pulse (GDELT GKG, 6-hourly), V-Dem libdem + freexp (monthly), PortWatch (weekly), history snapshots 2000–present
- [x] Workflow push-race tolerance: rebase-retry loop in every Action so concurrent runs don't deadlock
- [x] Boot defaults: nothing painted on top of the globe, every rail section collapsed — user picks the lens

### Next up (priority order)
- [ ] **Editorial interstate-tension layer** — heat + arcs you control (independent of UCDP)
- [ ] **Flat equal-area export** (Equal Earth / Robinson) for article screenshots
- [ ] More fills: regime type, economic tier
- [ ] More zones: Cohen's realms (full taxonomy, not just shatterbelts)
- [ ] Flow layers: undersea cables, energy pipelines, trade gravity
- [ ] Context: population density, EEZs / maritime zones, disputed-territory overlay
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

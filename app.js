/* ============================================================================
   GEOSTRAT  —  application logic
   You normally won't need to edit this file. Classifications live in /data.
   This wires the data to the globe, builds the control rail, and handles
   clicks, telemetry, and the auto-spin.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- palette ---------------------------------------------------------- */
  var TIER_COLOR = {
    hegemon: "#FFD633", great: "#F07F2E", regional: "#C0392B",
    middle: "#4E88A6", small: "#3B5266", unclassified: "#2A3343"
  };
  var TIER_LABEL = {
    hegemon: "Hegemon", great: "Great power", regional: "Regional power",
    middle: "Middle power", small: "Small state", unclassified: "Unclassified"
  };
  var ROLE_LABEL = { agent: "Geostrategic player (agent)", pivot: "Geopolitical pivot", "": "—" };
  var BLOCS = [
    // defense & security
    { key: "nato", label: "NATO", color: "#4DA3FF", group: "def" },
    { key: "csto", label: "CSTO", color: "#E84393", group: "def" },
    { key: "sco", label: "SCO", color: "#FF9F43", group: "def" },
    { key: "aukus", label: "AUKUS", color: "#00CEC9", group: "def" },
    { key: "fiveEyes", label: "Five Eyes", color: "#A29BFE", group: "def" },
    { key: "quad", label: "QUAD (dialogue)", color: "#2ECC71", group: "def" },
    // economic & political
    { key: "eu", label: "European Union", color: "#B57EDC", group: "eco" },
    { key: "brics", label: "BRICS", color: "#FF6B6B", group: "eco" },
    { key: "eaeu", label: "EAEU", color: "#B33939", group: "eco" },
    { key: "asean", label: "ASEAN", color: "#F5D547", group: "eco" },
    { key: "gcc", label: "GCC", color: "#16A085", group: "eco" },
    { key: "arabLeague", label: "Arab League", color: "#A3CB38", group: "eco" },
    { key: "au", label: "African Union", color: "#D4915D", group: "eco" },
    { key: "opecPlus", label: "OPEC+", color: "#E1B12C", group: "eco" },
    { key: "mercosur", label: "Mercosur", color: "#74B9FF", group: "eco" },
    { key: "commonwealth", label: "Commonwealth", color: "#8FBF9F", group: "eco" },
    { key: "oas", label: "OAS", color: "#E8836F", group: "eco" }
  ];

  /* ---- theming ----------------------------------------------------------
     Two themes. "dark" is the original situation-room palette. "light" is
     Vellum: cream land, celadon sea, bronze chrome. Only the properties that
     genuinely have to invert are themed - saturated data colours (bloc
     outlines, pipelines, theory zones) read acceptably on both grounds.

     Light mode hides the CARTO raster basemap entirely and draws land as a
     flat cream fill from the countries source, with a hairline coastline.
     That gives exact palette control instead of tinting raster tiles - the
     tradeoff is no basemap texture or hillshade detail in light mode. */
  var THEMES = {
    dark: {
      space: "#0B1020", landBase: "#131C30", coast: "#2b3a55", borders: "#2b3a55",
      halo: "#0B1020", label: "#E8E6DF", labelDim: "#A8B2C4",
      labelWarm: "#E8C98A", labelTeal: "#6FE3D4", labelGreen: "#3FE08A",
      nodata: "#222C3B", raster: "visible", landBaseOpacity: 0
    },
    light: {
      space: "#D8E5D3", landBase: "#FAF6EC", coast: "#9A8F7A", borders: "#B9AE96",
      halo: "#FAF6EC", label: "#332C20", labelDim: "#6B6252",
      labelWarm: "#7A5A0E", labelTeal: "#1A5E52", labelGreen: "#2E6B2C",
      nodata: "#E0DACC", raster: "none", landBaseOpacity: 1
    }
  };

  /* Score bands - identical in both themes so the map and the country dossier
     always speak the same language. Absolute thresholds on a 0-100 scale.
     V-Dem indices are 0-1 interval scales rendered x100: not percentages,
     not percentiles. */
  var BANDS = [
    { max: 20, color: "#A8342E", label: "0–20" },
    { max: 40, color: "#C0701A", label: "20–40" },
    { max: 60, color: "#BFA318", label: "40–60" },
    { max: 80, color: "#2E6B2C", label: "60–80" },
    { max: Infinity, color: "#2A6497", label: "80–100" }
  ];
  function bandColor(v) {
    if (v == null || v < 0) return null;          // no data - never a red bar
    for (var i = 0; i < BANDS.length; i++) if (v < BANDS[i].max) return BANDS[i].color;
    return BANDS[BANDS.length - 1].color;
  }

  var THEME_NAME = "dark";
  try {
    var saved = localStorage.getItem("geostrat:theme");
    if (saved === "light" || saved === "dark") THEME_NAME = saved;
  } catch (e) { /* private browsing - fall back to dark */ }
  function TH(k) { return THEMES[THEME_NAME][k]; }

  /* Registry of paint properties that follow the theme: [layerId, prop, key].
     Most entries are auto-registered by matching known dark literals, so the
     ~100 hardcoded colours downstream don't each need hand-editing. */
  var THEMED_PAINT = [];
  function themed(layer, prop, key) { THEMED_PAINT.push([layer, prop, key]); }

  /* Score-band fill expression for a 0-100 property. `step` not `interpolate`:
     the bands are discrete and must not blend into each other. */
  function bandFill(prop) {
    var e = ["step", ["get", prop], TH("nodata"), 0, BANDS[0].color];
    for (var i = 0; i < BANDS.length - 1; i++) e.push(BANDS[i].max, BANDS[i + 1].color);
    return e;
  }
  var BAND_FILL_LAYERS = { "fill-vdem": "vdem", "fill-freexp": "freexp" };

  var byId = function (id) { return document.getElementById(id); };

  var COUNTRIES_GEO = null;   // decorated polygons, kept so live data can update them
  var COUNTRY_POINTS_GEO = null; // one point per country for proportional-symbol stats
  var POWER_BY_NAME = {};
  var VDEM = null; // {year:{name:score0-100}}     // World Bank stats + composite, keyed by country name
  function powerOf(name) {
    var v = POWER_BY_NAME[name];
    if (typeof v === "number") return { composite: v };  // tolerate old file shape
    return v || {};
  }

  /* ---- name join: map your readable names <-> world-map names ----------- */
  var nameIndex = {};
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  }
  function buildIndex() {
    var keys = {};
    Object.keys(window.COUNTRY_TIERS || {}).forEach(function (k) { keys[k] = 1; });
    Object.keys(window.COUNTRY_ROLES || {}).forEach(function (k) { keys[k] = 1; });
    Object.keys(window.MEMBERSHIPS || {}).forEach(function (b) {
      (window.MEMBERSHIPS[b] || []).forEach(function (k) { keys[k] = 1; });
    });
    // domain-only countries (e.g. North Korea sits in RIMLAND/NUCLEAR but in
    // no tier/role/bloc) must still be canonicalised, or their special-layer
    // membership flags never fire.
    [window.RIMLAND, window.RIMLAND_OFFSHORE, window.NUCLEAR,
     window.USBASE_HOSTS, Object.keys(window.NUCLEAR_INFO || {}),
     Object.keys(window.NAME_ALIASES || {})].forEach(function (list) {
      (list || []).forEach(function (k) { keys[k] = 1; });
    });
    Object.keys(keys).forEach(function (k) {
      nameIndex[norm(k)] = k;
      ((window.NAME_ALIASES || {})[k] || []).forEach(function (a) { nameIndex[norm(a)] = k; });
    });
  }
  function canonical(name) { return nameIndex[norm(name)] || null; }

  /* ---- fix polygons crossing the 180° meridian (Russia, Fiji, …) ---------
     On a globe these smear into a wedge across the Arctic. We split each
     crossing polygon at the antimeridian. Per-feature try/catch means a
     failure just leaves that country untouched rather than breaking the map. */
  function amCrosses(ring) {
    for (var i = 1; i < ring.length; i++)
      if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) return true;
    return false;
  }
  function amUnwrap(ring) {
    var out = [ring[0].slice()], prev = ring[0][0];
    for (var i = 1; i < ring.length; i++) {
      var lng = ring[i][0];
      while (lng - prev > 180) lng -= 360;
      while (lng - prev < -180) lng += 360;
      out.push([lng, ring[i][1]]); prev = lng;
    }
    return out;
  }
  function amClip(ring, leftSide) {
    var res = [], n = ring.length;
    for (var i = 0; i < n; i++) {
      var cur = ring[i], nxt = ring[(i + 1) % n];
      var curIn = leftSide ? cur[0] <= 180 : cur[0] >= 180;
      var nxtIn = leftSide ? nxt[0] <= 180 : nxt[0] >= 180;
      if (curIn) res.push(cur);
      if (curIn !== nxtIn) {
        var t = (180 - cur[0]) / (nxt[0] - cur[0]);
        res.push([180, cur[1] + t * (nxt[1] - cur[1])]);
      }
    }
    return res;
  }
  function amClose(r) {
    if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0].slice());
    return r;
  }
  function amSplit(outer) {
    var uw = amUnwrap(outer);
    var left = amClose(amClip(uw, true));
    var right = amClose(amClip(uw, false).map(function (p) { return [p[0] - 360, p[1]]; }));
    var res = [];
    if (left.length >= 4) res.push(left);
    if (right.length >= 4) res.push(right);
    return res;
  }
  function fixAntimeridian(f) {
    try {
      var g = f.geometry;
      if (!g) return f;
      var polys = g.type === "Polygon" ? [g.coordinates]
                : g.type === "MultiPolygon" ? g.coordinates : null;
      if (!polys) return f;
      var out = [];
      polys.forEach(function (rings) {
        if (amCrosses(rings[0])) amSplit(rings[0]).forEach(function (r) { out.push([r]); });
        else out.push(rings);
      });
      f.geometry = { type: "MultiPolygon", coordinates: out };
    } catch (e) { /* leave feature unchanged */ }
    return f;
  }

  /* ---- the globe -------------------------------------------------------- */
  var style = {
    version: 8,
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    projection: { type: "globe" },
    sky: { "atmosphere-blend": 0.55 },
    sources: {
      base: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO"
      },
      dem: {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        encoding: "terrarium", tileSize: 256, maxzoom: 13,
        attribution: "Elevation: Mapzen / AWS Terrain Tiles"
      }
    },
    layers: [
      { id: "space", type: "background", paint: { "background-color": THEMES[THEME_NAME].space } },
      { id: "base", type: "raster", source: "base",
        layout: { visibility: THEMES[THEME_NAME].raster } },
      { id: "hillshade", type: "hillshade", source: "dem", paint: {
          "hillshade-exaggeration": 0.45,
          "hillshade-shadow-color": "#05070d",
          "hillshade-highlight-color": "#3a4a63",
          "hillshade-accent-color": "#0B1020"
      } }
    ]
  };

  var map = new maplibregl.Map({
    container: "map", style: style, center: [20, 25], zoom: 1.7,
    minZoom: 0.7, maxZoom: 12, renderWorldCopies: false,
    attributionControl: false
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

  /* ---- state ------------------------------------------------------------ */
  var state = {
    hillshade: false, fill: "none", stat: "none", statMode: "ring",
    heat: false, heartland: false, rimland: false, nuclear: false,
    chokepoints: false, newspulse: false, lanes: false, portwatch: false, bri: false,
    allymode: false, advmode: false, basesmode: false, flat: false, islandchains: false, pearls: false, shatter: false, radar: false, clouds: false, deltas: false, terrain3d: false,
    pipelines: false, flowarcs: false, chokestress: false, caspian: false,
    worldisland: false, panregions: false, cropland: false, wheat: false, rice: false
  };
  BLOCS.forEach(function (b) { state[b.key] = false; });
  (window.RESOURCE_TYPES || []).forEach(function (t) { state["res" + t[0]] = false; });

  function setVis(id, on) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  }

  /* ---- boot ------------------------------------------------------------- */
  map.on("load", function () { boot(); });

  function fail(msg) {
    var ov = byId("overlay");
    ov.classList.add("error");
    byId("overlay-msg").innerHTML = msg;
  }

  /* Walk the built style once and register every paint property whose value is
     a known dark-theme literal. This is why ~100 hardcoded colours downstream
     didn't each need hand-editing: near-white labels, ink halos and pale lines
     are the only ones that actually break on cream, and they're identifiable
     by value. Expression-valued paints (arrays) are skipped deliberately —
     those are saturated data colours that read on both grounds. */
  function autoRegisterThemedPaint() {
    var VALUE_KEY = {
      "#0B1020": "halo",
      "#E8E6DF": "label",
      "#A8B2C4": "labelDim",
      "#E8C98A": "labelWarm",
      "#FFE6B8": "labelWarm",
      "#FFE2A8": "labelWarm",
      "#6FE3D4": "labelTeal",
      "#7FE3D6": "labelTeal",
      "#3FE08A": "labelGreen"
    };
    var PROPS = ["text-halo-color", "text-color", "icon-halo-color",
                 "line-color", "circle-color"];
    var layers;
    try { layers = map.getStyle().layers || []; } catch (e) { return; }
    layers.forEach(function (L) {
      var p = L.paint || {};
      PROPS.forEach(function (prop) {
        var v = p[prop];
        if (typeof v === "string" && VALUE_KEY[v]) themed(L.id, prop, VALUE_KEY[v]);
      });
    });
  }

  function applyTheme(name) {
    THEME_NAME = THEMES[name] ? name : "dark";
    document.documentElement.setAttribute("data-theme", THEME_NAME);
    try { localStorage.setItem("geostrat:theme", THEME_NAME); } catch (e) {}

    if (map.getLayer("space")) {
      map.setPaintProperty("space", "background-color", TH("space"));
    }
    if (map.getLayer("base")) {
      map.setLayoutProperty("base", "visibility", TH("raster"));
    }
    // hillshade is raster-derived terrain shading; it only makes sense over
    // the dark basemap, and reads as dirt on cream.
    if (map.getLayer("hillshade")) {
      map.setLayoutProperty("hillshade", "visibility",
        (THEME_NAME === "dark" && state.hillshade) ? "visible" : "none");
    }

    THEMED_PAINT.forEach(function (entry) {
      if (!map.getLayer(entry[0])) return;
      try { map.setPaintProperty(entry[0], entry[1], TH(entry[2])); } catch (e) {}
    });

    // score-band fills carry the themed no-data colour inside their expression,
    // so they need the whole expression rebuilt rather than a single stop.
    Object.keys(BAND_FILL_LAYERS).forEach(function (id) {
      if (!map.getLayer(id)) return;
      try { map.setPaintProperty(id, "fill-color", bandFill(BAND_FILL_LAYERS[id])); } catch (e) {}
    });

    var btn = byId("t-theme");
    if (btn) btn.innerHTML = THEME_NAME === "dark" ? "LIGHT ☀" : "DARK ☾";
    if (typeof updateLegend === "function") updateLegend();
    if (typeof refreshCard === "function") refreshCard();
    if (typeof refreshIndexPanels === "function") refreshIndexPanels();
  }

  function boot() {
    buildIndex();
    POWER_BY_NAME = window.POWER_INDEX || {};

    var COUNTRIES_50M = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
    var COUNTRIES_10M = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json";
    fetch(COUNTRIES_50M)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (topo) {
        if (typeof topojson === "undefined") throw new Error("topojson decoder did not load");
        var geo = topojson.feature(topo, topo.objects.countries);
        geo.features = geo.features.map(fixAntimeridian);
        COUNTRIES_GEO = geo;
        decorate(geo);
        addLayers(geo);
        autoRegisterThemedPaint();
        applyTheme(THEME_NAME);
        refreshConflict();
        refreshPower();
        refreshNewspulse();
        refreshPortwatch();
        fetch("data/vdem.json", { cache: "no-store" })
          .then(function (r) { if (r.ok) return r.json(); throw 0; })
          .then(function (d) { VDEM = d; clearRankCache(); applyYear(); refreshIndexPanels(); })
          .catch(function () {});
        buildRail();
        wireInteraction();
        restoreIndexPanels();
        byId("overlay").classList.add("hide");
        // Background upgrade: swap to 10m geometry for crisper bloc outlines
        // and coastlines once the initial 50m paint is on screen. Idle-time
        // scheduling so it doesn't delay first interaction.
        var schedule = window.requestIdleCallback ||
          function (fn) { return setTimeout(fn, 350); };
        schedule(function () { upgradeTo10m(COUNTRIES_10M); });
      })
      .catch(function (err) {
        fail("Couldn't load the world map data.<br><br>If you opened this file by double-clicking it, " +
             "your browser is blocking the download — publish it to GitHub Pages (or run a local server) " +
             "and it will work.<br><br><span style='opacity:.6'>" + (err && err.message) + "</span>");
      });
  }

  // Fetch the higher-resolution Natural Earth (10m) layer in the background and
  // swap it into the existing "countries" source. All decorated properties are
  // re-derived from the same name-join, so fills, filters, click handlers,
  // year-gated logic, and stat rings continue to work after the swap.
  function upgradeTo10m(url) {
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (topo) {
        if (typeof topojson === "undefined" || !topo || !topo.objects) return;
        var key = topo.objects.countries ? "countries" : Object.keys(topo.objects)[0];
        var geo = topojson.feature(topo, topo.objects[key]);
        geo.features = geo.features.map(fixAntimeridian);
        COUNTRIES_GEO = geo;
        decorate(geo);
        var src = map.getSource("countries");
        if (src) src.setData(geo);
        // recompute centroids for stat rings, names, nuclear labels
        COUNTRY_POINTS_GEO = buildCountryPoints(geo);
        var sp = map.getSource("country-points");
        if (sp) sp.setData(COUNTRY_POINTS_GEO);
        // any active fill/stat needs to re-resolve against the new features
        applyFill();
        if (state.stat !== "none") switchStat(state.stat);
        updateLegend();
      })
      .catch(function (e) { /* keep 50m on failure */ console.warn("10m upgrade skipped:", e && e.message); });
  }

  var CUR_YEAR = 2026;
  /* attach classifications to each country polygon */
  function membershipListAt(b, year) {
    var list = (window.MEMBERSHIPS[b] || []).slice();
    var ch = (window.MEMBERSHIP_CHANGES || {})[b] || {};
    if (ch.founded && year < ch.founded) return [];
    if (ch.joins) list = list.filter(function (c) { return !(ch.joins[c] && ch.joins[c] > year); });
    if (ch.leaves) Object.keys(ch.leaves).forEach(function (c) {
      if (year < ch.leaves[c] && list.indexOf(c) < 0) list.push(c);
    });
    return list;
  }
  function inSet(b) { var s = {}; membershipListAt(b, CUR_YEAR).forEach(function (k) { s[k] = 1; }); return s; }
  // V-Dem lookup that tolerates both the new nested shape ({libdem:{year:{...}},
  // freexp:{...}}) and the legacy flat-by-year shape ({year:{...}}, libdem only).
  function vdemAt(metric, year, name) {
    if (!VDEM) return -1;
    var idx = VDEM[metric];
    if (!idx) {
      // legacy shape — only libdem is available, no freexp until next workflow.
      if (metric !== "libdem") return -1;
      idx = VDEM;
    }
    var y = String(Math.min(year, 2025));
    var vy = idx[y] || idx[String(year - 1)];
    return (vy && vy[name] !== undefined) ? vy[name] : -1;
  }

  /* V-Dem core five, in dossier display order. All are 0-1 interval scales
     rendered x100 by the fetch script - not percentages, not percentiles. */
  var VDEM_INDICES = [
    { key: "polyarchy", label: "Electoral democracy" },
    { key: "libdem",    label: "Liberal democracy" },
    { key: "partipdem", label: "Participatory" },
    { key: "delibdem",  label: "Deliberative" },
    { key: "egaldem",   label: "Egalitarian" }
  ];
  // Regimes of the World (v2x_regime) — ordinal, so it shares the score ramp
  // rather than needing its own colour scheme.
  var REGIME_LABEL = ["Closed autocracy", "Electoral autocracy",
                      "Electoral democracy", "Liberal democracy"];

  /* Ranks are computed in the browser and memoised by metric+year rather than
     baked into vdem.json — ~180 rows sort in well under a millisecond, and
     precomputing would multiply the file by year and metric for no gain. */
  var RANK_CACHE = {};
  function clearRankCache() { RANK_CACHE = {}; }
  function rankTable(metric, year) {
    var ck = metric + ":" + year;
    if (RANK_CACHE[ck]) return RANK_CACHE[ck];
    var idx = VDEM && (VDEM[metric] || (metric === "libdem" && !VDEM.libdem ? VDEM : null));
    var rows = [];
    if (idx) {
      var y = String(Math.min(year, 2025));
      var vy = idx[y] || idx[String(year - 1)] || {};
      Object.keys(vy).forEach(function (n) {
        var v = vy[n];
        if (typeof v === "number" && v >= 0) rows.push({ name: n, value: v });
      });
    }
    rows.sort(function (a, b) {
      return b.value - a.value || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    var byName = {};
    for (var i = 0; i < rows.length; i++) {
      // competition ranking: ties share a rank, the next rank skips accordingly
      rows[i].rank = (i > 0 && rows[i].value === rows[i - 1].value)
        ? rows[i - 1].rank : i + 1;
      byName[rows[i].name] = rows[i];
    }
    RANK_CACHE[ck] = { rows: rows, byName: byName, total: rows.length };
    return RANK_CACHE[ck];
  }
  // Year-aware top trade partner. Static data.TRADE_PARTNER is the current
  // partner ("us"/"china"); TRADE_PARTNER_CHANGES[name] gives the year of
  // the most recent flip — before that year, the lookup returns the
  // opposite partner. Countries not in the changes table are assumed to
  // have held their current partner throughout the slider window.
  function traderAt(name, year) {
    var cur = (window.TRADE_PARTNER || {})[name];
    if (!cur) return "none";
    var flip = (window.TRADE_PARTNER_CHANGES || {})[name];
    if (flip && year < flip) return cur === "us" ? "china" : "us";
    return cur;
  }
  function whAt(name, year) {
    var ni = (window.NUCLEAR_INFO || {})[name];
    if (!ni) return 0;
    var v = 0;
    (ni.hist || [[year, ni.wh]]).forEach(function (h) { if (h[0] <= year) v = h[1]; });
    return v || (ni.hist && ni.hist[0] && year >= ni.hist[0][0] ? ni.hist[0][1] : (year >= 2016 ? ni.wh : 0));
  }
  function conflictsAt(name, year) {
    return (window.CONFLICTS || []).filter(function (cf) {
      return cf.parties.indexOf(name) >= 0 &&
             (cf.sinceY || 0) <= year && year <= (cf.untilY || 9999);
    });
  }
  function listSet(arr) { var s = {}; (arr || []).forEach(function (k) { s[k] = 1; }); return s; }
  function decorate(geo) {
    var blocSets = {};
    BLOCS.forEach(function (b) { blocSets[b.key] = inSet(b.key); });
    var rim = listSet(window.RIMLAND), nuc = listSet(window.NUCLEAR);
    geo.features.forEach(function (f) {
      var raw = f.properties && f.properties.name;
      var key = canonical(raw);
      f.properties = f.properties || {};
      f.properties.cname = key || raw || "Unknown";
      f.properties.tier = (key && window.COUNTRY_TIERS[key]) || "unclassified";
      f.properties.role = (key && window.COUNTRY_ROLES[key]) || "";
      BLOCS.forEach(function (b) { f.properties[b.key] = !!(key && blocSets[b.key][key]); });
      f.properties.rimland = !!(key && rim[key]);
      f.properties.nuclear = !!(key && nuc[key]);
      var ni = (window.NUCLEAR_INFO || {})[f.properties.cname];
      var nwh = whAt(f.properties.cname, CUR_YEAR);
      f.properties.nuclear = f.properties.nuclear && nwh > 0;
      f.properties.nicbm = !!(ni && ni.icbm && !(ni.icbmY && ni.icbmY > CUR_YEAR));
      f.properties.nh = !!(ni && ni.h && !(ni.hY && ni.hY > CUR_YEAR));
      var st = powerOf(f.properties.cname);
      f.properties.composite = st.composite || 0;
      f.properties.renew = st.renew || 0;
      // Choropleth fills (fill-stat-*) and the older fill-milex layer both
      // read these properties; keep them in sync via the same World Bank
      // record so the country source backs every paint expression.
      f.properties.milex = st.milex || 0;
      f.properties.milexv = st.milex || 0;
      f.properties.milper = st.milper || 0;
      f.properties.pop = st.pop || 0;
      f.properties.gdp = st.gdp || 0;
      f.properties.gdppc = st.gdppc || 0;
      f.properties.gini = (st.gini === undefined ? -1 : st.gini);
      f.properties.trade = (st.trade === undefined ? -999 : st.trade);
      f.properties.arable = (st.arable === undefined ? -1 : st.arable);
      f.properties.relig = (window.RELIGION || {})[f.properties.cname] || "none";
      f.properties.trader = traderAt(f.properties.cname, CUR_YEAR);
      f.properties.vdem = vdemAt("libdem", CUR_YEAR, f.properties.cname);
      f.properties.freexp = vdemAt("freexp", CUR_YEAR, f.properties.cname);
      VDEM_INDICES.forEach(function (m) {
        f.properties["vd_" + m.key] = vdemAt(m.key, CUR_YEAR, f.properties.cname);
      });
      f.properties.regime = vdemAt("regime", CUR_YEAR, f.properties.cname);
      f.properties.usbase = (window.USBASE_HOSTS || []).indexOf(f.properties.cname) >= 0;
      f.properties.oil = (window.OIL_PRODUCTION || {})[st.iso3 || ""] || 0;
      f.properties.offshore = !!(key && listSet(window.RIMLAND_OFFSHORE)[key]);
      var cfs = conflictsAt(f.properties.cname, CUR_YEAR);
      f.properties.conflict = cfs.length ? cfs[0].type : "";
    });
  }

  function fc(features) { return { type: "FeatureCollection", features: features }; }

  function centroid(geom) {
    var polys = geom && geom.type === "Polygon" ? [geom.coordinates]
              : geom && geom.type === "MultiPolygon" ? geom.coordinates : [];
    var best = null, bestN = 0;
    polys.forEach(function (rings) {
      var ring = rings[0];
      if (ring && ring.length > bestN) { bestN = ring.length; best = ring; }
    });
    if (!best) return null;
    var sx = 0, sy = 0;
    best.forEach(function (p) { sx += p[0]; sy += p[1]; });
    return [sx / best.length, sy / best.length];
  }
  function buildCountryPoints(geo) {
    var feats = [];
    geo.features.forEach(function (f) {
      var c = centroid(f.geometry);
      if (!c) return;
      var st = powerOf(f.properties.cname);
      feats.push({ type: "Feature",
        properties: { cname: f.properties.cname, pop: st.pop || 0, gdp: st.gdp || 0,
          gdppc: st.gdppc || 0, milex: st.milex || 0, milper: st.milper || 0,
          renew: st.renew || 0, r: 0,
          freexp: vdemAt("freexp", CUR_YEAR, f.properties.cname),
          nwh: whAt(f.properties.cname, CUR_YEAR) },
        geometry: { type: "Point", coordinates: c } });
    });
    return fc(feats);
  }

  function addLayers(geo) {
    map.addSource("countries", { type: "geojson", data: geo });
    map.addSource("conflict", { type: "geojson", data: window.CONFLICT_POINTS });
    map.addSource("zone-heartland", { type: "geojson", data: window.THEORY_ZONES.heartland });
    map.addSource("chokepoints", {
      type: "geojson",
      data: fc((window.CHOKEPOINTS || []).map(function (c) {
        return { type: "Feature", properties: { name: c.name },
                 geometry: { type: "Point", coordinates: [c.lng, c.lat] } };
      }))
    });
    map.addSource("newspulse", { type: "geojson", data: window.NEWSPULSE || fc([]) });
    map.addSource("lanes", { type: "geojson", data: fc((window.SHIPPING_LANES || []).map(function (r) {
      return { type: "Feature", properties: { name: r.name, w: r.w },
               geometry: { type: "MultiLineString", coordinates: r.segments } };
    })) });
    map.addSource("portwatch", { type: "geojson", data: fc([]) });
    map.addSource("bri", { type: "geojson", data: fc((window.BRI_CORRIDORS || []).map(function (r) {
      return { type: "Feature", properties: { name: r.name, w: r.w, status: r.status || "completed" },
               geometry: { type: "MultiLineString", coordinates: r.segments } };
    })) });
    map.addSource("bri-pois", { type: "geojson", data: fc((window.BRI_POIS || []).map(function (p) {
      return { type: "Feature", properties: { kind: p.kind, name: p.name },
               geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
    })) });
    COUNTRY_POINTS_GEO = buildCountryPoints(geo);
    map.addSource("country-points", { type: "geojson", data: COUNTRY_POINTS_GEO });

    // land base — flat cream landmass for the light theme. Sits above the
    // raster basemap and below every choropleth, so paint order is unchanged.
    // Opacity 0 in dark mode leaves the raster basemap showing through.
    map.addLayer({ id: "land-base", type: "fill", source: "countries",
      paint: { "fill-color": TH("landBase"), "fill-opacity": TH("landBaseOpacity") } });
    themed("land-base", "fill-color", "landBase");
    themed("land-base", "fill-opacity", "landBaseOpacity");

    // coastline hairline — separates land from sea regardless of how close the
    // choropleth band and the sea colour get. Light theme only.
    map.addLayer({ id: "coastline", type: "line", source: "countries",
      paint: { "line-color": TH("coast"), "line-width": 0.5,
               "line-opacity": TH("landBaseOpacity") } });
    themed("coastline", "line-color", "coast");
    themed("coastline", "line-opacity", "landBaseOpacity");

    // power-tier fill
    map.addLayer({ id: "fill-tier", type: "fill", source: "countries",
      paint: { "fill-color": ["match", ["get", "tier"],
        "hegemon", TIER_COLOR.hegemon, "great", TIER_COLOR.great, "regional", TIER_COLOR.regional,
        "middle", TIER_COLOR.middle, "small", TIER_COLOR.small, TIER_COLOR.unclassified],
        "fill-opacity": 0.55 },
      layout: { visibility: "visible" } });

    // agent / pivot fill
    map.addLayer({ id: "fill-role", type: "fill", source: "countries",
      paint: { "fill-color": ["match", ["get", "role"],
        "agent", "#3FA37A", "pivot", "#D98AE0", "rgba(0,0,0,0)"],
        "fill-opacity": 0.6 },
      layout: { visibility: "none" } });

    // computed power composite (World Bank) — continuous ramp
    map.addLayer({ id: "fill-power", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "composite"],
        0, "#2A3343", 0.01, "#5B4A22", 0.03, "#8A6A1E",
        0.06, "#C28A2A", 0.12, "#F0A83C", 0.2, "#FFD633"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // renewables — % of electricity output, green ramp
    map.addLayer({ id: "fill-renew", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "renew"],
        0, "#58708F", 25, "#46946E", 50, "#3AB374", 75, "#3FD685", 100, "#7CFFB0"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // military spending fill (USD, log-ish stops)
    map.addLayer({ id: "fill-milex", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "milexv"],
        0, "#3B4D63", 1e9, "#8A7245", 1e10, "#C28A35", 6e10, "#E89A3D", 3e11, "#FF9A4D", 9e11, "#FFD633"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // Gini inequality fill (missing = -1 stays dark)
    map.addLayer({ id: "fill-gini", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "gini"],
        -1, "#2A3343", 25, "#4E88A6", 35, "#C9A227", 45, "#E8843D", 55, "#E84393"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // trade balance fill (diverging; missing = -999 dark)
    map.addLayer({ id: "fill-trade", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "trade"],
        -999, "#2A3343", -20, "#FF5C8A", -8, "#D96A57", 0, "#8A93A6", 8, "#4ECB7E", 20, "#3FE08A"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // majority religion fill
    map.addLayer({ id: "fill-religion", type: "fill", source: "countries",
      paint: { "fill-color": ["match", ["get", "relig"],
        "christian", "#6C8EBF", "muslim", "#3FA37A", "hindu", "#E8843D",
        "buddhist", "#C9A227", "jewish", "#5BC8FF", "folk", "#B57EDC",
        "unaffiliated", "#8A93A6", "#2A3343"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // top trade partner: US vs China
    map.addLayer({ id: "fill-trader", type: "fill", source: "countries",
      paint: { "fill-color": ["match", ["get", "trader"],
        "us", "#4DA3FF", "china", "#FF4D4D", "#222C3B"], "fill-opacity": 0.6 },
      layout: { visibility: "none" } });

    // V-Dem fills — five discrete score bands, the same ones the country
    // dossier bars use. `bandFill` builds a step expression, so a country at
    // 59 and one at 61 read as different bands rather than a smooth blend.
    map.addLayer({ id: "fill-vdem", type: "fill", source: "countries",
      paint: { "fill-color": bandFill("vdem"), "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    map.addLayer({ id: "fill-freexp", type: "fill", source: "countries",
      paint: { "fill-color": bandFill("freexp"), "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // Arable land — % of land area (World Bank AG.LND.ARBL.ZS); missing = -1 dark
    map.addLayer({ id: "fill-arable", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "arable"],
        -1, "#222C3B", 0, "#23331F", 10, "#3E5A2A", 25, "#6E8F38", 40, "#A8C24A", 60, "#E4E86A"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // US military footprint: host countries + base points
    map.addLayer({ id: "fill-usbases", type: "fill", source: "countries",
      filter: ["==", ["get", "usbase"], true],
      paint: { "fill-color": "#C0392B", "fill-opacity": 0.45 },
      layout: { visibility: "none" } });

    // active conflicts fill
    map.addLayer({ id: "fill-conflict", type: "fill", source: "countries",
      paint: { "fill-color": ["match", ["get", "conflict"],
        "interstate", "#FF4D4D", "intl-civil", "#E8843D", "civil", "#C9A227", "#222C3B"],
        "fill-opacity": 0.6 },
      layout: { visibility: "none" } });

    // Spykman offshore islands (shown with Rimland toggle)
    map.addLayer({ id: "offshore-fill", type: "fill", source: "countries",
      filter: ["==", ["get", "offshore"], true],
      paint: { "fill-color": "#7E93B8", "fill-opacity": 0.3 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "offshore-line", type: "line", source: "countries",
      filter: ["==", ["get", "offshore"], true],
      paint: { "line-color": "#7E93B8", "line-width": 1, "line-opacity": 0.55 },
      layout: { visibility: "none" } });

    // crisp borders
    map.addLayer({ id: "country-borders", type: "line", source: "countries",
      paint: { "line-color": TH("borders"), "line-width": 0.6, "line-opacity": 0.85 } });
    themed("country-borders", "line-color", "borders");

    // bloc outlines
    BLOCS.forEach(function (b) {
      map.addLayer({ id: "bloc-" + b.key, type: "line", source: "countries",
        filter: ["==", ["get", b.key], true],
        paint: { "line-color": b.color, "line-width": 2, "line-opacity": 0.9 },
        layout: { visibility: "none" } });
    });

    // theory zone
    map.addLayer({ id: "zone-heartland-fill", type: "fill", source: "zone-heartland",
      paint: { "fill-color": "#E8A33D", "fill-opacity": 0.12 }, layout: { visibility: "none" } });
    map.addLayer({ id: "zone-heartland-line", type: "line", source: "zone-heartland",
      paint: { "line-color": "#E8A33D", "line-width": 1.4, "line-dasharray": [2, 2], "line-opacity": 0.7 },
      layout: { visibility: "none" } });

    // Spykman Rimland — tan country fill (stackable highlight)
    map.addLayer({ id: "rimland-fill", type: "fill", source: "countries",
      filter: ["==", ["get", "rimland"], true],
      paint: { "fill-color": "#C8B08A", "fill-opacity": 0.38 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "rimland-line", type: "line", source: "countries",
      filter: ["==", ["get", "rimland"], true],
      paint: { "line-color": "#C8B08A", "line-width": 1, "line-opacity": 0.6 },
      layout: { visibility: "none" } });

    // Nuclear weapons states — green diagonal hatch
    (function () {
      var cv = document.createElement("canvas"); cv.width = 8; cv.height = 8;
      var ctx = cv.getContext("2d");
      ctx.strokeStyle = "#3FE08A"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, 10); ctx.lineTo(10, -2);
      ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
      ctx.moveTo(2, 14); ctx.lineTo(14, 2);
      ctx.stroke();
      if (!map.hasImage("nuclear-hatch")) map.addImage("nuclear-hatch", ctx.getImageData(0, 0, 8, 8));
    })();
    map.addLayer({ id: "nuclear-fill", type: "fill", source: "countries",
      filter: ["==", ["get", "nuclear"], true],
      paint: { "fill-pattern": "nuclear-hatch", "fill-opacity": 0.65 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "nuclear-line-icbm", type: "line", source: "countries",
      filter: ["all", ["==", ["get", "nuclear"], true], ["==", ["get", "nicbm"], true]],
      paint: { "line-color": ["case", ["get", "nh"], "#3FE08A", "#C9E84D"],
        "line-width": 2 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "nuclear-line-reg", type: "line", source: "countries",
      filter: ["all", ["==", ["get", "nuclear"], true], ["==", ["get", "nicbm"], false]],
      paint: { "line-color": ["case", ["get", "nh"], "#3FE08A", "#C9E84D"],
        "line-width": 2, "line-dasharray": [2, 1.6] },
      layout: { visibility: "none" } });

    // Shipping lanes — static arteries, flat slate, no glow.
    map.addLayer({ id: "lanes-core", type: "line", source: "lanes",
      paint: { "line-color": "#6E7790", "line-opacity": 0.35, "line-width": 1 },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });

    // PortWatch — live chokepoint traffic rings
    map.addLayer({ id: "portwatch-ring", type: "circle", source: "portwatch",
      paint: { "circle-radius": ["interpolate", ["linear"], ["get", "calls"], 0, 3, 30, 8, 80, 13, 200, 20],
        "circle-color": "#49C5B6", "circle-opacity": 0.15,
        "circle-stroke-color": "#6FE3D4", "circle-stroke-width": 1.6, "circle-stroke-opacity": 0.9 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "portwatch-label", type: "symbol", source: "portwatch",
      layout: { "text-field": ["concat", ["to-string", ["get", "calls"]], "/day"],
        "text-font": ["Open Sans Regular"], "text-size": 10,
        "text-offset": [0, 1.6], "text-anchor": "top", visibility: "none" },
      paint: { "text-color": "#6FE3D4", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // Belt and Road corridors: muted violet, dashed, thin.
    map.addLayer({ id: "bri-solid", type: "line", source: "bri",
      filter: ["==", ["get", "status"], "completed"],
      paint: { "line-color": "#A98DD0", "line-opacity": 0.55, "line-dasharray": [2, 2],
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 0.8, 10, 2] },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });
    map.addLayer({ id: "bri-dash", type: "line", source: "bri",
      filter: ["==", ["get", "status"], "planned"],
      paint: { "line-color": "#A98DD0", "line-opacity": 0.55, "line-dasharray": [2, 2],
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 0.8, 10, 2] },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });
    map.addLayer({ id: "bri-poi", type: "circle", source: "bri-pois",
      paint: { "circle-radius": ["match", ["get", "kind"], "port", 4.5, 3.5],
        "circle-color": ["match", ["get", "kind"], "port", "#E8A33D", "#E8E6DF"],
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.3 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "bri-poi-label", type: "symbol", source: "bri-pois",
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 10, "text-offset": [0, 0.9], "text-anchor": "top", visibility: "none" },
      paint: { "text-color": "#E8C98A", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // numeric labels for stats (rings + choropleth share the same labels).
    // y-offset is per-feature (text-em units, computed from the ring radius)
    // so the number always sits a small padding below the circle's bottom
    // edge rather than overlapping the ring like the previous fixed offset.
    map.addLayer({ id: "stat-labels", type: "symbol", source: "country-points",
      filter: ["!=", ["get", "lbl"], ""],
      layout: { "text-field": ["get", "lbl"], "text-font": ["Open Sans Regular"],
        "text-size": 10.5,
        "text-offset": ["literal", [0, 0]],   // overwritten per feature via lblOffset
        "text-radial-offset": ["coalesce", ["get", "lblOffset"], 1.5],
        "text-anchor": "top",
        "text-allow-overlap": false, "text-letter-spacing": 0.02,
        visibility: "none" },
      paint: { "text-color": "#FFE2A8", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });

    // conflict heatmap
    map.addLayer({ id: "conflict-heat", type: "heatmap", source: "conflict",
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 6, 1.4],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 3, 20, 6, 36],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(180,70,30,0.30)",
          0.45, "rgba(225,100,40,0.42)",
          0.7, "rgba(255,125,50,0.50)",
          1, "rgba(255,170,80,0.60)"],
        "heatmap-opacity": 0.7
      }, layout: { visibility: "visible" } });

    // proportional statistic rings (World Bank), one metric at a time —
    // hollow amber outlines so they float over any active country fill.
    map.addLayer({ id: "stat-circles", type: "circle", source: "country-points",
      paint: { "circle-radius": ["get", "r"],
        "circle-color": "#E8A33D", "circle-opacity": 0.05,
        "circle-stroke-color": "#E8A33D", "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.9 },
      layout: { visibility: "none" } });

    // per-statistic choropleth fills (active when statMode === "fill"). These
    // sit above the global Country fill layers so the user can switch from
    // floating rings to a clean full-country view of the same metric.
    var STAT_RAMPS = {
      pop: ["interpolate", ["linear"], ["get", "pop"],
        0, "#1E2A40", 5e6, "#2E5F66", 5e7, "#4DA38A", 2e8, "#E8A33D", 1.4e9, "#FFD633"],
      gdp: ["interpolate", ["linear"], ["get", "gdp"],
        0, "#1E2A40", 1e11, "#2E5F66", 1e12, "#4DA38A", 5e12, "#E8A33D", 2.5e13, "#FFD633"],
      gdppc: ["interpolate", ["linear"], ["get", "gdppc"],
        0, "#1E2A40", 2000, "#2E5F66", 12000, "#4DA38A", 40000, "#E8A33D", 90000, "#FFD633"],
      milex: ["interpolate", ["linear"], ["get", "milex"],
        0, "#3B4D63", 1e9, "#8A7245", 1e10, "#C28A35", 6e10, "#E89A3D", 3e11, "#FF9A4D", 9e11, "#FFD633"],
      milper: ["interpolate", ["linear"], ["get", "milper"],
        0, "#1E2A40", 50000, "#5B4A22", 250000, "#C28A2A", 1e6, "#F0A83C", 3e6, "#FFD633"],
      renew: ["interpolate", ["linear"], ["get", "renew"],
        0, "#58708F", 25, "#46946E", 50, "#3AB374", 75, "#3FD685", 100, "#7CFFB0"],
      freexp: ["interpolate", ["linear"], ["get", "freexp"],
        -1, "#222C3B", 0, "#3B1F4F", 25, "#6E2F8A", 50, "#A07AC4", 75, "#5BC8FF", 100, "#A8E8FF"]
    };
    Object.keys(STAT_RAMPS).forEach(function (m) {
      map.addLayer({ id: "fill-stat-" + m, type: "fill", source: "countries",
        paint: { "fill-color": STAT_RAMPS[m], "fill-opacity": 0.62 },
        layout: { visibility: "none" } },
        map.getLayer("country-borders") ? "country-borders" : undefined);
    });

    // chokepoints
    map.addLayer({ id: "chokepoint-dot", type: "circle", source: "chokepoints",
      paint: { "circle-radius": 4, "circle-color": "#E8A33D",
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.5 },
      layout: { visibility: "visible" } });
    map.addLayer({ id: "chokepoint-label", type: "symbol", source: "chokepoints",
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", visibility: "visible" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });

    // GDELT news-pulse — granular per-mention points from the GKG. We get a
    // few hundred 0.5° grid cells, so the radius/opacity ramp stays small at
    // the low end (lets dense regions read as glow rather than blobs) and
    // scales gently into the headlines.
    map.addLayer({ id: "newspulse", type: "circle", source: "newspulse",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "count"],
          1, 2, 5, 3.5, 25, 6, 100, 9, 300, 13],
        "circle-color": "#5BC8FF",
        "circle-opacity": ["interpolate", ["linear"], ["get", "count"],
          1, 0.35, 5, 0.5, 25, 0.65, 100, 0.8],
        "circle-blur": 0.25,
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 0.3 },
      layout: { visibility: "none" } });

    // military bases (filtered on click when bases mode is on)
    map.addSource("bases", { type: "geojson", data: fc((window.BASES || []).map(function (b) {
      return { type: "Feature", properties: { owner: b.owner, name: b.name, host: b.host },
               geometry: { type: "Point", coordinates: [b.lng, b.lat] } };
    })) });
    [["bases-own", "#FFD633"], ["bases-ally", "#4DA3FF"], ["bases-adv", "#FF4D4D"]].forEach(function (cfg) {
      map.addLayer({ id: cfg[0], type: "circle", source: "bases",
        filter: ["==", ["get", "owner"], "___none___"],
        paint: { "circle-radius": 4.5, "circle-color": cfg[1],
          "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.4 } });
      map.addLayer({ id: cfg[0] + "-label", type: "symbol", source: "bases",
        filter: ["==", ["get", "owner"], "___none___"],
        layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
          "text-size": 10, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true },
        paint: { "text-color": cfg[1], "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });
    });

    // ally highlight (filters set on click when ally mode is on)
    map.addLayer({ id: "ally-mil", type: "fill", source: "countries",
      filter: ["==", ["get", "cname"], "___none___"],
      paint: { "fill-color": "#4DA3FF", "fill-opacity": 0.32 } });
    map.addLayer({ id: "ally-econ", type: "fill", source: "countries",
      filter: ["==", ["get", "cname"], "___none___"],
      paint: { "fill-color": "#2ECC71", "fill-opacity": 0.26 } });
    map.addLayer({ id: "ally-adv", type: "fill", source: "countries",
      filter: ["==", ["get", "cname"], "___none___"],
      paint: { "fill-color": "#FF4D4D", "fill-opacity": 0.34 } });
    map.addLayer({ id: "ally-self", type: "line", source: "countries",
      filter: ["==", ["get", "cname"], "___none___"],
      paint: { "line-color": "#FFD633", "line-width": 2.5 } });

    // crisp vector country names (replaces blurry raster labels)
    map.addSource("citylabels", { type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png"],
      tileSize: 256, attribution: "" });
    map.addLayer({ id: "citylabels", type: "raster", source: "citylabels",
      minzoom: 4, paint: { "raster-opacity": 0.9 } });

    map.addLayer({ id: "country-names", type: "symbol", source: "country-points",
      maxzoom: 4.2,
      layout: { "text-field": ["get", "cname"], "text-font": ["Open Sans Regular"],
        "text-transform": "uppercase", "text-letter-spacing": 0.12,
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 3, 11.5, 5, 14.5],
        "text-padding": 4 },
      paint: { "text-color": "#A8B2C4", "text-halo-color": "#0B1020", "text-halo-width": 1.6,
        "text-opacity": 0.95 } });

    // nuclear warhead-count labels (with the nuclear toggle)
    map.addLayer({ id: "nuclear-label", type: "symbol", source: "country-points",
      filter: [">", ["get", "nwh"], 0],
      layout: { "text-field": ["concat", "\u2248", ["to-string", ["get", "nwh"]], " wh"],
        "text-font": ["Open Sans Regular"], "text-size": 10.5,
        "text-offset": [0, 1.4], "text-anchor": "top", visibility: "none" },
      paint: { "text-color": "#3FE08A", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // Island Chains
    map.addSource("islandchains", { type: "geojson", data: fc((window.ISLAND_CHAINS || []).map(function (r) {
      return { type: "Feature", properties: { name: r.name },
               geometry: { type: "MultiLineString", coordinates: r.segments } };
    })) });
    map.addLayer({ id: "islandchains-line", type: "line", source: "islandchains",
      paint: { "line-color": "#5BC8FF", "line-width": 1.8, "line-opacity": 0.8 },
      layout: { "line-cap": "round", visibility: "none" } });

    // String of Pearls
    map.addSource("pearls", { type: "geojson", data: fc(
      [{ type: "Feature", properties: { kind: "line" },
         geometry: { type: "LineString", coordinates: (window.PEARLS || { line: [] }).line } }]
      .concat(((window.PEARLS || {}).ports || []).map(function (p) {
        return { type: "Feature", properties: { kind: "port", name: p.name },
                 geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
      }))) });
    map.addLayer({ id: "pearls-line", type: "line", source: "pearls",
      filter: ["==", ["get", "kind"], "line"],
      paint: { "line-color": "#E8E6DF", "line-width": 1, "line-dasharray": [1.4, 1.8], "line-opacity": 0.65 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "pearls-dot", type: "circle", source: "pearls",
      filter: ["==", ["get", "kind"], "port"],
      paint: { "circle-radius": 4, "circle-color": "#E8E6DF",
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.3 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "pearls-label", type: "symbol", source: "pearls",
      filter: ["==", ["get", "kind"], "port"],
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 10, "text-offset": [0, 1], "text-anchor": "top", visibility: "none" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // River deltas (Marshall)
    map.addSource("deltas", { type: "geojson", data: fc((window.DELTAS || []).map(function (z) {
      return { type: "Feature", properties: { name: z.name },
               geometry: { type: "Polygon", coordinates: z.coords } };
    })) });
    map.addLayer({ id: "deltas-fill", type: "fill", source: "deltas",
      paint: { "fill-color": "#49C5B6", "fill-opacity": 0.3 }, layout: { visibility: "none" } });
    map.addLayer({ id: "deltas-label", type: "symbol", source: "deltas",
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 10, visibility: "none" },
      paint: { "text-color": "#7FE3D6", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // Shatterbelts
    map.addSource("shatterbelts", { type: "geojson", data: fc((window.SHATTERBELTS || []).map(function (z) {
      return { type: "Feature", properties: { name: z.name },
               geometry: { type: "Polygon", coordinates: z.coords } };
    })) });
    map.addLayer({ id: "shatter-fill", type: "fill", source: "shatterbelts",
      paint: { "fill-color": "#C44569", "fill-opacity": 0.16 }, layout: { visibility: "none" } });
    map.addLayer({ id: "shatter-line", type: "line", source: "shatterbelts",
      paint: { "line-color": "#C44569", "line-width": 1.3, "line-dasharray": [2, 2], "line-opacity": 0.75 },
      layout: { visibility: "none" } });

    // ---- Haushofer / World-Island (Map 34) -------------------------------
    // One stackable toggle ("worldisland") drives three sub-features filtered
    // out of the same source: the desert/steppe belt, the monsoon coastlands
    // (the original map's dark "inner crescent"), and the World-Island boundary.
    var HF = window.HAUSHOFER || { worldIsland: fc([]), panRegions: fc([]) };
    map.addSource("haushofer-wi", { type: "geojson", data: HF.worldIsland });
    map.addLayer({ id: "hf-desert-fill", type: "fill", source: "haushofer-wi",
      filter: ["==", ["get", "kind"], "desert"],
      paint: { "fill-color": "#C9A24B", "fill-opacity": 0.16 }, layout: { visibility: "none" } });
    map.addLayer({ id: "hf-desert-line", type: "line", source: "haushofer-wi",
      filter: ["==", ["get", "kind"], "desert"],
      paint: { "line-color": "#C9A24B", "line-width": 1, "line-dasharray": [3, 2], "line-opacity": 0.6 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "hf-monsoon-fill", type: "fill", source: "haushofer-wi",
      filter: ["==", ["get", "kind"], "monsoon"],
      paint: { "fill-color": "#2E6E8E", "fill-opacity": 0.42 }, layout: { visibility: "none" } });
    map.addLayer({ id: "hf-boundary-line", type: "line", source: "haushofer-wi",
      filter: ["==", ["get", "kind"], "boundary"],
      paint: { "line-color": "#E8A33D", "line-width": 1.8, "line-dasharray": [4, 2], "line-opacity": 0.85 },
      layout: { "line-cap": "round", visibility: "none" } });

    // ---- Haushofer pan-regions (four meridional blocs) -------------------
    map.addSource("haushofer-pan", { type: "geojson", data: HF.panRegions });
    var PAN_COLOR = ["match", ["get", "kind"],
      "pan-america", "#4DA3FF", "pan-eurafrica", "#E8843D",
      "pan-russia", "#C44569", "pan-asia", "#C9A227", "#8A93A6"];
    map.addLayer({ id: "hf-pan-fill", type: "fill", source: "haushofer-pan",
      paint: { "fill-color": PAN_COLOR, "fill-opacity": 0.15 }, layout: { visibility: "none" } });
    map.addLayer({ id: "hf-pan-line", type: "line", source: "haushofer-pan",
      paint: { "line-color": PAN_COLOR, "line-width": 1.4, "line-opacity": 0.7 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "hf-pan-label", type: "symbol", source: "haushofer-pan",
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 12, "text-allow-overlap": false, visibility: "none" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });

    // ---- Agriculture: cropland extent, wheat belts, rice regions ---------
    [["cropland", window.CROPLAND_REGIONS, "#6FB36F", "#9AD79A"],
     ["wheat", window.WHEAT_BELTS, "#E8C45A", "#F2D880"],
     ["rice", window.RICE_REGIONS, "#4FC3A1", "#86E8C6"]].forEach(function (a) {
      map.addSource("ag-" + a[0], { type: "geojson", data: a[1] || fc([]) });
      map.addLayer({ id: a[0] + "-fill", type: "fill", source: "ag-" + a[0],
        paint: { "fill-color": a[2], "fill-opacity": 0.34 }, layout: { visibility: "none" } });
      map.addLayer({ id: a[0] + "-line", type: "line", source: "ag-" + a[0],
        paint: { "line-color": a[3], "line-width": 1, "line-opacity": 0.7 },
        layout: { visibility: "none" } });
    });

    // natural resource deposits — points (named fields) + hatched basin polygons.
    // Basins paint underneath the dots; both share the resource toggle.
    map.addSource("resources", { type: "geojson", data: fc((window.RESOURCES || []).map(function (r) {
      return { type: "Feature", properties: { rtype: r.type, name: r.name },
               geometry: { type: "Point", coordinates: [r.lng, r.lat] } };
    })) });
    map.addSource("resource-basins", { type: "geojson",
      data: window.RESOURCE_BASINS || fc([]) });

    // Generate a 16x16 diagonal-hatch sprite per resource type, in that
    // resource's signature color. Same compositing trick as nuclear-hatch
    // above, but parameterised so each type carries its own pattern image.
    function makeResHatch(id, color) {
      if (map.hasImage(id)) return;
      var cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
      var ctx = cv.getContext("2d");
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      ctx.beginPath();
      // three parallel 45° strokes so the pattern tiles cleanly
      ctx.moveTo(-4, 20); ctx.lineTo(20, -4);
      ctx.moveTo(-12, 12); ctx.lineTo(12, -12);
      ctx.moveTo(4, 28); ctx.lineTo(28, 4);
      ctx.stroke();
      map.addImage(id, ctx.getImageData(0, 0, 16, 16));
    }

    (window.RESOURCE_TYPES || []).forEach(function (t) {
      makeResHatch("res-hatch-" + t[0], t[2]);

      // hatched basin polygon (under the dots)
      map.addLayer({ id: "resb-" + t[0], type: "fill", source: "resource-basins",
        filter: ["==", ["get", "rtype"], t[0]],
        paint: { "fill-pattern": "res-hatch-" + t[0], "fill-opacity": 0.55 },
        layout: { visibility: "none" } });
      // crisp basin outline so edges read at low zoom
      map.addLayer({ id: "resb-" + t[0] + "-line", type: "line", source: "resource-basins",
        filter: ["==", ["get", "rtype"], t[0]],
        paint: { "line-color": t[2], "line-width": 1.0, "line-opacity": 0.85 },
        layout: { visibility: "none" } });

      // named point + label (on top of the basin fill)
      map.addLayer({ id: "res-" + t[0], type: "circle", source: "resources",
        filter: ["==", ["get", "rtype"], t[0]],
        paint: { "circle-radius": 4.5, "circle-color": t[2],
          "circle-stroke-color": "#E8ECF1", "circle-stroke-width": 1 },
        layout: { visibility: "none" } });
      map.addLayer({ id: "res-" + t[0] + "-label", type: "symbol", source: "resources",
        filter: ["==", ["get", "rtype"], t[0]], minzoom: 2.5,
        layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
          "text-size": 9.5, "text-offset": [0, 0.9], "text-anchor": "top", visibility: "none" },
        paint: { "text-color": t[2], "text-halo-color": "#0B1020", "text-halo-width": 1.2 } });
    });

    // ---- Energy modes ----------------------------------------------------
    // Pipelines, oil-production choropleth, flow arcs, chokepoint stress.
    // Each source is fetched at boot from data/energy/*; if a file is missing
    // we paint an empty FC so the toggle still flips cleanly.
    map.addSource("pipelines",      { type: "geojson", data: fc([]) });
    map.addSource("flow-arcs",      { type: "geojson", data: fc([]) });
    map.addSource("caspian",        { type: "geojson", data: fc([]) });
    map.addSource("caspian-nodes",  { type: "geojson", data: fc([]) });

    // 2a. Pipelines: oil amber solid, gas teal solid.
    map.addLayer({ id: "pipelines-line", type: "line", source: "pipelines",
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": ["match", ["get", "substance"], "gas", "#7FD1C4", "#E8A33D"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.2, 6, 3.5],
        "line-opacity": 1
      } });
    map.addLayer({ id: "pipelines-label", type: "symbol", source: "pipelines",
      minzoom: 3.2,
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 10, "symbol-placement": "line", "text-anchor": "center",
        visibility: "none" },
      paint: { "text-color": "#E8C98A", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

    // 2b. Oil-production choropleth.
    // f.properties.oil is set per-feature in decorate() via ISO3 join.
    // beforeId "fill-tier" inserts it at the very bottom of the custom stack —
    // just above the basemap and below every zone/line/arc/marker layer — so
    // pipelines and flow arcs stay visible when the choropleth is on.
    map.addLayer({ id: "fill-oil", type: "fill", source: "countries",
      paint: {
        "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", "oil"], 0],
          0,         "#0B1020",
          250000,    "#3A2A14",
          1000000,   "#6B4518",
          4000000,   "#A86A1E",
          9000000,   "#E8A33D",
          13000000,  "#FFD27F"],
        "fill-opacity": 0.6 },
      layout: { visibility: "none" } }, "fill-tier");

    // 2c. Flow arcs: pale-gold; maritime solid, overland dashed.
    map.addLayer({ id: "flow-arcs-line", type: "line", source: "flow-arcs",
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": "#FFE6B8",
        "line-dasharray": ["match", ["get", "mode"],
          "overland", ["literal", [2, 2]], ["literal", [1, 0]]],
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2, 6, 5],
        "line-opacity": 0.9
      } });
    map.addLayer({ id: "flow-arcs-label", type: "symbol", source: "flow-arcs",
      layout: { "text-field": ["get", "label"], "text-font": ["Open Sans Regular"],
        "text-size": 10.5, "symbol-placement": "line",
        "symbol-spacing": 500, "text-anchor": "center",
        "text-keep-upright": true, visibility: "none" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });
    // Direction glyph: small chevron repeated along the arc.
    map.addLayer({ id: "flow-arcs-arrow", type: "symbol", source: "flow-arcs",
      layout: { "text-field": "▶", "text-font": ["Open Sans Regular"],
        "text-size": 11, "symbol-placement": "line",
        "symbol-spacing": 90, "text-keep-upright": false, visibility: "none" },
      paint: { "text-color": "#FFE6B8",
        "text-halo-color": "#0B1020", "text-halo-width": 1.2 } });

    // 2e. Caspian oil shipping. Iran-tagged flows (the Neka swap) are amber and
    // prominent; non-Iran Caspian export flows (CPC, BTC, Atyrau, KZ->Baku) are
    // teal context. Tanker legs solid, the Iran swap-out settlement leg dashed.
    map.addLayer({ id: "caspian-line", type: "line", source: "caspian",
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": ["case", ["get", "iran"], "#E8A33D", "#7FD1C4"],
        "line-dasharray": ["case",
          ["==", ["get", "kind"], "swapout"], ["literal", [3, 2]],
          ["literal", [1, 0]]],
        "line-width": ["case", ["get", "iran"],
          ["interpolate", ["linear"], ["zoom"], 2, 2.2, 6, 5],
          ["interpolate", ["linear"], ["zoom"], 2, 1.2, 6, 3]],
        "line-opacity": ["case", ["get", "iran"], 0.95, 0.7]
      } });
    map.addLayer({ id: "caspian-arrow", type: "symbol", source: "caspian",
      layout: { "text-field": "▶", "text-font": ["Open Sans Regular"],
        "text-size": 11, "symbol-placement": "line",
        "symbol-spacing": 110, "text-keep-upright": false, visibility: "none" },
      paint: { "text-color": ["case", ["get", "iran"], "#E8A33D", "#7FD1C4"],
        "text-halo-color": "#0B1020", "text-halo-width": 1.2 } });
    map.addLayer({ id: "caspian-label", type: "symbol", source: "caspian",
      minzoom: 3.4,
      layout: { "text-field": ["get", "label_bpd"], "text-font": ["Open Sans Regular"],
        "text-size": 10, "symbol-placement": "line", "symbol-spacing": 600,
        "text-anchor": "center", visibility: "none" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });
    map.addLayer({ id: "caspian-node", type: "circle", source: "caspian-nodes",
      paint: {
        "circle-radius": ["case", ["get", "iran"], 4.5, 3],
        "circle-color": ["case", ["get", "iran"], "#E8A33D", "#7FD1C4"],
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.3 },
      layout: { visibility: "none" } });
    map.addLayer({ id: "caspian-node-label", type: "symbol", source: "caspian-nodes",
      layout: { "text-field": ["get", "node_label"], "text-font": ["Open Sans Regular"],
        "text-size": ["case", ["get", "iran"], 11.5, 10],
        "text-offset": [0, 0.9], "text-anchor": "top", "text-allow-overlap": false,
        visibility: "none" },
      paint: { "text-color": ["case", ["get", "iran"], "#FFD27F", "#E8E6DF"],
        "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });

    // 2d. Chokepoint stress is rendered as fixed-size ring-gauge HTML markers
    // (see buildChokepointGauges), not map layers — no glow/halo circles.

    // Kick off the async loaders. Each failure leaves an empty FC, never throws.
    loadEnergyData();

    // transparent always-on hit layer for clicks
    map.addLayer({ id: "countries-hit", type: "fill", source: "countries",
      paint: { "fill-color": "#000", "fill-opacity": 0 } });

    applyFill();
  }

  /* ---- Energy data loaders ---------------------------------------------- */
  // arc densifier: if `via` waypoints are present, linear-interp through them
  // (keeps maritime arcs over water). Otherwise spherical great-circle.
  function lerp(a, b, t) { return a + (b - a) * t; }
  function densifyVia(pts, n) {
    if (pts.length < 2) return pts.slice();
    var out = [pts[0].slice()];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      for (var k = 1; k <= n; k++) {
        out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
      }
    }
    return out;
  }
  function greatCircle(from, to, n) {
    // Slerp on the unit sphere. Returns n+1 [lng,lat] points.
    var DEG = Math.PI / 180, RAD = 180 / Math.PI;
    function v(p) {
      var lon = p[0] * DEG, lat = p[1] * DEG;
      return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    }
    var a = v(from), b = v(to);
    var dot = Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]));
    var omega = Math.acos(dot);
    if (omega < 1e-6) return [from.slice(), to.slice()];
    var so = Math.sin(omega);
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var s1 = Math.sin((1 - t) * omega) / so;
      var s2 = Math.sin(t * omega) / so;
      var x = s1*a[0] + s2*b[0], y = s1*a[1] + s2*b[1], z = s1*a[2] + s2*b[2];
      var lat = Math.asin(z) * RAD;
      var lon = Math.atan2(y, x) * RAD;
      out.push([+lon.toFixed(3), +lat.toFixed(3)]);
    }
    return out;
  }
  function buildArcFeature(arc) {
    var coords;
    if (arc.via && arc.via.length) {
      var pts = [arc.from].concat(arc.via).concat([arc.to]);
      coords = densifyVia(pts, 12);
    } else {
      coords = greatCircle(arc.from, arc.to, 64);
    }
    return { type: "Feature",
      properties: { id: arc.id, label: arc.label || "", mode: arc.mode || "maritime" },
      geometry: { type: "LineString", coordinates: coords } };
  }

  // ---- Caspian oil shipping ----------------------------------------------
  function fmtBpd(n) {
    if (n == null) return "";
    return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M bpd"
                    : Math.round(n / 1e3) + "k bpd";
  }
  function buildCaspianOil(d) {
    if (!d) return;
    // Flow lines (tanker legs densify through `via`; pipelines do too).
    var lineFeats = (d.flows || []).map(function (fl) {
      var pts = [fl.from].concat(fl.via || []).concat([fl.to]);
      return { type: "Feature",
        properties: {
          id: fl.id, iran: !!fl.iran, kind: fl.kind || "tanker",
          label: fl.label || "",
          label_bpd: (fl.label || "") + (fl.actual_bpd != null ? "  ·  " + fmtBpd(fl.actual_bpd) : "")
        },
        geometry: { type: "LineString", coordinates: densifyVia(pts, 10) } };
    });
    var ls = map.getSource("caspian");
    if (ls) ls.setData({ type: "FeatureCollection", features: lineFeats });

    // Nodes. Neka carries the headline Iran-swap readout (actual vs capacity).
    var sw = d.iran_swap || {};
    var nodeFeats = (d.nodes || []).map(function (nd) {
      var lbl = nd.name;
      if (nd.id === "neka") {
        lbl = "Neka — Iran Caspian swap\n" + fmtBpd(sw.actual_bpd) + " actual (est.) · "
            + fmtBpd(sw.capacity_bpd) + " capacity";
      } else if (nd.id === "kharg") {
        lbl = "Kharg — Iran Gulf swap-out";
      }
      return { type: "Feature",
        properties: { id: nd.id, iran: !!nd.iran, node_label: lbl },
        geometry: { type: "Point", coordinates: nd.coords } };
    });
    var ns = map.getSource("caspian-nodes");
    if (ns) ns.setData({ type: "FeatureCollection", features: nodeFeats });
  }
  var CASPIAN_LAYERS = ["caspian-line", "caspian-arrow", "caspian-label",
    "caspian-node", "caspian-node-label"];
  function setCaspianVisible(on) {
    CASPIAN_LAYERS.forEach(function (id) { setVis(id, on); });
  }

  var CHOKEPOINT_COORDS = {
    hormuz:      [56.30, 26.60],
    malacca:     [102.30, 2.50],
    babelmandeb: [43.30, 12.60]
  };
  var CHOKEPOINT_DISPLAY = {
    hormuz: "Strait of Hormuz", malacca: "Strait of Malacca", babelmandeb: "Bab el-Mandeb"
  };

  function loadEnergyData() {
    // Pipelines
    fetch("data/energy/pipelines.geojson", { cache: "default" })
      .then(function (r) { if (!r.ok) throw new Error("pipelines " + r.status); return r.json(); })
      .then(function (d) { var s = map.getSource("pipelines"); if (s) s.setData(d); })
      .catch(function (e) { console.warn("energy/pipelines:", e.message); });

    // Flow arcs
    fetch("data/energy/flow_arcs.json", { cache: "default" })
      .then(function (r) { if (!r.ok) throw new Error("arcs " + r.status); return r.json(); })
      .then(function (d) {
        var arcs = (d && d.arcs) || [];
        var feats = arcs.map(buildArcFeature);
        var s = map.getSource("flow-arcs");
        if (s) s.setData({ type: "FeatureCollection", features: feats });
      })
      .catch(function (e) { console.warn("energy/arcs:", e.message); });

    // Caspian oil shipping (Iran swap-focused).
    fetch("data/energy/caspian_oil.json", { cache: "default" })
      .then(function (r) { if (!r.ok) throw new Error("caspian " + r.status); return r.json(); })
      .then(function (d) { window.CASPIAN_OIL = d; buildCaspianOil(d); })
      .catch(function (e) { console.warn("energy/caspian:", e.message); });

    // Oil production -> decorate() reads window.OIL_PRODUCTION via st.iso3.
    fetch("data/energy/oil_production.json", { cache: "default" })
      .then(function (r) { if (!r.ok) throw new Error("oil " + r.status); return r.json(); })
      .then(function (d) {
        window.OIL_PRODUCTION = d;
        // refresh country features so f.properties.oil populates
        if (typeof refreshPower === "function") refreshPower();
        if (typeof applyYear === "function") applyYear();
      })
      .catch(function (e) { console.warn("energy/oil:", e.message); });

    // Chokepoint stress: editorial overrides take precedence over PortWatch.
    // PortWatch's Feb-2026 boundary revision counts stranded/anchored
    // tankers, so its tanker series under-reports the Hormuz collapse.
    // Where data/energy/chokepoint_editorial.json has an entry, we use
    // (baseline_bbl_day, pct_of_normal) directly. Where it doesn't, we
    // fall back to PortWatch tanker_pct (then tanker_capacity_pct, then
    // all_pct). PortWatch still drives the chart at chart.html.
    function fetchJSON(path) {
      return fetch(path, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    Promise.all([
      fetchJSON("data/energy/chokepoint_series.json"),
      fetchJSON("data/energy/chokepoint_editorial.json")
    ]).then(function (results) {
      var series = results[0] || {};
      var editorial = results[1] || {};
      window.CHOKEPOINT_SERIES = series;
      window.CHOKEPOINT_EDITORIAL = editorial;

      // Build one fixed-size ring-gauge marker per chokepoint that has an
      // editorial (baseline_bbl_day, pct_of_normal) entry.
      var gauges = [];
      Object.keys(CHOKEPOINT_COORDS).forEach(function (slug) {
        var ed = editorial && editorial[slug];
        if (!ed || ed.pct_of_normal == null || ed.baseline_bbl_day == null) return;
        gauges.push({
          slug: slug,
          name: CHOKEPOINT_DISPLAY[slug],
          coords: CHOKEPOINT_COORDS[slug],
          baseline: ed.baseline_bbl_day,
          pct: ed.pct_of_normal
        });
      });
      buildChokepointGauges(gauges);
    }).catch(function (e) { console.warn("energy/chokepoint:", e.message); });
  }

  // ---- Chokepoint ring-gauge markers -------------------------------------
  // Fixed-pixel SVG markers (the element never scales with the data — only the
  // arc sweep and the centre dot encode the numbers). Severity colour:
  // pct<20 red, 20–70 amber, >70 green.
  var chokepointMarkers = [];
  function chokeSeverityColor(pct) {
    return pct < 20 ? "#E24B4A" : pct <= 70 ? "#EF9F27" : "#5DCAA5";
  }
  // SVG arc path from 12 o'clock, sweeping clockwise by `frac` of a full turn.
  function ringArcPath(cx, cy, r, frac) {
    frac = Math.max(0, Math.min(0.9999, frac));
    var a0 = -Math.PI / 2;                       // 12 o'clock
    var a1 = a0 + frac * 2 * Math.PI;            // clockwise (SVG y-down)
    var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    var large = frac > 0.5 ? 1 : 0;
    return "M " + x0.toFixed(2) + " " + y0.toFixed(2) +
           " A " + r + " " + r + " 0 " + large + " 1 " +
           x1.toFixed(2) + " " + y1.toFixed(2);
  }
  function fmtMbd2(barrels) {
    var mbd = barrels / 1e6;
    return (mbd >= 10 ? mbd.toFixed(1) : mbd.toFixed(2));
  }
  function buildChokepointGauges(gauges) {
    if (typeof maplibregl === "undefined") return;
    chokepointMarkers.forEach(function (m) { m.remove(); });
    chokepointMarkers = [];

    var R = 18, SIZE = 44, C = SIZE / 2;          // fixed pixel geometry
    gauges.forEach(function (g) {
      var color = chokeSeverityColor(g.pct);
      var current = g.baseline * g.pct / 100;     // bbl/day
      var dotR = Math.sqrt(current / 1e6) * 2.6;  // area ∝ current mb/d
      dotR = Math.max(1.5, Math.min(R - 2, dotR));
      var arc = ringArcPath(C, C, R, g.pct / 100);

      var el = document.createElement("div");
      el.className = "choke-gauge";
      el.style.display = state.chokestress ? "" : "none";
      el.innerHTML =
        '<svg width="' + SIZE + '" height="' + SIZE + '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '">' +
          '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" ' +
            'stroke="#2E3650" stroke-width="3"/>' +
          '<path d="' + arc + '" fill="none" stroke="' + color + '" ' +
            'stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="' + C + '" cy="' + C + '" r="' + dotR.toFixed(2) + '" fill="' + color + '"/>' +
        '</svg>' +
        '<div class="choke-gauge-label">' + g.name + '<br>' +
          fmtMbd2(current) + ' mb/d · ' + g.pct + '% of normal</div>';

      var marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(g.coords).addTo(map);
      chokepointMarkers.push(marker);
    });
  }
  function setChokepointGaugesVisible(on) {
    chokepointMarkers.forEach(function (m) {
      m.getElement().style.display = on ? "" : "none";
    });
  }

  function applyFill() {
    setVis("fill-tier", state.fill === "tier");
    setVis("fill-role", state.fill === "role");
    setVis("fill-power", state.fill === "power");
    setVis("fill-renew", state.fill === "renew");
    setVis("fill-milex", state.fill === "milex");
    setVis("fill-gini", state.fill === "gini");
    setVis("fill-trade", state.fill === "trade");
    setVis("fill-arable", state.fill === "arable");
    setVis("fill-religion", state.fill === "religion");
    setVis("fill-conflict", state.fill === "conflict");
    setVis("fill-trader", state.fill === "trader");
    setVis("fill-vdem", state.fill === "vdem");
    setVis("fill-freexp", state.fill === "freexp");
    setVis("fill-usbases", state.fill === "usbases");
    setVis("fill-oil", state.fill === "oil");
    ["bases-own"].forEach(function (l) {
      if (state.fill === "usbases") {
        setBaseFilter("bases-own", ["United States"]);
      } else if (!state.basesmode) { setBaseFilter("bases-own", []); }
    });
  }

  /* swap the sample heat points for the live UCDP file once it exists in /data.
     Updated weekly by the GitHub Action; failure here just keeps the sample. */
  function refreshConflict() {
    fetch("data/conflict.geojson", { cache: "no-store" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no file"); })
      .then(function (d) {
        var s = map.getSource("conflict");
        if (s && d && d.features && d.features.length) {
          s.setData(d);
          var heatRow = byId("cb-heat");
          if (heatRow) {
            var span = heatRow.parentNode.querySelector(".label");
            if (span) span.textContent = "Violence density (UCDP, live)";
          }
        }
      })
      .catch(function () { /* keep the bundled sample */ });
  }

  /* swap sample power index for the live World Bank file once the Action writes it. */
  function refreshPower() {
    fetch("data/power-index.json", { cache: "no-store" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no file"); })
      .then(function (d) { if (d && typeof d === "object") { POWER_BY_NAME = d; applyComposite(); rebuildStats(); } })
      .catch(function () { /* keep the bundled sample */ });
  }
  function applyComposite() {
    if (!COUNTRIES_GEO) return;
    COUNTRIES_GEO.features.forEach(function (f) {
      var st = powerOf(f.properties.cname);
      f.properties.composite = st.composite || 0;
      f.properties.renew = st.renew || 0;
      // Choropleth fills (fill-stat-*) and the older fill-milex layer both
      // read these properties; keep them in sync via the same World Bank
      // record so the country source backs every paint expression.
      f.properties.milex = st.milex || 0;
      f.properties.milexv = st.milex || 0;
      f.properties.milper = st.milper || 0;
      f.properties.pop = st.pop || 0;
      f.properties.gdp = st.gdp || 0;
      f.properties.gdppc = st.gdppc || 0;
      f.properties.gini = (st.gini === undefined ? -1 : st.gini);
      f.properties.trade = (st.trade === undefined ? -999 : st.trade);
      f.properties.arable = (st.arable === undefined ? -1 : st.arable);
      f.properties.oil = (window.OIL_PRODUCTION || {})[st.iso3 || ""] || 0;
    });
    var s = map.getSource("countries");
    if (s) s.setData(COUNTRIES_GEO);
  }

  function statMax(metric) {
    var max = 0;
    COUNTRY_POINTS_GEO.features.forEach(function (f) { var v = f.properties[metric] || 0; if (v > max) max = v; });
    return max;
  }
  function statLabel(metric, v) {
    if (v === undefined || v === null) return "";
    if (metric === "freexp") return v >= 0 ? Math.round(v) : "";
    if (!v) return "";
    if (metric === "renew") return Math.round(v) + "%";
    if (metric === "gdp" || metric === "gdppc" || metric === "milex") return fmtUSD(v);
    return fmtNum(v);
  }
  var STAT_METRICS = ["pop", "gdp", "gdppc", "milex", "milper", "renew", "freexp"];
  function applyStatRender() {
    var on = state.stat !== "none";
    var ringMode = on && state.statMode === "ring";
    setVis("stat-circles", ringMode);
    setVis("stat-labels", on);   // labels stay on in both modes
    STAT_METRICS.forEach(function (m) {
      setVis("fill-stat-" + m, on && state.statMode === "fill" && state.stat === m);
    });
  }
  function switchStat(metric) {
    state.stat = metric;
    if (metric === "none") { applyStatRender(); tele(); return; }
    var max = statMax(metric);
    COUNTRY_POINTS_GEO.features.forEach(function (f) {
      var v = f.properties[metric] || 0;
      // Smaller cap (~22px) so rings read as accents, not blobs.
      var r = (v > 0 && max > 0) ? Math.sqrt(v / max) * 20 + 2 : 0;
      f.properties.r = r;
      f.properties.lbl = statLabel(metric, v);
      // label radial-offset in text-em units; sits just below the ring edge.
      // Falls back to ~1.6em when r=0 (no ring, e.g. choropleth mode).
      f.properties.lblOffset = r > 0 ? (r + 4) / 10.5 : 1.6;
    });
    var s = map.getSource("country-points"); if (s) s.setData(COUNTRY_POINTS_GEO);
    applyStatRender();
    updateStatLegend();
    tele();
  }
  function rebuildStats() {
    if (!COUNTRY_POINTS_GEO) return;
    COUNTRY_POINTS_GEO.features.forEach(function (f) {
      var st = powerOf(f.properties.cname);
      f.properties.pop = st.pop || 0; f.properties.gdp = st.gdp || 0;
      f.properties.gdppc = st.gdppc || 0; f.properties.milex = st.milex || 0;
      f.properties.milper = st.milper || 0; f.properties.renew = st.renew || 0;
      f.properties.freexp = vdemAt("freexp", CUR_YEAR, f.properties.cname);
      f.properties.nwh = whAt(f.properties.cname, CUR_YEAR);
    });
    if (state.stat !== "none") switchStat(state.stat);
    else { var s = map.getSource("country-points"); if (s) s.setData(COUNTRY_POINTS_GEO); }
  }

  /* load the live GDELT news-pulse file (written every few hours by the Action). */
  function refreshNewspulse() {
    fetch("data/newspulse.geojson", { cache: "no-store" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no file"); })
      .then(function (d) { var s = map.getSource("newspulse"); if (s && d) s.setData(d); })
      .catch(function () { /* layer stays empty until the Action runs */ });
  }

  /* load the live PortWatch chokepoint-traffic file (weekly Action). */
  function refreshPortwatch() {
    fetch("data/portwatch.json", { cache: "no-store" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no file"); })
      .then(function (d) { var s = map.getSource("portwatch"); if (s && d) s.setData(d); })
      .catch(function () { /* layer stays empty until the Action runs */ });
  }

  /* Radar + clouds live in setRadar() / setClouds() below; they own their
     own polling interval and layer ids ("radar", "clouds"). The earlier
     loadWeather() created duplicate "wx-radar" / "wx-clouds" layers that
     never got toggled by the rail handlers, so it was dead code. */

  /* ---- temporal: load a historical World Bank year ------------------------ */
  var HIST_CACHE = {};
  function loadPortwatchYear(y) {
    if (y >= 2026) { refreshPortwatch(); return; }
    fetch("data/history/portwatch-" + y + ".json", { cache: "default" })
      .then(function (r) { if (r.ok) return r.json(); throw 0; })
      .then(function (d) { var s2 = map.getSource("portwatch"); if (s2) s2.setData(d); })
      .catch(function () {
        var s2 = map.getSource("portwatch"); if (s2) s2.setData(fc([]));
      });
  }
  function applyYear() {
    loadPortwatchYear(CUR_YEAR);
    decorate(COUNTRIES_GEO);
    var src = map.getSource("countries"); if (src) src.setData(COUNTRIES_GEO);
    rebuildStats(); clearAllies(); clearAdversaries(); clearBases(); updateLegend();
    refreshCard();
    refreshIndexPanels();
  }
  function setYear(y) {
    CUR_YEAR = y;
    var lab = byId("t-yearv");
    if (y >= 2026) {
      if (lab) lab.textContent = "LIVE";
      refreshPower(); applyYear();
      return;
    }
    if (lab) lab.textContent = y;
    function done(d) { POWER_BY_NAME = d; applyYear(); }
    if (HIST_CACHE[y]) { done(HIST_CACHE[y]); return; }
    fetch("data/history/power-" + y + ".json", { cache: "default" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no history file"); })
      .then(function (d) { HIST_CACHE[y] = d; done(d); })
      .catch(function () { if (lab) lab.textContent = y + " (n/a)"; applyYear(); });
  }

  /* ---- news pulse from data/newspulse.geojson ----------------------------
     The static file is rebuilt every 6h by update-newspulse.yml from the
     latest GDELT GKG 2.0 slice (per-mention geocoded locations, not just
     publishing-outlet centroids), so what we paint here is granular at
     ~0.5 deg resolution. Toggling the layer or letting the 15-min poller
     fire just re-fetches the file with cache-busting. */
  var pulseTimer = null;
  function loadPulse() {
    fetch("data/newspulse.geojson?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        var feats = (d && d.features) || [];
        feats.forEach(function (f) {
          f.properties = f.properties || {};
          var c = f.properties.count || 1;
          f.properties.w = Math.min(1, Math.log10(c + 1) / 3);
        });
        var s = map.getSource("newspulse");
        if (s) s.setData({ type: "FeatureCollection", features: feats });
      }).catch(function (e) { console.error("news pulse:", e); });
  }
  function setPulse(on) {
    state.newspulse = on; setVis("newspulse", on);
    if (on) {
      loadPulse();
      if (!pulseTimer) pulseTimer = setInterval(function () { if (state.newspulse) loadPulse(); }, 15 * 60 * 1000);
    }
  }

  /* ---- live precipitation radar (RainViewer, ~10-min frames) -------------- */
  var radarTimer = null;
  function loadRadar() {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var frames = (d && d.radar && d.radar.past) || [];
        if (!frames.length) return;
        var f = frames[frames.length - 1];
        var url = d.host + f.path + "/256/{z}/{x}/{y}/2/1_1.png";
        if (map.getLayer("radar")) map.removeLayer("radar");
        if (map.getSource("radar")) map.removeSource("radar");
        map.addSource("radar", { type: "raster", tiles: [url], tileSize: 256,
          attribution: "Radar: RainViewer" });
        var beforeR = map.getLayer("chokepoint-dot") ? "chokepoint-dot" : undefined;
        map.addLayer({ id: "radar", type: "raster", source: "radar",
          paint: { "raster-opacity": 0.62 } }, beforeR);
        setVis("radar", state.radar);
      })
      .catch(function () {});
  }
  function loadClouds() {
    // NASA BlueMarble: a global satellite composite. No orbital seams, no
    // antimeridian gaps, no polar holes. We tried stacking live VIIRS daily
    // products on top, but their JPEG no-data pixels are opaque black, and
    // even at low opacity two layers of black compound into a near-black
    // wedge through the central Pacific. BlueMarble alone looks clean.
    if (!map.getSource("clouds-base")) {
      map.addSource("clouds-base", { type: "raster",
        tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
                "BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/" +
                "{z}/{y}/{x}.jpg"],
        tileSize: 256, minzoom: 0, maxzoom: 8,
        attribution: "Imagery: NASA EOSDIS GIBS / BlueMarble" });
    }
    if (!map.getLayer("clouds-base")) {
      // Insert at the bottom of the layer stack so every other layer
      // (fills, borders, theory zones, chokepoints, etc.) paints on top.
      var beforeBase = map.getLayer("fill-tier") ? "fill-tier" : undefined;
      map.addLayer({ id: "clouds-base", type: "raster", source: "clouds-base",
        paint: { "raster-opacity": 1.0 } }, beforeBase);
      setVis("clouds-base", state.clouds);
    }
  }
  function setClouds(on) {
    state.clouds = on;
    if (on) {
      loadClouds();
    } else if (map.getLayer("clouds-base")) {
      setVis("clouds-base", false);
    }
  }
  function setRadar(on) {
    state.radar = on;
    if (on) {
      loadRadar();
      if (!radarTimer) radarTimer = setInterval(function () { if (state.radar) loadRadar(); }, 10 * 60 * 1000);
    } else if (map.getLayer("radar")) {
      setVis("radar", false);
    }
  }

  /* ---- ally derivation: shared blocs + bilateral pacts -------------------- */
  function alliesOf(name) {
    var mil = {}, econ = {};
    function collect(keys, into) {
      (keys || []).forEach(function (k) {
        var list = membershipListAt(k, CUR_YEAR);
        if (list.indexOf(name) >= 0)
          list.forEach(function (c) { if (c !== name) into[c] = 1; });
      });
    }
    var cfg = window.ALLIANCE_CONFIG || {};
    collect(cfg.military, mil); collect(cfg.economic, econ);
    var bp = window.BILATERAL_PACTS || {};
    (bp.military || []).forEach(function (p) {
      if (p[0] === name) mil[p[1]] = 1; if (p[1] === name) mil[p[0]] = 1;
    });
    (bp.economic || []).forEach(function (p) {
      if (p[0] === name) econ[p[1]] = 1; if (p[1] === name) econ[p[0]] = 1;
    });
    return { mil: Object.keys(mil), econ: Object.keys(econ) };
  }
  function showAllies(name) {
    var a = alliesOf(name);
    map.setFilter("ally-mil", ["in", ["get", "cname"], ["literal", a.mil]]);
    map.setFilter("ally-econ", ["in", ["get", "cname"], ["literal", a.econ]]);
    map.setFilter("ally-self", ["==", ["get", "cname"], name]);
  }
  function clearAllies() {
    ["ally-mil", "ally-econ", "ally-self"].forEach(function (id) {
      map.setFilter(id, ["==", ["get", "cname"], "___none___"]);
    });
  }
  function adversariesOf(name) {
    var out = {};
    (window.ADVERSARIES || []).forEach(function (p) {
      if (p[0] === name) out[p[1]] = 1; if (p[1] === name) out[p[0]] = 1;
    });
    return Object.keys(out);
  }
  function showAdversaries(name) {
    map.setFilter("ally-adv", ["in", ["get", "cname"], ["literal", adversariesOf(name)]]);
    map.setFilter("ally-self", ["==", ["get", "cname"], name]);
  }
  function clearAdversaries() {
    map.setFilter("ally-adv", ["==", ["get", "cname"], "___none___"]);
  }
  function setBaseFilter(layer, owners) {
    var f = owners.length ? ["in", ["get", "owner"], ["literal", owners]]
                          : ["==", ["get", "owner"], "___none___"];
    map.setFilter(layer, f); map.setFilter(layer + "-label", f);
  }
  function showBases(name) {
    var own = [name];
    var allies = state.allymode ? alliesOf(name).mil : [];
    var advs = state.advmode ? adversariesOf(name) : [];
    allies = allies.filter(function (a) { return a !== name; });
    setBaseFilter("bases-own", own);
    setBaseFilter("bases-ally", allies);
    setBaseFilter("bases-adv", advs);
  }
  function clearBases() {
    ["bases-own", "bases-ally", "bases-adv"].forEach(function (l) { setBaseFilter(l, []); });
  }

  /* ---- control rail ----------------------------------------------------- */
  function row(kind, id, label, checked, group, color) {
    var type = kind === "rad" ? "radio" : "checkbox";
    var nm = group ? ' name="' + group + '"' : "";
    var sw = color ? '<span class="swatch" style="background:' + color + '"></span>' : "";
    return '<label class="row"><input type="' + type + '" id="cb-' + id + '"' + nm +
           (checked ? " checked" : "") + '/><span class="box"></span>' + sw +
           '<span class="label">' + label + "</span></label>";
  }

  function sec(id, title, inner, hint, startOpen) {
    return '<h2 class="sec' + (startOpen === false ? " closed" : "") + '" data-sec="' + id + '">' + title + "</h2>" +
           '<div class="secbody' + (startOpen === false ? " collapsed" : "") + '" id="sec-' + id + '">' +
           (hint ? '<p class="hint">' + hint + "</p>" : "") + inner + "</div>";
  }
  // sub-heading inside a section (e.g. "Defense" vs "Economic & political")
  function sub(title) { return '<h3 class="subhead">' + title + "</h3>"; }
  // theory row: regular row + info-icon tooltip sourced from window.THEORY_META
  function theoryRow(key, label, color) {
    var base = row("chk", key, label, state[key], null, color);
    var m = (window.THEORY_META || {})[key];
    if (!m) return base;
    var safe = function (s) { return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"); };
    var tip =
      '<span class="info-pop" role="tooltip">' +
        '<b>' + safe(m.name) + '</b>' +
        ' <span class="info-year">' + safe(m.year) + '</span><br>' +
        '<i>' + safe(m.theorist) + '</i><br>' +
        '<span class="info-school">' + safe(m.school) + '</span><br>' +
        safe(m.desc) +
      '</span>';
    var icon = '<button class="info-i" type="button" aria-label="About ' +
      safe(m.name) + '" data-theory="' + safe(key) + '">i</button>' + tip;
    // splice the icon+tooltip in just before the closing </label> tag
    return base.replace(/<\/label>$/, icon + "</label>");
  }
  // alphabetise rows by their label, ignoring case + leading punctuation, with
  // an optional "anchor" entry (typically "None") forced to the top.
  function alpha(rows, anchor) {
    var withKey = rows.map(function (r) {
      var m = r.match(/<span class="label">([\s\S]*?)<\/span>/);
      var label = (m ? m[1] : "").replace(/&amp;/g, "&").replace(/<[^>]+>/g, "");
      return { row: r, key: label.toLowerCase().replace(/^[^a-z0-9]+/, "") };
    });
    withKey.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    var out = withKey.map(function (e) { return e.row; });
    if (anchor) {
      var idx = -1;
      out.forEach(function (r, i) { if (idx < 0 && r.indexOf('id="cb-' + anchor + '"') >= 0) idx = i; });
      if (idx > 0) out.unshift(out.splice(idx, 1)[0]);
    }
    return out.join("");
  }

  function buildRail() {
    var rail = byId("rail");

    // Country-fill radios are split across three sections (general / security /
    // economy) but share name="fillgrp" so only one can be active at a time.
    var fillsGeneral = [
      row("rad", "fill-arable", "Arable land (% national)", state.fill === "arable", "fillgrp"),
      row("rad", "fill-role", "Agent / pivot", state.fill === "role", "fillgrp"),
      row("rad", "fill-power", "Computed power (data)", state.fill === "power", "fillgrp"),
      row("rad", "fill-freexp", "Freedom of expression (V-Dem)", state.fill === "freexp", "fillgrp"),
      row("rad", "fill-gini", "Inequality (Gini)", state.fill === "gini", "fillgrp"),
      row("rad", "fill-vdem", "Liberal democracy (V-Dem)", state.fill === "vdem", "fillgrp"),
      row("rad", "fill-religion", "Majority religion", state.fill === "religion", "fillgrp"),
      row("rad", "fill-milex", "Military spending", state.fill === "milex", "fillgrp"),
      row("rad", "fill-tier", "Power tier", state.fill === "tier", "fillgrp"),
      row("rad", "fill-renew", "Renewables (% of total energy)", state.fill === "renew", "fillgrp"),
      row("rad", "fill-trade", "Trade balance (% GDP)", state.fill === "trade", "fillgrp")
    ];
    var noneFill = row("rad", "fill-none", "None", state.fill === "none", "fillgrp");

    var defBlocs = alpha(BLOCS.filter(function (b) { return b.group === "def"; })
      .map(function (b) { return row("chk", b.key, b.label, state[b.key], null, b.color); }));
    var ecoBlocs = alpha(BLOCS.filter(function (b) { return b.group === "eco"; })
      .map(function (b) { return row("chk", b.key, b.label, state[b.key], null, b.color); }));
    var resourceRows = alpha((window.RESOURCE_TYPES || []).map(function (t) {
      return row("chk", "res" + t[0], t[1], state["res" + t[0]], null, t[2]);
    }));

    rail.innerHTML =
      '<button class="reset" id="btn-reset">All layers off</button>' +
      sec("base", "Base map",
        row("chk", "clouds", "Satellite imagery (BlueMarble)", state.clouds, null, "#8A93A6") +
        row("chk", "hillshade", "Terrain &amp; elevation", state.hillshade) +
        row("chk", "terrain3d", "3D topography (relief)", state.terrain3d),
        "3D relief is most visible zoomed in; combine with FLAT mode for best results.", false) +

      sec("fill", "Country fills",
        noneFill + alpha(fillsGeneral) +
        '<div class="legend" id="legend"></div>',
        "Choose one — these paint every country.", false) +

      sec("idx", "Index rankings",
        VDEM_INDICES.map(function (m) {
          return row("chk", "idx-" + m.key, m.label + " (V-Dem)", !!IDX_PANELS[m.key]);
        }).join(""),
        "Opens a floating ranked list. Drag panels by the header — they snap edge to edge, and the arrangement is remembered.", false) +

      sec("stats", "Statistics",
        row("rad", "stat-none", "None", state.stat === "none", "statgrp") +
        alpha([
          row("rad", "stat-freexp", "Freedom of expression", state.stat === "freexp", "statgrp"),
          row("rad", "stat-gdp", "GDP", state.stat === "gdp", "statgrp"),
          row("rad", "stat-gdppc", "GDP per capita", state.stat === "gdppc", "statgrp"),
          row("rad", "stat-milper", "Military personnel", state.stat === "milper", "statgrp"),
          row("rad", "stat-milex", "Military spending", state.stat === "milex", "statgrp"),
          row("rad", "stat-pop", "Population", state.stat === "pop", "statgrp"),
          row("rad", "stat-renew", "Renewables %", state.stat === "renew", "statgrp")
        ]) +
        '<div class="statmode">' +
          row("chk", "statmode-fill", "Render as country fill (choropleth)",
              state.statMode === "fill", null, "#E8A33D") +
          '<div class="legend" id="stat-legend"></div>' +
        '</div>',
        "Hollow amber rings over the active fill by default; toggle to repaint as a choropleth.", false) +

      sec("blocs", "Alliances &amp; blocs",
        sub("Defense") + defBlocs +
        sub("Economic &amp; political") + ecoBlocs,
        "Stackable bloc outlines. Membership follows the YEAR slider.", false) +

      sec("security", "Conflict &amp; security",
        sub("Choropleth") +
        row("rad", "fill-none-security", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-conflict", "Active conflicts", state.fill === "conflict", "fillgrp") +
        row("rad", "fill-usbases", "US military footprint", state.fill === "usbases", "fillgrp") +
        sub("Stack toggles") +
        row("chk", "heat", "Violence density (heat)", state.heat, null, "#ff6a3d") +
        row("chk", "nuclear", "Nuclear weapons states", state.nuclear, null, "#3FE08A") +
        '<p class="hint">Nuclear borders: solid = intercontinental, dashed = regional. Green = thermonuclear, lime = fission-only. Labels show est. warheads.</p>', null, false) +

      sec("econ", "Economy &amp; connectivity",
        sub("Choropleth") +
        row("rad", "fill-none-econ", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-trader", "Top trade partner: US/China", state.fill === "trader", "fillgrp") +
        sub("Stack toggles") +
        row("chk", "bri", "Belt &amp; Road corridors", state.bri, null, "#E8A33D") +
        row("chk", "chokepoints", "Chokepoints &amp; straits", state.chokepoints, null, "#E8A33D") +
        row("chk", "portwatch", "Chokepoint traffic (PortWatch, live)", state.portwatch, null, "#6FE3D4") +
        row("chk", "lanes", "Shipping lanes (major routes)", state.lanes, null, "#49C5B6"),
        "BRI: solid = operational, dashed = planned. PortWatch rings: 7-day avg daily transits.", false) +

      sec("energy", "Energy &amp; chokepoints",
        sub("Choropleth") +
        row("rad", "fill-none-energy", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-oil", "Oil production (barrels/day)", state.fill === "oil", "fillgrp") +
        sub("Stack toggles") +
        row("chk", "pipelines", "Pipelines (oil amber, gas teal)", state.pipelines, null, "#E8A33D") +
        row("chk", "flowarcs", "Energy flow arcs (maritime / overland)", state.flowarcs, null, "#E8A33D") +
        row("chk", "chokestress", "Chokepoint stress halos", state.chokestress, null, "#FFD27F") +
        row("chk", "caspian", "Caspian oil shipping (Iran swap)", state.caspian, null, "#E8A33D"),
        "Pipelines: solid = operating, dashed = construction/proposed. Arcs: amber = maritime, teal dashed = overland. Stress halos scale to % collapse vs Jan-Feb 2026 baseline (PortWatch). Caspian: amber = Iran's Neka swap (actual bpd, est.), teal = other Caspian export flows (CPC, BTC). Iran ships ~none of its own crude north — the bpd shown is actual swap throughput, not the ~370k bpd terminal capacity.", false) +

      sec("signals", "Live signals",
        row("chk", "newspulse", "News pulse (GDELT)", state.newspulse, null, "#5BC8FF") +
        row("chk", "radar", "Precipitation radar (live)", state.radar, null, "#4DA3FF"),
        "Fetched live in-browser (10-15 min refresh). Empty = feed momentarily down.", false) +

      sec("theory", "Classical theory",
        theoryRow("islandchains", "Island Chains (1st-3rd)", "#5BC8FF") +
        theoryRow("heartland", "Mackinder Heartland (1943, approx.)", "#E8A33D") +
        theoryRow("deltas", "River deltas (Marshall)", "#49C5B6") +
        theoryRow("shatter", "Shatterbelts (Cohen)", "#C44569") +
        theoryRow("rimland", "Spykman Rimland + offshore", "#C8B08A") +
        theoryRow("pearls", "String of Pearls", "#E8E6DF") +
        sub("Haushofer / World-Island") +
        theoryRow("worldisland", "World-Island (Map 34: belt + monsoon)", "#E8A33D") +
        theoryRow("panregions", "Pan-regions (4 meridional blocs)", "#B57EDC"),
        "The two Haushofer layers stack with each other and with the Heartland/Rimland above.", false) +

      sec("agriculture", "Agriculture",
        row("chk", "cropland", "Arable / cropland extent", state.cropland, null, "#6FB36F") +
        row("chk", "wheat", "Wheat belts", state.wheat, null, "#E8C45A") +
        row("chk", "rice", "Rice regions", state.rice, null, "#4FC3A1"),
        "Approximate sub-national growing regions (FAO / agronomic geography), stackable. For a national arable-land choropleth, see Country fills.", false) +

      sec("resources", "Natural resources",
        resourceRows +
        '<p class="hint">Major deposits/basins (editorial). Geology: constant across YEAR.</p>',
        null, false) +

      sec("interact", "Interaction (on click)",
        row("chk", "advmode", "Adversary highlight", state.advmode, null, "#FF4D4D") +
        row("chk", "allymode", "Ally highlight", state.allymode, null, "#FFD633") +
        row("chk", "basesmode", "Military bases", state.basesmode, null, "#FFD633"),
        "Click a country: military allies blue, economic green, adversaries red.", false) +

      '<p class="hint" style="margin-top:12px">Data: Natural Earth, RainViewer, Open-Meteo, World Bank (CC BY-4.0), UCDP, IMF PortWatch, OSM/CARTO, AWS Terrain. Conflict synopses: sources per entry.</p>';

    byId("btn-reset").onclick = function () {
      state.fill = "none"; state.stat = "none"; state.statMode = "ring";
      ["hillshade","heat","heartland","rimland","nuclear","chokepoints",
       "newspulse","lanes","portwatch","bri","allymode","advmode","basesmode","islandchains","pearls","shatter","radar","clouds","deltas","terrain3d",
       "pipelines","flowarcs","chokestress","caspian",
       "worldisland","panregions","cropland","wheat","rice"].forEach(function (k) { state[k] = false; });
      BLOCS.forEach(function (b) { state[b.key] = false; });
  (window.RESOURCE_TYPES || []).forEach(function (t) { state["res" + t[0]] = false; });
      applyFill(); switchStat("none");
      [["hillshade",["hillshade"]],["heat",["conflict-heat"]],
       ["heartland",["zone-heartland-fill","zone-heartland-line"]],
       ["rimland",["rimland-fill","rimland-line","offshore-fill","offshore-line"]],
       ["nuclear",["nuclear-fill","nuclear-line-icbm","nuclear-line-reg","nuclear-label"]],
       ["islandchains",["islandchains-line"]],["pearls",["pearls-line","pearls-dot","pearls-label"]],
       ["shatter",["shatter-fill","shatter-line"]],["deltas",["deltas-fill","deltas-label"]],
       ["radar",["radar"]],["clouds",["clouds-base"]],
       ["chokepoints",["chokepoint-dot","chokepoint-label"]],
       ["newspulse",["newspulse"]],["lanes",["lanes-core"]],
       ["portwatch",["portwatch-ring","portwatch-label"]],["bri",["bri-solid","bri-dash","bri-poi","bri-poi-label"]],
       ["pipelines",["pipelines-line","pipelines-label"]],
       ["flowarcs",["flow-arcs-line","flow-arcs-label","flow-arcs-arrow"]],
       ["worldisland",["hf-desert-fill","hf-desert-line","hf-monsoon-fill","hf-boundary-line"]],
       ["panregions",["hf-pan-fill","hf-pan-line","hf-pan-label"]],
       ["cropland",["cropland-fill","cropland-line"]],
       ["wheat",["wheat-fill","wheat-line"]],
       ["rice",["rice-fill","rice-line"]]
      ].forEach(function (t) { t[1].forEach(function (id) { setVis(id, false); }); });
      setChokepointGaugesVisible(false);
      setCaspianVisible(false);
      BLOCS.forEach(function (b) { setVis("bloc-" + b.key, false); });
      (window.RESOURCE_TYPES || []).forEach(function (t) {
        state["res" + t[0]] = false;
        ["res-" + t[0], "res-" + t[0] + "-label",
         "resb-" + t[0], "resb-" + t[0] + "-line"].forEach(function (id) {
          setVis(id, false);
        });
      });
      clearAllies(); clearAdversaries(); clearBases(); setRadar(false); setClouds(false); try { map.setTerrain(null); } catch (e) {}
      buildRail(); updateLegend(); tele();
    };

    // collapsible headers
    Array.prototype.forEach.call(rail.querySelectorAll("h2.sec"), function (h) {
      h.addEventListener("click", function () {
        h.classList.toggle("closed");
        var body = byId("sec-" + h.getAttribute("data-sec"));
        if (body) body.classList.toggle("collapsed");
      });
    });

    // theory info-icon: tap to toggle (hover is handled by CSS). The button
    // sits inside the row <label>, so we must stop the click from also
    // toggling the parent checkbox.
    rail.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".info-i");
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var open = btn.getAttribute("aria-expanded") === "true";
      // close any other open tooltips so they don't pile up
      Array.prototype.forEach.call(rail.querySelectorAll(".info-i[aria-expanded='true']"),
        function (b) { if (b !== btn) b.setAttribute("aria-expanded", "false"); });
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        Array.prototype.forEach.call(rail.querySelectorAll(".info-i[aria-expanded='true']"),
          function (b) { b.setAttribute("aria-expanded", "false"); });
      }
    });

    byId("cb-terrain3d").onchange = function (e) {
      state.terrain3d = e.target.checked;
      try {
        map.setTerrain(state.terrain3d ? { source: "dem", exaggeration: 1.5 } : null);
      } catch (err) { console.error("terrain:", err); }
      tele();
    };
    byId("cb-hillshade").onchange = function (e) { state.hillshade = e.target.checked; setVis("hillshade", state.hillshade); tele(); };
    ["none", "tier", "role", "power", "renew", "milex", "gini", "trade", "arable", "religion", "conflict", "trader", "vdem", "freexp", "usbases", "oil"].forEach(function (v) {
      byId("cb-fill-" + v).onchange = function (e) { if (e.target.checked) { state.fill = v; applyFill(); updateLegend(); refreshCard(); tele(); } };
    });
    // The Security and Economy subsections each carry their own "None" radio
    // (separate ids, shared name="fillgrp" so radio uniqueness still holds).
    // Both clear the active fill so the user can opt out per category without
    // scrolling back up to Country fills.
    ["fill-none-security", "fill-none-econ", "fill-none-energy"].forEach(function (id) {
      var el = byId("cb-" + id);
      if (el) el.onchange = function (e) {
        if (!e.target.checked) return;
        state.fill = "none"; applyFill(); updateLegend(); refreshCard(); tele();
      };
    });
    ["none", "pop", "gdp", "gdppc", "milex", "milper", "renew", "freexp"].forEach(function (m) {
      byId("cb-stat-" + m).onchange = function (e) { if (e.target.checked) { switchStat(m); refreshCard(); } };
    });
    byId("cb-statmode-fill").onchange = function (e) {
      state.statMode = e.target.checked ? "fill" : "ring";
      applyStatRender(); updateLegend(); tele();
    };
    BLOCS.forEach(function (b) {
      byId("cb-" + b.key).onchange = function (e) { state[b.key] = e.target.checked; setVis("bloc-" + b.key, state[b.key]); tele(); };
    });
    byId("cb-heat").onchange = function (e) { state.heat = e.target.checked; setVis("conflict-heat", state.heat); tele(); };
    byId("cb-newspulse").onchange = function (e) { setPulse(e.target.checked); tele(); };
    byId("cb-radar").onchange = function (e) { setRadar(e.target.checked); tele(); };
    byId("cb-clouds").onchange = function (e) { setClouds(e.target.checked); tele(); };
    byId("cb-heartland").onchange = function (e) {
      state.heartland = e.target.checked;
      setVis("zone-heartland-fill", state.heartland); setVis("zone-heartland-line", state.heartland); tele();
    };
    byId("cb-rimland").onchange = function (e) {
      state.rimland = e.target.checked;
      setVis("rimland-fill", state.rimland); setVis("rimland-line", state.rimland);
      setVis("offshore-fill", state.rimland); setVis("offshore-line", state.rimland); tele();
    };
    (window.RESOURCE_TYPES || []).forEach(function (t) {
      byId("cb-res" + t[0]).onchange = function (e) {
        state["res" + t[0]] = e.target.checked;
        ["res-" + t[0], "res-" + t[0] + "-label",
         "resb-" + t[0], "resb-" + t[0] + "-line"].forEach(function (id) {
          setVis(id, e.target.checked);
        });
        tele();
      };
    });
    byId("cb-nuclear").onchange = function (e) {
      state.nuclear = e.target.checked;
      ["nuclear-fill","nuclear-line-icbm","nuclear-line-reg","nuclear-label"]
        .forEach(function (id) { setVis(id, state.nuclear); });
      tele();
    };
    byId("cb-islandchains").onchange = function (e) {
      state.islandchains = e.target.checked; setVis("islandchains-line", state.islandchains); tele();
    };
    byId("cb-pearls").onchange = function (e) {
      state.pearls = e.target.checked;
      ["pearls-line","pearls-dot","pearls-label"].forEach(function (id) { setVis(id, state.pearls); });
      tele();
    };
    byId("cb-shatter").onchange = function (e) {
      state.shatter = e.target.checked;
      setVis("shatter-fill", state.shatter); setVis("shatter-line", state.shatter); tele();
    };
    byId("cb-deltas").onchange = function (e) {
      state.deltas = e.target.checked;
      setVis("deltas-fill", state.deltas); setVis("deltas-label", state.deltas); tele();
    };
    byId("cb-worldisland").onchange = function (e) {
      state.worldisland = e.target.checked;
      ["hf-desert-fill","hf-desert-line","hf-monsoon-fill","hf-boundary-line"]
        .forEach(function (id) { setVis(id, state.worldisland); });
      tele();
    };
    byId("cb-panregions").onchange = function (e) {
      state.panregions = e.target.checked;
      ["hf-pan-fill","hf-pan-line","hf-pan-label"].forEach(function (id) { setVis(id, state.panregions); });
      tele();
    };
    ["cropland", "wheat", "rice"].forEach(function (k) {
      byId("cb-" + k).onchange = function (e) {
        state[k] = e.target.checked;
        setVis(k + "-fill", state[k]); setVis(k + "-line", state[k]); tele();
      };
    });
    VDEM_INDICES.forEach(function (m) {
      var cb = byId("cb-idx-" + m.key);
      if (cb) cb.onchange = function () { toggleIndexPanel(m.key, m.label); };
    });
    byId("cb-lanes").onchange = function (e) {
      state.lanes = e.target.checked;
      setVis("lanes-core", state.lanes); tele();
    };
    byId("cb-portwatch").onchange = function (e) {
      state.portwatch = e.target.checked;
      setVis("portwatch-ring", state.portwatch); setVis("portwatch-label", state.portwatch); tele();
    };
    byId("cb-bri").onchange = function (e) {
      state.bri = e.target.checked;
      ["bri-solid","bri-dash","bri-poi","bri-poi-label"].forEach(function (id) { setVis(id, state.bri); });
      tele();
    };
    byId("cb-pipelines").onchange = function (e) {
      state.pipelines = e.target.checked;
      ["pipelines-line","pipelines-label"].forEach(function (id) { setVis(id, state.pipelines); });
      tele();
    };
    byId("cb-flowarcs").onchange = function (e) {
      state.flowarcs = e.target.checked;
      ["flow-arcs-line","flow-arcs-label","flow-arcs-arrow"].forEach(function (id) { setVis(id, state.flowarcs); });
      tele();
    };
    byId("cb-chokestress").onchange = function (e) {
      state.chokestress = e.target.checked;
      setChokepointGaugesVisible(state.chokestress);
      tele();
    };
    byId("cb-caspian").onchange = function (e) {
      state.caspian = e.target.checked;
      setCaspianVisible(state.caspian);
      tele();
    };
    byId("cb-allymode").onchange = function (e) {
      state.allymode = e.target.checked;
      if (!state.allymode) clearAllies();
      tele();
    };
    byId("cb-advmode").onchange = function (e) {
      state.advmode = e.target.checked;
      if (!state.advmode) clearAdversaries();
      tele();
    };
    byId("cb-basesmode").onchange = function (e) {
      state.basesmode = e.target.checked;
      if (!state.basesmode) clearBases();
      tele();
    };
    byId("cb-chokepoints").onchange = function (e) {
      state.chokepoints = e.target.checked;
      setVis("chokepoint-dot", state.chokepoints); setVis("chokepoint-label", state.chokepoints); tele();
    };

    updateLegend();
    tele();
  }

  function fillVintage() {
    var wb = ["power", "renew", "milex", "gini", "trade", "arable"];
    if (wb.indexOf(state.fill) >= 0 || state.stat !== "none") {
      if (CUR_YEAR >= 2026) {
        var m = POWER_BY_NAME && POWER_BY_NAME._meta;
        return "World Bank, latest per country" + (m && m.fetched ? " \u00B7 fetched " + m.fetched : "");
      }
      return "World Bank, year " + CUR_YEAR;
    }
    if (state.fill === "tier" || state.fill === "role") return "Editorial, 2026 snapshot";
    if (state.fill === "religion") return "Editorial, ~2024 estimates";
    if (state.fill === "trader") return "Editorial · partner flips per TRADE_PARTNER_CHANGES · year " + CUR_YEAR;
    if (state.fill === "vdem") return "V-Dem v2x_libdem via OWID (CC BY), year " + Math.min(CUR_YEAR, 2025);
    if (state.fill === "freexp") return "V-Dem v2x_freexp_altinf via OWID (CC BY), year " + Math.min(CUR_YEAR, 2025);
    if (state.fill === "usbases") return "After Vine (2021) / IBON (2025): 742 bases, 82 hosts. Dots = curated majors. 2026 snapshot";
    if (state.fill === "conflict") return (window.CONFLICTS_VINTAGE || "Editorial") + " \u00B7 era-bounded by YEAR";
    if (state.fill === "oil") return "Our World in Data \u00B7 crude+condensate, barrels/day (latest available year)";
    return "";
  }
  function updateLegend() {
    var el = byId("legend");
    var items = state.fill === "tier"
      ? [["Hegemon", TIER_COLOR.hegemon], ["Great", TIER_COLOR.great], ["Regional", TIER_COLOR.regional],
         ["Middle", TIER_COLOR.middle], ["Small", TIER_COLOR.small], ["Unclassified", TIER_COLOR.unclassified]]
      : state.fill === "role"
      ? [["Agent", "#3FA37A"], ["Pivot", "#D98AE0"]]
      : state.fill === "power"
      ? [["Lower", "#3B5266"], ["", "#C28A2A"], ["Higher", "#FFD633"]]
      : state.fill === "renew"
      ? [["0%", "#2A3343"], ["50%", "#2F7556"], ["100%", "#3FE08A"]]
      : state.fill === "milex"
      ? [["Low", "#5A3A3A"], ["Mid", "#C2552E"], ["High", "#FFD633"]]
      : state.fill === "gini"
      ? [["Equal 25", "#4E88A6"], ["40", "#E8843D"], ["Unequal 55", "#E84393"]]
      : state.fill === "trade"
      ? [["Deficit", "#E84393"], ["0", "#3B5266"], ["Surplus", "#3FE08A"]]
      : state.fill === "arable"
      ? [["0%", "#23331F"], ["25%", "#6E8F38"], ["60%+", "#E4E86A"]]
      : state.fill === "vdem"
      ? bandLegend()
      : state.fill === "freexp"
      ? bandLegend()
      : state.fill === "usbases"
      ? [["Hosts US bases/installations", "#C0392B"]]
      : state.fill === "trader"
      ? [["US-led", "#4DA3FF"], ["China-led", "#FF4D4D"]]
      : state.fill === "conflict"
      ? [["Interstate", "#FF4D4D"], ["Intl. civil/proxy", "#E8843D"], ["Civil", "#C9A227"]]
      : state.fill === "religion"
      ? [["Christian", "#6C8EBF"], ["Muslim", "#3FA37A"], ["Hindu", "#E8843D"],
         ["Buddhist", "#C9A227"], ["Jewish", "#5BC8FF"], ["Folk", "#B57EDC"],
         ["Unaffil.", "#8A93A6"]]
      : state.fill === "oil"
      ? [["0", "#0B1020"], ["250k", "#3A2A14"], ["1M", "#6B4518"],
         ["4M", "#A86A1E"], ["9M", "#E8A33D"], ["13M b/d", "#FFD27F"]]
      : [];
    el.innerHTML = items.map(function (i) {
      return '<span><i style="background:' + i[1] + '"></i>' + i[0] + "</span>";
    }).join("");
    updateStatLegend();
  }

  // Legend for the five score bands, plus the themed no-data swatch. Built from
  // BANDS so the legend can never drift from the fill it describes.
  function bandLegend() {
    return BANDS.map(function (b) { return [b.label, b.color]; })
                .concat([["No data", TH("nodata")]]);
  }

  // legend strip for the active statistic. Renders only in choropleth mode
  // (state.statMode === "fill") — in ring mode the size already encodes the
  // value, so the gradient is irrelevant.
  var STAT_LEGEND = {
    pop:    [["0", "#1E2A40"], ["50M", "#4DA38A"], ["1.4B+", "#FFD633"]],
    gdp:    [["$0", "#1E2A40"], ["$1T", "#4DA38A"], ["$25T+", "#FFD633"]],
    gdppc:  [["$0", "#1E2A40"], ["$12k", "#4DA38A"], ["$90k+", "#FFD633"]],
    milex:  [["$0", "#3B4D63"], ["$10B", "#C28A35"], ["$900B+", "#FFD633"]],
    milper: [["0", "#1E2A40"], ["250k", "#C28A2A"], ["3M+", "#FFD633"]],
    renew:  [["0%", "#58708F"], ["50%", "#3AB374"], ["100%", "#7CFFB0"]],
    freexp: [["0", "#3B1F4F"], ["50", "#A07AC4"], ["100", "#A8E8FF"]]
  };
  var STAT_LABEL = {
    pop: "Population", gdp: "GDP", gdppc: "GDP / capita",
    milex: "Mil. spending", milper: "Mil. personnel",
    renew: "Renewables %", freexp: "Freedom of expression"
  };
  function updateStatLegend() {
    var el = byId("stat-legend");
    if (!el) return;
    if (state.stat === "none" || state.statMode !== "fill") {
      el.innerHTML = ""; return;
    }
    var items = STAT_LEGEND[state.stat] || [];
    el.innerHTML =
      '<div class="legend-title">' + (STAT_LABEL[state.stat] || state.stat) + "</div>" +
      items.map(function (i) {
        return '<span><i style="background:' + i[1] + '"></i>' + i[0] + "</span>";
      }).join("");
  }

  /* ---- telemetry + interaction ------------------------------------------ */
  function tele() {
    var c = map.getCenter();
    byId("t-coords").textContent = c.lat.toFixed(1) + "°, " + c.lng.toFixed(1) + "°";
    byId("t-zoom").textContent = map.getZoom().toFixed(1);
    var n = (state.fill !== "none" ? 1 : 0) + (state.stat !== "none" ? 1 : 0) +
            (state.hillshade ? 1 : 0) + (state.heat ? 1 : 0) +
            (state.heartland ? 1 : 0) + (state.rimland ? 1 : 0) + (state.nuclear ? 1 : 0) +
            (state.chokepoints ? 1 : 0) + (state.newspulse ? 1 : 0) +
            (state.lanes ? 1 : 0) + (state.portwatch ? 1 : 0) + (state.bri ? 1 : 0) +
            (state.radar ? 1 : 0) + (state.clouds ? 1 : 0);
    BLOCS.forEach(function (b) { if (state[b.key]) n++; });
    byId("t-layers").textContent = n;
  }
  map.on("move", tele);

  function wireInteraction() {
    map.on("click", "countries-hit", function (e) {
      var p = e.features[0].properties;
      showCard(p);
      refreshIndexPanels();
      if (state.allymode) showAllies(p.cname);
      if (state.advmode) showAdversaries(p.cname);
      if (state.basesmode) showBases(p.cname);
    });
    map.on("mouseenter", "countries-hit", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "countries-hit", function () { map.getCanvas().style.cursor = ""; });

    byId("card-close").onclick = function () {
      byId("card").classList.remove("show");
      CARD_OPEN = null;
    };

    var rt = byId("rail-toggle");
    if (rt) rt.onclick = function () { byId("rail").classList.toggle("hidden"); };

    (function () {
      try {
        var owner = location.hostname.split(".")[0];
        var repo = location.pathname.split("/").filter(Boolean)[0];
        if (!owner || !repo) return;
        fetch("https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=1")
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var dt = d && d[0] && d[0].commit && d[0].commit.committer.date;
            if (dt) byId("t-upd").textContent = dt.slice(0, 10);
          }).catch(function () {});
      } catch (e) {}
    })();

    var ty = byId("t-year");
    if (ty) ty.oninput = function () { setYear(parseInt(ty.value, 10)); };

    var tp = byId("t-proj");
    if (tp) tp.onclick = function () {
      state.flat = !state.flat;
      try {
        map.setProjection({ type: state.flat ? "mercator" : "globe" });
        if (map.setRenderWorldCopies) map.setRenderWorldCopies(state.flat);
      } catch (err) { console.error(err); }
      tp.textContent = state.flat ? "GLOBE ◯" : "FLAT ▭";
      tp.classList.toggle("on", state.flat);
    };

    var tt = byId("t-theme");
    if (tt) tt.onclick = function () {
      applyTheme(THEME_NAME === "dark" ? "light" : "dark");
    };

    // auto-spin
    var spinning = false, raf = null;
    function step() { if (!spinning) return; var c = map.getCenter(); c.lng += 0.05; map.setCenter(c); raf = requestAnimationFrame(step); }
    function setSpin(on) {
      spinning = on;
      byId("t-spin").classList.toggle("on", on);
      byId("t-spin").textContent = on ? "SPIN ◼" : "SPIN ▷";
      if (on) step(); else if (raf) cancelAnimationFrame(raf);
    }
    byId("t-spin").onclick = function () { setSpin(!spinning); };
    byId("t-spin").onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSpin(!spinning); } };
    ["mousedown", "touchstart", "wheel"].forEach(function (ev) {
      map.on(ev, function () { if (spinning) setSpin(false); });
    });
  }

  function fmtUSD(v) {
    if (!v) return "—";
    if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    return "$" + Math.round(v);
  }
  function fmtNum(v) {
    if (!v) return "—";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(0) + "k";
    return String(Math.round(v));
  }
  function setText(id, t) { var el = byId(id); if (el) el.textContent = t; }
  function setHTML(id, h) { var el = byId(id); if (el) el.innerHTML = h; }
  var CARD_OPEN = null;  // cname currently shown in the card

  // Active-layer descriptors for the card. Each entry returns a one-line
  // "label: value" summary for the country properties under the current fill
  // or stat. Used to surface the active metric in the card so the user can
  // see the exact number behind the color they're looking at.
  function fmtPct(v) { return v == null || v < 0 ? "—" : Math.round(v) + "%"; }
  function fmtVdem(v) { return v == null || v < 0 ? "—" : Math.round(v) + " / 100"; }
  var FILL_CARD = {
    tier:    function (p, st) { return ["Power tier", TIER_LABEL[p.tier] || "—"]; },
    role:    function (p, st) { return ["Strategic role", ROLE_LABEL[p.role] || "—"]; },
    power:   function (p, st) { return ["Computed power (share)",
                                        st.composite != null ? (st.composite * 100).toFixed(2) + "%" : "—"]; },
    renew:   function (p, st) { return ["Renewables (% of total energy)", fmtPct(st.renew)]; },
    milex:   function (p, st) { return ["Military spending", st.milex ? fmtUSD(st.milex) : "—"]; },
    gini:    function (p, st) { return ["Inequality (Gini)", st.gini != null && st.gini >= 0 ? Math.round(st.gini) : "—"]; },
    trade:   function (p, st) { return ["Trade balance (% GDP)",
                                        st.trade != null && st.trade !== -999 ? (st.trade > 0 ? "+" : "") + st.trade.toFixed(1) + "%" : "—"]; },
    religion: function (p, st) { return ["Majority religion", (p.relig || "—").replace(/^./, function (c) { return c.toUpperCase(); })]; },
    conflict: function (p, st) { return ["Active conflict type", p.conflict || "—"]; },
    trader:  function (p, st) { return ["Top trade partner",
                                        p.trader === "us" ? "US-led" : p.trader === "china" ? "China-led" : "—"]; },
    vdem:    function (p, st) { return ["Liberal democracy (V-Dem)", fmtVdem(p.vdem)]; },
    freexp:  function (p, st) { return ["Freedom of expression (V-Dem)", fmtVdem(p.freexp)]; },
    usbases: function (p, st) { return ["US military footprint", p.usbase ? "Host country" : "—"]; }
  };
  var STAT_CARD = {
    pop:    function (st) { return ["Population", st.pop ? fmtNum(st.pop) : "—"]; },
    gdp:    function (st) { return ["GDP", st.gdp ? fmtUSD(st.gdp) : "—"]; },
    gdppc:  function (st) { return ["GDP per capita", st.gdppc ? fmtUSD(st.gdppc) : "—"]; },
    milex:  function (st) { return ["Military spending", st.milex ? fmtUSD(st.milex) : "—"]; },
    milper: function (st) { return ["Military personnel", st.milper ? fmtNum(st.milper) : "—"]; },
    renew:  function (st) { return ["Renewables", fmtPct(st.renew)]; },
    freexp: function (st) { var p = COUNTRIES_GEO && COUNTRIES_GEO.features
                              .filter(function (f) { return f.properties.cname === CARD_OPEN; })[0];
                            return ["Freedom of expression", fmtVdem(p && p.properties.freexp)]; }
  };

  function refreshCard() {
    if (!CARD_OPEN || !COUNTRIES_GEO) return;
    var f = COUNTRIES_GEO.features.filter(function (f) {
      return f.properties.cname === CARD_OPEN;
    })[0];
    if (f) showCard(f.properties);
  }

  /* ---- floating index ranking panels -------------------------------------
     One IndexPanel per V-Dem metric, opened from the rail. Draggable by the
     header, snapping to each other's edges so three indices can be lined up
     side by side for a screenshot. Layout persists to localStorage.

     Drag uses pointer events with setPointerCapture (one code path for mouse,
     trackpad, touch and pen) and moves via CSS transform rather than left/top,
     which avoids a layout pass on every frame. */
  var IDX_PANELS = {};
  var IDX_Z = 8;
  var IDX_STORE = "geostrat:idxpanels:v1";

  function idxLoadLayout() {
    try { return JSON.parse(localStorage.getItem(IDX_STORE) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function idxSaveLayout() {
    var out = {};
    Object.keys(IDX_PANELS).forEach(function (k) {
      var p = IDX_PANELS[k];
      out[k] = { x: p.x, y: p.y };
    });
    try { localStorage.setItem(IDX_STORE, JSON.stringify(out)); } catch (e) {}
  }

  function IndexPanel(metric, label) {
    var self = this;
    this.metric = metric;
    this.label = label;

    var el = document.createElement("div");
    el.className = "idx-panel";
    el.innerHTML =
      '<div class="idx-head"><span class="idx-title"></span>' +
      '<button class="idx-close" aria-label="Close">✕</button></div>' +
      '<div class="idx-body"></div>';
    document.body.appendChild(el);

    this.el = el;
    this.head = el.querySelector(".idx-head");
    this.body = el.querySelector(".idx-body");
    el.querySelector(".idx-title").textContent = label;
    el.querySelector(".idx-close").onclick = function () { self.close(); };

    // stagger new panels so they don't stack exactly on top of each other
    var n = Object.keys(IDX_PANELS).length;
    var saved = idxLoadLayout()[metric];
    this.x = saved ? saved.x : 0;
    this.y = saved ? saved.y : 0;
    el.style.left = (18 + (saved ? 0 : n * 24)) + "px";
    el.style.top = (110 + (saved ? 0 : n * 24)) + "px";
    el.style.transform = "translate(" + this.x + "px," + this.y + "px)";
    el.style.zIndex = ++IDX_Z;

    this.wireDrag();
    this.render();
  }

  IndexPanel.prototype.wireDrag = function () {
    var self = this, sx = 0, sy = 0, ox = 0, oy = 0, active = false;
    this.head.addEventListener("pointerdown", function (e) {
      if (e.target.classList.contains("idx-close")) return;
      active = true;
      try { self.head.setPointerCapture(e.pointerId); } catch (err) {}
      sx = e.clientX; sy = e.clientY; ox = self.x; oy = self.y;
      self.el.style.zIndex = ++IDX_Z;
      self.head.classList.add("grabbing");
      e.preventDefault();
    });
    this.head.addEventListener("pointermove", function (e) {
      if (!active) return;
      self.moveTo(ox + (e.clientX - sx), oy + (e.clientY - sy));
    });
    function end() {
      if (!active) return;
      active = false;
      self.head.classList.remove("grabbing");
      self.snap();
      idxSaveLayout();
    }
    this.head.addEventListener("pointerup", end);
    this.head.addEventListener("pointercancel", end);
  };

  // Clamp against the viewport so a panel can never be dragged out of reach.
  IndexPanel.prototype.moveTo = function (nx, ny) {
    var r = this.el.getBoundingClientRect();
    var left0 = r.left - this.x, top0 = r.top - this.y;
    nx = Math.max(8 - left0, Math.min(nx, window.innerWidth - left0 - r.width - 8));
    ny = Math.max(8 - top0, Math.min(ny, window.innerHeight - top0 - r.height - 8));
    this.x = nx; this.y = ny;
    this.el.style.transform = "translate(" + nx + "px," + ny + "px)";
  };

  // On release, align a touching edge if it's within 16px of another panel.
  IndexPanel.prototype.snap = function () {
    var me = this.el.getBoundingClientRect(), dx = 0, dy = 0, self = this;
    Object.keys(IDX_PANELS).forEach(function (k) {
      var o = IDX_PANELS[k];
      if (o === self) return;
      var r = o.el.getBoundingClientRect();
      if (Math.abs(me.left - r.right) < 16) dx = r.right - me.left;
      else if (Math.abs(me.right - r.left) < 16) dx = r.left - me.right;
      if (Math.abs(me.top - r.top) < 16) dy = r.top - me.top;
    });
    if (dx || dy) this.moveTo(this.x + dx, this.y + dy);
  };

  IndexPanel.prototype.render = function () {
    var t = rankTable(this.metric, CUR_YEAR), self = this;
    if (!t.total) {
      this.body.innerHTML = '<p class="idx-empty">No data for ' + this.label +
        " in " + Math.min(CUR_YEAR, 2025) +
        ". The V-Dem workflow may not have run since this index was added.</p>";
      return;
    }
    var html = t.rows.map(function (r) {
      var active = r.name === CARD_OPEN ? " active" : "";
      return '<div class="idx-row' + active + '" data-name="' +
        String(r.name).replace(/"/g, "&quot;") + '">' +
        '<span class="idx-rank">' + r.rank + "</span>" +
        '<span class="idx-name">' + r.name + "</span>" +
        '<span class="idx-score" style="color:' + bandColor(r.value) + '">' +
        Math.round(r.value) + "</span></div>";
    }).join("");
    this.body.innerHTML = html;
    this.body.onclick = function (e) {
      var row = e.target.closest ? e.target.closest(".idx-row") : null;
      if (!row) return;
      self.selectCountry(row.getAttribute("data-name"));
    };
    // keep the highlighted country in view when the panel re-renders
    var act = this.body.querySelector(".idx-row.active");
    if (act && act.scrollIntoView) act.scrollIntoView({ block: "center" });
  };

  IndexPanel.prototype.selectCountry = function (name) {
    if (!COUNTRIES_GEO) return;
    var f = COUNTRIES_GEO.features.filter(function (x) {
      return x.properties.cname === name;
    })[0];
    if (!f) return;
    showCard(f.properties);
    byId("card").classList.add("show");
    var c = centroid(f.geometry);
    if (c) map.easeTo({ center: c, duration: 700 });
    refreshIndexPanels();
  };

  IndexPanel.prototype.close = function () {
    this.el.parentNode && this.el.parentNode.removeChild(this.el);
    delete IDX_PANELS[this.metric];
    idxSaveLayout();
    // sync the rail checkbox directly rather than rebuilding the whole rail,
    // which would collapse whatever sections the user has open
    var cb = byId("cb-idx-" + this.metric);
    if (cb) cb.checked = false;
  };

  function toggleIndexPanel(metric, label) {
    if (IDX_PANELS[metric]) { IDX_PANELS[metric].close(); return; }
    IDX_PANELS[metric] = new IndexPanel(metric, label);
    idxSaveLayout();
    var cb = byId("cb-idx-" + metric);
    if (cb) cb.checked = true;
  }
  function refreshIndexPanels() {
    Object.keys(IDX_PANELS).forEach(function (k) { IDX_PANELS[k].render(); });
  }
  // Reopen whatever was on screen last session, in its saved position.
  function restoreIndexPanels() {
    var layout = idxLoadLayout();
    VDEM_INDICES.forEach(function (m) {
      if (layout[m.key] && !IDX_PANELS[m.key]) toggleIndexPanel(m.key, m.label);
    });
  }

  /* Renders the V-Dem block: regime badge, five score bars with ranks, note.
     Missing data arrives as the -1 sentinel from vdemAt. -1 falls inside the
     0-20 band, so it MUST be filtered before any band lookup or a country with
     no coverage would render a confident red bar reading "deeply autocratic"
     instead of "unknown". */
  function renderVdemBlock(p) {
    var wrap = byId("card-vdem"), note = byId("card-vdem-note"),
        field = byId("card-vdem-field"), badge = byId("card-regime");

    var regime = p.regime;
    if (badge) {
      var hasRegime = typeof regime === "number" && regime >= 0 && regime <= 3;
      badge.innerHTML = hasRegime
        ? '<span class="regime-badge">' + REGIME_LABEL[regime] + "</span>" : "";
      badge.style.display = hasRegime ? "" : "none";
    }
    if (!wrap) return;

    var any = false;
    var html = VDEM_INDICES.map(function (m) {
      var v = p["vd_" + m.key];
      var known = typeof v === "number" && v >= 0;
      if (!known) {
        return '<div class="vd-row"><div class="vd-top"><span>' + m.label +
               '</span><span class="vd-nodata">—</span></div>' +
               '<div class="vd-track"></div></div>';
      }
      any = true;
      var t = rankTable(m.key, CUR_YEAR);
      var r = t.byName[p.cname];
      var rankTxt = r ? '<span class="vd-rank">· ' + r.rank + "</span>" : "";
      var score = Math.round(v);
      return '<div class="vd-row"><div class="vd-top"><span>' + m.label +
             '</span><span><b>' + score + "</b> " + rankTxt + "</span></div>" +
             '<div class="vd-track"><i style="width:' + Math.max(0, Math.min(100, v)) +
             "%;background:" + bandColor(v) + '"></i></div></div>';
    }).join("");

    // If the whole set is missing, say so once rather than printing five dashes.
    if (!any) {
      html = '<p class="vd-nodata-all">No V-Dem coverage for this country' +
             (VDEM ? "" : " (index not loaded yet)") + ".</p>";
    }
    wrap.innerHTML = html;
    if (field) field.style.display = "";

    var total = any ? rankTable("libdem", CUR_YEAR).total : 0;
    if (note) {
      note.textContent = any
        ? "V-Dem indices (0–1) ×100. Not percentages or percentiles. Fixed bands. " +
          "Ranked of " + total + ", year " + Math.min(CUR_YEAR, 2025) + "."
        : "";
    }
  }

  function showCard(p) {
    CARD_OPEN = p.cname;
    setText("card-name", p.cname);
    setText("card-tier", TIER_LABEL[p.tier] || p.tier);
    setText("card-role", ROLE_LABEL[p.role] || "—");
    var chips = [];
    BLOCS.forEach(function (b) { if (p[b.key]) chips.push('<span class="chip">' + b.label + "</span>"); });
    setHTML("card-blocs", chips.length ? chips.join("") : '<span class="value">—</span>');

    renderVdemBlock(p);

    var st = powerOf(p.cname);
    var yearLabel = CUR_YEAR >= 2026 ? "live" : CUR_YEAR;
    var yearEl = byId("card-year");
    if (yearEl) yearEl.textContent = "[" + yearLabel + "]";

    // active-layer line: what the current fill or active stat says about
    // this country. Hidden if neither produces a meaningful value.
    var activeRows = [];
    var ff = FILL_CARD[state.fill];
    if (ff) {
      var pair = ff(p, st);
      if (pair && pair[1] !== "—") activeRows.push("<b>" + pair[0] + ":</b> " + pair[1]);
    }
    var sf = STAT_CARD[state.stat];
    if (sf && state.stat !== state.fill) {
      var pair2 = sf(st);
      if (pair2 && pair2[1] !== "—") activeRows.push("<b>" + pair2[0] + ":</b> " + pair2[1]);
    }
    var actField = byId("card-active-field");
    var actVal = byId("card-active");
    if (activeRows.length) {
      if (actField) actField.style.display = "";
      if (actVal) { actVal.style.display = ""; actVal.innerHTML = activeRows.join("<br>"); }
    } else {
      if (actField) actField.style.display = "none";
      if (actVal) actVal.style.display = "none";
    }

    var hasStats = st.gdp || st.pop || st.milex;
    setHTML("card-stats", hasStats
      ? "GDP " + fmtUSD(st.gdp) + " &middot; Pop " + fmtNum(st.pop) +
        "<br>Per cap " + fmtUSD(st.gdppc) + " &middot; Mil " + fmtUSD(st.milex) +
        "<br>Forces " + fmtNum(st.milper) +
        (st.renew ? " &middot; Renewables " + Math.round(st.renew) + "%" : "") +
        (st.gini !== undefined ? "<br>Gini " + Math.round(st.gini) : "") +
        (st.trade !== undefined ? " &middot; Trade bal " + (st.trade > 0 ? "+" : "") + st.trade.toFixed(1) + "% GDP" : "") +
        (st.tradeusd !== undefined ? " (" + (st.tradeusd < 0 ? "&minus;" : "+") + fmtUSD(Math.abs(st.tradeusd)) + "/yr)" : "")
      : "—");
    var ni = (window.NUCLEAR_INFO || {})[p.cname];
    if (ni) {
      var cur = byId("card-role");
      if (cur) cur.innerHTML = (ROLE_LABEL[p.role] || "&mdash;") +
        "<br><span style='color:#3FE08A'>Nuclear: &asymp;" + ni.wh + " warheads &middot; " +
        (ni.icbm ? "intercontinental" : "regional") + " &middot; " +
        (ni.h ? "thermonuclear" : "fission") + "</span>";
    }

    var confs = conflictsAt(p.cname, CUR_YEAR);
    setHTML("card-conflict", confs.length ? confs.map(function (cf) {
      return "<b>" + cf.name + "</b> (" + cf.type + ", " + cf.since +
             (cf.untilY ? "&ndash;" + cf.untilY : "&ndash;ongoing") + ")<br>" +
             cf.cause + "<br>" + cf.casualties +
             "<br><i>Source: " + cf.source + "</i>";
    }).join("<hr>") : "—");

    var wb = byId("card-wb");
    if (wb) {
      if (st.iso3) { wb.href = "https://data.worldbank.org/country/" + st.iso3; wb.style.display = "inline-block"; }
      else { wb.style.display = "none"; }
    }
    var wx = byId("card-wx");
    if (wx) {
      wx.textContent = "\u2026";
      var pt = COUNTRY_POINTS_GEO && COUNTRY_POINTS_GEO.features.filter(function (f) {
        return f.properties.cname === p.cname;
      })[0];
      if (pt) {
        var c = pt.geometry.coordinates;
        fetch("https://api.open-meteo.com/v1/forecast?latitude=" + c[1].toFixed(2) +
              "&longitude=" + c[0].toFixed(2) + "&current=temperature_2m,wind_speed_10m")
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var cu = d && d.current;
            wx.textContent = cu ? Math.round(cu.temperature_2m) + "\u00B0C \u00B7 wind " +
              Math.round(cu.wind_speed_10m) + " km/h (centroid)" : "\u2014";
          }).catch(function () { wx.textContent = "\u2014"; });
      } else { wx.textContent = "\u2014"; }
    }
    var card = byId("card"); if (card) card.classList.add("show");
  }
})();

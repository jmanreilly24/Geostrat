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
      { id: "space", type: "background", paint: { "background-color": "#0B1020" } },
      { id: "base", type: "raster", source: "base" },
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
    hillshade: true, fill: "tier", stat: "none", statMode: "ring",
    heat: true, heartland: false, rimland: false, nuclear: false,
    chokepoints: true, newspulse: false, lanes: false, portwatch: false, bri: false,
    allymode: false, advmode: false, basesmode: false, flat: false, islandchains: false, pearls: false, shatter: false, radar: false, clouds: false, deltas: false, terrain3d: false
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
        refreshConflict();
        refreshPower();
        refreshNewspulse();
        refreshPortwatch();
        fetch("data/vdem.json", { cache: "no-store" })
          .then(function (r) { if (r.ok) return r.json(); throw 0; })
          .then(function (d) { VDEM = d; applyYear(); })
          .catch(function () {});
        buildRail();
        wireInteraction();
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
      f.properties.relig = (window.RELIGION || {})[f.properties.cname] || "none";
      f.properties.trader = traderAt(f.properties.cname, CUR_YEAR);
      f.properties.vdem = vdemAt("libdem", CUR_YEAR, f.properties.cname);
      f.properties.freexp = vdemAt("freexp", CUR_YEAR, f.properties.cname);
      f.properties.usbase = (window.USBASE_HOSTS || []).indexOf(f.properties.cname) >= 0;
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

    // V-Dem liberal democracy index (0-100)
    map.addLayer({ id: "fill-vdem", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "vdem"],
        -1, "#222C3B", 0, "#8E2F4F", 25, "#C2552E", 50, "#C9A227", 75, "#4E9E6E", 100, "#3FE08A"],
        "fill-opacity": 0.62 },
      layout: { visibility: "none" } });

    // V-Dem freedom of expression index (0-100) — distinct blue-violet ramp
    // so it reads differently from the libdem fill at a glance.
    map.addLayer({ id: "fill-freexp", type: "fill", source: "countries",
      paint: { "fill-color": ["interpolate", ["linear"], ["get", "freexp"],
        -1, "#222C3B", 0, "#3B1F4F", 25, "#6E2F8A", 50, "#A07AC4", 75, "#5BC8FF", 100, "#A8E8FF"],
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
      paint: { "line-color": "#2b3a55", "line-width": 0.6, "line-opacity": 0.85 } });

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

    // Shipping lanes — static arteries with a soft glow
    map.addLayer({ id: "lanes-glow", type: "line", source: "lanes",
      paint: { "line-color": "#49C5B6", "line-opacity": 0.12,
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 3, 10, 10] },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });
    map.addLayer({ id: "lanes-core", type: "line", source: "lanes",
      paint: { "line-color": "#49C5B6", "line-opacity": 0.45,
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 1, 10, 3.2] },
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

    // Belt and Road corridors: solid = completed, dashed = planned/ongoing
    map.addLayer({ id: "bri-solid", type: "line", source: "bri",
      filter: ["==", ["get", "status"], "completed"],
      paint: { "line-color": "#E8A33D", "line-opacity": 0.8,
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 1, 10, 3] },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });
    map.addLayer({ id: "bri-dash", type: "line", source: "bri",
      filter: ["==", ["get", "status"], "planned"],
      paint: { "line-color": "#E8A33D", "line-opacity": 0.7, "line-dasharray": [2.2, 1.8],
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 1, 10, 2.6] },
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

    // natural resource deposits
    map.addSource("resources", { type: "geojson", data: fc((window.RESOURCES || []).map(function (r) {
      return { type: "Feature", properties: { rtype: r.type, name: r.name },
               geometry: { type: "Point", coordinates: [r.lng, r.lat] } };
    })) });
    (window.RESOURCE_TYPES || []).forEach(function (t) {
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

    // transparent always-on hit layer for clicks
    map.addLayer({ id: "countries-hit", type: "fill", source: "countries",
      paint: { "fill-color": "#000", "fill-opacity": 0 } });

    applyFill();
  }

  function applyFill() {
    setVis("fill-tier", state.fill === "tier");
    setVis("fill-role", state.fill === "role");
    setVis("fill-power", state.fill === "power");
    setVis("fill-renew", state.fill === "renew");
    setVis("fill-milex", state.fill === "milex");
    setVis("fill-gini", state.fill === "gini");
    setVis("fill-trade", state.fill === "trade");
    setVis("fill-religion", state.fill === "religion");
    setVis("fill-conflict", state.fill === "conflict");
    setVis("fill-trader", state.fill === "trader");
    setVis("fill-vdem", state.fill === "vdem");
    setVis("fill-freexp", state.fill === "freexp");
    setVis("fill-usbases", state.fill === "usbases");
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
      row("rad", "fill-role", "Agent / pivot", state.fill === "role", "fillgrp"),
      row("rad", "fill-power", "Computed power (data)", state.fill === "power", "fillgrp"),
      row("rad", "fill-freexp", "Freedom of expression (V-Dem)", state.fill === "freexp", "fillgrp"),
      row("rad", "fill-gini", "Inequality (Gini)", state.fill === "gini", "fillgrp"),
      row("rad", "fill-vdem", "Liberal democracy (V-Dem)", state.fill === "vdem", "fillgrp"),
      row("rad", "fill-religion", "Majority religion", state.fill === "religion", "fillgrp"),
      row("rad", "fill-milex", "Military spending", state.fill === "milex", "fillgrp"),
      row("rad", "fill-tier", "Power tier", state.fill === "tier", "fillgrp"),
      row("rad", "fill-renew", "Renewables (% of grid)", state.fill === "renew", "fillgrp"),
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
        "3D relief is most visible zoomed in; combine with FLAT mode for best results.") +

      sec("fill", "Country fills",
        noneFill + alpha(fillsGeneral) +
        '<div class="legend" id="legend"></div>',
        "Choose one — these paint every country.") +

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
        "Hollow amber rings over the active fill by default; toggle to repaint as a choropleth.") +

      sec("blocs", "Alliances &amp; blocs",
        sub("Defense") + defBlocs +
        sub("Economic &amp; political") + ecoBlocs,
        "Stackable bloc outlines. Membership follows the YEAR slider.") +

      sec("security", "Conflict &amp; security",
        sub("Choropleth") +
        row("rad", "fill-none-security", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-conflict", "Active conflicts", state.fill === "conflict", "fillgrp") +
        row("rad", "fill-usbases", "US military footprint", state.fill === "usbases", "fillgrp") +
        sub("Stack toggles") +
        row("chk", "heat", "Violence density (heat)", state.heat, null, "#ff6a3d") +
        row("chk", "nuclear", "Nuclear weapons states", state.nuclear, null, "#3FE08A") +
        '<p class="hint">Nuclear borders: solid = intercontinental, dashed = regional. Green = thermonuclear, lime = fission-only. Labels show est. warheads.</p>') +

      sec("econ", "Economy &amp; connectivity",
        sub("Choropleth") +
        row("rad", "fill-none-econ", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-trader", "Top trade partner: US/China", state.fill === "trader", "fillgrp") +
        sub("Stack toggles") +
        row("chk", "bri", "Belt &amp; Road corridors", state.bri, null, "#E8A33D") +
        row("chk", "chokepoints", "Chokepoints &amp; straits", state.chokepoints, null, "#E8A33D") +
        row("chk", "portwatch", "Chokepoint traffic (PortWatch, live)", state.portwatch, null, "#6FE3D4") +
        row("chk", "lanes", "Shipping lanes (major routes)", state.lanes, null, "#49C5B6"),
        "BRI: solid = operational, dashed = planned. PortWatch rings: 7-day avg daily transits.") +

      sec("signals", "Live signals",
        row("chk", "newspulse", "News pulse (GDELT)", state.newspulse, null, "#5BC8FF") +
        row("chk", "radar", "Precipitation radar (live)", state.radar, null, "#4DA3FF"),
        "Fetched live in-browser (10-15 min refresh). Empty = feed momentarily down.", false) +

      sec("theory", "Classical theory",
        theoryRow("islandchains", "Island Chains (1st-3rd)", "#5BC8FF") +
        theoryRow("heartland", "Mackinder Heartland (approx.)", "#E8A33D") +
        theoryRow("deltas", "River deltas (Marshall)", "#49C5B6") +
        theoryRow("shatter", "Shatterbelts (Cohen)", "#C44569") +
        theoryRow("rimland", "Spykman Rimland + offshore", "#C8B08A") +
        theoryRow("pearls", "String of Pearls", "#E8E6DF")) +

      sec("resources", "Natural resources",
        resourceRows +
        '<p class="hint">Major deposits/basins (editorial). Geology: constant across YEAR.</p>',
        null, false) +

      sec("interact", "Interaction (on click)",
        row("chk", "advmode", "Adversary highlight", state.advmode, null, "#FF4D4D") +
        row("chk", "allymode", "Ally highlight", state.allymode, null, "#FFD633") +
        row("chk", "basesmode", "Military bases", state.basesmode, null, "#FFD633"),
        "Click a country: military allies blue, economic green, adversaries red.") +

      '<p class="hint" style="margin-top:12px">Data: Natural Earth, RainViewer, Open-Meteo, World Bank (CC BY-4.0), UCDP, IMF PortWatch, OSM/CARTO, AWS Terrain. Conflict synopses: sources per entry.</p>';

    byId("btn-reset").onclick = function () {
      state.fill = "none"; state.stat = "none"; state.statMode = "ring";
      ["hillshade","heat","heartland","rimland","nuclear","chokepoints",
       "newspulse","lanes","portwatch","bri","allymode","advmode","basesmode","islandchains","pearls","shatter","radar","clouds","deltas","terrain3d"].forEach(function (k) { state[k] = false; });
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
       ["newspulse",["newspulse"]],["lanes",["lanes-glow","lanes-core"]],
       ["portwatch",["portwatch-ring","portwatch-label"]],["bri",["bri-solid","bri-dash","bri-poi","bri-poi-label"]]
      ].forEach(function (t) { t[1].forEach(function (id) { setVis(id, false); }); });
      BLOCS.forEach(function (b) { setVis("bloc-" + b.key, false); });
      (window.RESOURCE_TYPES || []).forEach(function (t) {
        state["res" + t[0]] = false; setVis("res-" + t[0], false); setVis("res-" + t[0] + "-label", false);
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
    ["none", "tier", "role", "power", "renew", "milex", "gini", "trade", "religion", "conflict", "trader", "vdem", "freexp", "usbases"].forEach(function (v) {
      byId("cb-fill-" + v).onchange = function (e) { if (e.target.checked) { state.fill = v; applyFill(); updateLegend(); refreshCard(); tele(); } };
    });
    // The Security and Economy subsections each carry their own "None" radio
    // (separate ids, shared name="fillgrp" so radio uniqueness still holds).
    // Both clear the active fill so the user can opt out per category without
    // scrolling back up to Country fills.
    ["fill-none-security", "fill-none-econ"].forEach(function (id) {
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
        setVis("res-" + t[0], e.target.checked); setVis("res-" + t[0] + "-label", e.target.checked);
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
    byId("cb-lanes").onchange = function (e) {
      state.lanes = e.target.checked;
      setVis("lanes-glow", state.lanes); setVis("lanes-core", state.lanes); tele();
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
    var wb = ["power", "renew", "milex", "gini", "trade"];
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
      : state.fill === "vdem"
      ? [["0", "#8E2F4F"], ["50", "#C9A227"], ["100", "#3FE08A"]]
      : state.fill === "freexp"
      ? [["0", "#3B1F4F"], ["50", "#A07AC4"], ["100", "#A8E8FF"]]
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
      : [];
    el.innerHTML = items.map(function (i) {
      return '<span><i style="background:' + i[1] + '"></i>' + i[0] + "</span>";
    }).join("");
    updateStatLegend();
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
    renew:   function (p, st) { return ["Renewables (% of grid)", fmtPct(st.renew)]; },
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

  function showCard(p) {
    CARD_OPEN = p.cname;
    setText("card-name", p.cname);
    setText("card-tier", TIER_LABEL[p.tier] || p.tier);
    setText("card-role", ROLE_LABEL[p.role] || "—");
    var chips = [];
    BLOCS.forEach(function (b) { if (p[b.key]) chips.push('<span class="chip">' + b.label + "</span>"); });
    setHTML("card-blocs", chips.length ? chips.join("") : '<span class="value">—</span>');

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

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
  var POWER_BY_NAME = {};     // World Bank stats + composite, keyed by country name
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
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
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
    hillshade: true, fill: "tier", stat: "none",
    heat: true, heartland: false, rimland: false, nuclear: false,
    chokepoints: true, newspulse: false, lanes: false, portwatch: false, bri: false,
    allymode: false, advmode: false
  };
  BLOCS.forEach(function (b) { state[b.key] = false; });

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

    var COUNTRIES_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
    fetch(COUNTRIES_URL)
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
        buildRail();
        wireInteraction();
        byId("overlay").classList.add("hide");
      })
      .catch(function (err) {
        fail("Couldn't load the world map data.<br><br>If you opened this file by double-clicking it, " +
             "your browser is blocking the download — publish it to GitHub Pages (or run a local server) " +
             "and it will work.<br><br><span style='opacity:.6'>" + (err && err.message) + "</span>");
      });
  }

  /* attach classifications to each country polygon */
  function inSet(b) { var s = {}; (window.MEMBERSHIPS[b] || []).forEach(function (k) { s[k] = 1; }); return s; }
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
      var st = powerOf(f.properties.cname);
      f.properties.composite = st.composite || 0;
      f.properties.renew = st.renew || 0;
      f.properties.milexv = st.milex || 0;
      f.properties.gini = (st.gini === undefined ? -1 : st.gini);
      f.properties.trade = (st.trade === undefined ? -999 : st.trade);
      f.properties.relig = (window.RELIGION || {})[f.properties.cname] || "none";
      f.properties.offshore = !!(key && listSet(window.RIMLAND_OFFSHORE)[key]);
      var ct = "";
      (window.CONFLICTS || []).forEach(function (cf) {
        if (cf.parties.indexOf(f.properties.cname) >= 0 && !ct) ct = cf.type;
      });
      f.properties.conflict = ct;
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
          renew: st.renew || 0, r: 0 },
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
      return { type: "Feature", properties: { name: r.name, w: r.w },
               geometry: { type: "MultiLineString", coordinates: r.segments } };
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
    map.addLayer({ id: "nuclear-line", type: "line", source: "countries",
      filter: ["==", ["get", "nuclear"], true],
      paint: { "line-color": "#3FE08A", "line-width": 1.2, "line-opacity": 0.7 },
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

    // Belt and Road corridors
    map.addLayer({ id: "bri-line", type: "line", source: "bri",
      paint: { "line-color": "#E8A33D", "line-opacity": 0.75, "line-dasharray": [2.2, 1.6],
        "line-width": ["interpolate", ["linear"], ["get", "w"], 1, 1, 10, 3] },
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });

    // numeric labels under stat circles
    map.addLayer({ id: "stat-labels", type: "symbol", source: "country-points",
      filter: [">", ["get", "r"], 0],
      layout: { "text-field": ["get", "lbl"], "text-font": ["Open Sans Regular"],
        "text-size": 10, "text-offset": [0, 0.6], "text-anchor": "top",
        "text-allow-overlap": false, visibility: "none" },
      paint: { "text-color": "#F0B450", "text-halo-color": "#0B1020", "text-halo-width": 1.3 } });

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

    // proportional statistic circles (World Bank), one metric at a time
    map.addLayer({ id: "stat-circles", type: "circle", source: "country-points",
      paint: { "circle-radius": ["get", "r"],
        "circle-color": "#E8A33D", "circle-opacity": 0.18,
        "circle-stroke-color": "#F0B450", "circle-stroke-width": 1, "circle-stroke-opacity": 0.75 },
      layout: { visibility: "none" } });

    // chokepoints
    map.addLayer({ id: "chokepoint-dot", type: "circle", source: "chokepoints",
      paint: { "circle-radius": 4, "circle-color": "#E8A33D",
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 1.5 },
      layout: { visibility: "visible" } });
    map.addLayer({ id: "chokepoint-label", type: "symbol", source: "chokepoints",
      layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", visibility: "visible" },
      paint: { "text-color": "#E8E6DF", "text-halo-color": "#0B1020", "text-halo-width": 1.4 } });

    // GDELT news-pulse — cool dots sized by mention count
    map.addLayer({ id: "newspulse", type: "circle", source: "newspulse",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 2.5, 50, 9, 500, 16],
        "circle-color": "#5BC8FF", "circle-opacity": 0.45,
        "circle-stroke-color": "#0B1020", "circle-stroke-width": 0.5 },
      layout: { visibility: "none" } });

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
      f.properties.milexv = st.milex || 0;
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
    if (!v) return "";
    if (metric === "renew") return Math.round(v) + "%";
    if (metric === "gdp" || metric === "gdppc" || metric === "milex") return fmtUSD(v);
    return fmtNum(v);
  }
  function switchStat(metric) {
    state.stat = metric;
    if (metric === "none") { setVis("stat-circles", false); setVis("stat-labels", false); tele(); return; }
    var max = statMax(metric);
    COUNTRY_POINTS_GEO.features.forEach(function (f) {
      var v = f.properties[metric] || 0;
      f.properties.r = (v > 0 && max > 0) ? Math.sqrt(v / max) * 30 + 2 : 0;
      f.properties.lbl = statLabel(metric, v);
    });
    var s = map.getSource("country-points"); if (s) s.setData(COUNTRY_POINTS_GEO);
    setVis("stat-circles", true); setVis("stat-labels", true);
    tele();
  }
  function rebuildStats() {
    if (!COUNTRY_POINTS_GEO) return;
    COUNTRY_POINTS_GEO.features.forEach(function (f) {
      var st = powerOf(f.properties.cname);
      f.properties.pop = st.pop || 0; f.properties.gdp = st.gdp || 0;
      f.properties.gdppc = st.gdppc || 0; f.properties.milex = st.milex || 0;
      f.properties.milper = st.milper || 0; f.properties.renew = st.renew || 0;
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

  /* ---- ally derivation: shared blocs + bilateral pacts -------------------- */
  function alliesOf(name) {
    var mil = {}, econ = {};
    function collect(keys, into) {
      (keys || []).forEach(function (k) {
        var list = (window.MEMBERSHIPS || {})[k] || [];
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

  function buildRail() {
    var rail = byId("rail");
    var defBlocs = BLOCS.filter(function (b) { return b.group === "def"; })
      .map(function (b) { return row("chk", b.key, b.label, state[b.key], null, b.color); }).join("");
    var ecoBlocs = BLOCS.filter(function (b) { return b.group === "eco"; })
      .map(function (b) { return row("chk", b.key, b.label, state[b.key], null, b.color); }).join("");

    rail.innerHTML =
      '<button class="reset" id="btn-reset">All layers off</button>' +
      sec("base", "Base",
        row("chk", "hillshade", "Terrain &amp; elevation", state.hillshade)) +

      sec("fill", "Country fill — choose one",
        row("rad", "fill-none", "None", state.fill === "none", "fillgrp") +
        row("rad", "fill-tier", "Power tier", state.fill === "tier", "fillgrp") +
        row("rad", "fill-role", "Agent / pivot", state.fill === "role", "fillgrp") +
        row("rad", "fill-power", "Computed power (data)", state.fill === "power", "fillgrp") +
        row("rad", "fill-renew", "Renewables (% of grid)", state.fill === "renew", "fillgrp") +
        row("rad", "fill-milex", "Military spending", state.fill === "milex", "fillgrp") +
        row("rad", "fill-gini", "Inequality (Gini)", state.fill === "gini", "fillgrp") +
        row("rad", "fill-trade", "Trade balance (% GDP)", state.fill === "trade", "fillgrp") +
        row("rad", "fill-religion", "Majority religion", state.fill === "religion", "fillgrp") +
        row("rad", "fill-conflict", "Active conflicts", state.fill === "conflict", "fillgrp") +
        '<div class="legend" id="legend"></div>',
        "Only one can paint the countries at a time.") +

      sec("stats", "Country statistics — choose one",
        row("rad", "stat-none", "None", state.stat === "none", "statgrp") +
        row("rad", "stat-pop", "Population", state.stat === "pop", "statgrp") +
        row("rad", "stat-gdp", "GDP", state.stat === "gdp", "statgrp") +
        row("rad", "stat-gdppc", "GDP per capita", state.stat === "gdppc", "statgrp") +
        row("rad", "stat-milex", "Military spending", state.stat === "milex", "statgrp") +
        row("rad", "stat-milper", "Military personnel", state.stat === "milper", "statgrp") +
        row("rad", "stat-renew", "Renewables %", state.stat === "renew", "statgrp"),
        "Sized circles, World Bank latest. Combine with any fill.") +

      sec("def", "Defense &amp; security — stack", defBlocs, null, false) +
      sec("eco", "Economic &amp; political — stack", ecoBlocs, null, false) +

      sec("conflict", "Conflict &amp; tension — stack",
        row("chk", "heat", "Violence density (sample)", state.heat, null, "#ff6a3d"),
        "Your editorial tension layer comes next.") +

      sec("ship", "Economy &amp; connectivity — stack",
        row("chk", "lanes", "Shipping lanes (major routes)", state.lanes, null, "#49C5B6") +
        row("chk", "portwatch", "Chokepoint traffic (PortWatch, live)", state.portwatch, null, "#6FE3D4") +
        row("chk", "bri", "Belt &amp; Road corridors", state.bri, null, "#E8A33D"),
        "Rings sized by 7-day avg daily transits, updated weekly.") +

      sec("signals", "Live signals — stack",
        row("chk", "newspulse", "News pulse (GDELT)", state.newspulse, null, "#5BC8FF"),
        "News-mention geography, refreshed every few hours. Noisy by nature.", false) +

      sec("theory", "Classical theory",
        row("chk", "heartland", "Mackinder Heartland (approx.)", state.heartland, null, "#E8A33D") +
        row("chk", "rimland", "Spykman Rimland + offshore", state.rimland, null, "#C8B08A")) +

      sec("status", "Status — stack",
        row("chk", "nuclear", "Nuclear weapons states", state.nuclear, null, "#3FE08A")) +

      sec("interact", "Interaction",
        row("chk", "allymode", "Ally highlight on click", state.allymode, null, "#FFD633") +
        row("chk", "advmode", "Adversary highlight on click", state.advmode, null, "#FF4D4D"),
        "Click a country: military allies blue, economic green, adversaries red.") +

      sec("ref", "Reference — stack",
        row("chk", "chokepoints", "Chokepoints &amp; straits", state.chokepoints, null, "#E8A33D")) +
      '<p class="hint" style="margin-top:12px">Data: Natural Earth · World Bank (CC BY-4.0) · UCDP · IMF PortWatch · OSM/CARTO · AWS Terrain. Conflict synopses: sources per entry.</p>';

    byId("btn-reset").onclick = function () {
      state.fill = "none"; state.stat = "none";
      ["hillshade","heat","heartland","rimland","nuclear","chokepoints",
       "newspulse","lanes","portwatch","bri","allymode","advmode"].forEach(function (k) { state[k] = false; });
      BLOCS.forEach(function (b) { state[b.key] = false; });
      applyFill(); switchStat("none");
      [["hillshade",["hillshade"]],["heat",["conflict-heat"]],
       ["heartland",["zone-heartland-fill","zone-heartland-line"]],
       ["rimland",["rimland-fill","rimland-line","offshore-fill","offshore-line"]],
       ["nuclear",["nuclear-fill","nuclear-line"]],
       ["chokepoints",["chokepoint-dot","chokepoint-label"]],
       ["newspulse",["newspulse"]],["lanes",["lanes-glow","lanes-core"]],
       ["portwatch",["portwatch-ring","portwatch-label"]],["bri",["bri-line"]]
      ].forEach(function (t) { t[1].forEach(function (id) { setVis(id, false); }); });
      BLOCS.forEach(function (b) { setVis("bloc-" + b.key, false); });
      clearAllies(); clearAdversaries();
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

    byId("cb-hillshade").onchange = function (e) { state.hillshade = e.target.checked; setVis("hillshade", state.hillshade); tele(); };
    ["none", "tier", "role", "power", "renew", "milex", "gini", "trade", "religion", "conflict"].forEach(function (v) {
      byId("cb-fill-" + v).onchange = function (e) { if (e.target.checked) { state.fill = v; applyFill(); updateLegend(); tele(); } };
    });
    ["none", "pop", "gdp", "gdppc", "milex", "milper", "renew"].forEach(function (m) {
      byId("cb-stat-" + m).onchange = function (e) { if (e.target.checked) switchStat(m); };
    });
    BLOCS.forEach(function (b) {
      byId("cb-" + b.key).onchange = function (e) { state[b.key] = e.target.checked; setVis("bloc-" + b.key, state[b.key]); tele(); };
    });
    byId("cb-heat").onchange = function (e) { state.heat = e.target.checked; setVis("conflict-heat", state.heat); tele(); };
    byId("cb-newspulse").onchange = function (e) { state.newspulse = e.target.checked; setVis("newspulse", state.newspulse); tele(); };
    byId("cb-heartland").onchange = function (e) {
      state.heartland = e.target.checked;
      setVis("zone-heartland-fill", state.heartland); setVis("zone-heartland-line", state.heartland); tele();
    };
    byId("cb-rimland").onchange = function (e) {
      state.rimland = e.target.checked;
      setVis("rimland-fill", state.rimland); setVis("rimland-line", state.rimland);
      setVis("offshore-fill", state.rimland); setVis("offshore-line", state.rimland); tele();
    };
    byId("cb-nuclear").onchange = function (e) {
      state.nuclear = e.target.checked;
      setVis("nuclear-fill", state.nuclear); setVis("nuclear-line", state.nuclear); tele();
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
      state.bri = e.target.checked; setVis("bri-line", state.bri); tele();
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
    byId("cb-chokepoints").onchange = function (e) {
      state.chokepoints = e.target.checked;
      setVis("chokepoint-dot", state.chokepoints); setVis("chokepoint-label", state.chokepoints); tele();
    };

    updateLegend();
    tele();
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
            (state.lanes ? 1 : 0) + (state.portwatch ? 1 : 0) + (state.bri ? 1 : 0);
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
    });
    map.on("mouseenter", "countries-hit", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "countries-hit", function () { map.getCanvas().style.cursor = ""; });

    byId("card-close").onclick = function () { byId("card").classList.remove("show"); };

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
  function showCard(p) {
    setText("card-name", p.cname);
    setText("card-tier", TIER_LABEL[p.tier] || p.tier);
    setText("card-role", ROLE_LABEL[p.role] || "—");
    var chips = [];
    BLOCS.forEach(function (b) { if (p[b.key]) chips.push('<span class="chip">' + b.label + "</span>"); });
    setHTML("card-blocs", chips.length ? chips.join("") : '<span class="value">—</span>');

    var st = powerOf(p.cname);
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
    var confs = (window.CONFLICTS || []).filter(function (cf) {
      return cf.parties.indexOf(p.cname) >= 0;
    });
    setHTML("card-conflict", confs.length ? confs.map(function (cf) {
      return "<b>" + cf.name + "</b> (" + cf.type + ", since " + cf.since + ")<br>" +
             cf.cause + "<br>" + cf.casualties +
             "<br><i>Source: " + cf.source + "</i>";
    }).join("<hr>") : "—");

    var wb = byId("card-wb");
    if (wb) {
      if (st.iso3) { wb.href = "https://data.worldbank.org/country/" + st.iso3; wb.style.display = "inline-block"; }
      else { wb.style.display = "none"; }
    }
    var card = byId("card"); if (card) card.classList.add("show");
  }
})();

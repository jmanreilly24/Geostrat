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
    { key: "nato", label: "NATO", color: "#4DA3FF" },
    { key: "brics", label: "BRICS", color: "#FF6B6B" },
    { key: "eu", label: "European Union", color: "#B57EDC" }
  ];

  var byId = function (id) { return document.getElementById(id); };

  var COUNTRIES_GEO = null;   // decorated polygons, kept so live data can update them
  var POWER_BY_NAME = {};     // World Bank power composite, keyed by country name

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
    hillshade: true, fill: "tier",
    nato: false, brics: false, eu: false,
    heat: true, heartland: false, chokepoints: true,
    newspulse: false
  };

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
  function decorate(geo) {
    var nato = inSet("nato"), brics = inSet("brics"), eu = inSet("eu");
    geo.features.forEach(function (f) {
      var raw = f.properties && f.properties.name;
      var key = canonical(raw);
      f.properties = f.properties || {};
      f.properties.cname = key || raw || "Unknown";
      f.properties.tier = (key && window.COUNTRY_TIERS[key]) || "unclassified";
      f.properties.role = (key && window.COUNTRY_ROLES[key]) || "";
      f.properties.nato = !!(key && nato[key]);
      f.properties.brics = !!(key && brics[key]);
      f.properties.eu = !!(key && eu[key]);
      f.properties.composite = POWER_BY_NAME[f.properties.cname] || 0;
    });
  }

  function fc(features) { return { type: "FeatureCollection", features: features }; }

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

    // conflict heatmap
    map.addLayer({ id: "conflict-heat", type: "heatmap", source: "conflict",
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 3],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 3, 40, 6, 64],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(11,16,32,0)", 0.15, "#7d3b1f", 0.35, "#c25a22",
          0.6, "#ff8a3d", 0.85, "#ff4d2e", 1, "#ffd08a"],
        "heatmap-opacity": 0.82
      }, layout: { visibility: "visible" } });

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

    // transparent always-on hit layer for clicks
    map.addLayer({ id: "countries-hit", type: "fill", source: "countries",
      paint: { "fill-color": "#000", "fill-opacity": 0 } });

    applyFill();
  }

  function applyFill() {
    setVis("fill-tier", state.fill === "tier");
    setVis("fill-role", state.fill === "role");
    setVis("fill-power", state.fill === "power");
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
      .then(function (d) { if (d && typeof d === "object") { POWER_BY_NAME = d; applyComposite(); } })
      .catch(function () { /* keep the bundled sample */ });
  }
  function applyComposite() {
    if (!COUNTRIES_GEO) return;
    COUNTRIES_GEO.features.forEach(function (f) {
      f.properties.composite = POWER_BY_NAME[f.properties.cname] || 0;
    });
    var s = map.getSource("countries");
    if (s) s.setData(COUNTRIES_GEO);
  }

  /* load the live GDELT news-pulse file (written every few hours by the Action). */
  function refreshNewspulse() {
    fetch("data/newspulse.geojson", { cache: "no-store" })
      .then(function (r) { if (r.ok) return r.json(); throw new Error("no file"); })
      .then(function (d) { var s = map.getSource("newspulse"); if (s && d) s.setData(d); })
      .catch(function () { /* layer stays empty until the Action runs */ });
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

  function buildRail() {
    var rail = byId("rail");
    rail.innerHTML =
      "<h2>Base</h2>" +
      row("chk", "hillshade", "Terrain &amp; elevation", state.hillshade) +

      "<h2>Country fill — choose one</h2>" +
      '<p class="hint">Only one can paint the countries at a time.</p>' +
      row("rad", "fill-none", "None", state.fill === "none", "fillgrp") +
      row("rad", "fill-tier", "Power tier", state.fill === "tier", "fillgrp") +
      row("rad", "fill-role", "Agent / pivot", state.fill === "role", "fillgrp") +
      row("rad", "fill-power", "Computed power (data)", state.fill === "power", "fillgrp") +
      '<div class="legend" id="legend"></div>' +

      "<h2>Alliances &amp; blocs — stack</h2>" +
      BLOCS.map(function (b) { return row("chk", b.key, b.label, state[b.key], null, b.color); }).join("") +

      "<h2>Conflict &amp; tension — stack</h2>" +
      row("chk", "heat", "Violence density (sample)", state.heat, null, "#ff6a3d") +
      '<p class="hint">Your editorial tension layer comes next.</p>' +

      "<h2>Live signals — stack</h2>" +
      '<p class="hint">News-mention geography from GDELT, refreshed every few hours. Noisy by nature.</p>' +
      row("chk", "newspulse", "News pulse (GDELT)", state.newspulse, null, "#5BC8FF") +

      "<h2>Classical theory</h2>" +
      row("chk", "heartland", "Mackinder Heartland (approx.)", state.heartland, null, "#E8A33D") +

      "<h2>Reference — stack</h2>" +
      row("chk", "chokepoints", "Chokepoints &amp; straits", state.chokepoints, null, "#E8A33D");

    byId("cb-hillshade").onchange = function (e) { state.hillshade = e.target.checked; setVis("hillshade", state.hillshade); tele(); };
    ["none", "tier", "role", "power"].forEach(function (v) {
      byId("cb-fill-" + v).onchange = function (e) { if (e.target.checked) { state.fill = v; applyFill(); updateLegend(); tele(); } };
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
    var n = (state.fill !== "none" ? 1 : 0) + (state.hillshade ? 1 : 0) +
            (state.nato ? 1 : 0) + (state.brics ? 1 : 0) + (state.eu ? 1 : 0) +
            (state.heat ? 1 : 0) + (state.heartland ? 1 : 0) + (state.chokepoints ? 1 : 0) +
            (state.newspulse ? 1 : 0);
    byId("t-layers").textContent = n;
  }
  map.on("move", tele);

  function wireInteraction() {
    map.on("click", "countries-hit", function (e) { showCard(e.features[0].properties); });
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

  function showCard(p) {
    byId("card-name").textContent = p.cname;
    byId("card-tier").textContent = TIER_LABEL[p.tier] || p.tier;
    byId("card-role").textContent = ROLE_LABEL[p.role] || "—";
    var chips = [];
    BLOCS.forEach(function (b) { if (p[b.key]) chips.push('<span class="chip">' + b.label + "</span>"); });
    byId("card-blocs").innerHTML = chips.length ? chips.join("") : '<span class="value">—</span>';
    byId("card").classList.add("show");
  }
})();

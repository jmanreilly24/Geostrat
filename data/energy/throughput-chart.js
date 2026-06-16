/* ============================================================================
   Throughput chart renderer.
   Usage:  renderThroughputChart(containerEl, seriesJson, opts)
   opts:   { metric: "tanker"|"all", primary: "hormuz"|... , width: 960, height: 420 }
   No external dependencies; hand-rolled SVG so the export at 960x420 is exact.
   ========================================================================== */
(function () {
  var INK     = "#0B1020";
  var GRID    = "#1C2336";
  var TEXT    = "#E8E6DF";
  var MUTED   = "#9AA3B7";
  var AMBER   = "#E8A33D";
  var AMBER_2 = "#FFD27F";
  var TEAL    = "#7FD1C4";
  var ROSE    = "#C44569";
  var SERIES_COLORS = { hormuz: AMBER, malacca: TEAL, babelmandeb: ROSE };
  var SERIES_TITLES = { hormuz: "Strait of Hormuz",
                        malacca: "Strait of Malacca",
                        babelmandeb: "Bab el-Mandeb" };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" })[c]; }); }

  function parseDate(s) { return new Date(s + "T00:00:00Z").getTime(); }
  function dateLabel(s) {
    var d = new Date(s + "T00:00:00Z");
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
    return m + " " + d.getUTCDate();
  }

  function pickMetricKey(metric) {
    return metric === "all" ? "all" : "tanker";
  }

  // Convert one series block -> [{t, y}] where y is pct of baseline.
  function pctSeries(block, metric) {
    var key = pickMetricKey(metric);
    var baseKey = (metric === "all" ? "all" : "tanker");
    var base = block && block.baseline && block.baseline[baseKey];
    if (!base) return [];
    return (block.series || []).map(function (r) {
      var v = r[key];
      return { t: parseDate(r.date), y: v == null ? null : (100 * v / base) };
    }).filter(function (p) { return p.y != null; });
  }

  function pathFor(pts, xs, ys) {
    if (!pts.length) return "";
    return pts.map(function (p, i) {
      return (i ? "L" : "M") + xs(p.t).toFixed(1) + " " + ys(p.y).toFixed(1);
    }).join(" ");
  }
  function areaFor(pts, xs, ys, y0) {
    if (!pts.length) return "";
    var top = pts.map(function (p, i) {
      return (i ? "L" : "M") + xs(p.t).toFixed(1) + " " + ys(p.y).toFixed(1);
    }).join(" ");
    var last = pts[pts.length - 1].t, first = pts[0].t;
    return top + " L" + xs(last).toFixed(1) + " " + y0.toFixed(1) +
                  " L" + xs(first).toFixed(1) + " " + y0.toFixed(1) + " Z";
  }

  window.renderThroughputChart = function (container, data, opts) {
    if (!container) return;
    opts = opts || {};
    var W = opts.width || 960, H = opts.height || 420;
    var metric = opts.metric || "tanker";  // "tanker" (default) or "all"
    var primary = opts.primary || "hormuz";
    var others = (opts.others || ["malacca", "babelmandeb"])
      .filter(function (k) { return data && data[k]; });
    var margin = { top: 48, right: 32, bottom: 48, left: 56 };
    var iw = W - margin.left - margin.right;
    var ih = H - margin.top - margin.bottom;

    // domain
    var pPts = pctSeries(data[primary], metric);
    if (!pPts.length) {
      container.innerHTML = '<div style="color:'+MUTED+';font-family:monospace;padding:20px">' +
        'No chokepoint_series.json yet (waiting on first PortWatch CI run).</div>';
      return;
    }
    var tMin = pPts[0].t, tMax = pPts[pPts.length - 1].t;
    var yMin = 0, yMax = 110;
    var xs = function (t) { return margin.left + (t - tMin) / (tMax - tMin) * iw; };
    var ys = function (y) { return margin.top + (yMax - y) / (yMax - yMin) * ih; };
    var y0 = ys(yMin);

    // war reference line
    var warT = parseDate("2026-02-28");
    var warX = xs(warT);

    // delta dots from primary
    var deltas = (data[primary] && data[primary].deltas) || {};
    var deltaKey = metric === "all" ? "all_pct" : "tanker_pct";

    function deltaPoint(d) {
      if (!d || !d.date) return null;
      return { t: parseDate(d.date), y: d[deltaKey], date: d.date };
    }
    var dotData = [
      ["pre-war",   deltaPoint(deltas.prewar),   "right"],
      ["−60d",      deltaPoint(deltas.minus60d), "right"],
      ["−30d",      deltaPoint(deltas.minus30d), "right"],
      ["latest",    deltaPoint(deltas.latest),   "left"]
    ].filter(function (r) { return r[1] && r[1].y != null; });

    // Y gridlines at 0,20,40,60,80,100
    var ticks = [0, 20, 40, 60, 80, 100];

    var svg = [];
    svg.push('<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" ' +
             'style="background:'+INK+';display:block;width:100%;height:auto;' +
             'font-family:\'Space Grotesk\',\'Inter\',sans-serif;">');

    // gradient for amber area
    svg.push('<defs>' +
      '<linearGradient id="amber-fill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="'+AMBER+'" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="'+AMBER+'" stop-opacity="0"/>' +
      '</linearGradient></defs>');

    // title
    svg.push('<text x="'+margin.left+'" y="22" fill="'+TEXT+'" font-size="16" font-weight="600" ' +
             'letter-spacing="0.04em">CHOKEPOINT THROUGHPUT vs PRE-WAR BASELINE</text>');
    svg.push('<text x="'+margin.left+'" y="40" fill="'+MUTED+'" font-size="11" ' +
             'font-family="\'IBM Plex Mono\',monospace" letter-spacing="0.06em">' +
             'IMF PORTWATCH &middot; AUTHOR\'S CALCULATION &middot; BASELINE: 2026-01-01 to 2026-02-27 (100%)' +
             '</text>');

    // gridlines + Y labels
    ticks.forEach(function (t) {
      var y = ys(t);
      svg.push('<line x1="'+margin.left+'" x2="'+(margin.left + iw)+
               '" y1="'+y+'" y2="'+y+'" stroke="'+GRID+'" stroke-width="1"/>');
      svg.push('<text x="'+(margin.left - 8)+'" y="'+(y + 3.5)+'" fill="'+MUTED+
               '" font-size="10" font-family="\'IBM Plex Mono\',monospace" text-anchor="end">' +
               t + '%</text>');
    });

    // X axis: monthly ticks
    var months = [];
    var d = new Date(tMin); d.setUTCDate(1);
    while (d.getTime() <= tMax + 1) {
      months.push(d.getTime());
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    months.forEach(function (m) {
      var x = xs(m);
      if (x < margin.left - 1 || x > margin.left + iw + 1) return;
      svg.push('<line x1="'+x+'" x2="'+x+'" y1="'+margin.top+'" y2="'+(margin.top + ih)+
               '" stroke="'+GRID+'" stroke-width="1" stroke-dasharray="2 4" opacity="0.5"/>');
      var lab = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                  [new Date(m).getUTCMonth()] + " '" +
                  String(new Date(m).getUTCFullYear()).slice(2);
      svg.push('<text x="'+x+'" y="'+(margin.top + ih + 16)+'" fill="'+MUTED+
               '" font-size="10" font-family="\'IBM Plex Mono\',monospace" text-anchor="middle">' +
               lab + '</text>');
    });

    // war line
    if (warX >= margin.left && warX <= margin.left + iw) {
      svg.push('<line x1="'+warX+'" x2="'+warX+'" y1="'+margin.top+'" y2="'+(margin.top + ih)+
               '" stroke="'+AMBER+'" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.7"/>');
      svg.push('<text x="'+(warX + 6)+'" y="'+(margin.top + 14)+'" fill="'+AMBER+
               '" font-size="11" font-family="\'IBM Plex Mono\',monospace" letter-spacing="0.06em">' +
               'WAR BEGINS &middot; 28 FEB 2026</text>');
    }

    // secondary lines (thin)
    others.forEach(function (k) {
      var pts = pctSeries(data[k], metric);
      var col = SERIES_COLORS[k] || MUTED;
      svg.push('<path d="'+pathFor(pts, xs, ys)+'" stroke="'+col+
               '" stroke-width="1.2" fill="none" opacity="0.7"/>');
    });

    // primary area + line
    svg.push('<path d="'+areaFor(pPts, xs, ys, y0)+'" fill="url(#amber-fill)" stroke="none"/>');
    svg.push('<path d="'+pathFor(pPts, xs, ys)+'" stroke="'+AMBER+
             '" stroke-width="2.4" fill="none"/>');

    // dots + value labels
    dotData.forEach(function (row) {
      var label = row[0], pt = row[1], side = row[2];
      var x = xs(pt.t), y = ys(pt.y);
      svg.push('<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+INK+'" stroke="'+AMBER_2+
               '" stroke-width="1.8"/>');
      var anchor = side === "left" ? "end" : "start";
      var lx = x + (side === "left" ? -10 : 10);
      svg.push('<text x="'+lx+'" y="'+(y - 8)+'" fill="'+TEXT+
               '" font-size="11.5" font-weight="600" font-family="\'IBM Plex Mono\',monospace" ' +
               'text-anchor="'+anchor+'">' + Math.round(pt.y) + '%</text>');
      svg.push('<text x="'+lx+'" y="'+(y + 12)+'" fill="'+MUTED+
               '" font-size="9.5" font-family="\'IBM Plex Mono\',monospace" letter-spacing="0.05em" ' +
               'text-anchor="'+anchor+'">' + label.toUpperCase() + " " + dateLabel(pt.date) + '</text>');
    });

    // legend (top-right)
    var legend = [[SERIES_TITLES[primary], SERIES_COLORS[primary], true]]
      .concat(others.map(function (k) { return [SERIES_TITLES[k], SERIES_COLORS[k], false]; }));
    var lx0 = margin.left + iw, ly0 = margin.top - 6;
    legend.reverse().forEach(function (row, i) {
      var y = ly0 - i * 16;
      svg.push('<rect x="'+(lx0 - 168)+'" y="'+(y - 8)+'" width="14" height="3" rx="1.5" fill="'+row[1]+
               '" opacity="'+(row[2] ? 1 : 0.7)+'"/>');
      svg.push('<text x="'+(lx0 - 150)+'" y="'+(y - 1)+'" fill="'+TEXT+
               '" font-size="11" font-family="\'IBM Plex Mono\',monospace" text-anchor="start">' +
               esc(row[0]) + (row[2] ? "" : "") + '</text>');
    });

    // metric note bottom-right
    svg.push('<text x="'+(margin.left + iw)+'" y="'+(H - 8)+'" fill="'+MUTED+
             '" font-size="10" font-family="\'IBM Plex Mono\',monospace" text-anchor="end">' +
             'METRIC: ' + (metric === "all" ? "ALL VESSELS" : "TANKERS") +
             ' &middot; GEOSTRAT</text>');

    svg.push('</svg>');
    container.innerHTML = svg.join("");
  };
})();

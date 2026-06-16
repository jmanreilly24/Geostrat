/* ============================================================================
   RESOURCE BASINS — polygon outlines for major fields/basins
   Rendered as hatched colored fills underneath the resource point dots.
   Edit freely. Each entry: { rtype, name, ellipse:[cx,cy,rx,ry] } or
   { rtype, name, polygon:[[lng,lat],...] }
   - ellipse: centered at (cx,cy), semi-axes (rx,ry) in degrees. Compact for
     fields that are roughly circular/oblong; gets expanded into a 14-vertex
     polygon at load time.
   - polygon: explicit ring (auto-closed). Use for irregular basins.
   rtype must match window.RESOURCE_TYPES keys: oil, gas, lithium, cobalt,
   copper, iron, rareearth, uranium.
   ========================================================================== */
(function () {
  function E(cx, cy, rx, ry) {
    var p = [], n = 14, i;
    for (i = 0; i < n; i++) {
      var a = i * 2 * Math.PI / n;
      p.push([+(cx + rx * Math.cos(a)).toFixed(3),
              +(cy + ry * Math.sin(a)).toFixed(3)]);
    }
    p.push(p[0].slice());
    return [p];
  }
  function toFeature(b) {
    var coords = b.ellipse ? E(b.ellipse[0], b.ellipse[1], b.ellipse[2], b.ellipse[3])
                            : [b.polygon.concat([b.polygon[0].slice()])];
    return { type: "Feature",
      properties: { rtype: b.rtype, name: b.name },
      geometry: { type: "Polygon", coordinates: coords } };
  }
  var BASINS = [
    /* =================== OIL — Middle East (granular) =================== */
    /* --- Saudi Arabia: Eastern Province cluster --- */
    { rtype:"oil", name:"Ghawar (KSA)",        ellipse:[49.30, 25.43, 0.45, 1.15] },
    { rtype:"oil", name:"Abqaiq (KSA)",        ellipse:[49.65, 25.94, 0.22, 0.18] },
    { rtype:"oil", name:"Qatif (KSA)",         ellipse:[49.95, 26.55, 0.18, 0.18] },
    { rtype:"oil", name:"Berri (KSA)",         ellipse:[49.50, 27.30, 0.25, 0.20] },
    { rtype:"oil", name:"Khurais (KSA)",       ellipse:[48.30, 25.50, 0.30, 0.45] },
    { rtype:"oil", name:"Safaniya (offshore)", ellipse:[49.30, 28.30, 0.45, 0.55] },
    { rtype:"oil", name:"Marjan (offshore)",   ellipse:[49.30, 28.05, 0.20, 0.22] },
    { rtype:"oil", name:"Manifa (offshore)",   ellipse:[50.05, 27.70, 0.30, 0.22] },
    { rtype:"oil", name:"Shaybah (Empty Q.)",  ellipse:[54.50, 22.50, 0.45, 0.30] },
    /* --- Iran: Khuzestan supergiant cluster + offshore --- */
    { rtype:"oil", name:"Ahvaz (Iran)",         ellipse:[48.67, 31.32, 0.30, 0.22] },
    { rtype:"oil", name:"Marun (Iran)",         ellipse:[49.17, 31.30, 0.25, 0.22] },
    { rtype:"oil", name:"Mansuri (Iran)",       ellipse:[48.85, 31.10, 0.18, 0.15] },
    { rtype:"oil", name:"Karanj (Iran)",        ellipse:[49.80, 31.00, 0.18, 0.15] },
    { rtype:"oil", name:"Agha Jari (Iran)",     ellipse:[49.85, 30.70, 0.25, 0.20] },
    { rtype:"oil", name:"Rag-e Safid (Iran)",   ellipse:[50.10, 30.70, 0.18, 0.15] },
    { rtype:"oil", name:"Gachsaran (Iran)",     ellipse:[50.83, 30.40, 0.35, 0.30] },
    { rtype:"oil", name:"Bibi Hakimeh (Iran)",  ellipse:[50.50, 30.55, 0.20, 0.18] },
    { rtype:"oil", name:"Parsi (Iran)",         ellipse:[49.30, 30.50, 0.18, 0.15] },
    { rtype:"oil", name:"Azadegan (Iran)",      ellipse:[47.85, 31.55, 0.30, 0.40] },
    { rtype:"oil", name:"Yadavaran (Iran)",     ellipse:[47.80, 31.35, 0.20, 0.18] },
    { rtype:"oil", name:"N. Azadegan (Iran)",   ellipse:[47.85, 31.85, 0.18, 0.18] },
    { rtype:"oil", name:"Darquain (Iran)",      ellipse:[48.20, 31.00, 0.18, 0.15] },
    { rtype:"oil", name:"Soroush (offshore)",   ellipse:[50.20, 29.30, 0.25, 0.22] },
    { rtype:"oil", name:"Foroozan (offshore)",  ellipse:[50.90, 28.90, 0.22, 0.20] },
    { rtype:"oil", name:"Salman (offshore)",    ellipse:[51.20, 27.80, 0.25, 0.22] },
    /* --- Iraq --- */
    { rtype:"oil", name:"Rumaila (Iraq)",       ellipse:[47.40, 30.40, 0.30, 0.55] },
    { rtype:"oil", name:"West Qurna (Iraq)",    ellipse:[47.45, 30.85, 0.22, 0.30] },
    { rtype:"oil", name:"Zubair (Iraq)",        ellipse:[47.70, 30.45, 0.18, 0.22] },
    { rtype:"oil", name:"Majnoon (Iraq)",       ellipse:[47.50, 31.05, 0.20, 0.20] },
    { rtype:"oil", name:"Halfaya (Iraq)",       ellipse:[47.20, 31.85, 0.18, 0.18] },
    { rtype:"oil", name:"Kirkuk (Iraq)",        ellipse:[44.40, 35.45, 0.35, 0.35] },
    { rtype:"oil", name:"East Baghdad (Iraq)",  ellipse:[44.55, 33.55, 0.22, 0.30] },
    /* --- Kuwait --- */
    { rtype:"oil", name:"Burgan (Kuwait)",      ellipse:[47.95, 29.05, 0.30, 0.30] },
    { rtype:"oil", name:"Raudhatain (Kuwait)",  ellipse:[47.85, 29.85, 0.20, 0.18] },
    /* --- UAE --- */
    { rtype:"oil", name:"Bab/Murban (UAE)",     ellipse:[53.30, 23.65, 0.30, 0.35] },
    { rtype:"oil", name:"Bu Hasa (UAE)",        ellipse:[53.05, 23.45, 0.22, 0.22] },
    { rtype:"oil", name:"Upper Zakum (UAE)",    ellipse:[53.40, 24.70, 0.30, 0.25] },
    { rtype:"oil", name:"Lower Zakum (UAE)",    ellipse:[53.65, 24.50, 0.22, 0.20] },
    /* --- Oman --- */
    { rtype:"oil", name:"Yibal (Oman)",         ellipse:[56.10, 22.20, 0.25, 0.20] },
    { rtype:"oil", name:"Lekhwair (Oman)",      ellipse:[55.85, 22.50, 0.22, 0.18] },
    { rtype:"oil", name:"Marmul (Oman)",        ellipse:[55.05, 19.10, 0.30, 0.22] },
    /* --- Qatar --- */
    { rtype:"oil", name:"Dukhan (Qatar)",       ellipse:[50.80, 25.40, 0.18, 0.45] },
    /* =================== OIL — Rest of world =================== */
    { rtype:"oil", name:"Permian Basin (US)",   ellipse:[-102.10, 31.80, 1.80, 1.20] },
    { rtype:"oil", name:"Eagle Ford (US)",      ellipse:[-99.00, 28.50, 1.60, 0.80] },
    { rtype:"oil", name:"Bakken (US/Can)",      ellipse:[-103.00, 48.20, 1.20, 0.90] },
    { rtype:"oil", name:"Forties/Brent (N.Sea)",ellipse:[1.50, 58.80, 1.40, 1.00] },
    { rtype:"oil", name:"Ekofisk (N.Sea)",      ellipse:[3.20, 56.50, 0.60, 0.50] },
    { rtype:"oil", name:"Samotlor (W. Siberia)",ellipse:[76.70, 61.00, 1.10, 1.00] },
    { rtype:"oil", name:"Priobskoye (W. Sib.)", ellipse:[69.40, 60.90, 0.80, 0.60] },
    { rtype:"oil", name:"Orinoco Belt (Vzla)",  ellipse:[-64.50, 8.60, 2.00, 0.70] },
    { rtype:"oil", name:"Pre-salt Santos (BR)", ellipse:[-42.50, -25.50, 2.20, 1.40] },
    { rtype:"oil", name:"Stabroek (Guyana)",    ellipse:[-56.90, 8.00, 0.90, 0.80] },
    { rtype:"oil", name:"Niger Delta",          ellipse:[5.80, 4.50, 1.40, 0.90] },
    { rtype:"oil", name:"Bohai Bay (China)",    ellipse:[119.50, 38.50, 1.50, 1.00] },
    { rtype:"oil", name:"Daqing (China)",       ellipse:[124.80, 46.50, 0.80, 0.60] },
    { rtype:"oil", name:"Tahe/Tarim (China)",   ellipse:[82.50, 40.50, 1.80, 1.20] },
    { rtype:"oil", name:"Cantarell (Mexico)",   ellipse:[-92.00, 19.50, 0.50, 0.40] },
    { rtype:"oil", name:"Athabasca Oil Sands",  ellipse:[-111.30, 57.20, 1.20, 1.20] },

    /* =================== GAS =================== */
    /* --- Iran/Qatar shared supergiant --- */
    { rtype:"gas", name:"South Pars / N. Dome", ellipse:[51.90, 26.30, 1.10, 1.00] },
    { rtype:"gas", name:"North Pars (Iran)",    ellipse:[52.30, 27.20, 0.30, 0.30] },
    { rtype:"gas", name:"Kish gasfield (Iran)", ellipse:[53.80, 26.50, 0.25, 0.25] },
    { rtype:"gas", name:"Kangan/Nar (Iran)",    ellipse:[52.10, 27.80, 0.30, 0.22] },
    { rtype:"gas", name:"Tabnak (Iran)",        ellipse:[52.30, 27.65, 0.20, 0.18] },
    { rtype:"gas", name:"Khangiran (Iran)",     ellipse:[60.50, 36.50, 0.30, 0.25] },
    /* --- Turkmenistan & Central Asia --- */
    { rtype:"gas", name:"Galkynysh (Turkm.)",   ellipse:[62.30, 37.30, 0.45, 0.35] },
    { rtype:"gas", name:"Karachaganak (Kaz.)",  ellipse:[51.50, 51.30, 0.40, 0.25] },
    /* --- Russia --- */
    { rtype:"gas", name:"Yamal (Bovanenkovo)",  ellipse:[68.50, 70.30, 1.50, 1.00] },
    { rtype:"gas", name:"Urengoy (W. Siberia)", ellipse:[78.50, 66.50, 1.00, 1.20] },
    /* --- North America shales --- */
    { rtype:"gas", name:"Marcellus (Appal.)",   ellipse:[-79.50, 40.80, 1.80, 1.40] },
    { rtype:"gas", name:"Haynesville (US)",     ellipse:[-93.50, 32.40, 0.90, 0.70] },
    /* --- Australia --- */
    { rtype:"gas", name:"NW Shelf (Carnarvon)", ellipse:[116.00, -19.80, 1.40, 1.20] },
    { rtype:"gas", name:"Browse Basin (Aus)",   ellipse:[124.00, -13.50, 0.90, 0.80] },
    /* --- Algeria / N. Africa --- */
    { rtype:"gas", name:"Hassi R'Mel (Algeria)",ellipse:[3.20, 32.90, 0.40, 0.40] },
    /* --- Europe --- */
    { rtype:"gas", name:"Groningen (NL)",       ellipse:[6.70, 53.30, 0.35, 0.25] },
    /* --- South Asia --- */
    { rtype:"gas", name:"Krishna-Godavari (IN)",ellipse:[83.50, 16.00, 0.80, 0.60] },
    /* --- US Gulf LNG / Mozambique LNG --- */
    { rtype:"gas", name:"Rovuma LNG (Moz.)",    ellipse:[40.50, -11.00, 0.70, 0.60] },

    /* =================== LITHIUM =================== */
    /* "Lithium Triangle" salars */
    { rtype:"lithium", name:"Salar de Atacama",  ellipse:[-68.25, -23.50, 0.35, 0.65] },
    { rtype:"lithium", name:"Salar de Uyuni",    ellipse:[-67.49, -20.13, 0.55, 0.55] },
    { rtype:"lithium", name:"Hombre Muerto",     ellipse:[-66.90, -25.40, 0.25, 0.30] },
    { rtype:"lithium", name:"Olaroz–Cauchari",   ellipse:[-66.70, -23.40, 0.25, 0.25] },
    { rtype:"lithium", name:"Greenbushes (Aus)", ellipse:[116.06, -33.86, 0.18, 0.18] },
    { rtype:"lithium", name:"Pilgangoora (Aus)", ellipse:[118.90, -21.05, 0.25, 0.20] },
    { rtype:"lithium", name:"Qinghai/Tibet brines", ellipse:[94.00, 35.50, 2.50, 1.40] },
    { rtype:"lithium", name:"Bikita (Zim.)",     ellipse:[31.60, -20.08, 0.18, 0.15] },
    { rtype:"lithium", name:"Manono (DRC)",      ellipse:[27.50, -7.30, 0.20, 0.20] },
    { rtype:"lithium", name:"Thacker Pass (US)", ellipse:[-118.00, 41.70, 0.25, 0.20] },

    /* =================== COPPER =================== */
    { rtype:"copper", name:"Chilean Copper Belt", ellipse:[-69.30, -24.30, 0.50, 1.80] },
    { rtype:"copper", name:"Cerro Verde (Peru)", ellipse:[-71.60, -16.54, 0.25, 0.22] },
    { rtype:"copper", name:"Antamina (Peru)",    ellipse:[-77.10, -9.55, 0.22, 0.22] },
    { rtype:"copper", name:"Oyu Tolgoi (Mong.)", ellipse:[106.87, 43.01, 0.30, 0.30] },
    { rtype:"copper", name:"Grasberg (Papua)",   ellipse:[137.11, -4.06, 0.20, 0.18] },
    { rtype:"copper", name:"Katanga Copperbelt", ellipse:[26.50, -10.90, 1.10, 0.80] },
    { rtype:"copper", name:"Zambian Copperbelt", ellipse:[27.80, -12.80, 0.80, 0.60] },
    { rtype:"copper", name:"Kamoa-Kakula (DRC)", ellipse:[25.30, -10.77, 0.25, 0.20] },
    { rtype:"copper", name:"Reko Diq (Pak.)",    ellipse:[62.30, 29.10, 0.25, 0.22] },

    /* =================== IRON ORE =================== */
    { rtype:"iron", name:"Pilbara (Aus)",       ellipse:[118.50, -22.50, 1.50, 1.30] },
    { rtype:"iron", name:"Carajás (Brazil)",    ellipse:[-50.16, -6.06, 0.45, 0.40] },
    { rtype:"iron", name:"Iron Quadrangle (BR)",ellipse:[-43.80, -20.20, 0.55, 0.45] },
    { rtype:"iron", name:"Simandou (Guinea)",   ellipse:[-8.85, 8.55, 0.25, 0.55] },
    { rtype:"iron", name:"Kursk Anomaly (Rus)", ellipse:[36.50, 51.30, 0.90, 0.70] },
    { rtype:"iron", name:"Hamersley (Aus)",     ellipse:[118.00, -22.30, 1.00, 0.80] },
    { rtype:"iron", name:"Krivbas (Ukraine)",   ellipse:[33.50, 47.80, 0.40, 0.30] },
    { rtype:"iron", name:"Anshan (China)",      ellipse:[122.80, 40.50, 0.50, 0.40] },

    /* =================== RARE EARTHS =================== */
    { rtype:"rareearth", name:"Bayan Obo (China)",  ellipse:[109.97, 41.77, 0.30, 0.30] },
    { rtype:"rareearth", name:"Sichuan REE (CN)",   ellipse:[102.20, 28.20, 0.40, 0.40] },
    { rtype:"rareearth", name:"Mountain Pass (US)", ellipse:[-115.53, 35.48, 0.18, 0.18] },
    { rtype:"rareearth", name:"Mount Weld (Aus)",   ellipse:[122.60, -28.86, 0.20, 0.20] },
    { rtype:"rareearth", name:"Kvanefjeld (Grl.)",  ellipse:[-46.02, 60.98, 0.20, 0.18] },
    { rtype:"rareearth", name:"Lovozero (Russia)",  ellipse:[34.80, 67.80, 0.30, 0.25] },

    /* =================== URANIUM =================== */
    { rtype:"uranium", name:"Kazakh ISR fields",  ellipse:[67.50, 44.50, 2.20, 1.40] },
    { rtype:"uranium", name:"Athabasca (Canada)", ellipse:[-104.54, 58.06, 1.00, 0.70] },
    { rtype:"uranium", name:"Arlit (Niger)",      ellipse:[7.39, 18.74, 0.40, 0.35] },
    { rtype:"uranium", name:"Husab/Rössing (Nam.)", ellipse:[15.03, -22.49, 0.30, 0.25] },
    { rtype:"uranium", name:"Olympic Dam (Aus)",  ellipse:[136.89, -30.44, 0.30, 0.30] },
    { rtype:"uranium", name:"McArthur River (Ca.)", ellipse:[-104.20, 57.80, 0.25, 0.22] },

    /* =================== COBALT =================== */
    { rtype:"cobalt", name:"Katanga (DRC)",       ellipse:[26.50, -10.90, 1.00, 0.70] },
    { rtype:"cobalt", name:"Murrin Murrin (Aus)", ellipse:[121.90, -28.70, 0.25, 0.22] },
    { rtype:"cobalt", name:"Sorowako (Indo.)",    ellipse:[121.36, -2.53, 0.30, 0.25] },
    { rtype:"cobalt", name:"Norilsk (Russia)",    ellipse:[87.50, 69.40, 0.50, 0.35] }
  ];
  window.RESOURCE_BASINS = { type: "FeatureCollection",
    features: BASINS.map(toFeature) };
})();

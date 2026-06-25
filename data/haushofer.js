/* ============================================================================
   HAUSHOFER / CLASSICAL WORLD-ISLAND  —  schematic geostrategic geometry
   ----------------------------------------------------------------------------
   Two stackable layers, modelled on Map 34 ("The World according to Haushofer",
   the Forschungsinstitut fuer Kulturmorphologie rendering of Mackinder's 1904
   World-Island) plus Haushofer's later pan-region blocs (~1924-1931):

     HAUSHOFER.worldIsland  — the World-Island boundary (Afro-Eurasia envelope),
                              the desert & steppe belt, and the monsoon coastlands
                              (the dark "inner crescent" of the original map).
     HAUSHOFER.panRegions   — the four meridional pan-region blocs.

   These are deliberately SCHEMATIC approximations of geopolitical constructs,
   not real borders. Coordinates are [lng, lat]. Refine freely.
   ========================================================================== */
(function () {
  function feat(name, kind, coords) {
    return { type: "Feature",
      properties: { name: name, kind: kind },
      geometry: { type: "Polygon", coordinates: [coords] } };
  }
  function multi(name, kind, polys) {
    return { type: "Feature",
      properties: { name: name, kind: kind },
      geometry: { type: "MultiPolygon", coordinates: polys.map(function (p) { return [p]; }) } };
  }
  function line(name, kind, coords) {
    return { type: "Feature",
      properties: { name: name, kind: kind },
      geometry: { type: "LineString", coordinates: coords } };
  }

  /* ---- World-Island boundary: a generous envelope around Afro-Eurasia ----- */
  var WORLD_ISLAND_RING = [
    [-12, 36], [-18, 26], [-18, 10], [8, 4], [11, -2], [13, -16], [18, -35],
    [27, -34], [33, -26], [41, -16], [51, 11], [60, 22], [66, 25], [73, 8],
    [80, 6], [95, 5], [105, 1], [110, 18], [120, 28], [122, 31], [130, 34],
    [142, 45], [160, 60], [172, 66], [165, 71], [120, 76], [80, 78], [55, 71],
    [32, 70], [10, 62], [-5, 58], [-10, 44], [-12, 36]
  ];

  /* ---- Desert & steppe belt: Sahara -> Arabia -> Iran -> C.Asia -> Gobi --- */
  var DESERT_BELT = [
    [-16, 28], [8, 31], [30, 33], [48, 38], [62, 44], [78, 48], [95, 48],
    [112, 46], [112, 40], [98, 40], [82, 40], [64, 36], [50, 30], [38, 22],
    [22, 18], [0, 17], [-16, 19], [-16, 28]
  ];

  /* ---- Monsoon coastlands: the dark, populous "inner crescent" of Asia ---- */
  var MONSOON = [
    /* W India / Deccan */
    [[70, 8], [73, 15], [73, 21], [74, 22], [77, 19], [78, 13], [77, 8], [70, 8]],
    /* E India / Bengal */
    [[80, 8], [80, 16], [85, 20], [91, 23], [93, 17], [88, 11], [82, 9], [80, 8]],
    /* SE Asia mainland coast */
    [[97, 9], [99, 16], [105, 18], [109, 21], [108, 11], [104, 8], [99, 6], [97, 9]],
    /* East China seaboard */
    [[108, 20], [112, 25], [118, 30], [122, 33], [121, 38], [118, 40], [114, 33], [110, 25], [108, 20]],
    /* Korea & Japan */
    [[126, 34], [130, 38], [137, 38], [142, 43], [140, 34], [135, 33], [129, 34], [126, 34]],
    /* Java / lesser Sunda */
    [[105, -7], [114, -8], [119, -8], [119, -6], [106, -6], [105, -7]]
  ];

  /* ---- Pan-regions: four schematic meridional blocs ---------------------- */
  var PAN_AMERICA = [
    [-168, 66], [-140, 71], [-95, 73], [-55, 62], [-52, 47], [-60, 24],
    [-78, 8], [-82, -4], [-70, -18], [-75, -45], [-68, -56], [-58, -50],
    [-40, -22], [-35, -7], [-50, 1], [-62, 9], [-83, 14], [-98, 16],
    [-118, 32], [-132, 52], [-168, 66]
  ];
  var EURAFRICA = [
    [-12, 36], [-18, 28], [-18, 10], [8, 4], [11, -3], [14, -18], [18, -35],
    [28, -34], [37, -16], [51, 12], [57, 22], [56, 30], [46, 40], [42, 48],
    [30, 47], [16, 41], [2, 44], [-10, 44], [-12, 36]
  ];
  var PAN_RUSSIA = [
    [28, 47], [28, 60], [31, 70], [60, 73], [100, 78], [140, 76], [178, 69],
    [178, 56], [140, 52], [104, 50], [90, 44], [82, 30], [80, 8], [72, 8],
    [62, 24], [52, 30], [46, 40], [42, 48], [28, 47]
  ];
  var PAN_ASIA = [
    [104, 50], [140, 52], [178, 56], [180, 8], [165, -12], [150, -45],
    [130, -32], [115, -35], [113, -22], [122, -10], [105, -8], [95, 5],
    [100, 20], [98, 38], [104, 50]
  ];

  window.HAUSHOFER = {
    worldIsland: {
      type: "FeatureCollection",
      features: [
        line("World-Island boundary", "boundary", WORLD_ISLAND_RING),
        feat("Desert & steppe belt", "desert", DESERT_BELT),
        multi("Monsoon coastlands", "monsoon", MONSOON)
      ]
    },
    panRegions: {
      type: "FeatureCollection",
      features: [
        feat("Pan-America", "pan-america", PAN_AMERICA),
        feat("Eurafrica (Pan-Europe-Africa)", "pan-eurafrica", EURAFRICA),
        feat("Pan-Russia", "pan-russia", PAN_RUSSIA),
        feat("Pan-Asia (Pan-Pacific)", "pan-asia", PAN_ASIA)
      ]
    }
  };
})();

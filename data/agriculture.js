/* ============================================================================
   AGRICULTURE  —  sub-national growing-region polygons (approximate)
   ----------------------------------------------------------------------------
   Hand-built envelopes around the world's major farming regions, drawn at the
   sub-national scale so they read as belts/deltas rather than whole countries.
   These approximate FAO / agronomic geography; they are recognisable, not
   pixel-accurate. Coordinates are [lng, lat]. Three layerable sets:

     CROPLAND_REGIONS — broad arable / cropland extent
     WHEAT_BELTS      — temperate grain belts
     RICE_REGIONS     — monsoon-Asia paddy & delta regions
   ========================================================================== */
(function () {
  function fc(list) {
    return { type: "FeatureCollection",
      features: list.map(function (r) {
        return { type: "Feature",
          properties: { name: r[0] },
          geometry: { type: "Polygon", coordinates: [r[1]] } };
      }) };
  }

  /* ---- Cropland / arable extent ----------------------------------------- */
  window.CROPLAND_REGIONS = fc([
    ["US Corn Belt & Great Plains",
      [[-104, 30], [-104, 44], [-96, 49], [-88, 45], [-82, 40], [-86, 33], [-96, 29], [-104, 30]]],
    ["Canadian Prairies",
      [[-114, 49], [-114, 56], [-97, 56], [-97, 49], [-114, 49]]],
    ["Mexican Bajio & central",
      [[-104, 19], [-103, 24], [-98, 24], [-97, 19], [-104, 19]]],
    ["Pampas & SE South America",
      [[-64, -39], [-64, -27], [-52, -22], [-48, -27], [-57, -38], [-64, -39]]],
    ["Brazilian cerrado / SE",
      [[-56, -24], [-55, -13], [-45, -12], [-44, -21], [-50, -24], [-56, -24]]],
    ["Western & Central Europe",
      [[-6, 40], [-8, 50], [4, 55], [20, 55], [27, 50], [22, 44], [10, 40], [-6, 40]]],
    ["Black Earth belt (Ukraine-S.Russia-N.Kazakhstan)",
      [[24, 46], [24, 53], [45, 56], [70, 56], [80, 53], [78, 47], [55, 45], [30, 45], [24, 46]]],
    ["Nile valley & delta",
      [[29, 24], [30, 31], [32, 31], [33, 30], [32, 24], [29, 24]]],
    ["West African Sudan-Sahel",
      [[-12, 9], [-10, 14], [15, 14], [16, 9], [0, 7], [-12, 9]]],
    ["Ethiopian highlands",
      [[36, 6], [36, 13], [40, 13], [40, 7], [36, 6]]],
    ["Indo-Gangetic plain",
      [[72, 25], [73, 31], [82, 31], [89, 27], [88, 23], [80, 23], [73, 24], [72, 25]]],
    ["Peninsular India",
      [[73, 9], [74, 21], [80, 22], [82, 15], [78, 8], [73, 9]]],
    ["North China Plain & NE China",
      [[110, 31], [110, 42], [126, 48], [132, 47], [123, 38], [120, 32], [114, 30], [110, 31]]],
    ["Mainland SE Asia & Java",
      [[95, 8], [97, 22], [107, 23], [110, 11], [105, -8], [113, -8], [113, -6], [99, 5], [95, 8]]],
    ["Fertile Crescent & Anatolia",
      [[27, 37], [29, 41], [42, 40], [48, 37], [44, 31], [35, 31], [27, 37]]],
    ["Murray-Darling & SE Australia",
      [[139, -37], [140, -28], [150, -28], [150, -37], [139, -37]]],
    ["SW Australia wheatbelt",
      [[115, -34], [115, -28], [119, -28], [119, -34], [115, -34]]],
    ["South Africa Highveld",
      [[24, -30], [25, -25], [30, -25], [30, -30], [24, -30]]]
  ]);

  /* ---- Wheat belts ------------------------------------------------------- */
  window.WHEAT_BELTS = fc([
    ["US winter & spring wheat",
      [[-104, 31], [-104, 49], [-96, 49], [-96, 31], [-104, 31]]],
    ["Canadian Prairies wheat",
      [[-114, 49], [-114, 55], [-98, 55], [-98, 49], [-114, 49]]],
    ["Pacific NW (Palouse)",
      [[-119, 46], [-119, 48], [-116, 48], [-116, 46], [-119, 46]]],
    ["Argentine Pampa wheat",
      [[-64, -39], [-63, -31], [-58, -31], [-58, -38], [-64, -39]]],
    ["NW Europe (France-Germany-Poland)",
      [[-3, 45], [-3, 53], [20, 54], [20, 47], [8, 45], [-3, 45]]],
    ["Black Earth wheat belt",
      [[26, 46], [26, 53], [55, 55], [78, 53], [78, 48], [50, 46], [26, 46]]],
    ["Anatolian plateau",
      [[28, 37], [29, 40], [41, 40], [42, 37], [28, 37]]],
    ["North China winter wheat",
      [[110, 32], [110, 40], [120, 40], [120, 32], [110, 32]]],
    ["Indian Punjab & upper Ganges",
      [[73, 27], [73, 32], [82, 31], [82, 26], [76, 26], [73, 27]]],
    ["SE Australia wheat",
      [[142, -37], [143, -31], [149, -31], [149, -36], [142, -37]]],
    ["SW Australia wheat",
      [[116, -34], [116, -29], [119, -29], [119, -34], [116, -34]]]
  ]);

  /* ---- Rice regions ------------------------------------------------------ */
  window.RICE_REGIONS = fc([
    ["Ganges-Brahmaputra & Bangladesh",
      [[83, 22], [84, 27], [90, 27], [92, 24], [90, 21], [85, 21], [83, 22]]],
    ["Eastern India coast",
      [[80, 15], [81, 22], [87, 22], [87, 16], [82, 14], [80, 15]]],
    ["South India deltas",
      [[77, 9], [78, 17], [82, 17], [81, 10], [77, 9]]],
    ["Irrawaddy delta",
      [[94, 15], [94, 19], [97, 19], [97, 15], [94, 15]]],
    ["Chao Phraya plain",
      [[99, 13], [99, 17], [101, 17], [101, 13], [99, 13]]],
    ["Mekong delta",
      [[104, 8], [104, 11], [107, 11], [107, 9], [104, 8]]],
    ["Red River delta",
      [[105, 20], [105, 21], [107, 21], [107, 20], [105, 20]]],
    ["Yangtze & southern China",
      [[108, 22], [109, 32], [122, 32], [122, 27], [116, 22], [108, 22]]],
    ["Java rice terraces",
      [[105, -8], [105, -6], [114, -7], [114, -8], [105, -8]]],
    ["Luzon & Visayas",
      [[120, 10], [120, 18], [124, 18], [124, 10], [120, 10]]],
    ["Japan & Korea paddy",
      [[126, 34], [127, 38], [141, 41], [141, 35], [131, 33], [126, 34]]],
    ["Sumatra & Malay rice",
      [[98, -4], [98, 4], [104, 4], [104, -4], [98, -4]]]
  ]);
})();

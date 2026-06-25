/* ============================================================================
   THEORY ZONES  —  APPROXIMATE polygons for classical geostrategy
   ----------------------------------------------------------------------------
   These are rough, hand-drawn approximations to demonstrate the "zone" layer
   type. Refine the coordinates (or replace with sourced polygons) over time.
   Only the Mackinder Heartland is seeded; add Rimland, Shatterbelts, etc.
   alongside it using the same shape. Coordinates are [lng, lat].
   ========================================================================== */
window.THEORY_ZONES = {
  heartland: {
    type: "Feature",
    properties: { name: "Mackinder Heartland (1943 revision, approx.)" },
    geometry: {
      // 1943 revision ("The Round World and the Winning of the Peace"):
      // eastern boundary pulled back to the Yenisei River, dropping the Lena /
      // Central Siberian uplands; Soviet power concentrated west of the Urals.
      type: "Polygon",
      coordinates: [[
        [38, 47], [30, 52], [26, 58], [28, 64], [40, 68], [55, 70],
        [70, 72], [82, 72],                 // Arctic coast to the Yenisei mouth
        [88, 60], [92, 55], [94, 52],       // eastern boundary down the Yenisei
        [88, 49], [80, 43], [72, 38],       // Altai - Tien Shan - Pamir/Hindu Kush
        [60, 38], [54, 38], [48, 41],       // Kopet Dag - Elburz - Caspian
        [44, 43], [40, 45], [38, 47]        // Caucasus back to the Black Sea
      ]]
    }
  }
  // rimland: { ... }   <- add the Rimland band here next
};

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
    properties: { name: "Mackinder Heartland (1919, approx.)" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [25, 68], [40, 75], [70, 77], [105, 76], [130, 72],
        [128, 62], [122, 52], [108, 43], [92, 38], [72, 36],
        [56, 38], [46, 41], [36, 46], [27, 54], [22, 60], [25, 68]
      ]]
    }
  }
  // rimland: { ... }   <- add the Rimland band here next
};

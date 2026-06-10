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
    properties: { name: "Mackinder Heartland (approx.)" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [30, 50], [55, 52], [90, 55], [110, 58], [120, 50],
        [115, 42], [95, 38], [70, 37], [55, 40], [40, 45], [30, 50]
      ]]
    }
  }
  // rimland: { ... }   <- add the Rimland band here next
};

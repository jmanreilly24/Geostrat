/* ============================================================================
   CONFLICT DENSITY  —  PLACEHOLDER SAMPLE DATA  (NOT real UCDP data yet)
   ----------------------------------------------------------------------------
   This exists only to prove the heatmap layer works. The real version will be
   wired to the auto-updating UCDP Georeferenced Event Dataset (monthly
   "Candidate" feed). Each point: [lng, lat, weight] where weight ~ intensity.
   When we connect the live feed, this file gets replaced by a fetch in app.js.
   ========================================================================== */
window.CONFLICT_POINTS = {
  type: "FeatureCollection",
  features: [
    // [lng, lat, weight]   — illustrative current-era hotspots, approximate
    [37.6, 47.9, 10], [37.0, 48.5, 9], [36.3, 49.9, 8], [38.0, 47.1, 8], // Ukraine
    [34.4, 31.4, 10], [34.3, 31.5, 9],                                   // Gaza / Israel
    [32.5, 15.5, 9], [29.7, 12.9, 8], [24.9, 13.5, 7],                   // Sudan
    [0.2, 13.5, 7], [1.5, 14.5, 7], [-1.7, 13.2, 6], [13.1, 13.6, 6],    // Sahel
    [96.1, 21.0, 7], [97.0, 19.7, 6],                                    // Myanmar
    [29.2, -1.7, 7], [28.9, -2.5, 6],                                    // DR Congo (east)
    [38.0, 35.9, 5], [40.1, 36.2, 5],                                    // Syria
    [44.5, 33.3, 4], [69.2, 34.5, 4],                                    // Iraq / Afghanistan
    [45.0, 15.4, 6]                                                       // Yemen
  ].map(function (p) {
    return {
      type: "Feature",
      properties: { weight: p[2] },
      geometry: { type: "Point", coordinates: [p[0], p[1]] }
    };
  })
};

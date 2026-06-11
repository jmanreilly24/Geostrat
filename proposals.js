/* ============================================================================
   GEOPOLITICAL PROPOSALS — Island Chains, String of Pearls, Shatterbelts
   Approximate, editable geometry.
   ========================================================================== */
window.ISLAND_CHAINS = [
  { name: "First Island Chain", segments: [[
    [145.8,43.4],[141,35.5],[131,31],[128,26.5],[122.5,24.8],[121,18],
    [122,13],[120,8],[116,4.5],[110,1.5]
  ]] },
  { name: "Second Island Chain", segments: [[
    [142,35.5],[142,27],[145.7,18],[144.9,13.5],[134.5,7.5],[131,2]
  ]] },
  { name: "Third Island Chain", segments: [
    [[165,53],[172,52.5],[179.9,52.3]],
    [[-179.9,52.3],[-170,52.8],[-160,54],[-157.8,21.3],[-170.7,-14.3]]
  ] }
];

window.PEARLS = {
  line: [[110.2,18.3],[108,12],[103.6,10.5],[98,7],[93.55,19.43],[91.8,22.3],
         [81.1,6.1],[79.85,6.95],[62.3,25.1],[58,15],[43.07,11.59]],
  ports: [
    { name: "Hainan (Yulin)", lng: 110.2, lat: 18.3 },
    { name: "Ream", lng: 103.6, lat: 10.5 },
    { name: "Kyaukpyu", lng: 93.55, lat: 19.43 },
    { name: "Chittagong", lng: 91.8, lat: 22.3 },
    { name: "Hambantota", lng: 81.1, lat: 6.1 },
    { name: "Colombo", lng: 79.85, lat: 6.95 },
    { name: "Gwadar", lng: 62.3, lat: 25.1 },
    { name: "Djibouti", lng: 43.07, lat: 11.59 }
  ]
};

window.SHATTERBELTS = [
  { name: "Middle East shatterbelt", coords: [[
    [26,42],[44,42],[54,40],[63,38],[61,25],[52,12],[43,11],[32,21],[24,31],[26,42]
  ]] },
  { name: "Southeast Asia shatterbelt", coords: [[
    [92,28],[108,24],[110,12],[107,-9],[95,-6],[91,8],[92,28]
  ]] }
];

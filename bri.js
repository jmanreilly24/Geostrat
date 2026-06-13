/* ============================================================================
   BELT AND ROAD — corridors with status + points of interest (editable)
   status: "completed" (solid) | "planned" (dashed, incl. ongoing/stalled)
   ========================================================================== */
window.BRI_CORRIDORS = [
  { name: "New Eurasian Land Bridge", w: 8, status: "completed", segments: [[
    [119.2,34.6],[113.6,34.7],[108.95,34.27],[103,36],[87.6,43.8],[80.4,44.2],
    [76.85,43.24],[71.4,51.2],[55,53],[37.6,55.7],[27.5,53.9],[21,52.2],[6.8,51.4]
  ]] },
  { name: "China–Mongolia–Russia", w: 5, status: "completed", segments: [[
    [116.4,39.9],[106.9,47.9],[105,52],[90,55],[60,56],[37.6,55.7]
  ]] },
  { name: "China–Central Asia–West Asia", w: 6, status: "planned", segments: [[
    [87.6,43.8],[69.2,41.3],[58,38],[51.4,35.7],[44,37.5],[32.9,39.9],[29,41]
  ]] },
  { name: "China–Pakistan (CPEC)", w: 7, status: "completed", segments: [[
    [76,39.5],[73,33.7],[68,28],[62.3,25.1]
  ]] },
  { name: "Bangladesh–China–India–Myanmar", w: 4, status: "planned", segments: [[
    [102.7,25],[96.1,22],[90.4,23.7],[88.4,22.6]
  ]] },
  { name: "China–Indochina (Laos rail done)", w: 6, status: "completed", segments: [[
    [102.7,25],[102.6,18],[100.5,13.7],[101.7,3.1],[103.8,1.35]
  ]] },
  { name: "Maritime Silk Road (main)", w: 9, status: "completed", segments: [[
    [119.3,26],[114,18],[107,8],[103.8,1.35],[98,5],[79.85,6.9],[73,8],
    [60,11],[51,12.2],[43.4,12.6],[38,20],[32.4,30],[27,34.5],[23.6,37.9],[12.3,45.4]
  ]] },
  { name: "MSR East Africa spur", w: 5, status: "completed", segments: [[
    [73,8],[60,2],[48,-1.5],[39.66,-4.04]
  ]] },
  { name: "Gwadar link (sea)", w: 5, status: "completed", segments: [[
    [73,8],[66,15],[62.3,25.1]
  ]] }
];

window.BRI_POIS = [
  { kind: "city", name: "Xi'an", lng: 108.95, lat: 34.27 },
  { kind: "city", name: "Urumqi", lng: 87.6, lat: 43.8 },
  { kind: "city", name: "Khorgos (dry port)", lng: 80.4, lat: 44.2 },
  { kind: "city", name: "Almaty", lng: 76.85, lat: 43.24 },
  { kind: "city", name: "Tashkent", lng: 69.2, lat: 41.3 },
  { kind: "city", name: "Tehran", lng: 51.4, lat: 35.7 },
  { kind: "city", name: "Istanbul", lng: 29, lat: 41 },
  { kind: "city", name: "Moscow", lng: 37.6, lat: 55.7 },
  { kind: "city", name: "Duisburg", lng: 6.8, lat: 51.4 },
  { kind: "city", name: "Kunming", lng: 102.7, lat: 25 },
  { kind: "city", name: "Vientiane", lng: 102.6, lat: 18 },
  { kind: "city", name: "Islamabad", lng: 73, lat: 33.7 },
  { kind: "port", name: "Gwadar", lng: 62.3, lat: 25.1 },
  { kind: "port", name: "Colombo", lng: 79.85, lat: 6.9 },
  { kind: "port", name: "Hambantota", lng: 81.1, lat: 6.1 },
  { kind: "port", name: "Kyaukpyu", lng: 93.55, lat: 19.43 },
  { kind: "port", name: "Djibouti", lng: 43.07, lat: 11.59 },
  { kind: "port", name: "Mombasa", lng: 39.66, lat: -4.04 },
  { kind: "port", name: "Piraeus", lng: 23.63, lat: 37.94 },
  { kind: "port", name: "Khalifa Port", lng: 54.65, lat: 24.81 },
  { kind: "port", name: "Ream", lng: 103.6, lat: 10.5 }
];

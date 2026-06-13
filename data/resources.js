/* ============================================================================
   NATURAL RESOURCE DEPOSITS — major fields/mines/basins (editorial, editable)
   Deposits are geological: valid across the YEAR slider unchanged.
   type: lithium | cobalt | copper | oil | gas | iron | rareearth | uranium
   ========================================================================== */
window.RESOURCES = [
  { type:"lithium", name:"Salar de Atacama", lng:-68.25, lat:-23.5 },
  { type:"lithium", name:"Salar de Uyuni", lng:-67.49, lat:-20.13 },
  { type:"lithium", name:"Hombre Muerto (Arg)", lng:-66.9, lat:-25.4 },
  { type:"lithium", name:"Greenbushes", lng:116.06, lat:-33.86 },
  { type:"lithium", name:"Pilgangoora", lng:118.9, lat:-21.05 },
  { type:"lithium", name:"Qinghai/Tibet brines", lng:95, lat:36 },
  { type:"lithium", name:"Bikita (Zimbabwe)", lng:31.6, lat:-20.08 },
  { type:"cobalt", name:"Katanga Copperbelt (DRC)", lng:26.5, lat:-10.9 },
  { type:"cobalt", name:"Murrin Murrin", lng:121.9, lat:-28.7 },
  { type:"cobalt", name:"Sorowako (Indonesia)", lng:121.36, lat:-2.53 },
  { type:"copper", name:"Escondida", lng:-69.07, lat:-24.27 },
  { type:"copper", name:"Cerro Verde (Peru)", lng:-71.6, lat:-16.54 },
  { type:"copper", name:"Oyu Tolgoi", lng:106.87, lat:43.01 },
  { type:"copper", name:"Grasberg", lng:137.11, lat:-4.06 },
  { type:"copper", name:"Kamoa-Kakula (DRC)", lng:25.3, lat:-10.77 },
  { type:"oil", name:"Ghawar", lng:49.3, lat:25.43 },
  { type:"oil", name:"Permian Basin", lng:-102.1, lat:31.8 },
  { type:"oil", name:"Orinoco Belt", lng:-64.5, lat:8.5 },
  { type:"oil", name:"West Siberia (Samotlor)", lng:76.7, lat:61 },
  { type:"oil", name:"Pre-salt Santos (Brazil)", lng:-42.5, lat:-25.5 },
  { type:"oil", name:"Stabroek (Guyana)", lng:-56.9, lat:8 },
  { type:"oil", name:"North Sea", lng:2.5, lat:58 },
  { type:"oil", name:"Niger Delta (offshore)", lng:5.5, lat:4 },
  { type:"gas", name:"South Pars / North Dome", lng:52.4, lat:26.5 },
  { type:"gas", name:"Yamal (Bovanenkovo)", lng:68.5, lat:70.3 },
  { type:"gas", name:"Galkynysh (Turkmenistan)", lng:62.3, lat:37.3 },
  { type:"gas", name:"Appalachia (Marcellus)", lng:-79.5, lat:40.5 },
  { type:"gas", name:"NW Shelf (Australia)", lng:116.5, lat:-19.8 },
  { type:"iron", name:"Pilbara", lng:118.7, lat:-22.6 },
  { type:"iron", name:"Carajás", lng:-50.16, lat:-6.06 },
  { type:"iron", name:"Simandou", lng:-8.85, lat:8.55 },
  { type:"iron", name:"Kursk Anomaly", lng:36.5, lat:51.3 },
  { type:"rareearth", name:"Bayan Obo", lng:109.97, lat:41.77 },
  { type:"rareearth", name:"Mountain Pass", lng:-115.53, lat:35.48 },
  { type:"rareearth", name:"Mount Weld", lng:122.6, lat:-28.86 },
  { type:"rareearth", name:"Kvanefjeld (Greenland)", lng:-46.02, lat:60.98 },
  { type:"uranium", name:"Kazakh ISR fields", lng:67.5, lat:44.5 },
  { type:"uranium", name:"Athabasca (Cigar Lake)", lng:-104.54, lat:58.06 },
  { type:"uranium", name:"Arlit (Niger)", lng:7.39, lat:18.74 },
  { type:"uranium", name:"Husab/Rössing (Namibia)", lng:15.03, lat:-22.49 },
  { type:"uranium", name:"Olympic Dam", lng:136.89, lat:-30.44 }
];
window.RESOURCE_TYPES = [
  ["lithium", "Lithium", "#7FE3D6"], ["cobalt", "Cobalt", "#5B8CFF"],
  ["copper", "Copper", "#E8843D"], ["oil", "Oil", "#E8A33D"],
  ["gas", "Gas", "#9B6EE8"], ["iron", "Iron ore", "#C0392B"],
  ["rareearth", "Rare earths", "#3FE08A"], ["uranium", "Uranium", "#F5D547"]
];

/* Countries/territories hosting US bases or installations (after Vine 2021 /
   IBON 2025 infographic: 82 countries & territories, 742 bases). Editable. */
window.USBASE_HOSTS = [
  "Germany","United Kingdom","Italy","Spain","Portugal","Netherlands","Belgium",
  "Luxembourg","Norway","Denmark","Iceland","Greece","Turkey","Poland","Romania",
  "Bulgaria","Hungary","Estonia","Latvia","Lithuania","Slovakia","Kosovo",
  "Greenland","Israel","Jordan","Egypt","Saudi Arabia","United Arab Emirates",
  "Qatar","Bahrain","Kuwait","Oman","Iraq","Syria","Djibouti","Kenya","Somalia",
  "Cameroon","Ghana","Senegal","Tunisia","Japan","South Korea","Philippines",
  "Thailand","Singapore","Australia","Marshall Is.","Palau","Papua New Guinea",
  "Bahamas","Cuba","Honduras","El Salvador","Peru","Chile","Colombia","Aruba"
];

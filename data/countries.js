/* ============================================================================
   COUNTRY DATA — edit this file to change classifications and memberships.
   Click any country on the map to see the exact name string to use here.
   ========================================================================== */

/* ---- POWER TIER (editorial) -------------------------------------------- */
window.COUNTRY_TIERS = {
  "United States": "hegemon",
  "China": "hegemon",

  "Russia": "great",
  "India": "great",

  "Japan": "regional", "Germany": "regional", "United Kingdom": "regional",
  "France": "regional", "Brazil": "regional", "Iran": "regional",
  "Saudi Arabia": "regional", "Turkey": "regional", "Israel": "regional",
  "South Korea": "regional", "Indonesia": "regional", "Nigeria": "regional",
  "South Africa": "regional", "Egypt": "regional", "Pakistan": "regional",
  "Australia": "regional", "Canada": "regional",

  "Italy": "middle", "Spain": "middle", "Poland": "middle", "Ukraine": "middle",
  "Vietnam": "middle", "United Arab Emirates": "middle", "Argentina": "middle",
  "Mexico": "middle", "Netherlands": "middle", "Sweden": "middle",
  "Norway": "middle", "Qatar": "middle", "Kazakhstan": "middle",
  "Ethiopia": "middle", "Philippines": "middle", "Thailand": "middle"
};

/* ---- BRZEZINSKI ROLES ---------------------------------------------------- */
window.COUNTRY_ROLES = {
  "France": "agent", "Germany": "agent", "Russia": "agent",
  "China": "agent", "India": "agent",
  "Ukraine": "pivot", "Azerbaijan": "pivot", "South Korea": "pivot",
  "Turkey": "pivot", "Iran": "pivot"
};

/* ---- BLOC / ALLIANCE MEMBERSHIP ------------------------------------------
   Each list renders as a stackable outline layer (colors set in app.js).    */
window.MEMBERSHIPS = {
  nato: [
    "Albania","Belgium","Bulgaria","Canada","Croatia","Czechia","Denmark",
    "Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Italy",
    "Latvia","Lithuania","Luxembourg","Montenegro","Netherlands","North Macedonia",
    "Norway","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden",
    "Turkey","United Kingdom","United States"
  ],
  csto: ["Russia","Belarus","Kazakhstan","Kyrgyzstan","Tajikistan","Armenia"],
  sco: [ // Shanghai Cooperation Organisation (security + economic)
    "China","Russia","India","Pakistan","Kazakhstan","Kyrgyzstan","Tajikistan",
    "Uzbekistan","Iran","Belarus"
  ],
  aukus: ["Australia","United Kingdom","United States"],
  fiveEyes: ["United States","United Kingdom","Canada","Australia","New Zealand"],
  quad: ["United States","Japan","India","Australia"], // dialogue, not a treaty

  eu: [
    "Austria","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark",
    "Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy",
    "Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal",
    "Romania","Slovakia","Slovenia","Spain","Sweden"
  ],
  brics: [
    "Brazil","Russia","India","China","South Africa","Egypt","Ethiopia","Iran",
    "United Arab Emirates","Indonesia","Saudi Arabia" // Saudi status contested
  ],
  bricsPartners: [
    "Belarus","Bolivia","Cuba","Kazakhstan","Malaysia","Nigeria","Thailand",
    "Uganda","Uzbekistan","Vietnam"
  ],
  eaeu: ["Russia","Belarus","Kazakhstan","Kyrgyzstan","Armenia"],
  asean: [
    "Brunei","Cambodia","Indonesia","Laos","Malaysia","Myanmar","Philippines",
    "Singapore","Thailand","Vietnam","Timor-Leste" // joined 2025
  ],
  gcc: ["Saudi Arabia","United Arab Emirates","Kuwait","Qatar","Bahrain","Oman"],
  arabLeague: [
    "Algeria","Bahrain","Djibouti","Egypt","Iraq","Jordan","Kuwait","Lebanon",
    "Libya","Mauritania","Morocco","Oman","Palestine","Qatar","Saudi Arabia",
    "Somalia","Sudan","Syria","Tunisia","United Arab Emirates","Yemen"
  ],
  au: [ // African Union (W. Sahara polygon stands in for SADR membership)
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon",
    "Central African Rep.","Chad","Congo","Côte d'Ivoire","Dem. Rep. Congo",
    "Djibouti","Egypt","Eq. Guinea","Eritrea","eSwatini","Ethiopia","Gabon",
    "Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya",
    "Madagascar","Malawi","Mali","Mauritania","Morocco","Mozambique","Namibia",
    "Niger","Nigeria","Rwanda","Senegal","Sierra Leone","Somalia","South Africa",
    "S. Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","W. Sahara",
    "Zambia","Zimbabwe"
  ],
  opecPlus: [
    "Saudi Arabia","Iraq","Iran","United Arab Emirates","Kuwait","Venezuela",
    "Nigeria","Libya","Algeria","Congo","Eq. Guinea","Gabon",
    "Russia","Kazakhstan","Azerbaijan","Bahrain","Brunei","Malaysia","Mexico",
    "Oman","S. Sudan","Sudan"
  ],
  mercosur: ["Brazil","Argentina","Uruguay","Paraguay","Bolivia"],
  commonwealth: [
    "United Kingdom","Canada","Australia","New Zealand","India","Pakistan",
    "Bangladesh","Sri Lanka","Malaysia","Brunei","Singapore","Papua New Guinea",
    "Fiji","Solomon Is.","Vanuatu","South Africa","Nigeria","Ghana","Kenya",
    "Tanzania","Uganda","Zambia","Malawi","Mozambique","Namibia","Botswana",
    "eSwatini","Lesotho","Sierra Leone","Gambia","Cameroon","Rwanda","Mauritius",
    "Jamaica","Trinidad and Tobago","Guyana","Belize","Bahamas","Cyprus","Malta",
    "Togo","Gabon"
  ],
  oas: [ // Organization of American States (Venezuela withdrew 2019)
    "Argentina","Bahamas","Belize","Bolivia","Brazil","Canada","Chile","Colombia",
    "Costa Rica","Cuba","Dominican Rep.","Ecuador","El Salvador","Guatemala",
    "Guyana","Haiti","Honduras","Jamaica","Mexico","Nicaragua","Panama",
    "Paraguay","Peru","Suriname","Trinidad and Tobago","United States","Uruguay"
  ]
};

/* ---- SPYKMAN RIMLAND (editorial — refine freely) ------------------------- */
window.RIMLAND = [
  "Norway","Sweden","Finland","Denmark","Germany","Netherlands","Belgium",
  "France","Spain","Portugal","Italy","Greece","Turkey","Syria","Lebanon",
  "Israel","Jordan","Iraq","Saudi Arabia","Yemen","Oman","United Arab Emirates",
  "Qatar","Kuwait","Bahrain","Iran","Afghanistan","Pakistan","India",
  "Bangladesh","Myanmar","Thailand","Malaysia","Cambodia","Vietnam",
  "China","South Korea","North Korea"
];
/* Spykman offshore islands & continents (shown with the Rimland toggle) */
window.RIMLAND_OFFSHORE = [
  "United Kingdom","Ireland","Iceland","Japan","Taiwan","Philippines",
  "Indonesia","Sri Lanka","Australia","New Zealand"
];

/* ---- NUCLEAR WEAPONS STATES ---------------------------------------------- */
window.NUCLEAR = [
  "United States","Russia","China","France","United Kingdom",
  "India","Pakistan","Israel","North Korea" // Israel: undeclared
];

/* ---- ALLY DERIVATION (used by "Ally highlight on click") ------------------
   Allies = everyone sharing a bloc listed here, plus bilateral pairs below.  */
window.ALLIANCE_CONFIG = {
  military: ["nato","csto","aukus","fiveEyes","quad"], // SCO excluded: forum, not a defense pact
  economic: ["eu","eaeu","asean","gcc","mercosur","brics","arabLeague","au",
             "opecPlus","commonwealth","oas"]
};
window.BILATERAL_PACTS = {
  military: [
    ["United States","Japan"], ["United States","South Korea"],
    ["United States","Philippines"], ["United States","Thailand"],
    ["United States","Israel"], ["United States","Egypt"],
    ["United States","Jordan"], ["United States","Kuwait"],
    ["United States","Bahrain"], ["United States","Qatar"],
    ["United States","Morocco"], ["United States","Tunisia"],
    ["United States","Kenya"], ["United States","Colombia"],
    ["United States","Argentina"], ["United States","Brazil"],
    ["United States","Taiwan"],
    ["Russia","North Korea"], ["Russia","Iran"], ["Russia","Syria"],
    ["China","North Korea"], ["China","Pakistan"],
    ["France","Greece"]
  ],
  economic: [["China","Pakistan"], ["Russia","India"]]
};

/* ---- ADVERSARY PAIRS (editorial — used by "Adversary highlight") ---------- */
window.ADVERSARIES = [
  ["United States","China"], ["United States","Russia"],
  ["United States","Iran"], ["United States","North Korea"],
  ["United States","Venezuela"], ["United States","Cuba"],
  ["China","India"], ["China","Taiwan"], ["China","Japan"],
  ["China","Philippines"], ["India","Pakistan"],
  ["Russia","Ukraine"], ["Russia","United Kingdom"], ["Russia","Poland"],
  ["Israel","Iran"], ["Saudi Arabia","Iran"],
  ["North Korea","South Korea"], ["Armenia","Azerbaijan"],
  ["Greece","Turkey"], ["Morocco","Algeria"], ["Venezuela","Guyana"],
  ["Ethiopia","Eritrea"], ["Rwanda","Dem. Rep. Congo"]
];

/* ---- NAME ALIASES (map-data spelling -> your spelling) -------------------- */
window.NAME_ALIASES = {
  "United States": ["United States of America","USA","US"],
  "Russia": ["Russian Federation"],
  "Czechia": ["Czech Republic","Czech Rep."],
  "North Macedonia": ["Macedonia"],
  "Turkey": ["Turkiye","Türkiye"],
  "South Korea": ["Korea, Republic of","Republic of Korea","Korea"],
  "North Korea": ["Dem. Rep. Korea","Korea, Dem. People's Rep.","DPRK"],
  "United Arab Emirates": ["UAE"],
  "Bolivia": ["Plurinational State of Bolivia"],
  "Iran": ["Islamic Republic of Iran"],
  "Vietnam": ["Viet Nam"],
  "Laos": ["Lao PDR"],
  "Myanmar": ["Burma"],
  "Brunei": ["Brunei Darussalam"],
  "Timor-Leste": ["East Timor"],
  "Syria": ["Syrian Arab Republic"],
  "Moldova": ["Republic of Moldova"],
  "Tanzania": ["United Republic of Tanzania"],
  "Venezuela": ["Bolivarian Republic of Venezuela"],
  "Kyrgyzstan": ["Kyrgyz Republic"],
  "Slovakia": ["Slovak Republic"],
  "Côte d'Ivoire": ["Ivory Coast","Cote d'Ivoire"],
  "Dem. Rep. Congo": ["Democratic Republic of the Congo","DR Congo","DRC"],
  "Congo": ["Republic of the Congo","Congo-Brazzaville"],
  "Central African Rep.": ["Central African Republic"],
  "S. Sudan": ["South Sudan"],
  "Eq. Guinea": ["Equatorial Guinea"],
  "W. Sahara": ["Western Sahara"],
  "Bosnia and Herz.": ["Bosnia and Herzegovina"],
  "Dominican Rep.": ["Dominican Republic"],
  "Solomon Is.": ["Solomon Islands"],
  "eSwatini": ["Swaziland","Eswatini"],
  "Palestine": ["West Bank","Palestinian Territories"]
};

/* ---- NUCLEAR ARSENAL DETAIL (FAS-style estimates, editable) ----------------
   wh: est. total warheads · icbm: intercontinental-range delivery · h: thermonuclear */
window.NUCLEAR_INFO = {
  "Russia":         { wh: 5580, icbm: true,  h: true  },
  "United States":  { wh: 5044, icbm: true,  h: true  },
  "China":          { wh: 600,  icbm: true,  h: true  },
  "France":         { wh: 290,  icbm: true,  h: true  },
  "United Kingdom": { wh: 225,  icbm: true,  h: true  },
  "India":          { wh: 172,  icbm: true,  h: true  },  // thermonuclear claim contested
  "Pakistan":       { wh: 170,  icbm: false, h: false },
  "Israel":         { wh: 90,   icbm: false, h: false }, // undeclared; capabilities unconfirmed
  "North Korea":    { wh: 50,   icbm: true,  h: true  }  // claimed thermonuclear (2017 test)
};

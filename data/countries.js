/* ============================================================================
   COUNTRY DATA  —  edit this file to change classifications and bloc membership
   ----------------------------------------------------------------------------
   You do NOT need to touch any code to update the map. Everything visual is
   driven by the lists below. To find the EXACT name to use for a country,
   click it on the map: the info card shows the name string the map expects.

   Power tiers (pick one per country): hegemon | great | regional | middle | small
   Brzezinski roles: "agent" (active geostrategic player) or "pivot"
   ========================================================================== */

/* ---- POWER TIER -------------------------------------------------------------
   Editorial starting point. Reassign freely — this is your call to make.      */
window.COUNTRY_TIERS = {
  "United States": "hegemon",

  "China": "great",
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
  // everything not listed renders as "small / unclassified" — add rows as you go
};

/* ---- BRZEZINSKI: GEOSTRATEGIC PLAYERS vs GEOPOLITICAL PIVOTS -----------------
   From Z. Brzezinski, "The Grand Chessboard" (1997). The classic five active
   geostrategic players in Eurasia, and the five geopolitical pivots.
   The United States sits outside this scheme as the external balancer.        */
window.COUNTRY_ROLES = {
  // agents (active geostrategic players)
  "France": "agent", "Germany": "agent", "Russia": "agent",
  "China": "agent", "India": "agent",
  // pivots (geopolitical pivots)
  "Ukraine": "pivot", "Azerbaijan": "pivot", "South Korea": "pivot",
  "Turkey": "pivot", "Iran": "pivot"
};

/* ---- BLOC / ALLIANCE MEMBERSHIP ---------------------------------------------
   Each list is rendered as its own outline layer you can stack. Add lists here
   and a matching entry in app.js BLOC_LAYERS to make a new bloc appear.        */
window.MEMBERSHIPS = {
  // NATO — 32 members (Finland 2023, Sweden 2024)
  nato: [
    "Albania","Belgium","Bulgaria","Canada","Croatia","Czechia","Denmark",
    "Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Italy",
    "Latvia","Lithuania","Luxembourg","Montenegro","Netherlands","North Macedonia",
    "Norway","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden",
    "Turkey","United Kingdom","United States"
  ],

  // BRICS — 11 full members as of 2026 (Saudi Arabia's status is contested —
  // invited 2023, listed as a member by India's 2026 chairship but never
  // formally confirmed accession; included here, flag if you'd rather exclude)
  brics: [
    "Brazil","Russia","India","China","South Africa",
    "Egypt","Ethiopia","Iran","United Arab Emirates","Indonesia","Saudi Arabia"
  ],

  // BRICS partner countries (2025 cohort)
  bricsPartners: [
    "Belarus","Bolivia","Cuba","Kazakhstan","Malaysia","Nigeria","Thailand",
    "Uganda","Uzbekistan","Vietnam"
  ],

  // EU — 27 members
  eu: [
    "Austria","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark",
    "Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy",
    "Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal",
    "Romania","Slovakia","Slovenia","Spain","Sweden"
  ]
};

/* ---- NAME ALIASES -----------------------------------------------------------
   Maps your readable names to the spellings used by the world map data, so the
   join works. Add an alias here if a country won't colour (click it to see the
   exact map name, then add that string to the list).                          */
window.NAME_ALIASES = {
  "United States": ["United States of America", "USA", "US"],
  "Russia": ["Russian Federation"],
  "Czechia": ["Czech Republic", "Czech Rep."],
  "North Macedonia": ["Macedonia"],
  "Turkey": ["Turkiye", "Türkiye"],
  "South Korea": ["Korea, Republic of", "Republic of Korea", "Korea"],
  "United Arab Emirates": ["UAE"],
  "Bolivia": ["Plurinational State of Bolivia"],
  "Iran": ["Islamic Republic of Iran"]
};

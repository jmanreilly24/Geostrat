/* ============================================================================
   POWER / STATS  —  PLACEHOLDER SAMPLE  (NOT live World Bank data yet)
   ----------------------------------------------------------------------------
   Replaced automatically by data/power-index.json after the "Update power index"
   GitHub Action runs. Keyed by the SAME names used in countries.js.
   Each entry: { iso3, composite (~0-0.2), gdp (USD), gdppc (USD),
                 pop (people), milex (USD), milper (people) }. Illustrative only.
   ========================================================================== */
window.POWER_INDEX = {
  "United States":  { iso3:"USA", composite:0.16, gdp:2.77e13, gdppc:81600, pop:3.34e8, milex:9.16e11, milper:1.33e6, renew:23 },
  "China":          { iso3:"CHN", composite:0.18, gdp:1.79e13, gdppc:12600, pop:1.41e9, milex:2.96e11, milper:2.0e6, renew:31 },
  "Russia":         { iso3:"RUS", composite:0.04, gdp:2.02e12, gdppc:13800, pop:1.44e8, milex:1.09e11, milper:1.32e6 },
  "India":          { iso3:"IND", composite:0.08, gdp:3.55e12, gdppc:2480,  pop:1.43e9, milex:8.36e10, milper:1.45e6, renew:21 },
  "Japan":          { iso3:"JPN", composite:0.03, gdp:4.21e12, gdppc:33800, pop:1.25e8, milex:5.0e10,  milper:2.47e5 },
  "Germany":        { iso3:"DEU", composite:0.025,gdp:4.46e12, gdppc:53600, pop:8.4e7,  milex:6.68e10, milper:1.83e5, renew:46 },
  "United Kingdom": { iso3:"GBR", composite:0.02, gdp:3.34e12, gdppc:49500, pop:6.8e7,  milex:7.49e10, milper:1.85e5 },
  "Saudi Arabia":   { iso3:"SAU", composite:0.015,gdp:1.07e12, gdppc:30400, pop:3.6e7,  milex:7.58e10, milper:2.5e5 },
  "Nigeria":        { iso3:"NGA", composite:0.011,gdp:3.63e11, gdppc:1620,  pop:2.23e8, milex:3.1e9,   milper:2.23e5 },
  "Brazil":         { iso3:"BRA", composite:0.02, gdp:2.17e12, gdppc:10000, pop:2.16e8, milex:2.27e10, milper:3.6e5, renew:89 }
};

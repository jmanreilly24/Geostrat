/* ============================================================================
   TOP TRADE PARTNER: US vs CHINA — editorial approximation from UN Comtrade /
   ITC reporting patterns. Binary by design; refine freely. "us" | "china"
   ========================================================================== */
(function () {
  var us = [
    "United States","Canada","Mexico","Guatemala","Belize","Honduras",
    "El Salvador","Costa Rica","Panama","Dominican Rep.","Haiti","Jamaica",
    "Bahamas","Trinidad and Tobago","Barbados","Saint Lucia","Grenada",
    "Antigua and Barb.","St. Kitts and Nevis","St. Vin. and Gren.","Dominica",
    "Colombia","Ecuador","Guyana",
    "United Kingdom","Ireland","Germany","Netherlands","Belgium","France",
    "Italy","Spain","Portugal","Switzerland","Austria","Denmark","Norway",
    "Sweden","Finland","Iceland","Poland","Czechia","Slovakia","Hungary",
    "Romania","Bulgaria","Greece","Croatia","Slovenia","Estonia","Latvia",
    "Lithuania","Luxembourg","Malta","Cyprus","Albania","North Macedonia",
    "Bosnia and Herz.","Serbia","Montenegro","Kosovo","Moldova","Ukraine",
    "Israel","Jordan","India","Nicaragua"
  ];
  var china = [
    "China","Russia","Belarus","Kazakhstan","Uzbekistan","Turkmenistan",
    "Tajikistan","Kyrgyzstan","Mongolia","Azerbaijan","Armenia","Georgia",
    "Turkey","Iran","Iraq","Saudi Arabia","United Arab Emirates","Qatar",
    "Kuwait","Bahrain","Oman","Yemen","Syria","Lebanon","Egypt","Libya",
    "Tunisia","Algeria","Morocco","W. Sahara","Mauritania","Mali","Niger",
    "Chad","Sudan","S. Sudan","Eritrea","Djibouti","Ethiopia","Somalia",
    "Senegal","Gambia","Guinea-Bissau","Guinea","Sierra Leone","Liberia",
    "Côte d'Ivoire","Ghana","Togo","Benin","Nigeria","Burkina Faso",
    "Cameroon","Central African Rep.","Eq. Guinea","Gabon","Congo",
    "Dem. Rep. Congo","Uganda","Kenya","Tanzania","Rwanda","Burundi",
    "Angola","Zambia","Malawi","Mozambique","Zimbabwe","Botswana","Namibia",
    "South Africa","Lesotho","eSwatini","Madagascar","Mauritius","Comoros",
    "Seychelles","Cabo Verde","São Tomé and Principe",
    "Pakistan","Afghanistan","Nepal","Bhutan","Bangladesh","Sri Lanka",
    "Maldives","Myanmar","Thailand","Laos","Cambodia","Vietnam","Malaysia",
    "Singapore","Brunei","Indonesia","Philippines","Timor-Leste",
    "Japan","South Korea","North Korea","Taiwan","Australia","New Zealand",
    "Papua New Guinea","Fiji","Solomon Is.","Vanuatu","Samoa","Tonga",
    "Kiribati","Marshall Is.","Micronesia","Palau",
    "Brazil","Argentina","Chile","Peru","Bolivia","Uruguay","Paraguay",
    "Venezuela","Suriname","Cuba"
  ];
  var out = {};
  us.forEach(function (k) { out[k] = "us"; });
  china.forEach(function (k) { out[k] = "china"; });
  window.TRADE_PARTNER = out;

  /* Year of the most recent flip in the leading trade partner. Each entry's
     value is the year the country's CURRENT top partner overtook the other.
     Before that year, the lookup treats the country as having the OPPOSITE
     partner. Countries that have been with the same partner throughout the
     slider window (2000-2026) can be omitted. Editorial; edit freely. */
  window.TRADE_PARTNER_CHANGES = {
    // Latin America (most flipped from US -> China between 2007 and 2015)
    "Argentina": 2014, "Bolivia": 2015, "Brazil": 2009, "Chile": 2007,
    "Cuba": 2010, "Peru": 2011, "Suriname": 2012, "Uruguay": 2013,
    "Venezuela": 2008,
    // Africa (China overtook the US/EU as the largest trade partner of
    // sub-Saharan Africa overall in 2009; individual countries varied)
    "Algeria": 2010, "Angola": 2005, "Egypt": 2015, "Ethiopia": 2008,
    "Ghana": 2013, "Kenya": 2010, "Mozambique": 2011, "Nigeria": 2009,
    "South Africa": 2009, "Sudan": 2002, "Tanzania": 2008, "Zambia": 2007,
    "Zimbabwe": 2010, "Dem. Rep. Congo": 2008,
    // Middle East
    "Iran": 2008, "Iraq": 2014, "Qatar": 2018, "Saudi Arabia": 2014,
    "Syria": 2012, "United Arab Emirates": 2015,
    // South / Southeast Asia & Pacific
    "Bangladesh": 2010, "Cambodia": 2007, "Indonesia": 2009, "Japan": 2007,
    "Laos": 2010, "Malaysia": 2009, "Myanmar": 2008, "Pakistan": 2009,
    "Philippines": 2014, "Singapore": 2013, "South Korea": 2003,
    "Sri Lanka": 2010, "Taiwan": 2004, "Thailand": 2013, "Vietnam": 2010,
    "Mongolia": 2008,
    "Australia": 2007, "New Zealand": 2008, "Papua New Guinea": 2014,
    "Solomon Is.": 2019,
    // Former Soviet space — most stayed in the Russian/EU orbit through the
    // 2000s and shifted to China only in the 2010s as the SCO and EAEU
    // formalised. Russia itself counts here in this binary view: pre-2014
    // its dominant trade partner was the EU (treated as "us" in the binary).
    "Russia": 2014, "Belarus": 2014, "Kazakhstan": 2010,
    "Kyrgyzstan": 2010, "Tajikistan": 2008, "Turkmenistan": 2009,
    "Uzbekistan": 2012
  };
})();

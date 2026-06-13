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
})();

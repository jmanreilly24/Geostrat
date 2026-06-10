/* ============================================================================
   RELIGION — majority/plurality religion per country (editorial, editable)
   Categories: christian, muslim, hindu, buddhist, jewish, folk, unaffiliated
   Religion shifts very slowly, so this is a hand-maintained list, not a feed.
   ========================================================================== */
(function () {
  var christian = [
    "United States","Canada","Mexico","Guatemala","Belize","Honduras",
    "El Salvador","Nicaragua","Costa Rica","Panama","Cuba","Dominican Rep.",
    "Haiti","Jamaica","Trinidad and Tobago","Bahamas","Colombia","Venezuela",
    "Guyana","Suriname","Ecuador","Peru","Brazil","Bolivia","Paraguay","Chile",
    "Argentina","Uruguay",
    "United Kingdom","Ireland","France","Spain","Portugal","Germany",
    "Netherlands","Belgium","Luxembourg","Switzerland","Austria","Italy",
    "Norway","Sweden","Finland","Denmark","Iceland","Poland","Czechia",
    "Slovakia","Hungary","Romania","Bulgaria","Greece","Croatia","Slovenia",
    "Serbia","Montenegro","North Macedonia","Estonia","Latvia","Lithuania",
    "Belarus","Ukraine","Moldova","Russia","Georgia","Armenia","Cyprus","Malta",
    "Ethiopia","Eritrea","Kenya","Tanzania","Uganda","Rwanda","Burundi",
    "Dem. Rep. Congo","Congo","Gabon","Eq. Guinea","Cameroon",
    "Central African Rep.","S. Sudan","Ghana","Togo","Benin","Liberia",
    "Côte d'Ivoire","Angola","Zambia","Malawi","Mozambique","Zimbabwe",
    "Botswana","Namibia","South Africa","Lesotho","eSwatini","Madagascar",
    "Philippines","Papua New Guinea","Fiji","Solomon Is.","Vanuatu",
    "Australia","New Zealand","Timor-Leste"
  ];
  var muslim = [
    "Morocco","W. Sahara","Algeria","Tunisia","Libya","Egypt","Sudan",
    "Mauritania","Mali","Niger","Chad","Senegal","Gambia","Guinea",
    "Guinea-Bissau","Sierra Leone","Burkina Faso","Nigeria","Somalia",
    "Djibouti","Turkey","Syria","Lebanon","Jordan","Iraq","Iran",
    "Saudi Arabia","Yemen","Oman","United Arab Emirates","Qatar","Bahrain",
    "Kuwait","Palestine","Azerbaijan","Kazakhstan","Uzbekistan","Turkmenistan",
    "Tajikistan","Kyrgyzstan","Afghanistan","Pakistan","Bangladesh","Malaysia",
    "Indonesia","Brunei","Albania","Kosovo","Bosnia and Herz.","Maldives"
  ];
  var hindu = ["India","Nepal"];
  var buddhist = ["Sri Lanka","Myanmar","Thailand","Cambodia","Laos","Bhutan","Mongolia"];
  var jewish = ["Israel"];
  var folk = ["Japan","Vietnam","Taiwan"];
  var unaffiliated = ["China","North Korea","South Korea"];

  var out = {};
  function tag(list, v) { list.forEach(function (k) { out[k] = v; }); }
  tag(christian, "christian"); tag(muslim, "muslim"); tag(hindu, "hindu");
  tag(buddhist, "buddhist"); tag(jewish, "jewish"); tag(folk, "folk");
  tag(unaffiliated, "unaffiliated");
  window.RELIGION = out;
})();

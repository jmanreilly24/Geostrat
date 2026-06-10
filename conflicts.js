/* ============================================================================
   ACTIVE CONFLICTS — DRAFT entries pending your approval (edit/delete freely)
   Status text reflects early 2026; the UCDP heatmap remains the live signal.
   type: "interstate" | "intl-civil" (internationalized civil/proxy) | "civil"
   parties: country names exactly as the map uses them.
   ========================================================================== */
window.CONFLICTS = [
  { name: "Russia–Ukraine War", type: "interstate", since: "2022",
    parties: ["Russia","Ukraine"],
    cause: "Russian full-scale invasion following 2014 annexation of Crimea and Donbas war.",
    casualties: "Est. 1M+ military killed/wounded combined; 14k+ UN-verified civilian deaths (true toll higher).",
    source: "UN OHCHR; Western official estimates" },
  { name: "Israel–Gaza War", type: "interstate", since: "2023",
    parties: ["Israel","Palestine"],
    cause: "Hamas-led Oct 7 2023 attack (~1,200 killed); Israeli offensive in Gaza followed.",
    casualties: "60k+ reported killed in Gaza (contested); ~2k Israeli dead. Ceasefire phases since Oct 2025.",
    source: "Gaza MoH; Israeli gov't; UN OCHA" },
  { name: "Sudan Civil War", type: "intl-civil", since: "2023",
    parties: ["Sudan"],
    cause: "Power struggle between Sudanese Armed Forces and Rapid Support Forces; external backers on both sides.",
    casualties: "Est. 150k+ killed; ~12M displaced; famine conditions.",
    source: "US envoy estimates; UN OCHA" },
  { name: "Myanmar Civil War", type: "civil", since: "2021",
    parties: ["Myanmar"],
    cause: "2021 military coup; nationwide armed resistance and ethnic armed organisations.",
    casualties: "Est. 50k+ killed since coup; 3M+ displaced.",
    source: "ACLED; UN OCHA" },
  { name: "Sahel Insurgencies", type: "intl-civil", since: "2012",
    parties: ["Mali","Burkina Faso","Niger"],
    cause: "Jihadist insurgencies (JNIM, IS-Sahel) after 2012 Mali rebellion; juntas with Russian support.",
    casualties: "Est. 40k+ killed since 2012, accelerating since 2020.",
    source: "ACLED; UCDP" },
  { name: "Eastern DRC / M23", type: "intl-civil", since: "2021",
    parties: ["Dem. Rep. Congo","Rwanda"],
    cause: "M23 offensive (UN-documented Rwandan backing); minerals and regional rivalry; Goma fell Jan 2025.",
    casualties: "Thousands killed this phase; 7M+ displaced in DRC overall.",
    source: "UN Group of Experts; UN OCHA" },
  { name: "Yemen Conflict", type: "intl-civil", since: "2014",
    parties: ["Yemen"],
    cause: "Houthi takeover vs internationally recognized gov't; Saudi/UAE intervention; Red Sea attacks since 2023.",
    casualties: "Est. 377k dead incl. indirect (UNDP, end-2021); truce largely holding on main fronts.",
    source: "UNDP; UCDP" },
  { name: "Somalia Insurgency", type: "intl-civil", since: "2007",
    parties: ["Somalia"],
    cause: "Al-Shabaab insurgency against federal gov't, AU and US support.",
    casualties: "Tens of thousands killed since 2007.",
    source: "UCDP; ACLED" }
];

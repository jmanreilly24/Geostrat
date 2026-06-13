/* ============================================================================
   MILITARY BASES — major overseas bases/facilities (editorial seed, editable)
   { owner: country name as the map uses it, name, host, lng, lat }
   Sources for verification: news reporting, IISS Military Balance summaries.
   ========================================================================== */
window.BASES = [
  // United States
  { owner:"United States", name:"Ramstein AB", host:"Germany", lng:7.6, lat:49.44 },
  { owner:"United States", name:"RAF Lakenheath", host:"United Kingdom", lng:0.56, lat:52.41 },
  { owner:"United States", name:"Naval Station Rota", host:"Spain", lng:-6.35, lat:36.62 },
  { owner:"United States", name:"Aviano AB", host:"Italy", lng:12.6, lat:46.03 },
  { owner:"United States", name:"Incirlik AB", host:"Turkey", lng:35.43, lat:37.0 },
  { owner:"United States", name:"Camp Lemonnier", host:"Djibouti", lng:43.15, lat:11.54 },
  { owner:"United States", name:"NSA Bahrain (5th Fleet)", host:"Bahrain", lng:50.6, lat:26.21 },
  { owner:"United States", name:"Al Udeid AB", host:"Qatar", lng:51.32, lat:25.12 },
  { owner:"United States", name:"Diego Garcia", host:"BIOT", lng:72.41, lat:-7.31 },
  { owner:"United States", name:"Kadena AB (Okinawa)", host:"Japan", lng:127.77, lat:26.36 },
  { owner:"United States", name:"Yokosuka (7th Fleet)", host:"Japan", lng:139.66, lat:35.29 },
  { owner:"United States", name:"Camp Humphreys", host:"South Korea", lng:127.03, lat:36.96 },
  { owner:"United States", name:"Andersen AFB (Guam)", host:"Guam (US)", lng:144.92, lat:13.58 },
  { owner:"United States", name:"Pituffik SB (Thule)", host:"Greenland (DK)", lng:-68.7, lat:76.53 },
  { owner:"United States", name:"Guantanamo Bay", host:"Cuba", lng:-75.15, lat:19.9 },
  { owner:"United States", name:"Soto Cano AB", host:"Honduras", lng:-87.62, lat:14.38 },
  { owner:"United States", name:"Darwin (rotational)", host:"Australia", lng:130.84, lat:-12.43 },
  { owner:"United States", name:"Pine Gap (joint AU-US)", host:"Australia", lng:133.737, lat:-23.8 },
  { owner:"United States", name:"NCS Harold E. Holt (joint)", host:"Australia", lng:114.16, lat:-21.82 },
  { owner:"United States", name:"NSA Souda Bay", host:"Greece", lng:24.12, lat:35.49 },
  { owner:"United States", name:"NAS Sigonella", host:"Italy", lng:14.92, lat:37.4 },
  { owner:"United States", name:"NSA Naples (6th Fleet)", host:"Italy", lng:14.29, lat:40.88 },
  { owner:"United States", name:"Spangdahlem AB", host:"Germany", lng:6.69, lat:49.97 },
  { owner:"United States", name:"Camp Bondsteel", host:"Kosovo", lng:21.25, lat:42.37 },
  { owner:"United States", name:"M. Kogalniceanu AB", host:"Romania", lng:28.49, lat:44.36 },
  { owner:"United States", name:"Redzikowo (Aegis Ashore)", host:"Poland", lng:17.1, lat:54.48 },
  { owner:"United States", name:"Keflavik (rotational)", host:"Iceland", lng:-22.61, lat:63.99 },
  { owner:"United States", name:"Lajes Field", host:"Portugal (Azores)", lng:-27.09, lat:38.76 },
  { owner:"United States", name:"Ali Al Salem AB", host:"Kuwait", lng:47.52, lat:29.35 },
  { owner:"United States", name:"Al Dhafra AB", host:"United Arab Emirates", lng:54.55, lat:24.25 },
  { owner:"United States", name:"Erbil AB", host:"Iraq", lng:43.96, lat:36.24 },
  { owner:"United States", name:"Misawa AB", host:"Japan", lng:141.37, lat:40.7 },
  { owner:"United States", name:"Yokota AB", host:"Japan", lng:139.35, lat:35.75 },
  { owner:"United States", name:"MCAS Iwakuni", host:"Japan", lng:132.24, lat:34.14 },
  { owner:"United States", name:"Osan AB", host:"South Korea", lng:127.03, lat:37.09 },
  { owner:"United States", name:"USAG Kwajalein Atoll", host:"Marshall Is.", lng:167.73, lat:8.72 },
  { owner:"United States", name:"NSF Singapore (Sembawang)", host:"Singapore", lng:103.78, lat:1.33 },
  { owner:"United States", name:"Manda Bay", host:"Kenya", lng:40.99, lat:-2.17 },
  { owner:"United States", name:"Shannon Airport (transit)", host:"Ireland", lng:-8.92, lat:52.7 },
  // Russia
  { owner:"Russia", name:"Tartus Naval Facility", host:"Syria", lng:35.87, lat:34.9 },
  { owner:"Russia", name:"Hmeimim AB", host:"Syria", lng:35.95, lat:35.4 },
  { owner:"Russia", name:"Sevastopol (Black Sea Fleet)", host:"Crimea (occ.)", lng:33.52, lat:44.62 },
  { owner:"Russia", name:"Gyumri 102nd Base", host:"Armenia", lng:43.84, lat:40.79 },
  { owner:"Russia", name:"201st Base Dushanbe", host:"Tajikistan", lng:68.78, lat:38.56 },
  { owner:"Russia", name:"Kant AB", host:"Kyrgyzstan", lng:74.85, lat:42.85 },
  { owner:"Russia", name:"Baltiysk (Kaliningrad)", host:"Russia (exclave)", lng:19.91, lat:54.65 },
  // China
  { owner:"China", name:"PLA Support Base Djibouti", host:"Djibouti", lng:43.07, lat:11.59 },
  { owner:"China", name:"Ream Naval Base (access)", host:"Cambodia", lng:103.6, lat:10.5 },
  { owner:"China", name:"Fiery Cross Reef", host:"South China Sea (disp.)", lng:112.89, lat:9.55 },
  { owner:"China", name:"Mischief Reef", host:"South China Sea (disp.)", lng:115.53, lat:9.9 },
  { owner:"Russia", name:"Port Sudan (agreement, pending)", host:"Sudan", lng:37.22, lat:19.62 },
  // United Kingdom
  { owner:"United Kingdom", name:"RAF Akrotiri", host:"Cyprus", lng:32.99, lat:34.59 },
  { owner:"United Kingdom", name:"Mount Pleasant", host:"Falkland Is.", lng:-58.45, lat:-51.82 },
  { owner:"United Kingdom", name:"Duqm (logistics)", host:"Oman", lng:57.7, lat:19.65 },
  { owner:"United Kingdom", name:"British Garrison Brunei", host:"Brunei", lng:114.93, lat:4.58 },
  { owner:"United Kingdom", name:"BATUK Nanyuki", host:"Kenya", lng:36.97, lat:-0.15 },
  // France
  { owner:"France", name:"Base aérienne Djibouti", host:"Djibouti", lng:43.16, lat:11.55 },
  { owner:"France", name:"Camp de la Paix", host:"United Arab Emirates", lng:54.45, lat:24.5 },
  { owner:"United Arab Emirates", name:"Assab", host:"Eritrea", lng:42.73, lat:13.07 },
  // Turkey
  { owner:"Turkey", name:"Tariq bin Ziyad Base", host:"Qatar", lng:51.45, lat:25.25 },
  { owner:"Turkey", name:"TURKSOM", host:"Somalia", lng:45.3, lat:2.02 },
  // India
  { owner:"India", name:"INS Jatayu (Minicoy)", host:"India (Lakshadweep)", lng:73.05, lat:8.28 },
  // Japan / others examples
  { owner:"India", name:"Agalega facility", host:"Mauritius", lng:56.62, lat:-10.37 },
  { owner:"China", name:"Tajikistan outpost (reported)", host:"Tajikistan", lng:73.95, lat:38.17 },
  { owner:"Japan", name:"JSDF Djibouti", host:"Djibouti", lng:43.14, lat:11.55 }
];

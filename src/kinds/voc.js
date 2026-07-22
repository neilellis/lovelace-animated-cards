// upstream: README #62 - Air quality (VOC) · env_with_graph #5 - Air quality (VOC)
// Shares the five-step environmental ramp (ENV_SHADOW / envCard, kinds/co2.js).
//
// Bands are the common consumer-VOC-index scale (Sensirion SGP/BME680-style index, roughly
// 0–500): <100 clean · <200 good · <300 fair · <400 poor · 400+ bad. Kept as constants —
// unlike air quality there is no competing regional standard to switch between.

const VOC_BANDS = [
  [100, "40, 200, 120", "env-m1", 4.4, "200, 255, 230"],
  [200, "140, 220, 80", "env-m2", 3.6, "225, 255, 200"],
  [300, "255, 210, 40", "env-m3", 3.0, "255, 245, 190"],
  [400, "255, 140, 40", "env-m4", 2.4, "255, 220, 170"],
  [null, "255, 50, 50", "env-m5", 2.0, "255, 170, 150"],
];

registerKind("voc", {
  label: "Animated VOC",
  desc: "Volatile-organic-compound index tile — clean green breath through to a red shimmer",
  domains: ["sensor"],
  deviceClass: ["volatile_organic_compounds", "volatile_organic_compounds_parts", "aqi"],
  schema: [F.icon, ...graphRows()],
  help: { icon: "Default mdi:air-filter", ...graphHelp() },
  docs: "Expects a VOC **index** sensor on the usual 0–500 consumer scale (Sensirion SGP4x, " +
    "BME680 and friends). A raw ppb sensor will sit permanently in the top band. " + graphDocs(),
  make: (c) => {
    const card = envCard(c, { rows: VOC_BANDS, icon: "mdi:air-filter", name: "VOC" });
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, thresholds: bandThresholds(VOC_BANDS, 0) });
  },
});

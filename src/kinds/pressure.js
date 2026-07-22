// upstream: README #63 - Pressure mbar · env_with_graph #10 - Pressure (mbar)
// Shares the five-step environmental ramp (ENV_SHADOW / envCard, kinds/co2.js).
//
// Unlike the other ramps this one is NOT a severity scale — it's a barometer: low (storm) blue
// through settled green to high (fine, still) amber/red. So a middle band is the calm one and
// both ends animate faster, which is exactly what upstream's durations already do.

const PRES_BANDS = [
  [990, "0, 140, 255", "env-m1", 4.4, "220, 240, 255"],    // deep low — unsettled
  [1005, "60, 190, 200", "env-m2", 3.6, "190, 245, 250"],  // low
  [1020, "120, 220, 120", "env-m3", 3.0, "210, 255, 210"], // normal
  [1035, "255, 200, 60", "env-m4", 2.6, "255, 240, 190"],  // high
  [null, "255, 80, 60", "env-m5", 2.1, "255, 190, 175"],   // very high
];

registerKind("pressure", {
  label: "Animated Barometer",
  desc: "Barometric-pressure tile — storm blue through settled green to a high-pressure shimmer",
  domains: ["sensor"],
  deviceClass: ["pressure", "atmospheric_pressure"],
  schema: [F.icon, ...graphRows()],
  help: { icon: "Default mdi:gauge", ...graphHelp() },
  docs: "Bands are in **mbar / hPa** (990 / 1005 / 1020 / 1035). A sensor reporting inHg or " +
    "kPa will sit in the bottom band — convert it with a template sensor first. " + graphDocs(),
  make: (c) => {
    const card = envCard(c, { rows: PRES_BANDS, icon: "mdi:gauge", name: "Pressure" });
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, thresholds: bandThresholds(PRES_BANDS, 0) });
  },
});

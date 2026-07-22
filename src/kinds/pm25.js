// upstream: env_with_graph #6 - Air quality (PM2.5)
//
// The particulate-concentration sibling of the `air-quality` kind: same six-band drawing
// (AQ_SHADOW / bandRamp, kinds/air-quality.js) but bound to a µg/m³ sensor rather than an
// index, and — because PM2.5 limits are exactly the thing that differs between standards —
// with every cut-off exposed as an option. Defaults are the European AQI 1-hour PM2.5 bands
// upstream ships (5 / 15 / 50 / 90 / 140). WHO 2021 24-h AQG users typically want
// 5 / 15 / 25 / 35 / 50; US EPA 24-h NAAQS-ish, 9 / 35 / 55 / 125 / 225.

const PM25_DEFAULTS = [5, 15, 50, 90, 140];
const PM25_COLORS = [
  ["40, 190, 100", "aq-breathe", 3.4],    // good
  ["140, 220, 140", "aq-wave", 3.2],      // fair
  ["255, 215, 70", "aq-wave", 3.0],       // moderate
  ["255, 170, 60", "aq-pulse", 2.8],      // poor
  ["230, 60, 60", "aq-throb", 2.4],       // very poor
  ["120, 0, 70", "aq-smog", 2.0],         // extremely poor
];

const pm25Rows = (c) => PM25_COLORS.map(([rgb, motion, dur], i) => [
  i < 5 ? (Number(c[`b${i + 1}`]) || PM25_DEFAULTS[i]) : null, rgb, motion, dur,
]);

registerKind("pm25", {
  label: "Animated PM2.5",
  desc: "Particulate tile (µg/m³) banded good→extremely poor, with tunable per-standard cut-offs",
  domains: ["sensor", "air_quality"],
  deviceClass: ["pm25"],
  schema: [
    F.icon,
    ...[1, 2, 3, 4, 5].map((n) => ({
      name: `b${n}`,
      selector: { number: { min: 0, max: 1000, step: 0.5, mode: "box", unit_of_measurement: "µg/m³" } },
    })),
    ...graphRows(),
  ],
  help: {
    icon: "Default mdi:blur",
    b1: "Top of the GOOD band (default 5)",
    b2: "Top of the FAIR band (default 15)",
    b3: "Top of the MODERATE band (default 50)",
    b4: "Top of the POOR band (default 90)",
    b5: "Top of the VERY POOR band (default 140) — above this is EXTREMELY POOR",
    ...graphHelp(),
  },
  docs: "Bands default to the **European AQI** 1-hour PM2.5 scale. Override them for WHO 2021 " +
    "(5 / 15 / 25 / 35 / 50) or a US 24-hour scale (9 / 35 / 55 / 125 / 225). " + graphDocs(),
  make: (c) => {
    const rows = pm25Rows(c);
    const card = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "PM2.5",
      icon: c.icon || "mdi:blur",
      primary_info: "state", secondary_info: "name",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": AQ_SHADOW,
        ".": `${clip}
      ha-card {${bandRamp("aq", rows)}
        --aq-rgb: {{ rgb }};
        --aq-anim: {{ a }};
        --aq-glow: {{ g }};
        --aq-halo: {{ h }};
        --ig-op: {{ op }};
        --card-primary-font-size: 1.5rem;
        --card-primary-line-height: 1.3;
      }`,
      } },
      grid_options: c.graph === false ? { columns: 6, rows: 2 } : { columns: 12, rows: 2 },
    };
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, thresholds: bandThresholds(rows) });
  },
});

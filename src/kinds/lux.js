// upstream: README #52 - Living room light (lux) · env_with_graph #8 - Illuminance (lux)
// Shares the five-step environmental ramp (ENV_SHADOW / envCard, kinds/co2.js) — upstream's
// lux keyframes are byte-identical to the temperature/CO₂/pressure ones under another name.
//
// Bands read as a light meter: deep blue night, purple dusk, warm indoor light, bright, then a
// near-white sun shimmer. Note upstream's blur(0.6px) top band is a 1 px effect — invisible on
// a TV across the room, kept only because it's the sun band and the colour carries the message.

const LUX_BANDS = [
  [10, "40, 80, 255", "env-m1", 4.4, "220, 240, 255"],    // dark
  [50, "140, 80, 220", "env-m2", 3.6, "220, 200, 255"],   // dim / dusk
  [200, "255, 210, 80", "env-m3", 3.0, "255, 245, 200"],  // comfortable indoor
  [500, "255, 160, 60", "env-m4", 2.6, "255, 225, 180"],  // bright
  [null, "255, 250, 230", "env-m5", 2.0, "255, 255, 245"], // direct sun
];

registerKind("lux", {
  label: "Animated Illuminance",
  desc: "Light-level tile ramping night-blue → dusk purple → warm → a near-white sun shimmer",
  domains: ["sensor"],
  deviceClass: ["illuminance"],
  entitySelector: { entity: { domain: "sensor", device_class: "illuminance" } },
  schema: [F.icon, ...graphRows()],
  help: { icon: "Default mdi:brightness-5", ...graphHelp() },
  docs: graphDocs(),
  make: (c) => {
    const card = envCard(c, { rows: LUX_BANDS, icon: "mdi:brightness-5", name: "Light level" });
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, thresholds: bandThresholds(LUX_BANDS, 0) });
  },
});

// upstream: README #61 - CO2 PPM · env_with_graph #9 - CO2

// ── SHARED: the five-step environmental ramp ─────────────────────────────────────────────
// README #52 (lux), #61 (CO2), #62 (VOC), #63 (pressure) and env_with_graph #1/#4/#8/#9/#10
// ship BYTE-IDENTICAL keyframes under per-card names (`lux-dark-breathe`, `co2-fresh-breathe`,
// `pres-low-breathe`, …) — pure copy-paste residue. One shared ladder replaces all of it:
//   env-m1 slow breathe · env-m2 sideways wave · env-m3 breathe · env-m4 pulse · env-m5 shimmer
// with glow/halo layers 1–5 escalating in radius and alpha. Only the band table differs
// per kind, so each kind file is a data table plus a registerKind call.
//
// Simplification vs upstream: upstream hand-picks the pale second wash inside each halo
// keyframe; here it is `var(--env-tint)`, set per band from the host block (defaults to the
// band colour). Same layered look, one fifth of the CSS.
const ENV_SHADOW = `
      .shape {
        --icon-size: 60px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        /* neutral pill — the theme's blue sensor disc fights every band colour */
        background-color: rgba(77, 77, 77, 0.15) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.06);
        --icon-color: rgba(var(--env-rgb, 150, 160, 170), 1) !important;
        position: relative;
        opacity: var(--ig-op, 1);
        transform-origin: 50% 60%;
        animation: var(--env-anim, env-m3 3s ease-in-out infinite);
      }
      .shape::before, .shape::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        pointer-events: none;
      }
      .shape::before { inset: -8px;  animation: var(--env-glow, none); }
      .shape::after  { inset: -22px; animation: var(--env-halo, none); mix-blend-mode: screen; }

      @keyframes env-m1 { 0%, 100% { transform: scale(0.96); } 50% { transform: scale(1.03); } }
      @keyframes env-m2 {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-1px); }
        50%      { transform: translateX(1px) translateY(-1px); }
        75%      { transform: translateX(-1px); }
      }
      @keyframes env-m3 { 0%, 100% { transform: scale(0.98); } 50% { transform: scale(1.05); } }
      @keyframes env-m4 { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
      @keyframes env-m5 {
        0%, 100% { transform: scale(1); filter: blur(0); }
        50%      { transform: scale(1.08); filter: blur(0.6px); }
      }

      @keyframes env-glow1 {
        0%, 100% { box-shadow: 0 0 20px 0 rgba(var(--env-rgb), 0.6), 0 0 34px 6px rgba(var(--env-rgb), 0.55); }
        50%      { box-shadow: 0 0 30px 4px rgba(var(--env-rgb), 0.95), 0 0 50px 10px rgba(var(--env-rgb), 0.85); }
      }
      @keyframes env-glow2 {
        0%, 100% { box-shadow: 0 0 22px 0 rgba(var(--env-rgb), 0.6), 0 0 34px 4px rgba(var(--env-rgb), 0.7); }
        50%      { box-shadow: 0 0 28px 2px rgba(var(--env-rgb), 0.95), 0 0 48px 12px rgba(var(--env-rgb), 0.85); }
      }
      @keyframes env-glow3 {
        50% { box-shadow: 0 0 26px 4px rgba(var(--env-rgb), 0.9), 0 0 42px 10px rgba(var(--env-rgb), 0.85); }
      }
      @keyframes env-glow4 {
        50% { box-shadow: 0 0 30px 4px rgba(var(--env-rgb), 0.95), 0 0 54px 14px rgba(var(--env-rgb), 0.9); }
      }
      @keyframes env-glow5 {
        50% { box-shadow: 0 0 34px 6px rgba(var(--env-rgb), 1), 0 0 62px 14px rgba(var(--env-rgb), 0.95); }
      }

      /* band 1 washes UPWARD (cold/dark/calm reads as light off the top), the rest downward */
      @keyframes env-halo1 {
        0%, 100% { box-shadow: 0 0 80px 20px rgba(var(--env-rgb), 0.35), 0 -20px 80px -14px rgba(var(--env-tint), 0.55); }
        50%      { box-shadow: 0 0 130px 36px rgba(var(--env-rgb), 0.5), 0 -34px 100px -8px rgba(var(--env-tint), 0.8); }
      }
      @keyframes env-halo2 {
        0%, 100% { box-shadow: 0 0 90px 26px rgba(var(--env-rgb), 0.35), 0 18px 80px -12px rgba(var(--env-tint), 0.35); }
        50%      { box-shadow: 0 0 140px 42px rgba(var(--env-rgb), 0.45), 0 30px 110px -10px rgba(var(--env-tint), 0.5); }
      }
      @keyframes env-halo3 {
        50% { box-shadow: 0 0 120px 40px rgba(var(--env-rgb), 0.45), 0 26px 80px -10px rgba(var(--env-tint), 0.5); }
      }
      @keyframes env-halo4 {
        50% { box-shadow: 0 0 140px 48px rgba(var(--env-rgb), 0.55), 0 26px 100px -10px rgba(var(--env-tint), 0.5); }
      }
      @keyframes env-halo5 {
        50% { box-shadow: 0 0 160px 60px rgba(var(--env-rgb), 0.6), 0 34px 120px -12px rgba(var(--env-tint), 0.6); }
      }`;

// Everything a five-band environmental readout needs on top of the shared shadow block.
// `rows` = [upper bound (last row ignored), rgb, motion, duration, halo tint].
function envCard(c, { rows, icon, name, cmp = "<", fontSize = "1.4rem" }) {
  return {
    type: "custom:mushroom-entity-card",
    entity: c.entity,
    name: c.name || name,
    icon: c.icon || icon,
    primary_info: "state", secondary_info: "name",
    tap_action: { action: "more-info" },
    card_mod: { style: {
      "mushroom-shape-icon$": ENV_SHADOW,
      ".": `${clip}
      ha-card {${bandRamp("env", rows, cmp)}
        --env-rgb: {{ rgb }};
        --env-tint: {{ tint }};
        --env-anim: {{ a }};
        --env-glow: {{ g }};
        --env-halo: {{ h }};
        --ig-op: {{ op }};
        --card-primary-font-size: ${fontSize};
        --card-primary-line-height: 1.3;
      }`,
    } },
    grid_options: c.graph === false ? { columns: 6, rows: 2 } : { columns: 12, rows: 2 },
  };
}

// ppm bands: <600 fresh · <800 good · <1000 stuffy · <1400 high · 1400+ open a window.
// ASHRAE/health-guideline numbers, not a per-house preference, so they stay constants.
const CO2_BANDS = [
  [600, "40, 200, 120", "env-m1", 4.4, "200, 255, 230"],
  [800, "120, 220, 120", "env-m2", 3.6, "210, 255, 210"],
  [1000, "255, 210, 40", "env-m3", 3.0, "255, 245, 190"],
  [1400, "255, 140, 40", "env-m4", 2.4, "255, 220, 170"],
  [null, "255, 50, 50", "env-m5", 2.0, "255, 170, 150"],
];

registerKind("co2", {
  label: "Animated CO₂",
  desc: "ppm tile — fresh green breath through to a red shimmer once the room needs airing",
  domains: ["sensor"],
  deviceClass: ["carbon_dioxide"],
  entitySelector: { entity: { domain: "sensor", device_class: "carbon_dioxide" } },
  schema: [F.icon, ...graphRows()],
  help: { icon: "Default mdi:molecule-co2", ...graphHelp() },
  docs: graphDocs(),
  make: (c) => {
    const card = envCard(c, { rows: CO2_BANDS, icon: "mdi:molecule-co2", name: "CO₂" });
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, thresholds: bandThresholds(CO2_BANDS, 0) });
  },
});

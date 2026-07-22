// upstream: README #49 - Air quality Home · #50 - Air quality Amsterdam · #51 - Air quality (US)
//           env_with_graph #3 - Airquility (US) · #7 - Air quality (EU)
//
// One kind, two published standards (`variant`):
//   us — US EPA AQI index: 0-50 good … 301+ hazardous
//   eu — European AQI (PM2.5 µg/m³, 1 h): 0-5 good … >140 extremely poor
// README #49/#50 and env #7 are the SAME eu card bound to different entities; README #51 and
// env #3 are the same us card. The graph is the only structural difference between the two
// upstream trees, so it's a switch here (see withMiniGraph in kinds/temp-graph.js).

// STATIC shadow block: six motions + a six-step glow/halo intensity ladder, all present
// unconditionally. Jinja only picks which names land in --aq-anim/--aq-glow/--aq-halo, so the
// block never re-renders and a sensor update can't restart the animation mid-cycle.
const AQ_SHADOW = `
      .shape {
        --icon-size: 60px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        background-color: rgba(77, 77, 77, 0.12) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.06);
        --icon-color: rgba(var(--aq-rgb, 150, 160, 170), 1) !important;
        position: relative;
        opacity: var(--ig-op, 1);
        transform-origin: 50% 60%;
        animation: var(--aq-anim, aq-breathe 3.4s ease-in-out infinite);
      }
      .shape::before, .shape::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        pointer-events: none;
      }
      .shape::before { inset: -8px;  animation: var(--aq-glow, none); }
      .shape::after  { inset: -22px; animation: var(--aq-halo, none); mix-blend-mode: screen; }

      /* ── motions: calm breath → sideways drift → pulse → throb → blurred smog ── */
      @keyframes aq-breathe   { 0%, 100% { transform: scale(0.98); } 50% { transform: scale(1.04); } }
      @keyframes aq-wave {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-1px); }
        50%      { transform: translateX(1px) translateY(-1px); }
        75%      { transform: translateX(-1px); }
      }
      @keyframes aq-pulse     { 0%, 100% { transform: scale(0.99); } 50% { transform: scale(1.06); } }
      @keyframes aq-throb     { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.07); } }
      @keyframes aq-smog {
        0%, 100% { transform: scale(1); filter: blur(0); }
        40%      { transform: scale(1.08) translateY(-1px); filter: blur(0.4px); }
      }
      @keyframes aq-smog-hard {
        0%, 100% { transform: scale(1); filter: blur(0); }
        35%      { transform: scale(1.1) translateY(-1px); filter: blur(0.6px); }
      }

      /* ── glow ladder: same shape, escalating radius + alpha with severity ── */
      @keyframes aq-glow1 {
        0%, 100% { box-shadow: 0 0 18px 0 rgba(var(--aq-rgb), 0.55), 0 0 30px 4px rgba(var(--aq-rgb), 0.6); }
        50%      { box-shadow: 0 0 24px 4px rgba(var(--aq-rgb), 0.9), 0 0 40px 10px rgba(var(--aq-rgb), 0.85); }
      }
      @keyframes aq-glow2 {
        0%, 100% { box-shadow: 0 0 20px 0 rgba(var(--aq-rgb), 0.6), 0 0 32px 4px rgba(var(--aq-rgb), 0.7); }
        50%      { box-shadow: 0 0 26px 3px rgba(var(--aq-rgb), 0.95), 0 0 44px 10px rgba(var(--aq-rgb), 0.85); }
      }
      @keyframes aq-glow3 {
        0%, 100% { box-shadow: 0 0 22px 0 rgba(var(--aq-rgb), 0.65), 0 0 34px 4px rgba(var(--aq-rgb), 0.75); }
        50%      { box-shadow: 0 0 30px 4px rgba(var(--aq-rgb), 1), 0 0 50px 12px rgba(var(--aq-rgb), 0.9); }
      }
      @keyframes aq-glow4 {
        0%, 100% { box-shadow: 0 0 24px 0 rgba(var(--aq-rgb), 0.75), 0 0 38px 6px rgba(var(--aq-rgb), 0.8); }
        50%      { box-shadow: 0 0 34px 4px rgba(var(--aq-rgb), 1), 0 0 60px 14px rgba(var(--aq-rgb), 0.95); }
      }
      @keyframes aq-glow5 {
        0%, 100% { box-shadow: 0 0 24px 0 rgba(var(--aq-rgb), 0.8), 0 0 40px 6px rgba(var(--aq-rgb), 0.85); }
        50%      { box-shadow: 0 0 34px 4px rgba(var(--aq-rgb), 1), 0 0 64px 14px rgba(var(--aq-rgb), 0.95); }
      }
      @keyframes aq-glow6 {
        0%, 100% { box-shadow: 0 0 26px 0 rgba(var(--aq-rgb), 0.85), 0 0 44px 8px rgba(var(--aq-rgb), 0.9); }
        50%      { box-shadow: 0 0 38px 6px rgba(var(--aq-rgb), 1), 0 0 70px 18px rgba(var(--aq-rgb), 0.98); }
      }

      /* ── halo ladder: the wide screen-blended wash; second shadow is a per-band tint ── */
      @keyframes aq-halo1 {
        0%, 100% { box-shadow: 0 0 80px 24px rgba(var(--aq-rgb), 0.35), 0 18px 70px -12px rgba(180, 255, 210, 0.3); }
        50%      { box-shadow: 0 0 120px 40px rgba(var(--aq-rgb), 0.45), 0 26px 90px -10px rgba(200, 255, 220, 0.45); }
      }
      @keyframes aq-halo2 {
        0%, 100% { box-shadow: 0 0 90px 28px rgba(var(--aq-rgb), 0.4), 0 20px 80px -10px rgba(255, 240, 170, 0.3); }
        50%      { box-shadow: 0 0 135px 44px rgba(var(--aq-rgb), 0.5), 0 30px 105px -8px rgba(255, 250, 190, 0.45); }
      }
      @keyframes aq-halo3 {
        0%, 100% { box-shadow: 0 0 100px 34px rgba(var(--aq-rgb), 0.5), 0 24px 90px -10px rgba(255, 210, 150, 0.45); }
        50%      { box-shadow: 0 0 145px 50px rgba(var(--aq-rgb), 0.6), 0 32px 115px -8px rgba(255, 220, 170, 0.55); }
      }
      @keyframes aq-halo4 {
        0%, 100% { box-shadow: 0 0 120px 40px rgba(var(--aq-rgb), 0.55), 0 30px 110px -10px rgba(150, 60, 60, 0.55); }
        50%      { box-shadow: 0 0 170px 64px rgba(var(--aq-rgb), 0.7), 0 40px 140px -8px rgba(180, 80, 80, 0.7); }
      }
      @keyframes aq-halo5 {
        0%, 100% { box-shadow: 0 0 140px 46px rgba(var(--aq-rgb), 0.6), 0 32px 120px -10px rgba(90, 40, 110, 0.6); }
        50%      { box-shadow: 0 0 190px 72px rgba(var(--aq-rgb), 0.75), 0 42px 150px -8px rgba(120, 60, 140, 0.75); }
      }
      @keyframes aq-halo6 {
        0%, 100% { box-shadow: 0 0 180px 60px rgba(var(--aq-rgb), 0.7), 0 40px 150px -10px rgba(60, 0, 30, 0.7); }
        50%      { box-shadow: 0 0 230px 90px rgba(var(--aq-rgb), 0.85), 0 52px 180px -8px rgba(90, 0, 45, 0.85); }
      }`;

// [upper bound (null = catch-all), rgb, motion keyframe, duration]. Ladder step = row index + 1.
const AQ_BANDS = {
  us: [[50, "40, 190, 100", "aq-breathe", 3.4], [100, "255, 215, 70", "aq-wave", 3.0],
       [150, "255, 170, 60", "aq-pulse", 2.8], [200, "230, 60, 60", "aq-throb", 2.4],
       [300, "170, 60, 180", "aq-smog", 2.2], [null, "120, 0, 70", "aq-smog-hard", 2.0]],
  eu: [[5, "40, 190, 100", "aq-breathe", 3.4], [15, "140, 220, 140", "aq-wave", 3.2],
       [50, "255, 215, 70", "aq-wave", 3.0], [90, "255, 170, 60", "aq-pulse", 2.8],
       [140, "230, 60, 60", "aq-throb", 2.4], [null, "120, 0, 70", "aq-smog", 2.0]],
};

// Shared by air-quality / lux / co2 / voc / pm25 / pressure: turn a band table into the host
// Jinja. `float(-999)` + a leading dead band so `unavailable` reads as a frozen grey tile
// instead of cosplaying as a perfect 0 AQI.
// rows: [bound, rgb, motion, duration, tint?]; `cmp` is '<=' (index scales) or '<'
// (measurements). `tint` is the pale second wash in the halo layer — defaults to the band
// colour, which reads as a plain monochrome halo.
function bandRamp(prefix, rows, cmp = "<=") {
  const set = ([, rgb, motion, dur, tint], i) =>
    `{% set rgb = '${rgb}' %}{% set tint = '${tint || rgb}' %}{% set a = '${motion} ${dur}s ease-in-out infinite' %}` +
    `{% set g = '${prefix}-glow${i + 1} ${(dur * 0.9).toFixed(2)}s ease-in-out infinite' %}` +
    `{% set h = '${prefix}-halo${i + 1} ${(dur * 1.1).toFixed(2)}s ease-in-out infinite' %}{% set op = '1' %}`;
  return `
        {% set v = states(config.entity) | float(-999) %}
        {% if v < -900 %}{% set rgb = '120, 120, 120' %}{% set tint = '120, 120, 120' %}{% set a = 'none' %}{% set g = 'none' %}{% set h = 'none' %}{% set op = '0.4' %}
        ` +
    rows.slice(0, -1).map((r, i) => `{% elif v ${cmp} ${r[0]} %}${set(r, i)}`).join("\n        ") +
    `\n        {% else %}${set(rows[rows.length - 1], rows.length - 1)}{% endif %}`;
}

// mini-graph colour stops from the same table (mini-graph colours from a threshold upward, so
// band i's colour is keyed just past band i-1's cut-off).
function bandThresholds(rows, step = 1) {
  const rgb = (s) => `rgb(${s.replace(/ /g, "")})`;
  return [{ value: 0, color: rgb(rows[0][1]) },
    ...rows.slice(0, -1).map((r, i) => ({ value: r[0] + step, color: rgb(rows[i + 1][1]) }))];
}

registerKind("air-quality", {
  label: "Animated Air Quality",
  desc: "AQI tile banded good→hazardous, glow + halo escalating with severity; optional 24 h sparkline",
  domains: ["sensor", "air_quality"],
  deviceClass: ["aqi"],
  schema: [F.variant(["us", "eu"]), F.icon, ...graphRows()],
  help: {
    variant: "us = US EPA AQI (50/100/150/200/300); eu = European AQI on PM2.5 µg/m³ (5/15/50/90/140)",
    icon: "Default mdi:air-filter",
    ...graphHelp(),
  },
  docs: graphDocs(),
  make: (c) => {
    const rows = AQ_BANDS[c.variant === "eu" ? "eu" : "us"];
    const card = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Air quality",
      icon: c.icon || "mdi:air-filter",
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

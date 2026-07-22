// upstream: env_with_graph #1 - Temperature (°C) + #4 - Temperature (F)
// (README #46/#47 are the same 5-band design without the graph — covered by the base `temp` kind.)
//
// A loud, banded sibling of the base `temp` kind: the shape breathes/waves/shimmers in a
// different keyframe per band, wrapped in a glow ring + a screen-blended halo, with a 24 h
// mini-graph sparkline bled into the bottom-right corner. Where `temp` is the calm floorplan
// ramp (comfort reads near-white), this one is upstream's saturated blue→red scale.

// ── SHARED: mini-graph sparkline wrapper ─────────────────────────────────────────────────
// Used by every graph-capable sensor kind in this batch (temp-graph, humidity-graph,
// air-quality, lux, co2, voc, pm25, pressure). Declared as a hoisted `function` so it does
// not matter where build.mjs sorts this file relative to its callers.
//
// Structure is upstream's: an outer vertical-stack-in-card holds the animated Mushroom card,
// then a second (nested) vertical-stack-in-card that is absolutely positioned over the
// bottom-right corner and holds a chrome-less mini-graph-card, radially masked so the line
// fades into the card instead of ending at a hard edge.
function withMiniGraph(card, entity, opts = {}) {
  const graph = prune({
    type: "custom:mini-graph-card",
    entities: [entity],
    hours_to_show: opts.hours || 24,
    line_width: 5,
    line_color: opts.lineColor,
    color_thresholds: opts.thresholds,
    show: { name: false, icon: false, state: false, labels: false, legend: false },
    card_mod: { style: `
      ha-card {
        background: none; box-shadow: none; border: none;
        opacity: ${opts.opacity || "50%"};
        width: ${opts.width || "400px"};
        mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%);
      }` },
  });
  return {
    type: "custom:vertical-stack-in-card",
    cards: [
      card,
      {
        type: "custom:vertical-stack-in-card",
        cards: [graph],
        card_mod: { style: { ".": `
          ha-card {
            background: none; box-shadow: none; border: none;
            margin: 8px 12px;
            position: absolute; bottom: -10px; right: -10px;
          }
          ha-card::before, ha-card::after { display: none !important; }` } },
      },
    ],
    grid_options: card.grid_options,
  };
}

// Editor rows / helper text / README note shared by the graph-capable kinds (see withMiniGraph
// above). Declared as hoisted `function`s, not consts: they are read at REGISTRATION time by
// kinds that build.mjs may concatenate before this file, and a const would still be in its
// temporal dead zone there.
function graphRows() {
  return [
    { name: "graph", selector: { boolean: {} } },
    { name: "graph_hours", selector: { number: { min: 1, max: 168, step: 1, mode: "box", unit_of_measurement: "h" } } },
  ];
}
function graphHelp() {
  return {
    graph: "Bleed a 24 h mini-graph sparkline into the corner (needs mini-graph-card + vertical-stack-in-card)",
    graph_hours: "History window for the sparkline (default 24)",
  };
}
function graphDocs() {
  return "The sparkline needs two more HACS frontend cards: **mini-graph-card** and " +
    "**vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.";
}

// STATIC shadow block. All five band keyframe sets live here unconditionally — Jinja only picks
// which name goes into --tg-anim/--tg-glow/--tg-halo, so the block never re-renders and the
// animation never restarts on a sensor update.
const TG_SHADOW = `
      .shape {
        --icon-size: 60px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        /* kill the theme's blue sensor disc — it fights the band tint */
        background-color: rgba(77, 77, 77, 0.15) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.06);
        --icon-color: rgba(var(--tg-rgb, 150, 160, 170), 1) !important;
        position: relative;
        opacity: var(--ig-op, 1);
        transform-origin: 50% 60%;
        animation: var(--tg-anim, tg-comfy-breathe 3s ease-in-out infinite);
      }
      .shape::before, .shape::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        pointer-events: none;
      }
      .shape::before { inset: -8px;  animation: var(--tg-glow, none); }
      /* screen-blend the outer halo so it adds light instead of dimming the card behind it */
      .shape::after  { inset: -22px; animation: var(--tg-halo, none); mix-blend-mode: screen; }

      @keyframes tg-cold-breathe {
        0%   { transform: scale(0.96); }
        50%  { transform: scale(1.03); }
        100% { transform: scale(0.96); }
      }
      @keyframes tg-cold-glow {
        0%, 100% { box-shadow: 0 0 20px 0 rgba(var(--tg-rgb), 0.6), 0 0 34px 6px rgba(var(--tg-rgb), 0.55); }
        50%      { box-shadow: 0 0 30px 4px rgba(var(--tg-rgb), 0.95), 0 0 50px 10px rgba(var(--tg-rgb), 0.85); }
      }
      @keyframes tg-cold-halo {
        0%, 100% { box-shadow: 0 0 80px 20px rgba(var(--tg-rgb), 0.35), 0 -20px 80px -14px rgba(220, 240, 255, 0.55); }
        50%      { box-shadow: 0 0 130px 36px rgba(var(--tg-rgb), 0.5), 0 -34px 100px -8px rgba(240, 250, 255, 0.8); }
      }

      @keyframes tg-cool-wave {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-1px); }
        50%      { transform: translateX(1px) translateY(-1px); }
        75%      { transform: translateX(-1px); }
      }
      @keyframes tg-cool-glow {
        0%, 100% { box-shadow: 0 0 22px 0 rgba(var(--tg-rgb), 0.6), 0 0 34px 4px rgba(var(--tg-rgb), 0.7); }
        50%      { box-shadow: 0 0 28px 2px rgba(var(--tg-rgb), 0.95), 0 0 48px 12px rgba(var(--tg-rgb), 0.85); }
      }
      @keyframes tg-cool-halo {
        0%, 100% { box-shadow: 0 0 90px 26px rgba(var(--tg-rgb), 0.35), 0 18px 80px -12px rgba(0, 220, 255, 0.35); }
        50%      { box-shadow: 0 0 140px 42px rgba(var(--tg-rgb), 0.45), 0 30px 110px -10px rgba(0, 255, 255, 0.5); }
      }

      @keyframes tg-comfy-breathe {
        0%, 100% { transform: scale(0.98); }
        50%      { transform: scale(1.05); }
      }
      @keyframes tg-comfy-glow {
        50% { box-shadow: 0 0 26px 4px rgba(var(--tg-rgb), 0.9), 0 0 42px 10px rgba(var(--tg-rgb), 0.85); }
      }
      @keyframes tg-comfy-halo {
        50% { box-shadow: 0 0 120px 40px rgba(var(--tg-rgb), 0.45), 0 26px 80px -10px rgba(180, 255, 200, 0.5); }
      }

      @keyframes tg-warm-pulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.07); }
      }
      @keyframes tg-warm-glow {
        50% { box-shadow: 0 0 30px 4px rgba(var(--tg-rgb), 0.95), 0 0 54px 14px rgba(var(--tg-rgb), 0.9); }
      }
      @keyframes tg-warm-halo {
        50% { box-shadow: 0 0 140px 48px rgba(var(--tg-rgb), 0.55), 0 26px 100px -10px rgba(255, 210, 150, 0.5); }
      }

      @keyframes tg-hot-shimmer {
        0%, 100% { transform: scale(1); filter: blur(0); }
        50%      { transform: scale(1.08); filter: blur(0.6px); }
      }
      @keyframes tg-hot-glow {
        50% { box-shadow: 0 0 34px 6px rgba(var(--tg-rgb), 1), 0 0 62px 14px rgba(var(--tg-rgb), 0.95); }
      }
      @keyframes tg-hot-halo {
        50% { box-shadow: 0 0 160px 60px rgba(var(--tg-rgb), 0.6), 0 34px 120px -12px rgba(255, 150, 100, 0.6); }
      }`;

// One band tuple per row: [threshold, rgb, keyframe stem, duration]. Upstream ships two sets
// that differ ONLY in the thresholds, so the °F card is the same kind with the °F numbers.
const TG_BANDS = {
  c: [[16, "0, 140, 255", "cold-breathe|cold", 4.4], [18, "255, 210, 40", "cool-wave|cool", 3.4],
      [20, "255, 150, 40", "comfy-breathe|comfy", 3.0], [22, "255, 115, 20", "warm-pulse|warm", 2.4]],
  f: [[64, "0, 140, 255", "cold-breathe|cold", 4.4], [68, "255, 210, 40", "cool-wave|cool", 3.4],
      [72, "255, 150, 40", "comfy-breathe|comfy", 3.0], [76, "255, 115, 20", "warm-pulse|warm", 2.4]],
};
const TG_HOT = ["255, 40, 40", "hot-shimmer|hot", 2.0];

// Jinja if/elif chain from a band table. `float(-999)` + a dead band first so `unavailable`
// reads as a grey frozen tile rather than an implausible 0 °C / 0 °F.
const tgRamp = (bands, hot) => {
  const row = ([rgb, stem, dur]) => {
    const [move, glow] = stem.split("|");
    return `{% set rgb = '${rgb}' %}{% set a = 'tg-${move} ${dur}s ease-in-out infinite' %}` +
      `{% set g = 'tg-${glow}-glow ${(dur * 0.9).toFixed(2)}s ease-in-out infinite' %}` +
      `{% set h = 'tg-${glow}-halo ${(dur * 1.15).toFixed(2)}s ease-in-out infinite' %}{% set op = '1' %}`;
  };
  return `
        {% set v = states(config.entity) | float(-999) %}
        {% if v < -900 %}{% set rgb = '120, 120, 120' %}{% set a = 'none' %}{% set g = 'none' %}{% set h = 'none' %}{% set op = '0.4' %}
        ` + bands.map(([t, ...rest]) => `{% elif v < ${t} %}${row(rest)}`).join("\n        ") +
    `\n        {% else %}${row(hot)}{% endif %}`;
};

registerKind("temp-graph", {
  label: "Animated Temperature (graph)",
  desc: "Banded thermometer with glow + halo layers and a 24 h sparkline bled into the corner",
  domains: ["sensor"],
  deviceClass: ["temperature"],
  entitySelector: { entity: { domain: "sensor", device_class: "temperature" } },
  schema: [F.variant(["c", "f"]), ...graphRows()],
  help: {
    variant: "Band thresholds: c = 16/18/20/22 °C, f = 64/68/72/76 °F",
    ...graphHelp(),
  },
  docs: graphDocs(),
  make: (c) => {
    const unit = c.variant === "f" ? "f" : "c";
    const bands = TG_BANDS[unit];
    const card = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Temperature",
      icon: "mdi:thermometer",
      primary_info: "state", secondary_info: "name",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": TG_SHADOW,
        ".": `${clip}
      ha-card {${tgRamp(bands, TG_HOT)}
        --tg-rgb: {{ rgb }};
        --tg-anim: {{ a }};
        --tg-glow: {{ g }};
        --tg-halo: {{ h }};
        --ig-op: {{ op }};
        --card-primary-font-size: 1.4rem;
        --card-primary-line-height: 1.3;
      }`,
      } },
      grid_options: c.graph === false ? { columns: 6, rows: 2 } : { columns: 12, rows: 2 },
    };
    if (c.graph === false) return card;
    // sparkline thresholds mirror the icon bands so the line and the glow agree: mini-graph
    // colours from a threshold UP, so band i's colour is keyed at band i-1's cut-off.
    const rgb = (s) => `rgb(${s.replace(/ /g, "")})`;
    return withMiniGraph(card, c.entity, {
      hours: c.graph_hours,
      thresholds: [
        { value: 0, color: rgb(bands[0][1]) },
        ...bands.slice(0, 3).map(([t], i) => ({ value: t, color: rgb(bands[i + 1][1]) })),
        { value: bands[3][0], color: rgb(TG_HOT[0]) },
      ],
    });
  },
});

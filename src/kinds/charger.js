// upstream: README #2 - Charger
// A charging plug: the shape swells in time with the draw, a soft halo breathes and two
// electric "arcs" flick around it. Upstream's copy-pasted number-mode/state-mode config block
// collapses into `power_entity`, which here sets the FILL SPEED (a fast charge fills faster), and
// its `current_power_w` attribute lookup becomes an optional power sensor — plugs that meter
// through a companion sensor are far more common than ones exposing that attribute.

const CHARGER_KEYFRAMES = `
      @keyframes charger-pulse {
        0%   { transform: scale(1); }
        25%  { transform: scale(1.05) translateY(-1px); }
        50%  { transform: scale(1.08) translateY(-2px); }
        75%  { transform: scale(1.04) translateY(-1px); }
        100% { transform: scale(1); }
      }
      @keyframes charger-glow {
        0%   { box-shadow: 0 0 10px 3px rgba(var(--ch-rgb, 76, 175, 80), 0.6), 0 0 20px 8px rgba(var(--ch-rgb, 76, 175, 80), 0.3); }
        50%  { box-shadow: 0 0 18px 6px rgba(var(--ch-rgb, 76, 175, 80), 0.9), 0 0 32px 12px rgba(var(--ch-rgb, 76, 175, 80), 0.4); }
        100% { box-shadow: 0 0 10px 3px rgba(var(--ch-rgb, 76, 175, 80), 0.6), 0 0 20px 8px rgba(var(--ch-rgb, 76, 175, 80), 0.3); }
      }
      @keyframes charger-arcs {
        0%   { box-shadow: -10px -6px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0),   12px 4px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0); }
        25%  { box-shadow: -10px -6px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.7), 12px 4px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.4); }
        50%  { box-shadow: -6px 2px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.3),   10px -8px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.7); }
        75%  { box-shadow: -12px 4px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.5),  8px 0 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0.2); }
        100% { box-shadow: -10px -6px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0),   12px 4px 0 -4px rgba(var(--ch-rgb, 76, 175, 80), 0); }
      }`;

// One static shadow block, stamped for both icon structures (.shape on entity-cards,
// .container on the tile-based template-card the power override produces).
// Defaults are `none`: a charger spends most of the day plugged in but NOT charging.
const chargerIcon = (sel, extra = "") => `
      ${sel} {
        transform-origin: 50% 50%;
        position: relative;
        ${extra}
        opacity: var(--ig-op, 1);
        animation: var(--ch-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        pointer-events: none;
      }
      ${sel}::before { animation: var(--ch-glow, none); }
      ${sel}::after  { animation: var(--ch-arcs, none); }
      ${CHARGER_KEYFRAMES}`;

registerKind("charger", {
  label: "Animated Charger",
  desc: "Plug that swells, halos and throws electric arcs while charging — pulse rate tracks the draw",
  domains: ["switch", "input_boolean", "light"],
  schema: [F.icon, F.color, F.glow, F.speed,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    F.active],
  help: {
    power_entity: "Optional charge-power sensor — a bigger draw fills the battery faster",
    speed: "Base pulse duration (default 1.6s) — with a power sensor the draw shortens it, floored at 0.4s",
    glow: "Arc/halo colour as R, G, B — e.g. 76, 175, 80",
  },
  make: (c) => {
    const color = c.color || "green";
    const glow = c.glow || "76, 175, 80";
    const active = c.active || "on";
    const base = parseFloat(c.speed) || 1.6;
    // watts → pulse rate (upstream's 1.6 - p/800), floored so a fast charger can't strobe
    const dur = c.power_entity
      ? `{% set p = states('${c.power_entity}') | float(0) %}{% set dur = ([0.4, (${base} - p / 800)] | max | round(2)) ~ 's' %}`
      : `{% set dur = '${base}s' %}`;
    return {
      ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
      icon: c.icon || "mdi:power-plug",
      layout: "vertical", fill_container: true,
      tap_action: { action: "toggle" },
      card_mod: { style: {
        "mushroom-shape-icon$": chargerIcon(".shape"),
        "ha-tile-icon$": chargerIcon(".container", "border-radius: 9999px;"),
        ".": `${clip}
      ha-card {
        ${onTest(active)}
        ${dur}
        --ch-rgb: ${glow};
        --ch-anim: {{ ('charger-pulse ' ~ dur ~ ' ease-in-out infinite') if on else 'none' }};
        --ch-glow: {{ 'charger-glow 1.8s ease-in-out infinite' if on else 'none' }};
        --ch-arcs: {{ 'charger-arcs 1.2s linear infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.7' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

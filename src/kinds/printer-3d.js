// upstream: README #17 - 3d Printer  +  README #43 - 3D Printer
// Same device, two upstream looks → one kind with a `variant`:
//   gantry   (#17) — plug/switch driven: the nozzle traces a layer-by-layer raster (left↔right,
//                    stepping up), over a static bed shadow. Nothing else on the card.
//   progress (#43) — bound to a 0–100 % progress sensor: same raster on the icon plus a beam
//                    progress bar along the bottom edge, an ambient glow, and a DONE badge.
// #43 as published never animates — it sets `--shape-animation` but there is no
// `animation: var(...)` consumer anywhere (the classic missing-consumer bug); fixed here.

const PRINTER_KEYFRAMES = `
      @keyframes printer-raster {
        0%   { transform: translate(-5px, 4px) scale(0.96); }
        15%  { transform: translate(5px, 4px) scale(0.96); }
        16%  { transform: translate(5px, 2px) scale(0.98); }
        30%  { transform: translate(-5px, 2px) scale(0.98); }
        31%  { transform: translate(-5px, 0px) scale(1); }
        45%  { transform: translate(5px, 0px) scale(1); }
        46%  { transform: translate(5px, -2px) scale(1.02); }
        60%  { transform: translate(-5px, -2px) scale(1.02); }
        61%  { transform: translate(-5px, -4px) scale(1.04); }
        80%  { transform: translate(5px, -4px) scale(1.04); }
        100% { transform: translate(-5px, 4px) scale(0.96); }
      }`;

// Default `none`: a printer is idle far more often than it is printing.
const printerIcon = (bedShadow) => `
      .shape {
        transform-origin: 50% 80%;
        opacity: var(--ig-op, 1);
        box-shadow: var(--p3-shadow, ${bedShadow});
        animation: var(--p3-anim, none);
      }
      ${PRINTER_KEYFRAMES}`;

registerKind("printer-3d", {
  label: "Animated 3D Printer",
  desc: "Nozzle rasters layer by layer while printing — optional progress beam and DONE badge",
  domains: ["sensor", "switch", "input_boolean"],
  schema: [
    F.icon, F.color, F.glow, F.speed,
    F.variant(["gantry", "progress"]),
    { name: "max_value", selector: { number: { min: 1, step: 1, mode: "box" } } },
    F.active,
  ],
  help: {
    variant: "gantry = switch/plug driven, icon only · progress = bind a 0–100 % progress sensor and get the beam bar + DONE badge",
    glow: "Nozzle/beam colour as R, G, B (default 156, 39, 176)",
    speed: "Raster duration (default 2.3s)",
    max_value: "progress variant: the value that counts as finished (default 100)",
    active: "gantry variant: state that counts as printing (default: on)",
  },
  docs: "The `progress` variant expects a numeric percentage sensor (OctoPrint/Bambu/Moonraker all expose one). Anything at or above `max_value` shows the DONE badge; a missing or `unavailable` sensor goes grey with no bar rather than reporting 0 %.",
  make: (c) => {
    const color = c.color || "purple";
    const glow = c.glow || "156, 39, 176";
    const speed = c.speed || "2.3s";
    const icon = c.icon || "mdi:printer-3d-nozzle";
    const bedShadow = `0 8px 0 -4px rgba(var(--p3-rgb, ${glow}), 0.5), 0 0 12px 0 rgba(var(--p3-rgb, ${glow}), 0.8)`;

    if (c.variant === "progress") {
      const max = Number(c.max_value) > 0 ? Number(c.max_value) : 100;
      return {
        type: "custom:mushroom-entity-card",
        entity: c.entity, name: c.name, icon, icon_color: color,
        primary_info: "name", secondary_info: "state",
        tap_action: { action: "more-info" },
        card_mod: { style: {
          "mushroom-shape-icon$": printerIcon("none"),
          ".": `${clip}
      ha-card {
        {% set val = states(config.entity) | float(-1) %}
        {% set dead = val < 0 %}
        {% set printing = val > 0 and val < ${max} %}
        {% set done = (not dead) and val >= ${max} %}
        {% set pct = [[val / ${max} * 100, 0] | max, 100] | min %}
        --p3-rgb: ${glow};
        --p3-bar: {{ pct | round(2) }}%;
        --p3-bar-op: {{ '1' if printing else '0' }};
        --p3-done-op: {{ '1' if done else '0' }};
        --p3-anim: {{ 'printer-raster ${speed} linear infinite' if printing else 'none' }};
        --p3-shadow: {{ '0 0 10px 5px rgba(${glow}, 0.6)' if printing else 'none' }};
        --ig-op: {{ '0.45' if dead else '1' }};
        /* the dark stage + ambient bloom belong to a live print only; idle keeps the theme card */
        background-image: {{ 'radial-gradient(circle at 34px 34px, rgba(${glow}, 0.35) 0%, rgba(${glow}, 0.1) 40%, transparent 80%)' if printing else 'none' }};
        position: relative;
        overflow: hidden;
        transition: background-image 0.5s ease;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
      }
      ha-card::before {
        content: 'DONE';
        position: absolute; top: 10px; right: 10px; z-index: 2;
        font-size: 10px; font-weight: 900; letter-spacing: 1px;
        color: rgb(76, 175, 80);
        background: rgba(76, 175, 80, 0.15);
        border: 1px solid rgba(76, 175, 80, 0.5);
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
        padding: 2px 6px; border-radius: 4px;
        opacity: var(--p3-done-op, 0);
        transform: scale(var(--p3-done-op, 0));
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: none;
      }
      ha-card::after {
        content: '';
        position: absolute; left: 0; bottom: 0; height: 6px; z-index: 2;
        width: var(--p3-bar, 0%);
        background: linear-gradient(90deg, rgba(var(--p3-rgb, ${glow}), 0.4) 0%, rgba(var(--p3-rgb, ${glow}), 1) 100%);
        box-shadow: 0 -2px 10px rgba(var(--p3-rgb, ${glow}), 0.8);
        opacity: var(--p3-bar-op, 0);
        /* width glides as a one-shot transition — never a keyframe loop on a layout property */
        transition: width 0.5s ease-out, opacity 0.5s ease;
        animation: bar-flow 2s linear infinite;
        pointer-events: none;
      }
      @keyframes bar-flow {
        0%   { filter: brightness(1); }
        50%  { filter: brightness(1.3); }
        100% { filter: brightness(1); }
      }`,
        } },
        grid_options: { columns: 12, rows: 2 },
      };
    }

    const active = c.active || "on";
    return {
      ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
      icon,
      layout: "vertical", fill_container: true,
      tap_action: { action: "toggle" },
      card_mod: { style: {
        "mushroom-shape-icon$": printerIcon(bedShadow),
        "ha-tile-icon$": `
      .container {
        border-radius: 9999px;
        transform-origin: 50% 80%;
        opacity: var(--ig-op, 1);
        box-shadow: var(--p3-shadow, ${bedShadow});
        animation: var(--p3-anim, none);
      }
      ${PRINTER_KEYFRAMES}`,
        ".": `${clip}
      ha-card {
        ${onTest(active)}
        --p3-rgb: ${glow};
        --p3-anim: {{ 'printer-raster ${speed} linear infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.8' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

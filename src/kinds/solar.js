// upstream: README #75 - Solar Panel
//
// The corpus's most layered card: FOUR pierceable scopes cooperate, because each element only
// has two pseudo-elements to spend (see design-principles §3).
//   ha-card::after / ::before      → the W and A badges
//   mushroom-state-item$ .container → the progress bar (::before) + the V badge (::after)
//   mushroom-state-info$  .container → the custom message, bottom right (::after)
//   mushroom-shape-icon$  .shape    → the panel: a conic scan sweep (::before) and a radial
//                                     pulse (::after), with the icon's own glow radius scaled
//                                     by load
//
// Load is an UNBOUNDED magnitude, so it's normalised against `max_watts` and clamped, then
// spent on two axes: bar width (a transition, not a keyframe) and glow radius. The sweep/pulse
// keyframes themselves never change speed — 0 W just fades the sweep out via --sol-active.
// A dead power sensor reads 0 W and the whole card goes quiet, which is the honest picture.

registerKind("solar", {
  label: "Animated Solar Panel",
  desc: "Panel with a scanning sweep, load-scaled glow, a power bar and W / A / V badges",
  domains: ["sensor"],
  deviceClass: ["power"],
  entitySelector: { entity: { domain: "sensor", device_class: "power" } },
  schema: [
    F.icon,
    { name: "voltage_entity", selector: { entity: { domain: "sensor", device_class: "voltage" } } },
    { name: "current_entity", selector: { entity: { domain: "sensor", device_class: "current" } } },
    { name: "max_watts", selector: { number: { min: 1, max: 100000, step: 1, mode: "box", unit_of_measurement: "W" } } },
    { name: "milliamps", selector: { boolean: {} } },
    { name: "message", selector: { text: {} } },
    { name: "theme", selector: { select: { mode: "dropdown", options: ["dark", "light"] } } },
    { name: "color", selector: { text: {} } },
    { name: "height", selector: { text: {} } },
  ],
  help: {
    icon: "Default mdi:solar-power-variant",
    voltage_entity: "Optional voltage sensor — drives the green V badge",
    current_entity: "Optional current sensor — drives the blue A badge",
    max_watts: "Full-scale power: the bar hits 100 % and the glow maxes out here (default 1200)",
    milliamps: "Show current as mA (whole numbers) instead of A (2 dp)",
    message: "Small caption bottom-right (default MAX: <max_watts>W)",
    theme: "Card background + text colours — dark (default) or light",
    color: "Panel/bar colour as R, G, B (default 255, 193, 7)",
    height: "Card height (CSS, default 90px)",
  },
  docs: "Bind the **power** sensor as the entity; voltage and current sensors are optional and " +
    "their badges simply read 0 without them. The bar is scaled against `max_watts` and clamped " +
    "at 100 %, so a spiking inverter can't blow the layout out.",
  make: (c) => {
    const solar = c.color || "255, 193, 7";
    const max = Number(c.max_watts) || 1200;
    const h = c.height || "90px";
    const light = c.theme === "light";
    const bg = light ? "255, 255, 255" : "28, 28, 28";
    const txtMain = light ? "33, 33, 33" : "255, 255, 255";
    const txtSec = light ? "114, 114, 114" : "255, 255, 255";
    const msg = (c.message || `MAX: ${max}W`).replace(/"/g, "'");
    const vRead = c.voltage_entity ? `states('${c.voltage_entity}') | float(0)` : "0";
    const aRead = c.current_entity ? `states('${c.current_entity}') | float(0)` : "0";
    const amps = c.milliamps ? `(a | round(0) | int) ~ ' mA'` : `(a | round(2)) ~ ' A'`;

    // a badge is the same box three times over — only the colour var and the text change
    const badge = (sel, colorVar, contentVar, pos) => `
      ${sel} {
        content: var(${contentVar}, "");
        position: absolute; top: 12px; right: ${pos};
        width: 58px; height: 20px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(var(${colorVar}), 0.15);
        border: 1px solid rgb(var(${colorVar}));
        color: rgb(var(${colorVar}));
        box-shadow: 0 0 6px 0 rgba(var(${colorVar}), 0.3);
        font-size: 11px; font-weight: 700;
        border-radius: 4px; z-index: 5;
      }`;

    return {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Solar Panel",
      icon: c.icon || "mdi:solar-power-variant",
      primary_info: "name", secondary_info: "none",
      layout: "horizontal",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        // STATIC: sweep + pulse keyframes and both consumers. The sweep is faded, not stopped,
        // when idle (opacity var) — restarting a 4 s conic rotation on every power reading
        // would visibly stutter, and solar power updates constantly.
        "mushroom-shape-icon$": `
      .shape {
        --icon-size: 65px !important;
        --shape-color: rgba(${solar}, 0.2) !important;
        --icon-color: rgb(${solar}) !important;
        background: radial-gradient(circle, rgba(${solar}, 0.1) 0%, transparent 70%) !important;
        box-shadow: 0 0 var(--sol-glow, 0px) rgba(${solar}, 0.6);
        overflow: visible !important;
        transition: box-shadow 0.6s ease;
      }
      .shape::before {
        content: "";
        position: absolute; inset: -4px; border-radius: 50%;
        background: conic-gradient(from -25deg, transparent 0%, rgba(${solar}, 0.8) 25%, transparent 50%);
        animation: sol-scan 4s ease-in-out infinite;
        filter: blur(4px);
        z-index: 0;
        opacity: var(--sol-active, 0);
        transition: opacity 0.6s ease;
      }
      .shape::after {
        content: "";
        position: absolute; inset: 0; border-radius: 50%;
        background: radial-gradient(circle, rgba(${solar}, 0.8) 0%, transparent 60%);
        animation: sol-pulse 3s ease-in-out infinite;
        opacity: 0.6; z-index: -1;
      }
      ha-icon { z-index: 1; filter: drop-shadow(0 0 5px rgba(${solar}, 0.8)); }
      @keyframes sol-scan {
        0%, 100% { transform: rotate(-90deg); }
        50%      { transform: rotate(-30deg); }
      }
      @keyframes sol-pulse {
        0%, 100% { transform: scale(0.9); opacity: 0.5; }
        50%      { transform: scale(1.1); opacity: 0.8; }
      }`,
        // scope 2: the progress bar + the V badge (ha-card's two pseudo-elements are spent)
        "mushroom-state-item$": `
      .container::before {
        content: '';
        position: absolute; bottom: 0; left: 0;
        width: var(--sol-bar, 0%); height: 4px;
        background: rgb(${solar});
        box-shadow: 0 -1px 8px rgba(${solar}, 0.5);
        border-bottom-left-radius: var(--ha-card-border-radius, 12px);
        transition: width 0.5s ease;
        z-index: 2;
      }
      ${badge(".container::after", "--sol-c-volts", "--sol-v", "calc(12px + 128px)")}`,
        // scope 3: the caption
        "mushroom-state-info$": `
      .primary   { font-size: 14px !important; color: rgb(${txtMain}) !important; }
      .secondary { font-size: 11px !important; color: rgb(${txtSec}) !important; }
      .container::after {
        content: var(--sol-msg, "");
        position: absolute; bottom: 8px; right: 12px;
        width: 200px; text-align: right;
        font-size: 11px; font-weight: 600;
        color: rgba(${txtMain}, 0.4);
        letter-spacing: 1px; z-index: 6;
      }`,
        ".": `
      ha-card {
        {% set w = states(config.entity) | float(-1) %}
        {% set dead = w < 0 %}
        {% set w = 0 if dead else w %}
        {% set v = ${vRead} %}
        {% set a = ${aRead} %}
        {% set pct = ((w / ${max}) * 100) | round(0) | int %}
        {% set pct = [[pct, 0] | max, 100] | min %}
        --sol-c-watts: 255, 152, 0;
        --sol-c-amps: 33, 150, 243;
        --sol-c-volts: 76, 175, 80;
        --sol-w: "{{ w | round(0) | int }} W";
        --sol-v: "{{ v | round(0) | int }} V";
        --sol-a: "{{ ${amps} }}";
        --sol-msg: "${msg}";
        --sol-bar: {{ pct }}%;
        /* glow radius scales with load: 10px idle-ish → 40px flat out, 0 when nothing's coming in */
        --sol-glow: {{ 0 if w <= 0 else (((w / ${max}) * 30 + 10) | round(0) | int) }}px;
        --sol-active: {{ '0' if w <= 0 else '1' }};
        background: rgb(${bg}) !important;
        height: ${h} !important;
        box-shadow: {{ 'inset 0 0 60px rgba(${solar}, 0.1)' if w > 0 else 'none' }};
        opacity: {{ '0.6' if dead else '1' }};
        overflow: hidden !important;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      ${badge("ha-card::after", "--sol-c-watts", "--sol-w", "12px")}
      ${badge("ha-card::before", "--sol-c-amps", "--sol-a", "calc(12px + 64px)")}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

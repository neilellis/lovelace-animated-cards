// upstream: README #32 - Gaming Rig
//
// The icon becomes a boxy PC case with a glass side panel: an RGB conic "fan" spins behind the
// glass and a cyan/magenta neon breathes around the case while the rig is under load; powered
// but idle it just sits there with a faint static glow; off it's dark.
//
// Upstream's number-mode block is the load test. Here the `active` state decides powered vs
// off, and an optional `power_entity` splits powered into gaming (fan + neon) and idle (the
// static idle_glow); with no sensor, on == gaming. The case keeps a 10px radius in both icon
// structures (a round tile would undo the whole "it's a box" idea).

const RIG_FX = (sel) => `
      ${sel} {
        border-radius: 10px !important;
        position: relative;
        overflow: hidden;
        transform: translateZ(0);
        opacity: var(--rig-op, 0.5);
        box-shadow: var(--rig-shadow, none);
        animation: var(--rig-neon, none);
      }
      ${sel}::before {
        content: '';
        display: var(--rig-fx, none);
        position: absolute;
        top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
        opacity: 0.5;
        mix-blend-mode: screen;
        animation: var(--rig-spin, none);
      }
      ${sel}::after {
        content: '';
        display: var(--rig-fx, none);
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%, transparent 100%);
        pointer-events: none;
      }
      @keyframes rig-fan { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes rig-neon {
        0%   { box-shadow: 0 0 15px 2px rgba(var(--rig-a, 0, 255, 255), 0.6), 0 0 30px 10px rgba(var(--rig-b, 255, 0, 255), 0.4); }
        100% { box-shadow: 0 0 25px 5px rgba(var(--rig-a, 0, 255, 255), 0.8), 0 0 50px 20px rgba(var(--rig-b, 255, 0, 255), 0.6); }
      }`;

// busy test: the rig's own state decides on/off; an optional power sensor separates
// "under load" from "merely powered" — watts as a SECOND signal, never as the state (v0.3.0).
const RIG_BUSY = (sensor, above) => sensor
  ? `{% set busy = on and states('${sensor}') | float(-1) > ${above ?? 150} %}`
  : `{% set busy = on %}`;

const rigCard = (c) => {
  const speed = c.speed || "2s";
  const glowA = c.glow || "0, 255, 255";
  const glowB = c.glow_b || "255, 0, 255";
  const idleGlow = c.idle_glow || "255, 255, 255";
  const active = c.active || "on";
  const color = c.color || "white";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:desktop-tower",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      // STATIC: defaults describe an OFF rig (no fan, no neon) — desktops are off most of the day.
      "mushroom-shape-icon$": RIG_FX(".shape"),
      "ha-tile-icon$": RIG_FX(".container"),
      ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        ${RIG_BUSY(c.power_entity, c.power_above)}
        --rig-a: ${glowA};
        --rig-b: ${glowB};
        {% if busy %}
          --rig-fx: block;
          --rig-spin: rig-fan ${speed} linear infinite;
          --rig-neon: rig-neon ${speed} ease-in-out infinite alternate;
          --rig-shadow: none;
          --rig-op: 1;
        {% elif on %}
          --rig-fx: none;
          --rig-spin: none;
          --rig-neon: none;
          --rig-shadow: 0 0 6px 0 rgba(${idleGlow}, 0.4);
          --rig-op: 0.9;
        {% else %}
          --rig-fx: none;
          --rig-spin: none;
          --rig-neon: none;
          --rig-shadow: none;
          --rig-op: 0.5;
        {% endif %}
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("gaming-rig", {
  label: "Animated Gaming Rig",
  desc: "PC case with a spinning RGB fan and neon breathe under load; faint glow when idle",
  domains: ["switch", "input_boolean", "binary_sensor"],
  schema: [
    F.icon, F.color, F.glow,
    { name: "glow_b", selector: { text: {} } },
    { name: "idle_glow", selector: { text: {} } },
    F.speed, F.active,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "power_above", selector: { number: { min: 0, step: 0.1, mode: "box", unit_of_measurement: "W" } } },
  ],
  help: {
    power_entity: "Optional watts sensor for the busy level — the card's entity still decides on/off; above the threshold reads as gaming, below it as powered but idle (the static idle_glow)",
    power_above: "Watts above which it counts as gaming (default 150 W)",
    glow: "First neon colour as R, G, B (default 0, 255, 255)",
    glow_b: "Second neon colour as R, G, B (default 255, 0, 255)",
    idle_glow: "Static glow while on but idle, as R, G, B (default 255, 255, 255)",
    speed: "Fan revolution / neon breath period, e.g. 2s",
  },
  docs: "`active` (default `on`) decides powered vs off. Add a `power_entity` to get upstream's third level back: above `power_above` (default 150 W) the rig is gaming — spinning fan, breathing neon — and below it it's powered but idle, wearing the static `idle_glow`. Without a sensor, on == gaming. The watts are only ever the *busy* signal here; the card's own entity still decides on/off (that's the difference from the watts-as-state override dropped in v0.3.0).",
  make: rigCard,
});

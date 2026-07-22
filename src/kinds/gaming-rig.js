// upstream: README #32 - Gaming Rig
//
// The icon becomes a boxy PC case with a glass side panel: an RGB conic "fan" spins behind the
// glass and a cyan/magenta neon breathes around the case while the rig is under load; powered
// but idle it just sits there with a faint static glow; off it's dark.
//
// Upstream's number-mode block is the load test — here that's the optional power sensor
// (power_entity/power_above): above the threshold = gaming, below = idle. With no power sensor
// configured, on == gaming. The case keeps a 10px radius in both icon structures (a round tile
// would undo the whole "it's a box" idea).

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

// load test: the power sensor when one is configured, otherwise "on == gaming"
const RIG_BUSY = (power) => power
  ? `{% set busy = states('${power.entity}') | float(-1) > ${power.above ?? 0.5} %}`
  : `{% set busy = on %}`;

const rigCard = (c) => {
  const speed = c.speed || "2s";
  const glowA = c.glow || "0, 255, 255";
  const glowB = c.glow_b || "255, 0, 255";
  const idleGlow = c.idle_glow || "255, 255, 255";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "white";
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
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
        ${RIG_BUSY(power)}
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
    F.speed, F.powerEntity, F.powerAbove, F.active,
  ],
  help: {
    glow: "First neon colour as R, G, B (default 0, 255, 255)",
    glow_b: "Second neon colour as R, G, B (default 255, 0, 255)",
    idle_glow: "Static glow while on but idle, as R, G, B (default 255, 255, 255)",
    speed: "Fan revolution / neon breath period, e.g. 2s",
  },
  docs: "With a `power_entity` set, draw above `power_above` reads as gaming (fan + neon) and below it as powered-but-idle (static glow) — the three-state look upstream drove from its number-mode block. Without one, on == gaming.",
  make: rigCard,
});

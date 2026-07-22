// upstream: README #40 - Vibration
//
// Something is shaking: the icon judders on a 0.5s path, a shockwave ring fires outwards and an
// inner glow pulses "heat" into the shape. For a vibration binary_sensor (device_class
// vibration/moving) or a grinding appliance on a plug — waste disposal, macerator, pump.
//
// Upstream leaves the idle branch at full opacity, so a silent sensor looks identical to a live
// one; here idle dims (§6 "idle is quiet"), which is also what makes the shake mean something.

const VIB_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        position: relative;
        opacity: var(--vib-op, 0.55);
        animation: var(--vib-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
      }
      ${sel}::before { animation: var(--vib-wave, none); }
      ${sel}::after  { mix-blend-mode: overlay; animation: var(--vib-heat, none); }
      @keyframes vib-shake {
        0%   { transform: translate(1px, 1px) rotate(0deg); }
        10%  { transform: translate(-1px, -2px) rotate(-1deg); }
        20%  { transform: translate(-3px, 0) rotate(1deg); }
        30%  { transform: translate(3px, 2px) rotate(0deg); }
        40%  { transform: translate(1px, -1px) rotate(1deg); }
        50%  { transform: translate(-1px, 2px) rotate(-1deg); }
        60%  { transform: translate(-3px, 1px) rotate(0deg); }
        70%  { transform: translate(3px, 1px) rotate(-1deg); }
        80%  { transform: translate(-1px, -1px) rotate(1deg); }
        90%  { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
      }
      @keyframes vib-shockwave {
        0%   { box-shadow: 0 0 0 0 rgba(var(--vib-rgb, 244, 67, 54), 0.8); }
        70%  { box-shadow: 0 0 0 15px rgba(var(--vib-rgb, 244, 67, 54), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--vib-rgb, 244, 67, 54), 0); }
      }
      @keyframes vib-pulse {
        0%   { box-shadow: inset 0 0 0 0 rgba(var(--vib-rgb, 244, 67, 54), 0.4); }
        50%  { box-shadow: inset 0 0 10px 4px rgba(var(--vib-rgb, 244, 67, 54), 0.1); }
        100% { box-shadow: inset 0 0 0 0 rgba(var(--vib-rgb, 244, 67, 54), 0.4); }
      }`;

const vibrationCard = (c) => {
  const speed = c.speed || "0.5s";
  const glow = c.glow || "244, 67, 54";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "red";
  // a binary_sensor can't be toggled — tapping it should open more-info instead
  const sensor = String(c.entity || "").startsWith("binary_sensor.");
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
    icon: c.icon || "mdi:vibrate",
    layout: "vertical", fill_container: true,
    tap_action: { action: sensor ? "more-info" : "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": VIB_FX(".shape"),
      "ha-tile-icon$": VIB_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --vib-rgb: ${glow};
        --vib-anim: {{ 'vib-shake ${speed} linear infinite' if on else 'none' }};
        --vib-wave: {{ 'vib-shockwave 0.8s ease-out infinite' if on else 'none' }};
        --vib-heat: {{ 'vib-pulse 1.5s ease-in-out infinite' if on else 'none' }};
        --vib-op: {{ '1' if on else '0.55' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("vibration", {
  label: "Animated Vibration",
  desc: "Icon judders with a shockwave ring while something is vibrating; quiet and dim when still",
  domains: ["binary_sensor", "switch", "input_boolean"],
  deviceClass: ["vibration", "moving", "running"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Shockwave colour as R, G, B (default 244, 67, 54)",
    speed: "Shake period, e.g. 0.5s (smaller = more violent)",
  },
  docs: "Alarm-class motion: bind it to something genuinely exceptional. On a `binary_sensor` entity the tap action becomes more-info rather than toggle.",
  make: vibrationCard,
});

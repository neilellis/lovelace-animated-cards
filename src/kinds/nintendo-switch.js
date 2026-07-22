// upstream: README #35 - Nintendo Switch
//
// The Joy-Con look: a red bloom off the left edge, a blue bloom off the right, breathing
// together while the console is awake, with a light haptic rumble on the body. Off → the whole
// icon goes monochrome and dim (upstream's grayscale treatment, which doubles as the honest
// `unavailable` look).

const NS_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        position: relative;
        overflow: visible !important;
        filter: var(--ns-filter, grayscale(100%));
        opacity: var(--ns-op, 0.4);
        animation: var(--ns-shake, none);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        inset: -10px;
        border-radius: inherit;
        z-index: -1;
        pointer-events: none;
        animation: var(--ns-glow, none);
      }
      @keyframes ns-neon {
        0% {
          box-shadow:
            -6px 0 12px rgba(var(--ns-left, 255, 20, 20), 0.5),
            -12px 0 24px rgba(var(--ns-left, 255, 20, 20), 0.35),
            -18px 0 36px rgba(var(--ns-left, 255, 20, 20), 0.2),
             6px 0 12px rgba(var(--ns-right, 0, 200, 255), 0.5),
            12px 0 24px rgba(var(--ns-right, 0, 200, 255), 0.35),
            18px 0 36px rgba(var(--ns-right, 0, 200, 255), 0.2);
        }
        100% {
          box-shadow:
            -12px 0 24px rgba(var(--ns-left, 255, 20, 20), 0.9),
            -24px 0 40px rgba(var(--ns-left, 255, 20, 20), 0.65),
            -32px 0 60px rgba(var(--ns-left, 255, 20, 20), 0.4),
             12px 0 24px rgba(var(--ns-right, 0, 200, 255), 0.9),
             24px 0 40px rgba(var(--ns-right, 0, 200, 255), 0.65),
             32px 0 60px rgba(var(--ns-right, 0, 200, 255), 0.4);
        }
      }
      @keyframes ns-haptic {
        0%   { transform: translate(0, 0) rotate(0deg); }
        25%  { transform: translate(-1px, 1px) rotate(-1deg); }
        50%  { transform: translate(1px, -1px) rotate(1deg); }
        75%  { transform: translate(-1px, -1px) rotate(0deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }`;

const nsCard = (c) => {
  const speed = c.speed || "0.5s";
  const left = c.glow || "255, 20, 20";
  const right = c.glow_b || "0, 200, 255";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "white";
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
    icon: c.icon || "mdi:nintendo-switch",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": NS_FX(".shape"),
      "ha-tile-icon$": NS_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --ns-left: ${left};
        --ns-right: ${right};
        --ns-glow: {{ 'ns-neon ${speed} ease-in-out infinite alternate' if on else 'none' }};
        --ns-shake: {{ 'ns-haptic 0.4s linear infinite' if on else 'none' }};
        --ns-filter: {{ 'grayscale(0%)' if on else 'grayscale(100%)' }};
        --ns-op: {{ '1' if on else '0.4' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("nintendo-switch", {
  label: "Animated Nintendo Switch",
  desc: "Red/blue Joy-Con blooms breathing either side of the icon, with a haptic rumble",
  domains: ["switch", "input_boolean", "media_player", "binary_sensor"],
  schema: [
    F.icon, F.color, F.glow,
    { name: "glow_b", selector: { text: {} } },
    F.speed, F.powerEntity, F.powerAbove, F.active,
  ],
  help: {
    glow: "Left Joy-Con colour as R, G, B (default 255, 20, 20)",
    glow_b: "Right Joy-Con colour as R, G, B (default 0, 200, 255)",
    speed: "Bloom breath period, e.g. 0.5s",
    active: "State that counts as awake — for a media_player try `playing` (default: on)",
  },
  make: nsCard,
});

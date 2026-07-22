// upstream: README #31 - Console
//
// Games console: the pad rumbles, a coloured bloom breathes around it, and an LED ring cycles
// through the console's own light show (card colour → cyan → violet). Off = still + dimmed.
// Upstream's 120px/190px glow radii are toned down to something that reads on a tile without
// bleeding over its neighbours, and its per-branch `--glow-1/2/3` triple collapses into one
// bloom var (the three layers are now baked into the static keyframes).
//
// This card is deliberately loud (0.5s rumble) — it's an attention magnet, so one per view.

const CON_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        position: relative;
        overflow: visible !important;
        opacity: var(--con-op, 0.6);
        animation: var(--con-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        pointer-events: none;
      }
      ${sel}::before {
        inset: -8px;
        animation: var(--con-led, none);
      }
      ${sel}::after {
        inset: -14px;
        box-shadow: var(--con-bloom, none);
        mix-blend-mode: screen;
        animation: var(--con-glow, none);
      }
      @keyframes con-rumble {
        0%   { transform: translate(0, 0) rotate(0deg); }
        25%  { transform: translate(-2px, 1px) rotate(-3deg); }
        50%  { transform: translate(2px, -1px) rotate(3deg); }
        75%  { transform: translate(-1px, 2px) rotate(-1deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      @keyframes con-ultraglow {
        0%   { opacity: 0.9; filter: brightness(1); }
        40%  { opacity: 1;   filter: brightness(1.4); }
        70%  { opacity: 1;   filter: brightness(1.2); }
        100% { opacity: 0.9; filter: brightness(1); }
      }
      @keyframes con-led {
        0% {
          box-shadow: 0 0 0 0 rgba(var(--con-rgb, 156, 39, 176), 0.8), 0 0 16px 0 rgba(var(--con-rgb, 156, 39, 176), 0.9);
        }
        33% {
          box-shadow: 0 0 0 6px rgba(0, 210, 255, 0.5), 0 0 26px 6px rgba(0, 210, 255, 0.95);
        }
        66% {
          box-shadow: 0 0 0 10px rgba(200, 110, 255, 0.5), 0 0 34px 10px rgba(200, 110, 255, 1);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(var(--con-rgb, 156, 39, 176), 0.8), 0 0 16px 0 rgba(var(--con-rgb, 156, 39, 176), 0.9);
        }
      }`;

const consoleCard = (c) => {
  const speed = c.speed || "0.5s";
  const glow = c.glow || "156, 39, 176";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "purple";
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
    icon: c.icon || "mdi:controller",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": CON_FX(".shape"),
      "ha-tile-icon$": CON_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --con-rgb: ${glow};
        --con-anim: {{ 'con-rumble ${speed} ease-in-out infinite' if on else 'none' }};
        --con-led: {{ 'con-led 1.5s ease-in-out infinite' if on else 'none' }};
        --con-glow: {{ 'con-ultraglow 2s ease-in-out infinite' if on else 'none' }};
        --con-bloom: {{ '0 0 26px 8px rgba(${glow}, 0.65), 0 0 54px 20px rgba(${glow}, 0.35)' if on else 'none' }};
        --con-op: {{ '1' if on else '0.6' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("console", {
  label: "Animated Games Console",
  desc: "Pad rumbles inside a cycling RGB LED bloom while the console is on",
  domains: ["switch", "input_boolean", "media_player", "binary_sensor"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Base bloom colour as R, G, B (default 156, 39, 176)",
    speed: "Rumble period, e.g. 0.5s (smaller = more violent)",
    active: "State that counts as on — for a media_player try `playing` (default: on)",
  },
  docs: "Loud by design (fast rumble + bright bloom); keep one per view. On a metered plug, set `power_entity`/`power_above` so a console left in standby doesn't rumble all evening.",
  make: consoleCard,
});

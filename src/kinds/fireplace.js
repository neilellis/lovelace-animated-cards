// upstream: README #15 - Fireplace
// Three unsynced layers make it read as fire rather than as a pulsing blob: the icon flickers
// (1.4s, brightness + hue jitter + vertical lick), a blurred flame halo shifts (1.8s) and a
// wide ember bloom breathes underneath (2.4s). Periods with no small common multiple never
// visibly repeat. Off = still and dimmed.
//
// Related but distinct: `heater` (10-kinds-base) reuses the halo + ember layers on a *climate*
// entity keyed off hvac_action; this one is the switch/plug-driven fire itself and adds the
// flicker. Upstream's number-mode block becomes the shared power_entity/power_above override.

const FIREPLACE_KEYFRAMES = `
      @keyframes flame-core {
        0%   { transform: translateY(0)    scale(1);    filter: brightness(1.1) hue-rotate(0deg); }
        12%  { transform: translateY(-2px) scale(1.05); filter: brightness(1.4) hue-rotate(-10deg); }
        25%  { transform: translateY(1px)  scale(0.98); filter: brightness(0.9) hue-rotate(8deg); }
        40%  { transform: translateY(-3px) scale(1.07); filter: brightness(1.5) hue-rotate(-18deg); }
        55%  { transform: translateY(0)    scale(1.02); filter: brightness(1.2) hue-rotate(10deg); }
        70%  { transform: translateY(-1px) scale(1.04); filter: brightness(1.35) hue-rotate(-6deg); }
        85%  { transform: translateY(2px)  scale(0.97); filter: brightness(0.95) hue-rotate(6deg); }
        100% { transform: translateY(0)    scale(1);    filter: brightness(1.1) hue-rotate(0deg); }
      }
      @keyframes flame-halo {
        0%   { box-shadow: 0 0 14px 8px rgba(var(--fp-rgb, 255, 87, 34), 0.8), 0 -12px 24px -6px rgba(var(--fp-tip, 255, 200, 0), 0.4); }
        33%  { box-shadow: 0 0 20px 10px rgba(var(--fp-rgb, 255, 87, 34), 1),  0 -16px 30px -8px rgba(var(--fp-tip, 255, 160, 0), 0.5); }
        66%  { box-shadow: 0 0 18px 9px rgba(var(--fp-rgb, 255, 87, 34), 0.9), 0 -8px 20px -6px rgba(var(--fp-tip, 255, 220, 0), 0.35); }
        100% { box-shadow: 0 0 14px 8px rgba(var(--fp-rgb, 255, 87, 34), 0.8), 0 -12px 24px -6px rgba(var(--fp-tip, 255, 200, 0), 0.4); }
      }
      @keyframes flame-embers {
        0%   { box-shadow: 0 0 30px 10px rgba(var(--fp-rgb, 255, 87, 34), 0.25), 0 0 60px 20px rgba(var(--fp-tip, 255, 120, 0), 0.15); }
        50%  { box-shadow: 0 0 50px 18px rgba(var(--fp-rgb, 255, 87, 34), 0.5),  0 0 90px 35px rgba(var(--fp-tip, 255, 150, 0), 0.25); }
        100% { box-shadow: 0 0 30px 10px rgba(var(--fp-rgb, 255, 87, 34), 0.25), 0 0 60px 20px rgba(var(--fp-tip, 255, 120, 0), 0.15); }
      }`;

const fireplaceIcon = (sel, extra = "") => `
      ${sel} {
        position: relative;
        transform-origin: 50% 75%;
        ${extra}
        opacity: var(--ig-op, 1);
        animation: var(--fp-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: inherit;
        pointer-events: none;
        filter: blur(3px);
      }
      ${sel}::before { animation: var(--fp-halo, none); }
      ${sel}::after  { animation: var(--fp-embers, none); }
      ${FIREPLACE_KEYFRAMES}`;

registerKind("fireplace", {
  label: "Animated Fireplace",
  desc: "Flickering flame with a shifting halo and a slow ember bloom while it's lit",
  domains: ["switch", "input_boolean", "light", "climate"],
  schema: [F.icon, F.color, F.glow, { name: "tip_glow", selector: { text: {} } }, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Flame body colour as R, G, B (default 255, 87, 34)",
    tip_glow: "Flame-tip / ember colour as R, G, B (default 255, 190, 0)",
    speed: "Flicker duration (default 1.4s) — halo and embers stay deliberately out of step",
    active: "State that counts as lit (default: on; use `heat` for a climate entity)",
  },
  make: (c) => {
    const color = c.color || "deep-orange";
    const glow = c.glow || "255, 87, 34";
    const tip = c.tip_glow || "255, 190, 0";
    const speed = c.speed || "1.4s";
    const active = c.active || "on";
    const power = powerOf(c);
    return {
      ...(power
        ? powerFace(c.entity, c.name, power, color)
        : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
      icon: c.icon || "mdi:fire",
      layout: "vertical", fill_container: true,
      tap_action: { action: "toggle" },
      card_mod: { style: {
        "mushroom-shape-icon$": fireplaceIcon(".shape"),
        "ha-tile-icon$": fireplaceIcon(".container", "border-radius: 9999px;"),
        ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --fp-rgb: ${glow};
        --fp-tip: ${tip};
        --fp-anim: {{ 'flame-core ${speed} infinite' if on else 'none' }};
        --fp-halo: {{ 'flame-halo 1.8s infinite' if on else 'none' }};
        --fp-embers: {{ 'flame-embers 2.4s infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.6' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

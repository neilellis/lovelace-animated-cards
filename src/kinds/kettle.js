// upstream: README #22 - Kettle
//
// Upstream reuses the `tv-glitch` keyframes verbatim on a kettle — a CRT twitch reads as
// BROKEN, not boiling (design-principles §4 calls this out by name), and ships a dead
// `tv-standby` keyframe. Redrawn with the right metaphor: a heat glow that swells as the
// element works, plus a wisp of steam drifting up off the spout. Idle = still + dimmed.
//
// A kettle is a dumb 2–3 kW load, so the power override is the honest signal (the plug's own
// switch state can lie); set power_above around 100 W to catch the boil and ignore standby.

const KETTLE_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 60%;
        position: relative;
        overflow: visible !important;
        opacity: var(--ket-op, 0.55);
        animation: var(--ket-anim, none);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        left: 22%; right: 22%; top: -22px; height: 26px;
        border-radius: 50%;
        background: radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 70%);
        opacity: 0;
        pointer-events: none;
        animation: var(--ket-steam, none);
      }
      @keyframes kettle-heat {
        0%   { filter: brightness(1);    box-shadow: 0 0 8px 2px rgba(var(--ket-rgb, 255, 138, 101), 0.45); }
        50%  { filter: brightness(1.28); box-shadow: 0 0 26px 10px rgba(var(--ket-rgb, 255, 138, 101), 1); }
        100% { filter: brightness(1);    box-shadow: 0 0 8px 2px rgba(var(--ket-rgb, 255, 138, 101), 0.45); }
      }
      @keyframes kettle-steam {
        0%   { transform: translateY(6px) scaleX(0.7); opacity: 0; }
        35%  { opacity: 0.85; }
        100% { transform: translateY(-16px) scaleX(1.25); opacity: 0; }
      }`;

const kettleCard = (c) => {
  const speed = c.speed || "2.2s";
  const glow = c.glow || "255, 138, 101";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "deep-orange";
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
    icon: c.icon || "mdi:kettle-steam",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": KETTLE_FX(".shape"),
      "ha-tile-icon$": KETTLE_FX(".container", "9999px"),
      // a kettle boils for ~3 minutes a day → both animations default to `none`
      ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --ket-rgb: ${glow};
        --ket-anim: {{ 'kettle-heat ${speed} ease-in-out infinite' if on else 'none' }};
        --ket-steam: {{ 'kettle-steam ${speed} ease-out infinite' if on else 'none' }};
        --ket-op: {{ '1' if on else '0.55' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("kettle", {
  label: "Animated Kettle",
  desc: "Heat glow swells and steam drifts off the spout while it boils",
  domains: ["switch", "input_boolean", "binary_sensor"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Heat glow as R, G, B (default 255, 138, 101)",
    speed: "Boil cycle duration, e.g. 2.2s (smaller = angrier boil)",
    power_above: "Watts above which it counts as boiling — try ~100 for a kettle",
  },
  docs: "Redrawn from upstream: the original card animates a CRT `tv-glitch` on the kettle, which reads as a fault rather than a boil. This kind uses a heat glow + rising steam instead. On a metered plug set `power_entity` and `power_above: 100` so standby draw doesn't count as boiling.",
  make: kettleCard,
});

// upstream: README #37 - Air Purifier
//
// The motor breathes (a slow scale hum) and two rings of clean air ripple outwards, the second
// slower and offset so the pair never visibly repeats. Off → still and dimmed.
// Defaults to running: a purifier is generally left on, so "working" is the truthful look
// during the pre-template beat.

const AP_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        position: relative;
        overflow: visible !important;
        opacity: var(--ap-op, 1);
        animation: var(--ap-breath, ap-breath 3s ease-in-out infinite);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        animation: var(--ap-flow, ap-ripple 2s ease-out infinite);
      }
      ${sel}::before { z-index: -1; }
      ${sel}::after {
        background: rgba(var(--ap-rgb, 3, 169, 244), 0.1);
        z-index: -2;
        animation-duration: 3s;
        animation-delay: 0.5s;
      }
      @keyframes ap-ripple {
        0%   { transform: scale(1);   opacity: 0.8; box-shadow: 0 0 0 0 rgba(var(--ap-rgb, 3, 169, 244), 0.4); }
        100% { transform: scale(2.5); opacity: 0;   box-shadow: 0 0 20px 20px rgba(var(--ap-rgb, 3, 169, 244), 0); }
      }
      @keyframes ap-breath {
        0%   { transform: scale(1); }
        50%  { transform: scale(0.95); }
        100% { transform: scale(1); }
      }`;

const airPurifierCard = (c) => {
  const speed = c.speed || "3s";
  const glow = c.glow || "3, 169, 244";
  const active = c.active || "on";
  const power = powerOf(c);
  const color = c.color || "light-blue";
  return {
    ...(power
      ? powerFace(c.entity, c.name, power, color)
      : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
    icon: c.icon || "mdi:air-purifier",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": AP_FX(".shape"),
      "ha-tile-icon$": AP_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --ap-rgb: ${glow};
        --ap-breath: {{ 'ap-breath ${speed} ease-in-out infinite' if on else 'none' }};
        --ap-flow: {{ 'ap-ripple 2s ease-out infinite' if on else 'none' }};
        --ap-op: {{ '1' if on else '0.45' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("air-purifier", {
  label: "Animated Air Purifier",
  desc: "Motor hum breath with clean-air rings rippling out while it runs",
  domains: ["switch", "fan", "input_boolean"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Clean-air ring colour as R, G, B (default 3, 169, 244)",
    speed: "Motor-hum breath period, e.g. 3s",
  },
  make: airPurifierCard,
});

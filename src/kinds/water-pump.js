// upstream: README #41 - Water Pump
//
// While pumping: an impeller (a conic sheen) spins inside the icon, the housing buzzes with a
// high-frequency motor shake, and pressure rings flow outwards. Off/idle: everything stops —
// which is exactly what you want to see at a glance from a pump that shouldn't be running.

const WP_FX = (sel) => `
      ${sel} {
        border-radius: 50%;
        position: relative;
        overflow: visible !important;
        transform: translateZ(0);
        opacity: var(--wp-op, 0.5);
        animation: var(--wp-shake, none);
      }
      ${sel}::before {
        content: '';
        display: var(--wp-fx, none);
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(from 0deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.4) 25%,
          rgba(255, 255, 255, 0) 50%,
          rgba(255, 255, 255, 0.4) 75%,
          rgba(255, 255, 255, 0) 100%);
        mix-blend-mode: overlay;
        z-index: 1;
        animation: var(--wp-spin, none);
      }
      ${sel}::after {
        content: '';
        display: var(--wp-fx, none);
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(var(--wp-rgb, 33, 150, 243), 0.6);
        opacity: 0;
        z-index: -1;
        animation: var(--wp-flow, none);
      }
      @keyframes wp-hydro { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes wp-motor {
        0%   { transform: translate(0.5px, 0.5px); }
        100% { transform: translate(-0.5px, -0.5px); }
      }
      @keyframes wp-ripple {
        0%   { transform: scale(1);   opacity: 0.8; border-width: 4px; }
        100% { transform: scale(1.6); opacity: 0;   border-width: 0; }
      }`;

const waterPumpCard = (c) => {
  const speed = c.speed || "0.8s";
  const glow = c.glow || "33, 150, 243";
  const active = c.active || "on";
  const color = c.color || "blue";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:pump",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      // STATIC: all defaults off — a pump runs in short bursts, so "still" is the base rate.
      "mushroom-shape-icon$": WP_FX(".shape"),
      "ha-tile-icon$": WP_FX(".container"),
      ".": `${clip}
      ha-card {
        ${onTest(active)}
        --wp-rgb: ${glow};
        --wp-fx: {{ 'block' if on else 'none' }};
        --wp-spin: {{ 'wp-hydro ${speed} linear infinite' if on else 'none' }};
        --wp-shake: {{ 'wp-motor 0.12s ease-in-out infinite alternate' if on else 'none' }};
        --wp-flow: {{ 'wp-ripple 1.5s ease-out infinite' if on else 'none' }};
        --wp-op: {{ '1' if on else '0.5' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("water-pump", {
  label: "Animated Water Pump",
  desc: "Impeller spins, housing buzzes and pressure rings flow out while the pump runs",
  domains: ["switch", "input_boolean", "binary_sensor"],
  schema: [F.icon, F.color, F.glow, F.speed, F.active],
  help: {
    glow: "Pressure-ring colour as R, G, B (default 33, 150, 243)",
    speed: "Impeller revolution, e.g. 0.8s (smaller = faster)",
  },
  docs: "The motor buzz is a 0.12s alternate shake (upstream's 0.1s reads as a strobe on a big display). A pump that is powered but not running still animates — this card reads the entity's state, nothing else.",
  make: waterPumpCard,
});

// upstream: README #34 - Home Server
//
// A squared-off rack box: three activity LEDs flicker like disk I/O and a soft radial glow
// throbs behind the icon like network load. Off → monochrome and dim.
// Defaults to alive: a home server runs 24/7, so "up" is the truthful pre-template look.
//
// Upstream applies its `network-pulse` keyframe (which animates opacity 0.3 → 0.6) to BOTH the
// glow layer and the shape itself, so the whole icon drops to 30 % opacity mid-pulse. Split here:
// the shape gets a scale-only throb, the ::after glow keeps the opacity swell it was written for.

const SRV_FX = (sel) => `
      ${sel} {
        border-radius: 12px !important;
        transform-origin: 50% 50%;
        position: relative;
        filter: var(--srv-filter, grayscale(0%));
        opacity: var(--srv-op, 1);
        animation: var(--srv-throb, srv-throb 1.5s ease-in-out infinite);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        bottom: 25%; right: 25%;
        width: 6px; height: 6px;
        border-radius: 50%;
        box-shadow: 10px 0 0 0 #00ff00, 0 10px 0 0 #ffaa00, 10px 10px 0 0 #00ff00;
        opacity: 0;
        z-index: 2;
        animation: var(--srv-disk, srv-blink 0.5s steps(2, start) infinite);
      }
      ${sel}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle, rgba(var(--srv-rgb, 33, 150, 243), 0.5) 0%, transparent 70%);
        opacity: 0;
        z-index: 1;
        animation: var(--srv-glow, srv-glow 1.5s ease-in-out infinite);
      }
      @keyframes srv-throb {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.03); }
        100% { transform: scale(1); }
      }
      @keyframes srv-glow {
        0%   { opacity: 0.3; }
        50%  { opacity: 0.6; }
        100% { opacity: 0.3; }
      }
      @keyframes srv-blink {
        0%   { opacity: 0; }
        25%  { opacity: 1; }
        50%  { opacity: 0; }
        75%  { opacity: 1; }
        90%  { opacity: 0; }
        100% { opacity: 1; }
      }`;

const serverCard = (c) => {
  const speed = c.speed || "1.5s";
  const glow = c.glow || "33, 150, 243";
  const active = c.active || "on";
  const color = c.color || "blue";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:server-network",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": SRV_FX(".shape"),
      "ha-tile-icon$": SRV_FX(".container"),
      ".": `${clip}
      ha-card {
        ${onTest(active)}
        --srv-rgb: ${glow};
        --srv-throb: {{ 'srv-throb ${speed} ease-in-out infinite' if on else 'none' }};
        --srv-glow: {{ 'srv-glow ${speed} ease-in-out infinite' if on else 'none' }};
        --srv-disk: {{ 'srv-blink 0.5s steps(2, start) infinite' if on else 'none' }};
        --srv-filter: {{ 'grayscale(0%)' if on else 'grayscale(100%)' }};
        --srv-op: {{ '1' if on else '0.4' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("server", {
  label: "Animated Home Server",
  desc: "Rack box with flickering disk LEDs and a throbbing network glow while it's up",
  domains: ["switch", "binary_sensor", "input_boolean", "device_tracker"],
  deviceClass: ["connectivity", "running"],
  schema: [F.icon, F.color, F.glow, F.speed, F.active],
  help: {
    glow: "Network-load glow as R, G, B (default 33, 150, 243)",
    speed: "Network throb period, e.g. 1.5s",
    active: "State that counts as up — a ping/connectivity binary_sensor is the best signal (default: on)",
  },
  make: serverCard,
});

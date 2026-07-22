// upstream: README #25 - Router
//
// Three concentric wifi rings radiate out of the icon while the router is up, then fade.
// Unlike most of the plug-driven cards this one defaults to ANIMATING: a router is up
// essentially always, so "broadcasting" is the truthful pre-template look and a dark, still
// card genuinely means something is wrong.
//
// Bind a switch/plug, or a connectivity binary_sensor (device_class connectivity, 'on' = up).

const ROUTER_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        position: relative;
        opacity: var(--rtr-op, 1);
        animation: var(--rtr-anim, rtr-waves 1.7s ease-out infinite);
      }
      @keyframes rtr-waves {
        0% {
          box-shadow:
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0.9),
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0.5),
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0.2);
        }
        30% {
          box-shadow:
            0 0 0 4px rgba(var(--rtr-rgb, 33, 150, 243), 0.6),
            0 0 0 10px rgba(var(--rtr-rgb, 33, 150, 243), 0.35),
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0.2);
        }
        60% {
          box-shadow:
            0 0 0 8px rgba(var(--rtr-rgb, 33, 150, 243), 0),
            0 0 0 18px rgba(var(--rtr-rgb, 33, 150, 243), 0.25),
            0 0 0 28px rgba(var(--rtr-rgb, 33, 150, 243), 0.1);
        }
        100% {
          box-shadow:
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0),
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0),
            0 0 0 0 rgba(var(--rtr-rgb, 33, 150, 243), 0);
        }
      }`;

const routerCard = (c) => {
  const speed = c.speed || "1.7s";
  const glow = c.glow || "33, 150, 243";
  const active = c.active || "on";
  const color = c.color || "blue";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:router-wireless",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": ROUTER_FX(".shape"),
      "ha-tile-icon$": ROUTER_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active)}
        --rtr-rgb: ${glow};
        --rtr-anim: {{ 'rtr-waves ${speed} ease-out infinite' if on else 'none' }};
        --rtr-op: {{ '1' if on else '0.45' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("router", {
  label: "Animated Router",
  desc: "Wifi rings radiate out while the router is up; dark and still when it isn't",
  domains: ["switch", "binary_sensor", "input_boolean"],
  deviceClass: ["connectivity"],
  schema: [F.icon, F.color, F.glow, F.speed, F.active],
  help: {
    glow: "Ring colour as R, G, B (default 33, 150, 243)",
    speed: "Time for one ring to travel out, e.g. 1.7s",
  },
  make: routerCard,
});

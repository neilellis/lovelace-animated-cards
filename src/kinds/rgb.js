// upstream: README #21 - RGB
//
// An RGB light/strip on a plug: the icon disc cycles the whole hue wheel while on, still and
// dimmed when off. Upstream's number/state "USER CONFIG" block collapses into the entity +
// the optional power override (onTest). Default = animating: an RGB accent is usually put on a
// dashboard because it's lit, and it's the same base-rate call animLedStrip makes.

const RGB_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        opacity: var(--rgbc-op, 1);
        animation: var(--rgbc-anim, rgb-hue 3s linear infinite);
      }
      @keyframes rgb-hue {
        0%   { filter: hue-rotate(0deg) brightness(1.1);   box-shadow: 0 0 10px 3px rgba(var(--rgbc-glow, 33, 150, 243), 0.55); }
        50%  { filter: hue-rotate(180deg) brightness(1.3); box-shadow: 0 0 20px 8px rgba(var(--rgbc-glow, 33, 150, 243), 0.9); }
        100% { filter: hue-rotate(360deg) brightness(1.1); box-shadow: 0 0 10px 3px rgba(var(--rgbc-glow, 33, 150, 243), 0.55); }
      }`;

const rgbCard = (c) => {
  const speed = c.speed || "3s";
  const glow = c.glow || "33, 150, 243";
  const active = c.active || "on";
  const color = c.color || "blue";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:led-on",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": RGB_FX(".shape"),
      "ha-tile-icon$": RGB_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        ${onTest(active)}
        --rgbc-glow: ${glow};
        --rgbc-anim: {{ 'rgb-hue ${speed} linear infinite' if on else 'none' }};
        --rgbc-op: {{ '1' if on else '0.5' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("rgb", {
  label: "Animated RGB Light",
  desc: "Icon disc cycles the hue wheel while the RGB light/strip is on",
  domains: ["switch", "light", "input_boolean"],
  schema: [F.icon, F.color, F.glow, F.speed, F.active],
  help: {
    glow: "Halo colour as R, G, B — the hue cycle rotates away from it (default 33, 150, 243)",
    speed: "One full hue rotation, e.g. 3s (smaller = faster)",
  },
  make: rgbCard,
});

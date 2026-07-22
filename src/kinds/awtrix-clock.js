// upstream: README #38 - Awtrix Clock
//
// The icon becomes a little LED matrix: a pixel grid etched over the shape, a rainbow marquee
// scrolling across it, CRT scanline glare on top and a fine refresh flicker. Powered but idle it
// just breathes; off it goes monochrome and dark.
// Upstream scrolls the marquee by animating `left` (a layout property — never loop those, §4);
// it's a translateX here. Defaults to scrolling: an Awtrix cycles its apps all day.

const AWX_FX = (sel) => `
      ${sel} {
        border-radius: 8px !important;
        transform-origin: 50% 50%;
        position: relative;
        overflow: hidden;
        background-image:
          linear-gradient(rgba(0, 0, 0, 0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.2) 1px, transparent 1px) !important;
        background-size: 4px 4px !important;
        filter: var(--awx-filter, grayscale(0%));
        opacity: var(--awx-op, 1);
        animation: var(--awx-flicker, awx-refresh 0.1s steps(2) infinite);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(255, 0, 0, 0.6) 20%,
          rgba(255, 255, 0, 0.6) 40%,
          rgba(0, 255, 0, 0.6) 60%,
          rgba(0, 255, 255, 0.6) 80%,
          transparent 100%);
        mix-blend-mode: color-dodge;
        transform: translateX(-100%);
        animation: var(--awx-scroll, awx-marquee 1.5s linear infinite);
      }
      ${sel}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(rgba(255, 255, 255, 0.1) 50%, rgba(0, 0, 0, 0.1) 50%);
        background-size: 100% 4px;
        pointer-events: none;
        z-index: 2;
      }
      @keyframes awx-marquee {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes awx-refresh {
        0%   { opacity: 1; }
        100% { opacity: 0.95; }
      }
      @keyframes awx-breathe {
        0%   { filter: brightness(1); }
        50%  { filter: brightness(1.2); }
        100% { filter: brightness(1); }
      }`;

// "showing something" test: the power sensor when configured, otherwise on == scrolling
const AWX_BUSY = (power) => power
  ? `{% set busy = states('${power.entity}') | float(-1) > ${power.above ?? 0.5} %}`
  : `{% set busy = on %}`;

const awtrixCard = (c) => {
  const speed = c.speed || "1.5s";
  const active = c.active || "on";
  const color = c.color || "cyan";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:clock-digital",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": AWX_FX(".shape"),
      "ha-tile-icon$": AWX_FX(".container"),
      ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        ${AWX_BUSY(power)}
        {% if busy %}
          --awx-scroll: awx-marquee ${speed} linear infinite;
          --awx-flicker: awx-refresh 0.1s steps(2) infinite;
          --awx-filter: grayscale(0%);
          --awx-op: 1;
        {% elif on %}
          --awx-scroll: none;
          --awx-flicker: awx-breathe 4s ease-in-out infinite;
          --awx-filter: grayscale(0%);
          --awx-op: 1;
        {% else %}
          --awx-scroll: none;
          --awx-flicker: none;
          --awx-filter: grayscale(100%);
          --awx-op: 0.4;
        {% endif %}
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("awtrix-clock", {
  label: "Animated Pixel Clock",
  desc: "LED-matrix look — pixel grid, scrolling rainbow marquee and scanline glare (Awtrix/Ulanzi)",
  domains: ["switch", "light", "input_boolean"],
  schema: [F.icon, F.color, F.speed, F.active],
  help: {
    speed: "Marquee crossing time, e.g. 1.5s",
    active: "State that counts as powered on (default: on)",
  },
  make: awtrixCard,
});

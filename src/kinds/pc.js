// upstream: README #33 - PC
//
// Desktop tower: a squared-off case that cycles an RGB LED-strip glow around its edge and
// blinks a power-button LED while it's running. Off, the whole thing goes monochrome and dim —
// the corpus's clearest "this is dead" treatment, and the reason `unavailable` can't read as on.
// Upstream's LED is `background-color: #ffff` (a typo for yellow that renders white); fixed here
// and exposed as `led_color`.

const PC_FX = (sel) => `
      ${sel} {
        border-radius: 12px !important;
        position: relative;
        transform: translateZ(0);
        filter: var(--pc-filter, grayscale(100%));
        opacity: var(--pc-op, 0.4);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        z-index: -1;
        animation: var(--pc-glow, none);
      }
      ${sel}::after {
        content: '';
        position: absolute;
        top: 72%; right: 14%;
        width: 5px; height: 5px;
        border-radius: 50%;
        background-color: var(--pc-led, #ffeb3b);
        box-shadow: 0 0 5px var(--pc-led, #ffeb3b);
        opacity: var(--pc-led-op, 0);
        animation: var(--pc-led-anim, none);
      }
      @keyframes pc-rgb {
        0%   { box-shadow: 0 0 10px 2px rgba(255, 0, 0, 0.6),   inset 0 0 15px rgba(255, 0, 0, 0.2); }
        25%  { box-shadow: 0 0 10px 2px rgba(255, 0, 255, 0.6), inset 0 0 15px rgba(255, 0, 255, 0.2); }
        50%  { box-shadow: 0 0 10px 2px rgba(0, 0, 255, 0.6),   inset 0 0 15px rgba(0, 0, 255, 0.2); }
        75%  { box-shadow: 0 0 10px 2px rgba(0, 255, 255, 0.6), inset 0 0 15px rgba(0, 255, 255, 0.2); }
        100% { box-shadow: 0 0 10px 2px rgba(255, 0, 0, 0.6),   inset 0 0 15px rgba(255, 0, 0, 0.2); }
      }
      @keyframes pc-led-blink {
        0%   { opacity: 1;   transform: scale(1); }
        50%  { opacity: 0.3; transform: scale(0.9); }
        100% { opacity: 1;   transform: scale(1); }
      }`;

const pcCard = (c) => {
  const speed = c.speed || "5s";
  const led = c.led_color || "#ffeb3b";
  const active = c.active || "on";
  const color = c.color || "white";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:desktop-tower",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      "mushroom-shape-icon$": PC_FX(".shape"),
      "ha-tile-icon$": PC_FX(".container"),
      ".": `${clip}
      ha-card {
        ${onTest(active)}
        --pc-led: ${led};
        --pc-glow: {{ 'pc-rgb ${speed} linear infinite' if on else 'none' }};
        --pc-led-anim: {{ 'pc-led-blink 0.5s steps(2, start) infinite' if on else 'none' }};
        --pc-led-op: {{ '1' if on else '0' }};
        --pc-filter: {{ 'grayscale(0%)' if on else 'grayscale(100%)' }};
        --pc-op: {{ '1' if on else '0.4' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("pc", {
  label: "Animated PC",
  desc: "Tower case with an RGB edge glow and a blinking power LED while it runs",
  domains: ["switch", "input_boolean", "binary_sensor", "device_tracker"],
  schema: [F.icon, F.color, { name: "led_color", selector: { text: {} } }, F.speed, F.active],
  help: {
    led_color: "Power-button LED colour (CSS colour, default #ffeb3b)",
    speed: "One full RGB cycle, e.g. 5s",
    active: "State that counts as running — for a device_tracker/ping sensor use `home` or `on`",
  },
  make: pcCard,
});

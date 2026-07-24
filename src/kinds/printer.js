// upstream: README #36 - Printer
//
// Printing: the icon shakes with the mechanism, a scanner beam sweeps down through it and a
// green status LED blinks. Powered but idle: colour, no motion. Off: monochrome and dim.
// Upstream animates the beam by looping the `top` property (a layout property — §4 of the design
// guide: never loop those); it's a translateY here, which is composited.
//
// The "printing" signal is the optional power sensor (an inkjet idles at a couple of watts and
// spikes to a few hundred while it prints) — with no sensor configured, on == printing.

const PRN_FX = (sel, radius) => `
      ${sel} {${radius ? `
        border-radius: ${radius};` : ``}
        transform-origin: 50% 50%;
        position: relative;
        overflow: hidden;
        filter: var(--prn-filter, grayscale(100%));
        opacity: var(--prn-op, 0.45);
        animation: var(--prn-shake, none);
      }
      ${sel}::before {
        content: '';
        position: absolute;
        left: 0; right: 0; top: 0;
        height: 30%;
        background: linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%);
        mix-blend-mode: overlay;
        pointer-events: none;
        animation: var(--prn-scan, none);
      }
      ${sel}::after {
        content: '';
        position: absolute;
        bottom: 15%; right: 15%;
        width: 8px; height: 8px;
        border-radius: 50%;
        background-color: var(--prn-led, #00ff00);
        box-shadow: 0 0 5px var(--prn-led, #00ff00);
        opacity: 0;
        animation: var(--prn-led-anim, none);
      }
      @keyframes prn-vibrate {
        0%   { transform: translate(0, 0); }
        25%  { transform: translate(-1px, 1px); }
        50%  { transform: translate(1px, -1px); }
        75%  { transform: translate(-1px, -1px); }
        100% { transform: translate(0, 0); }
      }
      @keyframes prn-scan {
        0%   { transform: translateY(-140%); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateY(400%); opacity: 0; }
      }
      @keyframes prn-led-blink {
        0%   { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1.2); }
      }`;

// printing test: the printer's own state decides on/off; an optional power sensor separates
// "actually printing" from "merely powered" — watts as a SECOND signal, never as the state (v0.3.0).
const PRN_BUSY = (sensor, above) => sensor
  ? `{% set busy = on and states('${sensor}') | float(-1) > ${above ?? 15} %}`
  : `{% set busy = on %}`;

const printerCard = (c) => {
  const speed = c.speed || "1.5s";
  const led = c.led_color || "#00ff00";
  const active = c.active || "on";
  const color = c.color || "amber";
  return {
    ...{ type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color },
    icon: c.icon || "mdi:printer",
    layout: "vertical", fill_container: true,
    tap_action: { action: "toggle" },
    card_mod: { style: {
      // STATIC: defaults describe an OFF printer — printing is measured in minutes per week.
      "mushroom-shape-icon$": PRN_FX(".shape"),
      "ha-tile-icon$": PRN_FX(".container", "9999px"),
      ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        ${PRN_BUSY(c.power_entity, c.power_above)}
        --prn-led: ${led};
        --prn-shake: {{ 'prn-vibrate 0.2s linear infinite' if busy else 'none' }};
        --prn-scan: {{ 'prn-scan ${speed} ease-in-out infinite' if busy else 'none' }};
        --prn-led-anim: {{ 'prn-led-blink 1s infinite alternate' if busy else 'none' }};
        --prn-filter: {{ 'grayscale(0%)' if on else 'grayscale(100%)' }};
        --prn-op: {{ '1' if on else '0.45' }};
      }`,
    } },
    grid_options: { columns: 6, rows: 2 },
  };
};

registerKind("printer", {
  label: "Animated Printer",
  desc: "Shakes and sweeps a scanner beam while printing; colour but still when idle",
  domains: ["switch", "input_boolean", "binary_sensor", "sensor"],
  schema: [F.icon, F.color, { name: "led_color", selector: { text: {} } }, F.speed, F.active,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "power_above", selector: { number: { min: 0, step: 0.1, mode: "box", unit_of_measurement: "W" } } },
  ],
  help: {
    power_entity: "Optional watts sensor for the busy level — the card's entity still decides on/off; above the threshold reads as printing, below it as powered but idle (colour, but still)",
    power_above: "Watts above which it counts as printing (default 15 W)",
    led_color: "Status LED colour (CSS colour, default #00ff00)",
    speed: "Scanner-beam sweep duration, e.g. 1.5s",
    active: "State that counts as powered on (default: on)",
  },
  docs: "Two-level card: `active` decides powered vs dead (colour vs monochrome), while shake/beam/LED only run when it's actually printing. Supply a `power_entity` for that second level — above `power_above` (default 15 W) it's printing, below it it's merely warm. Without one, a printer that is simply on animates continuously. The watts are the *busy* signal only; on/off still comes from the card's own entity.",
  make: printerCard,
});

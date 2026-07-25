// kinds/pixel-clock.js — Animated Pixel Clock.
//
// A real clock in the Awtrix LED-matrix style (the awtrix-clock kind is an icon effect for an
// actual Awtrix/Ulanzi device and shows no time — this one IS the display). No entity needed:
// the whole card is a dark LED panel with a pixel grid, CRT scanlines, a slow rainbow marquee
// washing across the glass and glowing dot-matrix digits. `now()` in the templates re-renders
// the card every minute, which is exactly a clock's tick.
//
// This one is deliberately LOUD: it simulates a physical LED panel, so it flickers, scans and
// marquees whether or not anything is happening. That fights the idle-is-quiet rule and it fights
// the rest of a view — use it as a novelty/standalone panel. For a clock that sits alongside the
// other cards, use the `clock` kind (analog dial or quiet digital, zero looping animation).

// The digit sizes live in BOTH text-shadow scopes (tile + legacy Mushroom): the card's
// .primary/.secondary set their own font-size inside the shadow root, so host-level
// --card-primary-font-size never lands — same adoptedStyleSheets battle as the icon sizes.
const PXC_TEXT = `
      .primary { font-size: 32px !important; font-weight: 800 !important; line-height: 1.15 !important; }
      .secondary { font-size: 13px !important; }`;

const PXC_FX = `
      ha-card {
        min-height: 96px;
        justify-content: center;
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        background:
          linear-gradient(rgba(0, 0, 0, 0.35) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.35) 1px, transparent 1px),
          radial-gradient(circle at 50% 10%, #101913 0%, #0a0f0b 70%, #070a08 100%);
        background-size: 4px 4px, 4px 4px, 100% 100%;
        border: 1px solid #1c2620;
        text-align: center;
        --card-primary-font-size: 2.5rem;
        --card-primary-font-weight: 800;
        --card-secondary-font-size: 0.95rem;
        --card-primary-color: rgb(var(--pxc-rgb, 57, 255, 110));
        --primary-text-color: rgb(var(--pxc-rgb, 57, 255, 110));
        --card-secondary-color: rgba(var(--pxc-rgb, 57, 255, 110), 0.55);
        --secondary-text-color: rgba(var(--pxc-rgb, 57, 255, 110), 0.55);
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        letter-spacing: 3px;
        text-shadow: 0 0 8px rgba(var(--pxc-rgb, 57, 255, 110), 0.9), 0 0 22px rgba(var(--pxc-rgb, 57, 255, 110), 0.4);
        animation: pxc-refresh 0.12s steps(2) infinite;
      }
      /* the rainbow app-marquee washing across the matrix, additive like the Awtrix's LEDs */
      ha-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0;
        width: 60%; height: 100%;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(255, 0, 0, 0.28) 20%,
          rgba(255, 255, 0, 0.28) 40%,
          rgba(0, 255, 0, 0.28) 60%,
          rgba(0, 255, 255, 0.28) 80%,
          transparent 100%);
        mix-blend-mode: color-dodge;
        transform: translateX(-100%);
        animation: pxc-marquee var(--pxc-speed, 8s) linear infinite;
        z-index: 1;
        pointer-events: none;
      }
      /* CRT scanline glare over everything */
      ha-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(rgba(255, 255, 255, 0.06) 50%, rgba(0, 0, 0, 0.12) 50%);
        background-size: 100% 4px;
        pointer-events: none;
        z-index: 2;
      }
      @keyframes pxc-marquee {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(280%); }
      }
      @keyframes pxc-refresh {
        0%   { filter: brightness(1); }
        100% { filter: brightness(1.06); }
      }`;

registerKind("pixel-clock", {
  label: "Animated Pixel Clock",
  desc: "LED-matrix clock — glowing dot-matrix time over a pixel grid with scanlines and a slow rainbow marquee (no entity needed)",
  entityOptional: true,
  schema: [
    F.glow,
    { name: "twelve_hour", selector: { boolean: {} } },
    { name: "hide_date", selector: { boolean: {} } },
    F.speed,
  ],
  help: {
    glow: "LED colour as R, G, B (default 57, 255, 110 — matrix green)",
    twelve_hour: "Show 12-hour time with am/pm instead of 24-hour",
    hide_date: "Show only the time, no weekday/date line",
    speed: "Marquee crossing time, e.g. 8s (smaller = faster)",
  },
  docs: `No entity required — the card renders the current time (updates every minute) as a
glowing LED-matrix panel. An optional entity makes tap open its more-info dialog.`,
  make: (c) => ({
    type: "custom:mushroom-template-card",
    ...(c.entity ? { entity: c.entity } : {}),
    primary: c.twelve_hour ? "{{ now().strftime('%-I:%M %p') | lower }}" : "{{ now().strftime('%H:%M') }}",
    secondary: c.hide_date ? "" : "{{ now().strftime('%A %-d %B') }}",
    layout: "vertical",
    tap_action: c.entity ? { action: "more-info" } : { action: "none" },
    card_mod: { style: {
      "ha-tile-info$": PXC_TEXT,
      "mushroom-state-info$": PXC_TEXT,
      ".": `${PXC_FX}
      ha-card {
        --pxc-rgb: ${c.glow || "57, 255, 110"};
        ${c.speed ? `--pxc-speed: ${c.speed};` : ""}
      }` } },
    grid_options: { columns: 6, rows: 2 },
  }),
});

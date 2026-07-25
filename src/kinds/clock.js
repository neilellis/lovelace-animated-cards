// kinds/clock.js — Animated Clock (house design language).
//
// The sibling of `pixel-clock`, written because the LED-matrix panel is a loud, self-contained
// look that fights every other card on a view (Neil's call, 2026-07-25). This one is built from
// the corpus's own vocabulary instead: a Mushroom tile, a metaphor drawn INSIDE the icon disc,
// the reading in the card's normal type, the house cyan as the one accent.
//
// It is also the cleanest statement of the idle-is-quiet rule (design-principles §6): the card
// has NO looping animation at all. `now()` re-renders the template on every minute boundary, the
// hands are CSS-var rotations with a 0.6s eased transition, so the ONLY motion on the card is a
// hand sweeping to its new position when the time actually changes.
//
//   variant: analog  — clock face in the icon disc (tick ring, steel hour hand, cyan minute
//                      hand) + digital readout in the text
//   variant: digital — no dial: big monospace time, quiet date line, soft accent glow
//
// Hand angles are cumulative over the day (minute = minutes-since-midnight × 6°) so the eased
// transition always sweeps FORWARD; only the midnight wrap runs backwards, once a day.

const CLK_FACE = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px !important;
        position: relative;
        background:
          radial-gradient(circle at 50% 50%, #131820 0 68%, transparent 69%),
          repeating-conic-gradient(from -90deg,
            rgba(var(--clk-rgb, 0, 200, 255), 0.5) 0deg 1.6deg,
            transparent 1.6deg 30deg) !important;
        border: 1px solid rgba(var(--clk-rgb, 0, 200, 255), 0.22);
        box-shadow: inset 0 0 14px rgba(var(--clk-rgb, 0, 200, 255), 0.12);
        opacity: var(--clk-op, 1);
      }
      /* the two hands. bottom/left 50% + transform-origin 50% 100% pins both pivots on the
         dial centre; the % heights resolve against the disc, so they scale with icon size. */
      ${root}::before, ${root}::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 50%;
        transform-origin: 50% 100%;
        border-radius: 2px;
        transition: transform 0.6s cubic-bezier(0.34, 1.4, 0.5, 1);
      }
      ${root}::before {
        width: 3px; height: 21%;
        margin-left: -1.5px;
        background: rgba(226, 234, 242, 0.92);
        transform: rotate(var(--clk-hour, 0deg));
      }
      ${root}::after {
        width: 2px; height: 31%;
        margin-left: -1px;
        background: rgb(var(--clk-rgb, 0, 200, 255));
        box-shadow: 0 0 7px rgba(var(--clk-rgb, 0, 200, 255), 0.85);
        transform: rotate(var(--clk-min, 0deg));
      }`;

// Digits live in BOTH text scopes: .primary/.secondary set their own font-size inside the
// shadow root, so a host-level --card-primary-font-size never lands (adoptedStyleSheets).
const CLK_TEXT = (px) => `
      .primary {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace !important;
        font-size: ${px} !important;
        font-weight: 700 !important;
        letter-spacing: 1px !important;
        line-height: 1.1 !important;
      }
      .secondary { font-size: 12.5px !important; letter-spacing: 0.3px !important; }`;

registerKind("clock", {
  label: "Animated Clock",
  desc: "Time in the house card language — an analog dial drawn in the icon disc (or a quiet digital readout). No looping animation: the hands only move when the minute does",
  entityOptional: true,
  schema: [
    F.variant(["analog", "digital"]),
    F.glow,
    { name: "twelve_hour", selector: { boolean: {} } },
    { name: "hide_date", selector: { boolean: {} } },
  ],
  help: {
    variant: "analog = clock face in the icon disc; digital = big monospace time, no dial",
    glow: "Accent colour as R, G, B — the minute hand / digit glow (default 0, 200, 255, the house cyan)",
    twelve_hour: "Show 12-hour time with am/pm instead of 24-hour",
    hide_date: "Hide the weekday/date line",
  },
  docs: `No entity required — the card renders the current time and re-renders on every minute
boundary. An optional entity makes tap open its more-info dialog. Deliberately the quietest card
in the set: nothing loops, the hands just ease to their new angle each minute.`,
  make: (c) => {
    const rgb = c.glow || "0, 200, 255";
    const time = c.twelve_hour ? "{{ now().strftime('%-I:%M %p') | lower }}" : "{{ now().strftime('%H:%M') }}";
    const date = c.hide_date ? "" : "{{ now().strftime('%A %-d %B') }}";
    const digital = c.variant === "digital";

    // cumulative angles → the eased transition always sweeps forward (see header)
    const angles = `
        {% set n = now() %}
        --clk-hour: {{ ((n.hour * 60 + n.minute) * 0.5) | round(1) }}deg;
        --clk-min: {{ (n.hour * 60 + n.minute) * 6 }}deg;`;

    if (digital) {
      return {
        type: "custom:mushroom-template-card",
        ...(c.entity ? { entity: c.entity } : {}),
        primary: time,
        secondary: date,
        layout: "vertical",
        tap_action: c.entity ? { action: "more-info" } : { action: "none" },
        card_mod: { style: {
          "ha-tile-info$": CLK_TEXT("34px"),
          "mushroom-state-info$": CLK_TEXT("34px"),
          ".": `
          /* no dial, no icon — the time IS the card */
          ha-tile-icon, mushroom-shape-icon, ha-state-icon, ha-icon { display: none !important; }
          ha-card {
            --clk-rgb: ${rgb};
            min-height: 92px;
            justify-content: center;
            text-align: center;
            --card-primary-color: rgba(236, 242, 248, 0.96);
            --primary-text-color: rgba(236, 242, 248, 0.96);
            --card-secondary-color: rgba(var(--clk-rgb), 0.7);
            --secondary-text-color: rgba(var(--clk-rgb), 0.7);
            text-shadow: 0 0 14px rgba(var(--clk-rgb), 0.35);
            border: 1px solid rgba(var(--clk-rgb), 0.16);
          }`,
        } },
        grid_options: { columns: 6, rows: 2 },
      };
    }

    return {
      type: "custom:mushroom-template-card",
      ...(c.entity ? { entity: c.entity } : {}),
      primary: time,
      secondary: date,
      icon: "mdi:clock-outline",
      icon_color: "cyan",
      tap_action: c.entity ? { action: "more-info" } : { action: "none" },
      card_mod: { style: {
        "mushroom-shape-icon$": CLK_FACE(".shape", "--icon-size: 62px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": CLK_FACE(".container", "width: 62px !important; height: 62px !important;"),
        "ha-tile-info$": CLK_TEXT("26px"),
        "mushroom-state-info$": CLK_TEXT("26px"),
        ".": `
        mushroom-shape-icon { --icon-size: 62px; display: flex; margin: 0 !important; }
        ha-tile-icon { --tile-icon-size: 62px; width: 62px; height: 62px; }
        /* the dial is the icon — the mdi glyph would sit under the hands */
        ha-state-icon, ha-icon { display: none !important; }
        ha-card {
          --clk-rgb: ${rgb};${angles}
          --card-primary-color: rgba(236, 242, 248, 0.96);
          --primary-text-color: rgba(236, 242, 248, 0.96);
          --card-secondary-color: rgba(var(--clk-rgb), 0.7);
          --secondary-text-color: rgba(var(--clk-rgb), 0.7);
        }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

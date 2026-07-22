// upstream: README #67 - Fuel Tank
//
// ── SHARED: the level tank ────────────────────────────────────────────────────────────────
// README #66 (water) and #67 (fuel) are byte-identical apart from two RGB strings and the
// icon, so one drawing serves both (see kinds/water-tank.js for the sibling).
//
// The card itself is the tank: a `linear-gradient(to top, …)` whose hard colour stop sits at
// the level — that stop IS the waterline. Two pseudo-elements pinned at the stop draw a
// scalloped surface (`radial-gradient` repeated on x) and counter-scroll — one left over 10 s,
// one right over 3 s — which is what makes it read as a living liquid rather than a bar chart.
// Both surfaces vanish at 0 % and 100 %: an empty or brim-full tank has no visible surface.
//
// Declared as a hoisted `function` so build order between the two tank files doesn't matter.
function tankCard(c, { icon, name, fullRgb, lowRgb = "150, 29, 29", lowAt = 20 }) {
  return {
    type: "custom:mushroom-entity-card",
    entity: c.entity,
    name: c.name || name,
    icon: c.icon || icon,
    icon_color: "white",
    primary_info: "state", secondary_info: "name",
    layout: "vertical",
    tap_action: { action: "more-info" },
    card_mod: { style: {
      ".": `
      ha-card {
        {% set lvl = states(config.entity) | float(-999) %}
        {% set dead = lvl < -900 %}
        {% set lvl = [[lvl, 0] | max, 100] | min %}
        {% if dead %}{% set rgb = '90, 96, 104' %}
        {% elif lvl <= ${c.low_at || lowAt} %}{% set rgb = '${c.low_color || lowRgb}' %}
        {% else %}{% set rgb = '${c.color || fullRgb}' %}{% endif %}
        --tank-color: rgb({{ rgb }});
        --tank-color-light: rgba({{ rgb }}, 0.7);
        --tank-level: {{ '0%' if dead else (lvl | round(1) ~ '%') }};
        /* a surface only exists between empty and brim-full — and never on a dead sensor */
        --tank-wave: {{ 'none' if dead or lvl <= 0 or lvl >= 100 else 'block' }};
        --tank-wave-size: 40px;
        --card-primary-font-size: 20px;
        --card-secondary-font-size: 14px;
        height: ${c.height || "200px"} !important;
        background: linear-gradient(to top,
          var(--tank-color) 0%,
          var(--tank-color) var(--tank-level, 0%),
          transparent var(--tank-level, 0%),
          transparent 100%) !important;
        border: 1px solid rgba({{ rgb }}, 1);
        opacity: {{ '0.55' if dead else '1' }};
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 0;
      }
      ha-card::before, ha-card::after {
        content: "";
        position: absolute;
        z-index: 1;
        height: 30px;
        width: 200%;
        left: 0;
        bottom: var(--tank-level, 0%);
        background-size: var(--tank-wave-size, 40px) 40px;
        background-repeat: repeat-x;
        display: var(--tank-wave, none);
        pointer-events: none;
        transition: bottom 0.6s ease;
      }
      /* front surface — slow drift left */
      ha-card::after {
        background-image: radial-gradient(circle at 50% 100%, var(--tank-color) 65%, transparent 66%);
        animation: tank-scroll-left 10s linear infinite;
      }
      /* back surface — faster drift right, offset 5px; the parallax is the whole trick */
      ha-card::before {
        background-image: radial-gradient(circle at 50% 100%, var(--tank-color-light) 65%, transparent 66%);
        animation: tank-scroll-right 3s linear infinite;
        bottom: calc(var(--tank-level, 0%) + 5px);
      }
      /* lift the real content clear of the liquid, with a shadow so it stays legible over it */
      mushroom-card-content { position: relative !important; z-index: 10 !important; }
      mushroom-shape-icon { position: relative !important; z-index: 11 !important; --icon-size: 60px !important; }
      mushroom-state-info { position: relative !important; z-index: 11 !important; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
      ha-state-icon { color: white !important; }
      @keyframes tank-scroll-left {
        from { transform: translateX(0); }
        to   { transform: translateX(calc(var(--tank-wave-size, 40px) * -1)); }
      }
      @keyframes tank-scroll-right {
        from { transform: translateX(calc(var(--tank-wave-size, 40px) * -1)); }
        to   { transform: translateX(0); }
      }`,
    } },
    grid_options: { columns: 6, rows: 3 },
  };
}

// Editor rows / helper text / README note shared by both tanks. Hoisted `function`s rather
// than consts — water-tank.js reads them at REGISTRATION time and build order must not matter.
function tankRows() {
  return [
    F.icon,
    { name: "color", selector: { text: {} } },
    { name: "low_color", selector: { text: {} } },
    { name: "low_at", selector: { number: { min: 0, max: 99, step: 1, mode: "box", unit_of_measurement: "%" } } },
    { name: "height", selector: { text: {} } },
  ];
}
function tankHelp() {
  return {
    color: "Liquid colour as R, G, B above the low mark",
    low_color: "Liquid colour at or below the low mark (default 150, 29, 29 — red)",
    low_at: "Level at or below which the tank turns the low colour (default 20 %)",
    height: "Card height (CSS, default 200px)",
  };
}
function tankDocs() {
  return "Bind a level sensor that reports **percent full** (0–100). A depth or litre sensor " +
    "needs a template sensor in front of it, or the tank will read empty.";
}

registerKind("fuel-tank", {
  label: "Animated Fuel Tank",
  desc: "Tank that fills with amber fuel, twin counter-scrolling surfaces, red below the low mark",
  domains: ["sensor"],
  schema: tankRows(),
  help: { icon: "Default mdi:barrel", ...tankHelp() },
  docs: tankDocs(),
  make: (c) => tankCard(c, { icon: "mdi:barrel", name: "Fuel Tank", fullRgb: "150, 109, 29" }),
});

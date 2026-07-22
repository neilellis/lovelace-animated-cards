// battery.js — one kind, three upstream looks.
// upstream: battery #1 - Battery card 1 / #2 - Battery card 1 (low, medium, high)
// upstream: battery #3 - Battery card 2 / #4 - Battery card 2 (low, medium, high)
// upstream: battery #5 - Battery card 3 / #6 - Battery card 3 (low, medium, high)
//
// Upstream ships each design twice: once for a numeric % sensor, once for a sensor whose state
// is the text low/medium/high (Zigbee/Matter battery levels). That's the same card with a
// different level parser, so here it's ONE kind that sniffs the state and maps text → 20/50/100
// (upstream's own mapping). Band colours/thresholds are options; `variant` picks the look.

// Level + colour + readout, shared by all three variants. `dead` is its own branch so a flat
// battery and an unreachable one never look alike (an `unavailable` sensor coerced to 0 would
// otherwise cosplay as "empty and urgent").
const BAT_LEVEL = ({ charging, low, medium, rgbLow, rgbMed, rgbHigh, rgbCharge, rgbDead }) => `
        {% set raw = states(config.entity) %}
        {% set txt = raw | lower %}
        {% set dead = txt in ['unavailable', 'unknown', 'none', ''] %}
        {% set banded = txt in ['low', 'medium', 'high'] %}
        {% set num = raw | float(-1) %}
        {% set level = 20 if txt == 'low' else (50 if txt == 'medium' else (100 if txt == 'high' else [[num, 0] | max, 100] | min)) %}
        {% set level = 0 if dead or (not banded and num < 0) else level %}
        {% set charging = ${charging ? `is_state('${charging}', 'on')` : "false"} %}
        {% if dead %}{% set rgb = '${rgbDead}' %}
        {% elif charging %}{% set rgb = '${rgbCharge}' %}
        {% elif level <= ${low} %}{% set rgb = '${rgbLow}' %}
        {% elif level <= ${medium} %}{% set rgb = '${rgbMed}' %}
        {% else %}{% set rgb = '${rgbHigh}' %}{% endif %}
        {% set readout = '—' if dead else (txt | capitalize if banded else (level | round(0) | int | string ~ '%')) %}`;

// ── variant 1 — liquid-filled icon disc + bottom charge bar + a % chip on the card ──────────
// The wave (a 200% oversized rounded block spinning behind a `top: calc(100% - level)` line) and
// the charging bubbles are STATIC keyframes in the shadow block; the host only sets the level,
// the colour and whether the bubbles show.
const batLiquid = (c, lvl) => ({
  type: "custom:mushroom-entity-card",
  entity: c.entity,
  ...(c.name ? { name: c.name } : {}),
  ...(c.icon ? { icon: c.icon } : {}),
  icon_color: "white",
  primary_info: "name",
  secondary_info: "none",
  tap_action: { action: "more-info" },
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        --liquid-level: var(--bat-level, 0%);
        --liquid-color: var(--bat-color, rgba(120, 120, 120, 0.8));
        background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.03) !important;
        overflow: hidden !important;
        position: relative;
        border: 1px solid rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
        box-shadow: var(--bat-shadow, none) !important;
      }
      .shape::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%;
        height: 200%;
        top: calc(100% - var(--liquid-level));
        background: var(--liquid-color);
        border-radius: 40%;
        opacity: 0.85;
        transition: top 0.6s ease;
        animation: var(--bat-wave-anim, liquid-wave 6s linear infinite);
      }
      .shape::after {
        content: '';
        display: var(--bat-bubbles, none);
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(2px 2px at 20% 80%, rgba(255, 255, 255, 0.9), transparent),
          radial-gradient(2px 2px at 50% 70%, rgba(255, 255, 255, 0.9), transparent),
          radial-gradient(3px 3px at 80% 90%, rgba(255, 255, 255, 0.9), transparent);
        background-size: 100% 100%;
        animation: bubbles-rise 0.7s linear infinite;
      }
      ha-icon, ha-state-icon { position: relative; z-index: 2; color: white !important; }
      @keyframes liquid-wave { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes bubbles-rise {
        0%   { transform: translateY(10px);  opacity: 0; }
        50%  { opacity: 1; }
        100% { transform: translateY(-20px); opacity: 0; }
      }`,
    ".": `
      ha-card {${lvl}
        --card-primary-font-size: 15px !important;
        --card-secondary-font-size: 12px !important;
        --card-primary-font-weight: bold !important;
        --bat-level: {{ level }}%;
        --bat-color: rgba({{ rgb }}, 0.8);
        --bat-rgb: {{ rgb }};
        --bat-readout: "{{ readout }}";
        --bat-bubbles: {{ 'block' if charging and not dead else 'none' }};
        --bat-shadow: {{ '0 2px 10px rgba(' ~ rgb ~ ', 0.3)' if charging and not dead else 'none' }};
        --bat-wave-anim: {{ 'none' if dead else 'liquid-wave 6s linear infinite' }};
        ${c.target_soc ? `--bat-target: ${c.target_soc}%;` : ``}
        opacity: {{ '0.55' if dead else '1' }};
        position: relative;
        overflow: hidden;
        transition: all 0.5s ease;
        z-index: 1;
        background-image: radial-gradient(circle at 24px 24px, rgba({{ rgb }}, 0.15) 0%, transparent 60%) !important;
        background-size: 100% 100% !important;
        background-position: 0 0 !important;
        background-repeat: no-repeat !important;
      }
      ${c.target_soc ? `
      /* charge-limit marker: a dashed rule + a pill at the target percentage */
      ha-card::before {
        content: "${c.target_soc}%";
        position: absolute !important;
        top: 8px !important;
        left: ${c.target_soc}% !important;
        transform: translateX(${c.target_soc <= 10 ? "0%" : c.target_soc >= 90 ? "-100%" : "-50%"});
        background: var(--card-background-color, #fafafa);
        border: 1px solid rgba(128, 128, 128, 0.6);
        color: var(--primary-text-color);
        font-size: 10px;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 12px;
        z-index: 4;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        pointer-events: none;
      }` : ``}
      ha-card::after {
        content: '';
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        height: 4px !important;
        width: var(--bat-level, 0%) !important;
        background: linear-gradient(90deg, transparent, rgb(var(--bat-rgb, 120, 120, 120)));
        box-shadow: 0 0 10px rgba(var(--bat-rgb, 120, 120, 120), 0.5);
        transition: width 0.5s ease;
        z-index: 3;
        pointer-events: none;
      }
      mushroom-state-item { position: static !important; }
      mushroom-state-item::after {
        content: var(--bat-readout, "—");
        position: absolute !important;
        top: 12px !important;
        right: 12px !important;
        font-size: 1rem;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        padding: 2px 6px;
        border-radius: 4px;
        z-index: 4;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.5) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: rgb(var(--bat-rgb, 120, 120, 120)) !important;
      }
      mushroom-shape-icon { --icon-size: 65px; display: flex; padding-right: 15px; padding-bottom: 5px; }
      mushroom-state-info { position: relative; z-index: 3; }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// ── variant 2 — the whole CARD is the cell: a coloured fill sweeps in from the left with a
// spinning blob riding the waterline. Charging just spins the blob faster (3s vs 8s).
const batFill = (c, lvl) => ({
  type: "custom:mushroom-entity-card",
  entity: c.entity,
  ...(c.name ? { name: c.name } : {}),
  ...(c.icon ? { icon: c.icon } : {}),
  icon_color: "white",
  primary_info: "state",
  secondary_info: "name",
  tap_action: { action: "more-info" },
  card_mod: { style: {
    // entity-card: only the legacy shape block exists — used here just to keep the icon legible
    // over a saturated fill.
    "mushroom-shape-icon$": `
      .shape { box-shadow: var(--bat-shadow, none) !important; }
      ha-icon, ha-state-icon { color: white !important; }`,
    ".": `
      ha-card {${lvl}
        --card-primary-font-size: 15px !important;
        --card-secondary-font-size: 12px !important;
        --card-primary-font-weight: bold !important;
        --bat-rgb: {{ rgb }};
        --bat-level: {{ level }}%;
        /* full width once full, so the fill has no waterline notch at 100% */
        --bat-fill-width: {{ '100%' if level >= 100 else 'calc(' ~ level ~ '% - 60px)' }};
        --bat-wave-speed: {{ '3s' if charging and not dead else '8s' }};
        --bat-wave-anim: {{ 'none' if dead else 'spin-wave var(--bat-wave-speed, 8s) linear infinite' }};
        /* no waterline blob on an empty, full or dead battery — there'd be no surface to draw */
        --bat-wave-display: {{ 'none' if dead or level <= 0 or level >= 100 else 'block' }};
        opacity: {{ '0.55' if dead else '1' }};
        border-radius: var(--ha-card-border-radius, 12px);
        position: relative;
        overflow: hidden;
        z-index: 0;
        transition: all 0.5s ease;
      }
      mushroom-shape-icon {
        --icon-size: 68px;
        display: flex;
        margin: 0 !important;
        padding-right: 15px;
        z-index: 2;
      }
      ha-card::before {
        content: "";
        position: absolute;
        top: 0; left: 0; bottom: 0;
        z-index: -1;
        width: var(--bat-fill-width, 0px);
        background: rgb(var(--bat-rgb, 120, 120, 120));
        transition: width 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      ha-card::after {
        content: "";
        position: absolute;
        z-index: -1;
        display: var(--bat-wave-display, none);
        width: 120px;
        height: 120px;
        background: rgb(var(--bat-rgb, 120, 120, 120));
        box-shadow: 0 0 25px rgba(var(--bat-rgb, 120, 120, 120), 0.5);
        border-radius: 40%;
        left: calc(var(--bat-level, 0%) - 120px);
        top: calc(50% - 60px);
        animation: var(--bat-wave-anim, none);
        transition: left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      mushroom-state-item, .mushroom-state-item {
        z-index: 2;
        position: relative;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      }
      ha-state-icon { color: white !important; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
      @keyframes spin-wave { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// ── variant 3 — a glossy striped progress bar pinned along the bottom of the card. Charging
// speeds the barber-pole stripes (1.1s vs 6.5s) and the brightness breathe (1.4s vs 3.8s);
// upstream's `--border-speed` is dead config (nothing consumes it) so it's dropped.
const batBar = (c, lvl) => ({
  type: "custom:mushroom-entity-card",
  entity: c.entity,
  ...(c.name ? { name: c.name } : {}),
  ...(c.icon ? { icon: c.icon } : {}),
  icon_color: "white",
  primary_info: "state",
  secondary_info: "name",
  tap_action: { action: "more-info" },
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape { background-color: rgba(var(--bat-rgb, 120, 120, 120), 0.2) !important; }
      ha-icon, ha-state-icon {
        opacity: 0.96;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 8px rgba(var(--bat-rgb, 120, 120, 120), 0.18));
      }`,
    ".": `
      ha-card {${lvl}
        --card-primary-font-size: 15px !important;
        --card-secondary-font-size: 12px !important;
        --card-primary-font-weight: bold !important;
        --bat-rgb: {{ rgb }};
        --bat-frac: {{ (level / 100) | round(3) }};
        --bat-track: rgba(255, 255, 255, 0.08);
        --bat-fill-anim: {{ 'none' if dead else ('stripes-move 1.1s linear infinite, fill-breathe 1.4s ease-in-out infinite' if charging else 'stripes-move 6.5s linear infinite, fill-breathe 3.8s ease-in-out infinite') }};
        opacity: {{ '0.55' if dead else '1' }};
        padding-bottom: 28px !important;
        transition: all 0.3s ease;
        overflow: hidden;
        isolation: isolate;
      }
      mushroom-shape-icon {
        --icon-size: 68px;
        display: flex;
        margin: 0 !important;
        padding-right: 10px;
        position: relative;
        z-index: 3 !important;
      }
      mushroom-state-item { z-index: 3 !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); }
      /* track */
      mushroom-state-item::before {
        content: "";
        position: absolute;
        left: 14px; right: 14px; bottom: 12px;
        height: 12px;
        border-radius: 999px;
        z-index: 1;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0)), var(--bat-track);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 2px 5px rgba(0, 0, 0, 0.35);
      }
      /* fill — width is a one-shot transition, the stripes are the only loop */
      mushroom-state-item::after {
        content: "";
        position: absolute;
        left: 14px; bottom: 12px;
        height: 12px;
        border-radius: 999px;
        z-index: 2;
        pointer-events: none;
        width: calc((100% - 28px) * var(--bat-frac, 0));
        background-image:
          linear-gradient(90deg, rgb(var(--bat-rgb, 120, 120, 120)), rgba(var(--bat-rgb, 120, 120, 120), 0.45)),
          repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0px, rgba(255, 255, 255, 0.18) 7px, transparent 7px, transparent 14px),
          linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 55%);
        background-size: 100% 100%, 28px 28px, 100% 100%;
        background-position: 0 0, 0 0, 0 0;
        background-repeat: no-repeat;
        box-shadow:
          0 0 10px rgba(var(--bat-rgb, 120, 120, 120), 0.18),
          0 0 18px rgba(var(--bat-rgb, 120, 120, 120), 0.32),
          inset 0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 2px 6px rgba(0, 0, 0, 0.25);
        transition: width 0.45s cubic-bezier(0.2, 0.85, 0.2, 1);
        animation: var(--bat-fill-anim, stripes-move 6.5s linear infinite, fill-breathe 3.8s ease-in-out infinite);
      }
      @keyframes stripes-move {
        0%   { background-position: 0 0, 0 0, 0 0; }
        100% { background-position: 0 0, 28px 0, 0 0; }
      }
      @keyframes fill-breathe {
        0%, 100% { filter: brightness(1) saturate(1); }
        50%      { filter: brightness(1.14) saturate(1.08); }
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

registerKind("battery", {
  label: "Animated Battery",
  desc: "Battery level — liquid disc, card-wide fill or striped bar; charging is its own colour",
  domains: ["sensor", "binary_sensor"],
  deviceClass: ["battery"],
  schema: [
    F.variant(["1", "2", "3"]),
    { name: "charging_entity", selector: { entity: { domain: ["binary_sensor", "switch", "sensor"] } } },
    { name: "low", selector: { number: { min: 0, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
    { name: "medium", selector: { number: { min: 0, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
    { name: "target_soc", selector: { number: { min: 0, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
    F.icon,
    { name: "color_low", selector: { text: {} } },
    { name: "color_medium", selector: { text: {} } },
    { name: "color_high", selector: { text: {} } },
    { name: "color_charging", selector: { text: {} } },
  ],
  help: {
    variant: "1 = liquid-filled icon disc · 2 = card-wide liquid fill · 3 = striped progress bar",
    charging_entity: "Optional is-charging sensor — 'on' switches the card to the charging colour",
    low: "At or below this %, the battery reads low/red (default 20)",
    medium: "At or below this %, it reads medium/amber (default 60)",
    target_soc: "Optional charge-limit marker drawn across the card (variant 1 only)",
    color_low: "Low-band colour as R, G, B (default 244, 67, 54)",
    color_medium: "Medium-band colour as R, G, B (default 255, 152, 0)",
    color_high: "Healthy-band colour as R, G, B (default 0, 255, 100)",
    color_charging: "Charging colour as R, G, B (default 0, 255, 255)",
  },
  docs: "Works with a numeric battery-% sensor OR one whose state is the text low/medium/high " +
    "(mapped to 20/50/100 as upstream does) — no separate card for the banded case. An " +
    "unavailable/unknown sensor is drawn empty, grey and still, never as a plausible 0 %.",
  make: (c) => {
    const lvl = BAT_LEVEL({
      charging: c.charging_entity,
      low: c.low ?? 20,
      medium: c.medium ?? 60,
      rgbLow: c.color_low || "244, 67, 54",
      rgbMed: c.color_medium || "255, 152, 0",
      rgbHigh: c.color_high || "0, 255, 100",
      rgbCharge: c.color_charging || "0, 255, 255",
      rgbDead: "120, 120, 120",
    });
    const v = String(c.variant || "1");
    if (v === "2") return batFill(c, lvl);
    if (v === "3") return batBar(c, lvl);
    return batLiquid(c, lvl);
  },
});

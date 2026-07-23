// kinds/advanced-washer.js — Advanced Washing Machine (small / medium / large).
//
// A whole-appliance panel built for Tuya washer/washer-dryers (e.g. the WD3S8014 family)
// whose integration explodes the machine into ~50 sibling entities on one id prefix:
// `sensor.<base>_machine_status`, `select.<base>_actions`, `switch.<base>_prewash`, …
// Bind the **machine-status enum sensor** as the entity; every sibling is derived from its
// prefix, so one picker field configures the whole card.
//
// Three registered sizes share this builder:
//   small  — the animated hero alone (the footprint of the plain `washer` kind)
//   medium — hero + dial/Start/Pause/Stop fascia + temperature/spin + everyday toggles
//   large  — everything: all four programme selects, all nine feature switches, usage stats
//
// The design is skeuomorphic — the card IS the machine's front, per Neil's reference photos:
// every card in the stack wears a white appliance fascia (striking on a dark dashboard);
// the hero's icon disc is the porthole (white rim, dark glass, a tri-spoke drum that tumbles
// the laundry through sloshing water) and its badge is a seven-segment-style LED display
// (time remaining; blinks amber when paused; shows the F-code in red on a fault); the
// programme dial is a real rotary knob whose pointer turns to the selected programme; the
// Start/Pause/Stop buttons are embossed white machine buttons with an LED dot that lights
// when their state is live. Idle stays quiet (DESIGN.md §6) — motion means a wash is on.

// When the machine's panel is off (or the integration is offline) every control on the
// fascia goes grey and stops taking taps — like the real machine, nothing works until the
// panel wakes. `status` is the machine-status sensor; stats/hero stay readable.
const awDisabled = (status) => `
        {% if states('${status}') in ['off', 'unavailable', 'unknown'] %}pointer-events: none; opacity: 0.55; filter: saturate(0.35);{% endif %}`;

// The machine renders as ONE white fascia (a vertical-stack-in-card). The wrapper's
// gradient is the ONLY surface: every child ha-card must be genuinely transparent
// (AW_FLAT), or each tile paints its own opaque rounded rectangle over the gradient and
// the fascia shatters back into a stack of pills. The dark-on-white text vars live on the
// children so Mushroom reads them locally.
const AW_TEXT = `
        --primary-text-color: #23282d;
        --secondary-text-color: #59636b;
        --card-primary-color: #23282d;
        --card-secondary-color: #59636b;`;
const AW_FLAT = `
        background: transparent !important;
        --ha-card-background: transparent;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0;
        ${AW_TEXT}`;

// ── the porthole, drawn identically into BOTH icon structures (DESIGN.md rule 2) ─────────
// root = white rim + dark glass with a reflection; ::before = the water, a fat rotating
// blob whose top edge parks at --aw-water (the slosh); ::after = the drum — tri-spoke
// paddles + a centre hub + coloured clothes, all on one rotating layer (the tumble).
// All animation arrives via inherited vars defaulting to idle — a washing machine is off
// most of the day.
//
// ⚠️ Sizes need !important: Mushroom's tile CSS ships via adoptedStyleSheets, which cascade
// AFTER card-mod's injected <style>, so at equal specificity Mushroom's
// `.container { width: var(--tile-icon-size) }` beats a plain `width: 92px`.
const awPorthole = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.35), transparent 45%),
          radial-gradient(circle at 50% 55%, #2c343d 0%, #1c2229 70%, #14181d 100%) !important;
        border: 6px solid #eef0f2;
        opacity: var(--aw-op, 1);
        animation: var(--aw-pulse, none);
        box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--aw-rgb, 120, 130, 140), 0.25);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--aw-water, 12%));
        background: rgba(3, 155, 229, 0.5);
        border-radius: 42%;
        transition: top 0.8s ease;
        animation: var(--aw-slosh, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 7%;
        border-radius: 9999px;
        background-image:
          radial-gradient(circle 6px at 32% 40%, rgba(244, 143, 177, 0.95) 0 6px, transparent 7px),
          radial-gradient(circle 8px at 62% 64%, rgba(129, 199, 132, 0.95) 0 8px, transparent 9px),
          radial-gradient(circle 5px at 46% 78%, rgba(255, 224, 130, 0.95) 0 5px, transparent 6px),
          radial-gradient(circle 7px at 72% 34%, rgba(144, 202, 249, 0.95) 0 7px, transparent 8px),
          radial-gradient(circle 9px at 50% 50%, #9aa1a8 0 9px, transparent 10px),
          conic-gradient(from 8deg,
            rgba(148, 156, 164, 0.85) 0deg 12deg, transparent 12deg 120deg,
            rgba(148, 156, 164, 0.85) 120deg 132deg, transparent 132deg 240deg,
            rgba(148, 156, 164, 0.85) 240deg 252deg, transparent 252deg 360deg);
        animation: var(--aw-drum, none);
        z-index: 1;
      }
      @keyframes aw-slosh { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes aw-drum  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes aw-pulse {
        0%   { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--aw-rgb, 120, 130, 140), 0.3); }
        50%  { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 24px 9px rgba(var(--aw-rgb, 120, 130, 140), 0.85); }
        100% { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--aw-rgb, 120, 130, 140), 0.3); }
      }`;

// ── an embossed round machine button (the fascia's Start / Pause / Stop) with an LED dot
// that lights and blinks while `lit` (a Jinja condition on the machine's state) is true ───
const awBtnFace = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        background: radial-gradient(circle at 35% 28%, #ffffff 0%, #eef0f2 55%, #dde1e5 100%) !important;
        border: 1px solid #c6ccd2;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3), inset 0 1px 0 #ffffff;
      }
      ${root}::after {
        content: '';
        position: absolute;
        left: 50%; bottom: 4px;
        width: 7px; height: 7px;
        margin-left: -3.5px;
        border-radius: 9999px;
        background: rgba(var(--aw-btn-rgb, 120, 130, 140), var(--aw-btn-led, 0.25));
        box-shadow: 0 0 var(--aw-btn-glow, 0px) 1px rgba(var(--aw-btn-rgb, 120, 130, 140), 0.9);
        animation: var(--aw-btn-blink, none);
      }
      @keyframes aw-btn-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.3; } }`;

const awButton = (actions, status, option, label, icon, rgb, lit, confirmText) => ({
  type: "custom:mushroom-template-card",
  entity: actions,
  primary: label,
  icon,
  icon_color: `{% if states('${actions}') in ['unavailable', 'unknown'] %}disabled{% else %}rgb(${rgb}){% endif %}`,
  layout: "vertical",
  tap_action: {
    action: "call-service",
    service: "select.select_option",
    target: { entity_id: actions },
    data: { option },
    ...(confirmText ? { confirmation: { text: confirmText } } : {}),
  },
  card_mod: { style: {
    "ha-tile-icon$": awBtnFace(".container", "width: 52px !important; height: 52px !important;"),
    "mushroom-shape-icon$": awBtnFace(".shape", "--icon-size: 52px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
    ".": `
      ha-tile-icon { --tile-icon-size: 52px; --mdc-icon-size: 26px; width: 52px; height: 52px; }
      mushroom-shape-icon { --icon-size: 52px; }
      ha-card {
        ${awDisabled(status)}
        --aw-btn-rgb: ${rgb};
        {% if ${lit} %}--aw-btn-led: 1; --aw-btn-glow: 7px; --aw-btn-blink: aw-btn-blink 1.6s steps(1) infinite;{% endif %}
        ${AW_FLAT}
        --card-primary-font-size: 0.95rem;
        --card-primary-font-weight: 600;
      }`,
  } },
});

// ── the rotary programme dial: a knob whose pointer turns to the selected programme ──────
// root = the knob face (embossed white); ::before = the pointer stripe, rotated by
// --aw-dial (0.5s transition = the hand turning the dial); ::after = the tick ring, a
// dotted circle just outside the knob. The mdi glyph is hidden — the knob IS the icon.
const awDialFace = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: visible;
        background: radial-gradient(circle at 35% 28%, #ffffff 0%, #eef0f2 55%, #d8dce0 100%) !important;
        border: 1px solid #c6ccd2;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 #ffffff;
      }
      ${root}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        background: linear-gradient(#78828a, #78828a) no-repeat 50% 8% / 5px 15px;
        transform: rotate(calc(var(--aw-dial, 0) * 24deg));
        transition: transform 0.5s ease;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 9999px;
        border: 2px dotted #aab2b9;
      }`;

const awDial = (prog, status) => ({
  type: "custom:mushroom-template-card",
  entity: prog,
  primary: `Prog {{ states('${prog}') }}`,
  icon: "mdi:knob",
  layout: "vertical",
  tap_action: { action: "more-info" },
  card_mod: { style: {
    "ha-tile-icon$": awDialFace(".container", "width: 52px !important; height: 52px !important;"),
    "mushroom-shape-icon$": awDialFace(".shape", "--icon-size: 52px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
    ".": `
      ha-tile-icon { --tile-icon-size: 52px; width: 52px; height: 52px; }
      mushroom-shape-icon { --icon-size: 52px; }
      ha-state-icon, ha-icon { display: none; }
      ha-card {
        ${awDisabled(status)}
        --aw-dial: {{ states('${prog}') | int(0) }};
        ${AW_FLAT}
        --card-primary-font-size: 0.95rem;
        --card-primary-font-weight: 600;
      }`,
  } },
});

// ── a programme-setting dropdown whose icon comes alive only while the machine runs ──────
// The state would show twice (secondary text AND the dropdown), so the secondary is hidden;
// the dropdown fill is pinned — theme vars can't be trusted for contrast on the white fascia.
const awSelect = (entity, status, name, icon, color, runAnim, keyframes) => ({
  type: "custom:mushroom-select-card",
  entity, name, icon, icon_color: color,
  card_mod: { style: {
    "mushroom-state-info$": `.secondary { display: none !important; }`,
    ".": `
      ha-state-icon { display: inline-block; transform-origin: 50% 60%; animation: var(--aw-set, none); }
      ${keyframes}
      ha-card {
        ${awDisabled(status)}
        {% if is_state('${status}', 'running') %}--aw-set: ${runAnim};{% endif %}
        ${AW_FLAT}
        --spacing: 8px;
        --card-primary-font-size: 0.9rem;
        --control-select-menu-background-color: rgba(35, 40, 45, 0.07);
        --control-select-menu-text-color: #23282d;
      }` } },
});

// ── a feature toggle that breathes gently while ON (motion = "this option is active") ────
// Three of these share a row: a 42px icon + 12px spacing left ~50px of text at phone width
// and every label truncated ("Anti-cr…"). 36px icon, 8px spacing, 0.85rem, and labels are
// ALLOWED TO WRAP (!important — Mushroom's ellipsis ships via adoptedStyleSheets, which
// cascade after card-mod's <style>).
const awToggle = (entity, status, name, icon, color) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon, icon_color: color,
  secondary_info: "state",
  tap_action: { action: "toggle" },
  card_mod: { style: {
    "mushroom-state-info$": `.primary { white-space: normal !important; line-height: 1.2 !important; }`,
    ".": `
      ha-state-icon { display: inline-block; animation: var(--aw-opt, none); }
      @keyframes aw-opt-breathe {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50%      { transform: scale(1.12); filter: brightness(1.25); }
      }
      ha-card {
        ${awDisabled(status)}
        {% if is_state(config.entity, 'on') %}--aw-opt: aw-opt-breathe 3s ease-in-out infinite;{% endif %}
        ${AW_FLAT}
        --icon-size: 32px;
        --spacing: 6px;
        --card-primary-font-size: 0.85rem;
        --card-secondary-font-size: 0.8rem;
      }` } },
});

// ── a read-only stat tile; its icon ticks over only while the machine is running ─────────
const awStat = (entity, status, name, icon, color, secondary, runAnim, keyframes) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: name,
  secondary,
  icon,
  icon_color: color,
  tap_action: { action: "more-info" },
  card_mod: { style: { ".": `
      ha-state-icon { display: inline-block; transform-origin: 50% 50%; animation: var(--aw-stat, none); }
      ${keyframes}
      /* tile structure: the primary/secondary spans are SLOTTED into ha-tile-info, so
         (like slotted icons, DESIGN.md rule 3) their ellipsis must be beaten from the HOST
         block — let both lines wrap instead of "0.0 kWh …" truncation. !important because
         Mushroom's nowrap ships via adoptedStyleSheets, which cascade after card-mod. */
      ha-tile-info [slot="primary"], ha-tile-info [slot="secondary"] {
        white-space: normal !important; text-overflow: clip !important;
        line-height: 1.25 !important;
      }
      /* 3-abreast in a 129px cell: a 36px icon leaves "Programme" clipped mid-word */
      ha-tile-icon { --tile-icon-size: 32px; --mdc-icon-size: 18px; width: 32px; height: 32px; }
      mushroom-shape-icon { --icon-size: 32px; }
      ha-card {
        {% if is_state('${status}', 'running') %}--aw-stat: ${runAnim};{% endif %}
        ${AW_FLAT}
        --icon-size: 32px;
        --card-primary-font-size: 0.82rem;
        --card-secondary-font-size: 0.78rem;
      }` } },
});

// ── the shared builder ────────────────────────────────────────────────────────────────────
// parts: { controls, settings, everyday, options, stats } — which sections this size shows.

// Vertical rhythm on the fascia: rows inside vertical-stack-in-card sit flush, so with the
// section titles gone the zones need whitespace to read as zones — a larger gap opens each
// zone, a small one separates rows within it. (horizontal-stack takes no card_mod, so the
// margin goes on every cell of the row.)
const awGap = (px, row) => {
  for (const cell of row.cards) cell.card_mod.style["."] += `
      ha-card { margin-top: ${px}px; }`;
  return row;
};

const awMake = (c, parts) => {
  const base = (c.entity || "sensor.washing_machine_machine_status")
    .split(".")[1].replace(/_machine_status$/, "");
  const name = c.name || "Washing Machine";
  const s = (suffix) => `sensor.${base}_${suffix}`;
  const sel = (suffix) => `select.${base}_${suffix}`;
  const sw = (suffix) => `switch.${base}_${suffix}`;

  const status = c.entity;
  const actions = sel("actions");
  const rem = s("remaining_time_of_selected_program");
  const tot = s("selected_program_total_time");
  const door = s("door_status");
  const err = s("error_code");
  const delay = s("delay_end_time");
  const weight = s("washing_program_weight");

  // Line 1: what's happening, in a sentence. Line 2: door · delayed start · load · warnings.
  const statusLine =
    `{% set st = states(entity) %}` +
    `{% set rm = states('${rem}') | int(0) %}` +
    `{% set time = ((rm // 60) ~ ' h ' ~ ('%02d' | format(rm % 60)) ~ ' min') if rm >= 60 else (rm ~ ' min') %}` +
    `{% set fin = (now() + timedelta(minutes=rm)).strftime('%H:%M') %}` +
    `{% set e = states('${err}') %}` +
    `{% if st in ['unavailable', 'unknown'] %}Offline — check the machine's power and Wi-Fi` +
    `{% elif e not in ['none', 'unavailable', 'unknown'] %}⚠ Problem ({{ e | replace('error_', 'fault ') | replace('_', ' ') | upper }}) — check the machine` +
    `{% elif st == 'alarm' %}⚠ Problem — check the machine` +
    `{% elif st == 'running' %}About {{ time }} left — done by {{ fin }}` +
    `{% elif st == 'paused' %}Paused — {{ time }} still to go` +
    `{% elif st == 'standby' %}Ready — the wash takes about {{ time }}. Press Start.` +
    `{% else %}Switched off{% endif %}` +
    `\n` +
    `{% set d = states('${door}') %}` +
    `{% if d == 'open' %}Door open{% elif d == 'closed' %}Door closed{% endif %}` +
    `{% set dl = states('${delay}') | int(0) %}{% if dl > 0 %} · starts in {{ dl }} h{% endif %}` +
    `{% set w = states('${weight}') | float(0) %}{% if w > 0 %} · load {{ w | round(1) }} kg{% endif %}` +
    `{% if is_state('binary_sensor.${base}_detergent_state', 'on') %} · ⚠ detergent low{% endif %}` +
    `{% if is_state('binary_sensor.${base}_softener_state', 'on') %} · ⚠ softener low{% endif %}`;

  const hero = {
    type: "custom:mushroom-template-card",
    entity: status,
    primary: name,
    secondary: statusLine,
    multiline_secondary: true,
    icon: "mdi:washing-machine",
    icon_color: `{% set st = states(entity) %}{% if st in ['unavailable', 'unknown'] %}disabled{% elif st == 'running' %}light-blue{% elif st == 'paused' %}orange{% elif st == 'alarm' %}red{% elif st == 'standby' %}green{% else %}blue-grey{% endif %}`,
    tap_action: { action: "more-info" },
    hold_action: { action: "more-info" },
    card_mod: { style: {
      "mushroom-shape-icon$": awPorthole(".shape", "--icon-size: 92px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
      "ha-tile-icon$": awPorthole(".container", "width: 92px !important; height: 92px !important;"),
      ".": `
        mushroom-shape-icon { --icon-size: 92px; display: flex; margin: 0 !important; }
        ha-tile-icon { --tile-icon-size: 92px; width: 92px; height: 92px; }
        /* the porthole IS the machine — the mdi glyph would float on the glass, so hide it */
        ha-state-icon, ha-icon { display: none; }
        /* reserve the top-right corner for the LED display — long names/status lines must
           wrap early, never slide underneath it */
        ha-tile-info { margin-right: 82px; }
        ha-card {
          {% set st = states(config.entity) %}
          {% set e = states('${err}') %}
          {% set rm = states('${rem}') | float(0) %}
          {% set tt = states('${tot}') | float(0) %}
          {% set frac = ((tt - rm) / tt) if tt > 0 else 0 %}
          {% set frac = [[frac, 0] | max, 1] | min %}
          {% set trouble = st == 'alarm' or e not in ['none', 'unavailable', 'unknown'] %}
          {% set mins = rm | int %}
          {% set clock = (mins // 60) ~ ':' ~ ('%02d' | format(mins % 60)) %}
          {% if st in ['unavailable', 'unknown'] %}{% set rgb = '120, 124, 130' %}{% set led = '--:--' %}{% set ledc = '#6d747b' %}{% set leda = 'none' %}
          {% elif trouble %}{% set rgb = '244, 67, 54' %}{% set led = (e | replace('error_', '') | replace('_', ' ') | upper)[:5] if e not in ['none', 'unavailable', 'unknown'] else 'ERR' %}{% set ledc = '#ff5a5a' %}{% set leda = 'aw-led-blink 0.8s steps(1) infinite' %}
          {% elif st == 'running' %}{% set rgb = '3, 169, 244' %}{% set led = clock %}{% set ledc = '#7cfc98' %}{% set leda = 'none' %}
          {% elif st == 'paused' %}{% set rgb = '255, 152, 0' %}{% set led = clock %}{% set ledc = '#ffc66d' %}{% set leda = 'aw-led-blink 1.4s steps(1) infinite' %}
          {% elif st == 'standby' %}{% set rgb = '76, 175, 80' %}{% set led = clock %}{% set ledc = '#8fe4a3' %}{% set leda = 'none' %}
          {% else %}{% set rgb = '96, 135, 170' %}{% set led = '--:--' %}{% set ledc = '#8a9199' %}{% set leda = 'none' %}{% endif %}
          --aw-rgb: {{ rgb }};
          --aw-frac: {{ frac | round(3) }};
          --aw-led-text: "{{ led }}";
          --aw-led-color: {{ ledc }};
          --aw-led-anim: {{ leda }};
          --aw-bar: {{ 'block' if st in ['running', 'paused'] else 'none' }};
          {% if trouble %}--aw-pulse: aw-pulse 0.8s ease-in-out infinite; --aw-drum: none; --aw-slosh: none; --aw-water: 40%; --aw-op: 1;
          {% elif st == 'running' %}--aw-pulse: aw-pulse 2s ease-in-out infinite; --aw-drum: aw-drum 2.2s linear infinite; --aw-slosh: aw-slosh 5s linear infinite; --aw-water: 42%; --aw-op: 1;
          {% elif st == 'paused' %}--aw-pulse: aw-pulse 3.5s ease-in-out infinite; --aw-drum: aw-drum 8s linear infinite; --aw-slosh: aw-slosh 12s linear infinite; --aw-water: 42%; --aw-op: 0.95;
          {% elif st == 'standby' %}--aw-pulse: aw-pulse 4s ease-in-out infinite; --aw-drum: none; --aw-slosh: none; --aw-water: 18%; --aw-op: 1;
          {% else %}--aw-pulse: none; --aw-drum: none; --aw-slosh: none; --aw-water: 10%; --aw-op: 0.85;{% endif %}
          position: relative;
          overflow: hidden;
          ${AW_FLAT}
          --card-primary-font-size: 1.35rem;
          --card-secondary-font-size: 1rem;
          padding: 6px 0 10px;
        }
        /* the LED time/fault display, top right — seven-segment-ish glow on a dark inset */
        @keyframes aw-led-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.25; } }
        ha-card::before {
          content: var(--aw-led-text, "--:--");
          position: absolute; top: 10px; right: 12px; z-index: 5;
          background: linear-gradient(180deg, #14181c, #1e2429);
          color: var(--aw-led-color, #8a9199);
          border: 1px solid #0c0f12;
          box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.6);
          padding: 4px 12px; border-radius: 6px;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          font-size: 19px; font-weight: 700; letter-spacing: 2px;
          text-shadow: 0 0 7px currentColor;
          white-space: nowrap;
          animation: var(--aw-led-anim, none);
        }
        /* progress: an inset rounded track with the fill drawn as a hard gradient stop —
           a full-bleed square-ended stripe read as a glitchy separator, not progress */
        ha-card::after {
          content: '';
          position: absolute; left: 12px; right: 12px; bottom: 2px; height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg,
            rgb(var(--aw-rgb, 96, 135, 170)) calc(var(--aw-frac, 0) * 100%),
            rgba(35, 40, 45, 0.1) calc(var(--aw-frac, 0) * 100%));
          display: var(--aw-bar, none);
          z-index: 2;
        }`,
    } },
  };

  const cards = [hero];

  if (parts.controls) {
    cards.push(awGap(4, { type: "horizontal-stack", cards: [
      awDial(s("selected_program"), status),
      awButton(actions, status, "start", "Start", "mdi:play", "76, 175, 80",
        `is_state('${status}', 'running')`),
      awButton(actions, status, "pause", "Pause", "mdi:pause", "255, 152, 0",
        `is_state('${status}', 'paused')`),
      awButton(actions, status, "stop", "Stop", "mdi:stop", "244, 67, 54",
        `is_state('${status}', 'alarm')`,
        "Stop the wash? The programme will be cancelled."),
    ] }));
  }

  const tempSelect = awSelect(sel("temperature"), status, "Wash temperature", "mdi:thermometer", "red",
    "aw-set-glow 2.5s ease-in-out infinite",
    `@keyframes aw-set-glow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.5) drop-shadow(0 0 4px currentColor); } }`);
  const spinSelect = awSelect(sel("spin_speed"), status, "Spin speed", "mdi:rotate-3d-variant", "light-blue",
    "aw-set-spin 3s linear infinite",
    `@keyframes aw-set-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`);

  if (parts.settings) {
    cards.push(awGap(14, { type: "horizontal-stack", cards: [tempSelect, spinSelect] }));
    cards.push(awGap(6, { type: "horizontal-stack", cards: [
      awSelect(sel("detergent"), status, "Detergent amount", "mdi:chart-bubble", "teal",
        "aw-set-bob 2.8s ease-in-out infinite",
        `@keyframes aw-set-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }`),
      awSelect(sel("softener"), status, "Softener amount", "mdi:flower-tulip-outline", "pink",
        "aw-set-sway 3.4s ease-in-out infinite",
        `@keyframes aw-set-sway { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }`),
    ] }));
  } else if (parts.everyday) {
    // medium: the two settings everyone actually changes, no title chrome
    cards.push(awGap(14, { type: "horizontal-stack", cards: [tempSelect, spinSelect] }));
  }

  if (parts.options) {
    cards.push(awGap(14, { type: "horizontal-stack", cards: [
      awToggle(sw("prewash"), status, "Pre-wash", "mdi:water-plus", "light-blue"),
      awToggle(sw("steam"), status, "Steam", "mdi:kettle-steam", "cyan"),
      awToggle(sw("extra_rinse"), status, "Extra rinse", "mdi:water-sync", "blue"),
    ] }));
    cards.push(awGap(4, { type: "horizontal-stack", cards: [
      awToggle(sw("anti_crease"), status, "Anti-crease", "mdi:iron", "purple"),
      awToggle(sw("time_save"), status, "Quick wash", "mdi:clock-fast", "amber"),
      awToggle(sw("auto_dose"), status, "Auto dosing", "mdi:cup-water", "teal"),
    ] }));
    cards.push(awGap(4, { type: "horizontal-stack", cards: [
      awToggle(sw("child_lock"), status, "Child lock", "mdi:account-lock", "red"),
      awToggle(sw("mute"), status, "Quiet mode", "mdi:volume-off", "blue-grey"),
      awToggle(sw("auto_tub_clean"), status, "Drum clean", "mdi:autorenew", "green"),
    ] }));
  } else if (parts.everyday) {
    cards.push(awGap(14, { type: "horizontal-stack", cards: [
      awToggle(sw("time_save"), status, "Quick wash", "mdi:clock-fast", "amber"),
      awToggle(sw("extra_rinse"), status, "Extra rinse", "mdi:water-sync", "blue"),
      awToggle(sw("child_lock"), status, "Child lock", "mdi:account-lock", "red"),
    ] }));
  }

  if (parts.stats) {
    cards.push(awGap(14, { type: "horizontal-stack", cards: [
      // NBSPs inside each unit group: at phone width the secondary wraps between groups
      // ("0.2 kWh" / "· 22 L"), never leaving a dangling "·" at a line end
      awStat(s("daily_energy"), status, "Today", "mdi:lightning-bolt", "amber",
        `{{ states('${s("daily_energy")}') | float(0) | round(1) }} kWh · {{ states('${s("daily_water_consumption")}') | float(0) | round(0) }} L`,
        "aw-stat-flick 1.6s ease-in-out infinite",
        `@keyframes aw-stat-flick { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.6); } }`),
      awStat(s("electricity_consumption"), status, "All time", "mdi:counter", "deep-purple",
        `{{ states('${s("electricity_consumption")}') | float(0) | round(1) }} kWh · {{ states('${s("water_consumption")}') | float(0) | round(0) }} L`,
        "aw-stat-tick 2s steps(4) infinite",
        `@keyframes aw-stat-tick { from { transform: translateY(0); } to { transform: translateY(-2px); } }`),
      // "Cycle", not "Programme": a single unbreakable 9-char word cannot fit a 3-across
      // footer cell at phone width — it clipped mid-word at every size tried
      awStat(s("selected_program"), status, "Cycle", "mdi:tshirt-crew", "indigo",
        `No. {{ states('${s("selected_program")}') }} · step {{ states('${s("current_program_phase")}') }}`,
        "aw-stat-bob 3s ease-in-out infinite",
        `@keyframes aw-stat-bob { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }`),
    ] }));
  }

  // One card, not a stack of tiles: the wrapper's gradient is the only painted surface —
  // every child is AW_FLAT-transparent, so the porthole, buttons and settings all sit
  // directly on a single white fascia. (Never re-point --ha-card-background at a colour
  // here: the children inherit it and turn back into opaque tiles.)
  return {
    type: "custom:vertical-stack-in-card",
    cards,
    card_mod: { style: `
      ha-card {
        /* vertical-stack-in-card keeps the theme's (dark) ha-card background, so the white
           fascia must win with !important */
        background: linear-gradient(180deg, #f7f8f9 0%, #eceef0 60%, #e3e6e9 100%) !important;
        border: 1px solid #cfd5d9 !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35) !important;
        ${AW_TEXT}
        border-radius: 22px;
        padding: 12px 12px 14px;
      }
      #root { background: transparent !important; }` },
    grid_options: { columns: 12, rows: parts.rows ?? "auto" },
  };
};

// ── the three registered sizes ────────────────────────────────────────────────────────────
const AW_COMMON = {
  domains: ["sensor"],
  deviceClass: ["enum"],
  entitySelector: { entity: { domain: "sensor", device_class: "enum" } },
  schema: [],
  help: {
    entity: "The machine-status sensor (off / standby / running / paused / alarm) — every other control on the machine is found from its name",
  },
};

const AW_DOCS = `Built for Tuya washing machines / washer-dryers whose integration exposes
sibling entities on one id prefix (\`sensor.<base>_machine_status\`, \`select.<base>_actions\`,
\`select.<base>_temperature\`, \`switch.<base>_prewash\`, …). Pick the machine-status sensor;
everything else is derived. The card is drawn as the machine's own white fascia: a porthole
with a tumbling tri-spoke drum, a seven-segment LED showing time remaining (or the F-code on
a fault, blinking when paused), a rotary programme dial that turns to the selected programme,
and embossed Start/Pause/Stop buttons with live LED dots — over a plain-English status line
("About 2 h 15 min left — done by 17:43") with door / delay / load / low-detergent notes.`;

registerKind("advanced-washer", {
  ...AW_COMMON,
  label: "Advanced Washing Machine (large)",
  desc: "The whole machine on one white fascia — porthole, LED display, programme dial, Start/Pause/Stop, every setting, toggle and usage stat",
  docs: AW_DOCS + `

The large size shows everything and is happy as the only card on a dashboard; medium keeps
the dial/button fascia, temperature/spin and the everyday toggles; small is the hero alone.`,
  make: (c) => awMake(c, { controls: true, settings: true, options: true, stats: true }),
});

registerKind("advanced-washer-medium", {
  ...AW_COMMON,
  label: "Advanced Washing Machine (medium)",
  desc: "Porthole hero + LED display, programme dial and Start/Pause/Stop, temperature & spin, and the everyday toggles",
  docs: AW_DOCS,
  make: (c) => awMake(c, { controls: true, everyday: true }),
});

registerKind("advanced-washer-small", {
  ...AW_COMMON,
  label: "Advanced Washing Machine (small)",
  desc: "The animated porthole hero alone — LED time display, status sentence, progress bar, warnings",
  docs: AW_DOCS,
  make: (c) => awMake(c, { rows: 3 }),
});

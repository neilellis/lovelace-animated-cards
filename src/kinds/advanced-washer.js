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
// the hero is the machine's control panel — a porthole on the LEFT (white rim, dark glass, a
// tri-spoke drum that tumbles the laundry through sloshing water) beside a large dark LED
// SCREEN on the RIGHT that reads like the real display: big glowing seven-segment digits (time
// remaining; blinks amber when paused; blinks a red "EEEE" when the machine faults or goes
// offline), with the machine-state glyph + door open/closed indicator sitting small within the
// bezel and a progress track along its bottom edge. A slim conditional row below surfaces the
// occasional statuses (delayed start / load / low detergent-softener) only when they apply; the
// programme dial is a real rotary knob whose pointer turns to the selected programme; the
// Start/Pause/Stop buttons are embossed white machine buttons with an LED dot that lights
// when their state is live. Idle stays quiet (DESIGN.md §6) — motion means a wash is on.

// When the machine's panel is off (or the integration is offline) every control on the
// fascia goes grey and stops taking taps — like the real machine, nothing works until the
// panel wakes. `status` is the machine-status sensor; stats/hero stay readable.
const awDisabled = (status) => `
        {% if states('${status}') in ['off', 'unavailable', 'unknown'] %}pointer-events: none; opacity: 0.78; filter: saturate(0.6);{% endif %}`;

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

// ── ONE cell of a TRADITIONAL segmented control — one selectable option ───────────────────
// A row of these is a single joined bar (not separate pills): the cells ABUT (the parent row's
// gap is zeroed in awSeg), a thin divider sits between neighbours, and only the whole bar's
// outer corners are rounded. Each cell shows its value as a single glyph (o.glyph) — the motif
// is gone (Neil: "no per-value labels"); the group's identity comes from the label above + the
// accent fill. The live value's cell is filled solid with the setting's accent (teal/pink),
// its glyph white; the rest are flat + unfilled with a dark-grey glyph. Tap → select.select_option;
// the whole row greys + stops taking taps when the panel is off (awDisabled).
//
// pos ∈ {first, mid, last} drives the borders that build the joined bar:
//   every cell: top + bottom + right border (the right border of a non-last cell = the divider);
//   first cell: + left border and a LEFT-rounded radius; last cell: a RIGHT-rounded radius.
// So adjacent cells share one 1px line (right border vs the next cell's borderless left edge),
// and the bar reads as one pill with square inner corners.
//
// template-card is TILE-based (DESIGN.md rule 2): the icon is hidden and the glyph is SLOTTED
// into ha-tile-info (rule 3) — so it's sized/centred from the host block on the slotted span.
const AW_SEG_BORDER = "rgba(35, 40, 45, 0.22)";
const awSegCell = (entity, status, rgb, o, pos) => {
  const active = `is_state('${entity}', '${o.value}')`;
  const R = "9px";
  const radius = pos === "first" ? `${R} 0 0 ${R}` : pos === "last" ? `0 ${R} ${R} 0` : "0";
  const leftBorder = pos === "first" ? `1px solid ${AW_SEG_BORDER}` : "none";
  return {
    type: "custom:mushroom-template-card",
    entity,
    primary: o.glyph,
    tap_action: {
      action: "call-service",
      service: "select.select_option",
      target: { entity_id: entity },
      data: { option: o.value },
    },
    card_mod: { style: {
      ".": `
        ha-tile-icon, mushroom-shape-icon { display: none !important; }
        /* the slotted glyph: full cell width, centred, single char, never wrap/clip */
        ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
        ha-tile-info [slot="primary"] {
          display: block !important; width: 100% !important;
          font-size: 0.92rem !important; font-weight: 700 !important; line-height: 1 !important;
          text-align: center !important; white-space: nowrap !important; text-overflow: clip !important;
          overflow: visible !important;
          color: {% if ${active} %}#ffffff{% else %}rgb(89, 99, 107){% endif %} !important;
        }
        ha-card {
          ${awDisabled(status)}
          ${AW_TEXT}
          --ha-card-background: transparent;
          background: transparent !important;
          box-shadow: none !important;
          border-top: 1px solid ${AW_SEG_BORDER} !important;
          border-bottom: 1px solid ${AW_SEG_BORDER} !important;
          border-right: 1px solid ${AW_SEG_BORDER} !important;
          border-left: ${leftBorder} !important;
          border-radius: ${radius} !important;
          padding: 6px 0 !important;
          min-height: 0 !important;
          --spacing: 0;
          {% if ${active} %}
            background: rgb(${rgb}) !important;
            --ha-card-background: rgb(${rgb});
            border-color: rgb(${rgb}) !important;
          {% endif %}
        }` } },
  };
};

// a full segmented bar — a horizontal-stack of abutting cells. The stack normally inserts a
// margin between children (its `#root > *` carry `margin: 0 4px`), which would break "no gap
// between cells", so card_mod the stack itself to zero it. flex:1 keeps the cells equal-width.
const awSeg = (entity, status, rgb, options) => ({
  type: "horizontal-stack",
  cards: options.map((o, i) =>
    awSegCell(entity, status, rgb, o, i === 0 ? "first" : i === options.length - 1 ? "last" : "mid")),
  card_mod: { style: `
    #root { gap: 0 !important; }
    #root > * { margin: 0 !important; }` },
});

// the small text label that sits ABOVE a segmented group ("Detergent" / "Softener") — a
// centred, accent-tinted caption. No entity, no tap: a display-only mushroom-template-card
// with the icon hidden and only the slotted primary shown, sized down. `mt` = top margin that
// opens the gap from the dial row above (this is the top leaf of the settings sub-block).
const awSegLabel = (text, rgb, mt) => ({
  type: "custom:mushroom-template-card",
  primary: text,
  card_mod: { style: {
    ".": `
      ha-tile-icon, mushroom-shape-icon { display: none !important; }
      ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
      ha-tile-info [slot="primary"] {
        display: block !important; width: 100% !important;
        font-size: 0.74rem !important; font-weight: 700 !important; line-height: 1 !important;
        letter-spacing: 0.4px; text-transform: uppercase;
        text-align: center !important; white-space: nowrap !important;
        color: rgb(${rgb}) !important;
      }
      ha-card {
        ${AW_FLAT}
        padding: 0 0 4px !important;
        min-height: 0 !important;
        margin-top: ${mt}px !important;
      }` } },
});

// ── the spin-speed rotary DIAL — the same knob as the programme dial (awDial), bound to the
// spin select. The pointer turns to the chosen spin (index into the option list, reusing
// awDialFace's `--aw-dial * 24deg`); the current speed reads under the knob ("1000 rpm" /
// "No spin"). Tap opens more-info to change — matching the programme dial's behaviour. ──────
const AW_SPINS = ["none", "600", "800", "1000", "1200", "1400"];
const awSpinDial = (spin, status) => ({
  type: "custom:mushroom-template-card",
  entity: spin,
  primary: `{% set v = states('${spin}') %}{% if v == 'none' %}No spin{% elif v in ['unavailable', 'unknown'] %}—{% else %}{{ v }} rpm{% endif %}`,
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
        {% set v = states('${spin}') %}
        {% set opts = ['none', '600', '800', '1000', '1200', '1400'] %}
        --aw-dial: {{ opts.index(v) if v in opts else 0 }};
        ${AW_FLAT}
        --card-primary-font-size: 0.9rem;
        --card-primary-font-weight: 600;
      }`,
  } },
});

// ── the wash-temperature dial — same knob as spin (Neil: "temp can be a dial too"). Pointer
// turns to the temperature's index; the value reads under the knob ("Cold" / "40\u00b0C").
const AW_TEMPS = ["cold", "20", "30", "40", "60", "90"];
const awTempDial = (temp, status) => ({
  type: "custom:mushroom-template-card",
  entity: temp,
  primary: `{% set v = states('${temp}') %}{% if v == 'cold' %}Cold{% elif v in ['unavailable', 'unknown'] %}\u2014{% else %}{{ v }}\u00b0C{% endif %}`,
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
        {% set v = states('${temp}') %}
        {% set opts = ['cold', '20', '30', '40', '60', '90'] %}
        --aw-dial: {{ opts.index(v) if v in opts else 0 }};
        ${AW_FLAT}
        --card-primary-font-size: 0.9rem;
        --card-primary-font-weight: 600;
      }`,
  } },
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
  // vertical (icon-on-top) so the text spans the FULL 3-across cell (~100px) instead of the
  // ~55px an icon-left layout leaves — at 360px phone width "0.3 kWh · 23 L" and "No. 2 · step
  // 7" clipped their tails ("0.3 kW", "step") in the horizontal layout; centred + full-width
  // they wrap cleanly.
  layout: "vertical",
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
        line-height: 1.2 !important; text-align: center !important;
      }
      ha-tile-icon { --tile-icon-size: 30px; --mdc-icon-size: 18px; width: 30px; height: 30px; }
      mushroom-shape-icon { --icon-size: 30px; }
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
  const apply = (r) => {
    for (const cell of r.cards) {
      // recurse through nested stacks (the settings row nests two segmented groups) so the
      // top-margin lands on every leaf cell, not on a stack that carries no card_mod.
      if (cell.type === "horizontal-stack" || cell.type === "vertical-stack") { apply(cell); continue; }
      if (cell.card_mod && typeof cell.card_mod.style["."] === "string") cell.card_mod.style["."] += `
      ha-card { margin-top: ${px}px; }`;
    }
  };
  apply(row);
  return row;
};

const awMake = (c, parts) => {
  const base = (c.entity || "sensor.washing_machine_machine_status")
    .split(".")[1].replace(/_machine_status$/, "");
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

  // Shared state→visual preamble: computed identically in the porthole and the LED screen so
  // each card sets only the vars it needs (DESIGN.md rule 1 — Jinja lives in the host block).
  const statePre = `
          {% set st = states('${status}') %}
          {% set e = states('${err}') %}
          {% set offline = st in ['unavailable', 'unknown'] %}
          {% set trouble = st == 'alarm' or e not in ['none', 'unavailable', 'unknown'] %}
          {% set fault = offline or trouble %}`;

  // ── the porthole (LEFT half of the hero) — the animated drum disc, no glyph, no text ──────
  // The LED display and progress bar have MOVED to the screen card on the right; this card is
  // now just the tumbling porthole, vertically centred so it sits on the LED's centre line.
  const portholeCard = {
    type: "custom:mushroom-template-card",
    entity: status,
    layout: "vertical",
    icon: "mdi:washing-machine",
    tap_action: { action: "more-info" },
    hold_action: { action: "more-info" },
    card_mod: { style: {
      "mushroom-shape-icon$": awPorthole(".shape", "--icon-size: 88px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
      "ha-tile-icon$": awPorthole(".container", "width: 88px !important; height: 88px !important;"),
      ".": `
        mushroom-shape-icon { --icon-size: 88px; display: flex; margin: 0 !important; }
        ha-tile-icon { --tile-icon-size: 88px; width: 88px; height: 88px; }
        /* the porthole IS the machine — the mdi glyph would float on the glass, so hide it */
        ha-state-icon, ha-icon { display: none; }
        ha-tile-info, mushroom-state-info { display: none !important; }
        ha-card {
          ${statePre}
          {% if fault %}{% set rgb = '244, 67, 54' %}
          {% elif st == 'running' %}{% set rgb = '3, 169, 244' %}
          {% elif st == 'paused' %}{% set rgb = '255, 152, 0' %}
          {% elif st == 'standby' %}{% set rgb = '76, 175, 80' %}
          {% else %}{% set rgb = '96, 135, 170' %}{% endif %}
          --aw-rgb: {{ rgb }};
          {% if fault %}--aw-pulse: aw-pulse 0.8s ease-in-out infinite; --aw-drum: none; --aw-slosh: none; --aw-water: 40%; --aw-op: 1;
          {% elif st == 'running' %}--aw-pulse: aw-pulse 2s ease-in-out infinite; --aw-drum: aw-drum 2.2s linear infinite; --aw-slosh: aw-slosh 5s linear infinite; --aw-water: 42%; --aw-op: 1;
          {% elif st == 'paused' %}--aw-pulse: aw-pulse 3.5s ease-in-out infinite; --aw-drum: aw-drum 8s linear infinite; --aw-slosh: aw-slosh 12s linear infinite; --aw-water: 42%; --aw-op: 0.95;
          {% elif st == 'standby' %}--aw-pulse: aw-pulse 4s ease-in-out infinite; --aw-drum: none; --aw-slosh: none; --aw-water: 18%; --aw-op: 1;
          {% else %}--aw-pulse: none; --aw-drum: none; --aw-slosh: none; --aw-water: 10%; --aw-op: 0.92;{% endif %}
          ${AW_FLAT}
          display: flex; align-items: center; justify-content: center;
          padding: 2px 0;
          min-height: 112px;
        }`,
    } },
  };

  // ── the LED screen (RIGHT half of the hero) — the machine's real display ──────────────────
  // A mushroom-chips-card styled as a dark inset screen: two small indicator glyphs (machine
  // state + door) sit near the top; the big time / "EEEE" digits glow, centred, via ha-card::
  // before (a real pseudo-element, so a genuine seven-seg text-shadow bloom); the progress
  // track runs along the bottom (::after). state+door fold in here — no separate chip row.
  const ledScreen = {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips: [
      // machine state — and the single fault glyph (offline/alarm/error -> red alert, req 4)
      { type: "template",
        icon: `{% set st = states('${status}') %}{% set e = states('${err}') %}{% if st in ['unavailable', 'unknown'] or st == 'alarm' or e not in ['none', 'unavailable', 'unknown'] %}mdi:alert{% elif st == 'running' %}mdi:sync{% elif st == 'paused' %}mdi:pause-circle{% elif st == 'standby' %}mdi:play-circle{% elif st == 'off' %}mdi:power{% else %}mdi:washing-machine{% endif %}`,
        icon_color: `{% set st = states('${status}') %}{% set e = states('${err}') %}{% if st in ['unavailable', 'unknown'] or st == 'alarm' or e not in ['none', 'unavailable', 'unknown'] %}red{% elif st == 'running' %}light-blue{% elif st == 'paused' %}orange{% elif st == 'standby' %}green{% else %}grey{% endif %}`,
        tap_action: { action: "more-info", entity: status } },
      // door open / closed
      { type: "template",
        icon: `{% if is_state('${door}', 'open') %}mdi:door-open{% else %}mdi:door{% endif %}`,
        icon_color: `{% if is_state('${door}', 'open') %}orange{% else %}green{% endif %}`,
        tap_action: { action: "more-info", entity: door } },
      // cycle: programme No + phase step, printed small on the screen (moved here from the old
      // stats footer). Blank unless a programme is loaded, so it vanishes when the machine is off.
      { type: "template",
        content: `{% set p = states('${s("selected_program")}') %}{% set ph = states('${s("current_program_phase")}') %}{% if p not in ['unavailable', 'unknown', 'none', '', '0'] %}P{{ p }}{% if ph not in ['unavailable', 'unknown', 'none', '', '0'] %}\u00b7S{{ ph }}{% endif %}{% endif %}`,
        tap_action: { action: "more-info", entity: s("selected_program") } },
    ],
    card_mod: { style: `
      @keyframes aw-led-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.28; } }
      ha-card {
        ${statePre}
        {% set rm = states('${rem}') | float(0) %}
        {% set tt = states('${tot}') | float(0) %}
        {% set frac = ((tt - rm) / tt) if tt > 0 else 0 %}
        {% set frac = [[frac, 0] | max, 1] | min %}
        {% set mins = rm | int %}
        {% set clock = (mins // 60) ~ ':' ~ ('%02d' | format(mins % 60)) %}
        {% if fault %}{% set led = 'EEEE' %}{% set ledc = '#ff6b6b' %}{% set leda = 'aw-led-blink 0.8s steps(1) infinite' %}{% set glow = '255, 90, 90' %}
        {% elif st == 'running' %}{% set led = clock %}{% set ledc = '#7cfc98' %}{% set leda = 'none' %}{% set glow = '80, 240, 130' %}
        {% elif st == 'paused' %}{% set led = clock %}{% set ledc = '#ffc66d' %}{% set leda = 'aw-led-blink 1.4s steps(1) infinite' %}{% set glow = '255, 180, 80' %}
        {% elif st == 'standby' %}{% set led = clock %}{% set ledc = '#8fe4a3' %}{% set leda = 'none' %}{% set glow = '120, 220, 150' %}
        {% else %}{% set led = '--:--' %}{% set ledc = '#67727c' %}{% set leda = 'none' %}{% set glow = '70, 90, 110' %}{% endif %}
        position: relative;
        overflow: hidden;
        background: linear-gradient(165deg, #0d1116 0%, #161d23 55%, #0f151a 100%) !important;
        --ha-card-background: #0d1116;
        border: 1px solid #05070a !important;
        border-radius: 12px !important;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.4) !important;
        min-height: 112px;
        display: flex; align-items: flex-start; justify-content: center;
        padding: 8px 8px 0;
        --chip-background: transparent;
        --chip-box-shadow: none;
        --chip-border-width: 0px;
        --chip-border-color: transparent;
        --chip-height: 22px;
        --chip-icon-size: 18px;
        --chip-spacing: 6px;
        --primary-text-color: #9fb4ad;
        --secondary-text-color: #9fb4ad;
        --aw-led-text: "{{ led }}";
        --aw-led-color: {{ ledc }};
        --aw-led-anim: {{ leda }};
        --aw-frac: {{ frac | round(3) }};
        --aw-bar: {{ 'block' if st in ['running', 'paused'] else 'none' }};
        --aw-glow: {{ glow }};
        --aw-cycle-color: {% if st in ['off', 'unavailable', 'unknown'] %}#556158{% else %}#9fb4ad{% endif %};
        filter: drop-shadow(0 0 4px rgba({{ glow }}, 0.5));
      }
      .chip-container { flex-wrap: nowrap !important; }
      /* the cycle text chip reads as small screen print, not a label */
      mushroom-template-chip .content, mushroom-chip .content {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 13px; letter-spacing: 1px; font-weight: 700; color: var(--aw-cycle-color, #9fb4ad);
        text-shadow: 0 0 5px rgba(120, 200, 170, 0.4);
      }
      /* the big time / EEEE digits — centred, real seven-seg text-shadow glow */
      ha-card::before {
        content: var(--aw-led-text, "--:--");
        position: absolute; left: 0; right: 0; top: 26px; bottom: 14px;
        display: flex; align-items: center; justify-content: center;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 34px; font-weight: 700; letter-spacing: 3px;
        color: var(--aw-led-color, #67727c);
        text-shadow: 0 0 9px currentColor, 0 0 2px currentColor;
        white-space: nowrap;
        animation: var(--aw-led-anim, none);
        z-index: 1; pointer-events: none;
      }
      /* progress: a thin inset track along the bottom of the screen while a wash runs */
      ha-card::after {
        content: '';
        position: absolute; left: 10px; right: 10px; bottom: 7px; height: 4px;
        border-radius: 2px;
        background: linear-gradient(90deg,
          rgb(var(--aw-glow, 120,130,140)) calc(var(--aw-frac, 0) * 100%),
          rgba(255,255,255,0.12) calc(var(--aw-frac, 0) * 100%));
        display: var(--aw-bar, none);
        z-index: 2;
      }` },
  };

  // the hero: porthole on the left, the big LED screen on the right, side by side, centred.
  // (No awGap — it targets the `.`-keyed style object of each cell, and the LED cell's style is
  // a plain string; and the hero is the first row, so it needs no top gap anyway.)
  const hero = { type: "horizontal-stack", cards: [portholeCard, ledScreen] };

  // ── the conditional-status row: a slim chip row for the statuses that only sometimes apply
  // (delayed start, load, detergent-low, softener-low). Each renders NOTHING when it doesn't
  // apply (empty icon/content + transparent bg), so normally this row is invisible — the LED
  // already carries the always-present state + door. It appears only when there's something to
  // say, so it never clutters and never truncates.
  const heroExtras = {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips: [
      // delayed start (only when a delay is set)
      { type: "template",
        icon: `{% if states('${delay}') | int(0) > 0 %}mdi:timer-sand{% endif %}`,
        icon_color: "blue",
        content: `{% set d = states('${delay}') | int(0) %}{% if d > 0 %}{{ d }}h delay{% endif %}`,
        tap_action: { action: "more-info", entity: delay } },
      // load present (only when a weight is set)
      { type: "template",
        icon: `{% if states('${weight}') | float(0) > 0 %}mdi:tshirt-crew{% endif %}`,
        icon_color: "blue-grey",
        content: `{% set w = states('${weight}') | float(0) %}{% if w > 0 %}{{ w | round(1) }} kg{% endif %}`,
        tap_action: { action: "more-info", entity: weight } },
      // detergent low
      { type: "template",
        icon: `{% if is_state('binary_sensor.${base}_detergent_state', 'on') %}mdi:cup-water{% endif %}`,
        icon_color: "amber",
        content: `{% if is_state('binary_sensor.${base}_detergent_state', 'on') %}Detergent low{% endif %}`,
        tap_action: { action: "more-info", entity: `binary_sensor.${base}_detergent_state` } },
      // softener low
      { type: "template",
        icon: `{% if is_state('binary_sensor.${base}_softener_state', 'on') %}mdi:flower{% endif %}`,
        icon_color: "pink",
        content: `{% if is_state('binary_sensor.${base}_softener_state', 'on') %}Softener low{% endif %}`,
        tap_action: { action: "more-info", entity: `binary_sensor.${base}_softener_state` } },
    ],
    card_mod: { style: `
      ha-card, :host {
        background: transparent !important;
        box-shadow: none !important;
        ${AW_TEXT}
        --chip-background: transparent;
        --chip-box-shadow: none;
        --chip-border-width: 0px;
        --chip-height: 24px;
        --chip-icon-size: 18px;
        --chip-font-size: 0.78rem;
        --chip-spacing: 8px;
        padding: 0 8px;
        min-height: 0 !important;
      }
      .chip-container { min-height: 0 !important; }` },
  };

  const cards = [hero, heroExtras];

  if (parts.controls) {
    cards.push(awGap(-14, { type: "horizontal-stack", cards: [
      awDial(s("selected_program"), status),
      awButton(actions, status, "start", "Start", "mdi:play", "76, 175, 80",
        `is_state('${status}', 'running')`),
      awButton(actions, status, "pause", "Pause", "mdi:pause", "255, 152, 0",
        `is_state('${status}', 'paused')`),
      // Stop's LED never lights on a fault (req 4): the fault is shown ONLY by the hero LED
      // "EEEE" + the single alert glyph in the chip row — buttons carry no fault indicator.
      awButton(actions, status, "stop", "Stop", "mdi:stop", "244, 67, 54",
        `false`,
        "Stop the wash? The programme will be cancelled."),
    ] }));
  }

  // The four programme settings, tactile: segmented "radio" rows (icons to fit phone width)
  // + a rotary spin dial. Per-setting accent identity kept (temp red / spin dial / detergent
  // teal / softener pink). Live options are fixed by the Tuya integration.
  const spinDial = awSpinDial(sel("spin_speed"), status);
  const tempDial = awTempDial(sel("temperature"), status);
  // dose scale (off / auto / less / standard / more) as single glyphs: ○ = off, A = auto,
  // 1/2/3 = less/standard/more. No motif — the group label above + the accent fill carry the
  // identity, so detergent and softener share the glyph set (Neil: "no per-value labels").
  const DOSE = [
    { value: "off", glyph: "○" },   // ○
    { value: "auto", glyph: "A" },
    { value: "less", glyph: "1" },
    { value: "standard", glyph: "2" },
    { value: "more", glyph: "3" },
  ];
  const DET_RGB = "0, 150, 136";   // teal
  const SOFT_RGB = "233, 30, 99";  // pink
  const detSeg = (st) => awSeg(sel("detergent"), st, DET_RGB, DOSE);
  const softSeg = (st) => awSeg(sel("softener"), st, SOFT_RGB, DOSE);

  if (parts.settings) {
    // Row 1: wash temp + spin dials. Row 2: two segmented controls (detergent | softener), each
    // a joined bar with a small label above. Kept slim + untruncated at 390/360.
    cards.push(awGap(14, { type: "horizontal-stack", cards: [tempDial, spinDial] }));
    // vertical-stack = label row over bar row; the two groups sit 50/50 side by side so each
    // label centres over its own bar. The 10px top margin (on the labels) opens the gap from
    // the dial row. No awGap here (it would push the bar cells down off their labels).
    cards.push({
      type: "vertical-stack",
      cards: [
        { type: "horizontal-stack", cards: [
          awSegLabel("Detergent", DET_RGB, 10),
          awSegLabel("Softener", SOFT_RGB, 10),
        ] },
        { type: "horizontal-stack", cards: [detSeg(status), softSeg(status)] },
      ],
    });
  } else if (parts.everyday) {
    // medium: the two settings everyone actually changes, no title chrome
    cards.push(awGap(14, { type: "horizontal-stack", cards: [tempDial, spinDial] }));
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

  // Stats footer removed 2026-07-23 (Neil): the cycle info moved into the LED screen, and the
  // Today/All-time energy readouts are covered by the "Energy — last 7 days" graph on the subview.
  // `parts.stats` is now a no-op; kept in the size configs harmlessly.

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
with a tumbling tri-spoke drum, a seven-segment LED showing time remaining (blinking when
paused, a red "EEEE" when the machine faults or goes offline), a rotary programme dial that
turns to the selected programme, and embossed Start/Pause/Stop buttons with live LED dots —
with the machine-state + door indicators tucked inside the LED bezel, a progress track along
its bottom edge, and a slim conditional row that surfaces the occasional statuses (delayed
start, load, low detergent / softener) only when they apply.`;

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
  desc: "The animated porthole hero alone — beside the big LED screen (time, state + door glyphs, progress, EEEE faults)",
  docs: AW_DOCS,
  make: (c) => awMake(c, { rows: 3 }),
});

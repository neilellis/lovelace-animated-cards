// kinds/advanced-dishwasher.js — Advanced Dishwasher (one full-fascia panel).
//
// Built for AEG/Electrolux dishwashers on the `electrolux_status` integration (e.g. the
// ComfortLift), which explodes the machine into sibling entities on one id prefix:
// `sensor.<base>_connectivitystate`, `sensor.<base>_cyclephase`,
// `select.<base>_userselections_programuid`, `button.<base>_executecommand[_N]`, … Bind ANY of
// the machine's sensors (connectivity state is ideal); every sibling derives from the prefix.
//
// Sibling design of `advanced-washer` (same white fascia, LED screen, knob faces, embossed
// buttons, segmented bars, Bubble-Card pop-overs) — its face helpers (awBtnFace, awDialFace,
// awPopup, awSegLabel, AW_FLAT/AW_TEXT, awGap) are reused directly; the state/service-specific
// builders get dishwasher variants here because the washer ones hard-code awDisabled +
// select.select_option (the dishwasher's commands are button.press and its rinse-aid level is
// a number). ⚠️ This file concatenates BEFORE advanced-washer.js, so washer consts are only
// referenced inside functions that run at make()/render time — never at module-eval time.
//
// State model (no single machine-status enum on this integration by default):
//   `sensor.<base>_appliancestate` exists but ships registry-DISABLED (disabled_by:
//   integration), so the card composes its state truthfully from what is live:
//     offline  — connectivitystate unavailable/unknown/Disconnected
//     running  — cyclephase is a real phase (idle reads the literal string "Unavailable")
//     idle     — otherwise (the LED shows the selected programme's duration, dimmed —
//                `timetoend` stays live while idle, like the real panel)
//   and if appliancestate IS enabled later, its values upgrade the card for free
//   (paused / delayed start / end of cycle / error, matched case-insensitively).
//   The alerts sensor's count is NOT a fault signal (suppressed WARNING-NOT_NEEDED entries
//   still count); an alert chip appears only when an alarm attribute is literally "ON",
//   and EEEE is reserved for offline/error.

// Controls grey out + stop taking taps when the machine is unreachable — connectivity is the
// panel signal here (there's no "panel off" state like the Tuya washer's).
const adwDisabled = (conn) => `
        {% set cn = states('${conn}') %}
        {% if cn in ['unavailable', 'unknown', 'Disconnected', 'disconnected'] %}
          pointer-events: none; opacity: 0.35; filter: saturate(0.05) grayscale(0.7) brightness(0.98);
        {% endif %}`;

// Command buttons additionally soften when the appliance refuses remote commands
// (`sensor.<base>_remotecontrol` != Enabled — e.g. the door panel wasn't armed).
const adwCmdDisabled = (conn, remote) => `
        {% set cn = states('${conn}') %}
        {% if cn in ['unavailable', 'unknown', 'Disconnected', 'disconnected'] %}
          pointer-events: none; opacity: 0.35; filter: saturate(0.05) grayscale(0.7) brightness(0.98);
        {% elif states('${remote}') not in ['Enabled', 'enabled'] %}
          pointer-events: none; opacity: 0.55; filter: saturate(0.4);
        {% endif %}`;

// Shared Jinja preamble — the composite machine state, computed identically wherever needed.
const adwStatePre = (conn, app, ph) => `
          {% set conn = states('${conn}') %}
          {% set app = states('${app}') | lower | replace('_', ' ') %}
          {% set ph = states('${ph}') %}
          {% set phlive = ph not in ['Unavailable', 'unavailable', 'unknown', 'none', ''] %}
          {% set offline = conn in ['unavailable', 'unknown', 'Disconnected', 'disconnected'] %}
          {% set fault = offline or app in ['alarm', 'error', 'failure', 'fault'] %}
          {% set paused = app in ['paused', 'pause'] %}
          {% set delayed = app in ['delayed start', 'delayedstart', 'delayed'] %}
          {% set finished = app in ['end of cycle', 'endofcycle', 'finished', 'cycle complete'] %}
          {% set running = not fault and not paused and (phlive or app in ['running', 'washing']) %}`;

// ── the door window (LEFT half of the hero) — the washer porthole's dishwasher sibling ────
// root = white rim + dark glass + reflection, with STATIC plates (light discs racked low in
// the glass — they don't spin, the basket doesn't); ::before = the water slosh (washer's);
// ::after = the SPRAY ARM — a two-blade bar + hub that spins while a cycle runs.
const adwGlass = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.35), transparent 45%),
          radial-gradient(circle 8px at 30% 66%, rgba(222, 230, 236, 0.9) 0 8px, transparent 9px),
          radial-gradient(circle 9px at 52% 72%, rgba(200, 212, 222, 0.9) 0 9px, transparent 10px),
          radial-gradient(circle 7px at 72% 64%, rgba(222, 230, 236, 0.85) 0 7px, transparent 8px),
          radial-gradient(circle at 50% 55%, #2c343d 0%, #1c2229 70%, #14181d 100%) !important;
        border: 6px solid #eef0f2;
        opacity: var(--adw-op, 1);
        animation: var(--adw-pulse, none);
        box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--adw-rgb, 120, 130, 140), 0.25);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--adw-water, 10%));
        background: rgba(3, 155, 229, 0.5);
        border-radius: 42%;
        transition: top 0.8s ease;
        animation: var(--adw-slosh, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 16%;
        border-radius: 9999px;
        background-image:
          radial-gradient(circle 6px at 50% 50%, #9aa1a8 0 6px, transparent 7px),
          conic-gradient(from 0deg,
            rgba(160, 200, 230, 0.9) 0deg 14deg, transparent 14deg 180deg,
            rgba(160, 200, 230, 0.9) 180deg 194deg, transparent 194deg 360deg);
        animation: var(--adw-arm, none);
        z-index: 1;
      }
      @keyframes adw-slosh { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes adw-arm   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes adw-pulse {
        0%   { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--adw-rgb, 120, 130, 140), 0.3); }
        50%  { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 24px 9px rgba(var(--adw-rgb, 120, 130, 140), 0.85); }
        100% { box-shadow: 0 0 0 2px #cfd4d8, inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 8px 2px rgba(var(--adw-rgb, 120, 130, 140), 0.3); }
      }`;

// ── an embossed command button firing button.press (the washer's awButton fires
// select.select_option — this machine exposes one button entity per command) ──────────────
const adwButton = (btn, conn, remote, label, icon, rgb, lit, confirmText) => ({
  type: "custom:mushroom-template-card",
  entity: btn,
  primary: label,
  icon,
  // NB button entities idle at 'unknown' (never-pressed) — only 'unavailable' means dead.
  icon_color: `{% if states('${btn}') == 'unavailable' %}disabled{% else %}rgb(${rgb}){% endif %}`,
  layout: "vertical",
  tap_action: {
    action: "call-service",
    service: "button.press",
    target: { entity_id: btn },
    ...(confirmText ? { confirmation: { text: confirmText } } : {}),
  },
  card_mod: { style: {
    // + kill Mushroom's ::before colour tint (icon_color × 0.2 over the face) — the button
    // must read as an embossed WHITE knob with a coloured glyph, like the washer's fascia
    "ha-tile-icon$": awBtnFace(".container", "width: 48px !important; height: 48px !important;") + `
      .container::before { display: none !important; }`,
    "mushroom-shape-icon$": awBtnFace(".shape", "--icon-size: 48px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
    ".": `
      ha-tile-icon { --tile-icon-size: 48px; --mdc-icon-size: 24px; width: 48px; height: 48px; }
      mushroom-shape-icon { --icon-size: 48px; }
      /* 5 cells across at 390px: the label must own the full cell ("Resume" clipped to
         "Resum" before display:block/width:100%) */
      ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
      ha-tile-info [slot="primary"] { display: block !important; width: 100% !important; white-space: normal !important; text-overflow: clip !important; overflow: visible !important; text-align: center !important; line-height: 1.15 !important; }
      ha-card {
        ${adwCmdDisabled(conn, remote)}
        --aw-btn-rgb: ${rgb};
        {% if ${lit} %}--aw-btn-led: 1; --aw-btn-glow: 7px; --aw-btn-blink: aw-btn-blink 1.6s steps(1) infinite;{% endif %}
        ${AW_FLAT}
        --card-primary-font-size: 0.75rem;
        --card-primary-font-weight: 600;
      }`,
  } },
});

// ── a rotary select dial (knob face from the washer) whose pointer turns to the option's
// index in `opts`; tap → the Bubble pop-over at `hash`; `label` = Jinja for the under-text ──
const adwSelDial = (entity, conn, opts, label, hash) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: label,
  icon: "mdi:knob",
  layout: "vertical",
  tap_action: { action: "navigate", navigation_path: hash },
  card_mod: { style: {
    "ha-tile-icon$": awDialFace(".container", "width: 48px !important; height: 48px !important;"),
    "mushroom-shape-icon$": awDialFace(".shape", "--icon-size: 48px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
    ".": `
      ha-tile-icon { --tile-icon-size: 48px; width: 48px; height: 48px; }
      mushroom-shape-icon { --icon-size: 48px; }
      ha-state-icon, ha-icon { display: none; }
      ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
      ha-tile-info [slot="primary"] { display: block !important; width: 100% !important; white-space: normal !important; text-overflow: clip !important; overflow: visible !important; text-align: center !important; line-height: 1.15 !important; }
      ha-card {
        ${adwDisabled(conn)}
        {% set v = states('${entity}') %}
        {% set opts = [${opts.map((o) => `'${o}'`).join(", ")}] %}
        --aw-dial: {{ opts.index(v) if v in opts else 0 }};
        ${AW_FLAT}
        --card-primary-font-size: 0.8rem;
        --card-primary-font-weight: 600;
      }`,
  } },
});

// ── ONE cell of a segmented bar — the washer's awSegCell generalised to a service:
// selects fire select.select_option, numbers fire number.set_value (the rinse-aid level).
// Same joined-bar geometry: abutting cells, 1px dividers, outer-corner radius only.
const adwSegCell = (entity, conn, rgb, o, pos, isNumber) => {
  const active = isNumber
    ? `states('${entity}') | int(-1) == ${o.value}`
    : `is_state('${entity}', '${o.value}')`;
  const R = "9px";
  const radius = pos === "first" ? `${R} 0 0 ${R}` : pos === "last" ? `0 ${R} ${R} 0` : "0";
  const leftBorder = pos === "first" ? `1px solid ${AW_SEG_BORDER}` : "none";
  return {
    type: "custom:mushroom-template-card",
    entity,
    primary: o.glyph,
    tap_action: isNumber
      ? { action: "call-service", service: "number.set_value", target: { entity_id: entity }, data: { value: o.value } }
      : { action: "call-service", service: "select.select_option", target: { entity_id: entity }, data: { option: o.value } },
    card_mod: { style: {
      ".": `
        ha-tile-icon, mushroom-shape-icon { display: none !important; }
        ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
        ha-tile-info [slot="primary"] {
          display: block !important; width: 100% !important;
          font-size: 0.92rem !important; font-weight: 700 !important; line-height: 1 !important;
          text-align: center !important; white-space: nowrap !important; text-overflow: clip !important;
          overflow: visible !important;
          color: {% if ${active} %}#ffffff{% else %}rgb(89, 99, 107){% endif %} !important;
        }
        ha-card {
          ${adwDisabled(conn)}
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

const adwSeg = (entity, conn, rgb, options, isNumber) => ({
  type: "horizontal-stack",
  cards: options.map((o, i) =>
    adwSegCell(entity, conn, rgb, o, i === 0 ? "first" : i === options.length - 1 ? "last" : "mid", isNumber)),
  card_mod: { style: `
    #root { gap: 0 !important; }
    #root > * { margin: 0 !important; }` },
});

// ── one pill of the delay-start pop-over — awSheetOption's number sibling ─────────────────
const adwNumSheetOption = (entity, rgb, o) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: o.label,
  tap_action: {
    action: "call-service",
    service: "number.set_value",
    target: { entity_id: entity },
    data: { value: o.value },
  },
  card_mod: { style: {
    ".": `
      ha-tile-icon, mushroom-shape-icon { display: none !important; }
      ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
      ha-tile-info [slot="primary"] {
        display: block !important; width: 100% !important;
        font-size: 1rem !important; font-weight: 700 !important; line-height: 1.1 !important;
        text-align: center !important; white-space: nowrap !important;
        color: {% if states('${entity}') | int(-1) == ${o.value} %}#0d1116{% else %}#e7ecef{% endif %} !important;
      }
      ha-card {
        --ha-card-background: transparent;
        background: {% if states('${entity}') | int(-1) == ${o.value} %}rgb(${rgb}){% else %}rgba(255,255,255,0.05){% endif %} !important;
        border: 2px solid rgb(${rgb}) !important;
        border-radius: 14px !important;
        padding: 16px 6px !important;
        min-height: 0 !important;
        box-shadow: {% if states('${entity}') | int(-1) == ${o.value} %}0 0 12px rgba(${rgb}, 0.6){% else %}none{% endif %} !important;
      }` } },
});

const adwNumPopup = (hash, title, icon, entity, rgb, options) => ({
  type: "custom:bubble-card",
  card_type: "pop-up",
  hash,
  name: title,
  icon,
  show_header: true,
  close_on_click: true,
  bg_color: "#12181e",
  cards: [
    { type: "grid", columns: 3, square: false,
      cards: options.map((o) => adwNumSheetOption(entity, rgb, o)) },
  ],
});

// ── a feature toggle (the washer's awToggle with the dishwasher disable semantics) ────────
const adwToggle = (entity, conn, name, icon, color) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon, icon_color: color,
  secondary_info: "state",
  tap_action: { action: "toggle" },
  card_mod: { style: {
    "mushroom-state-info$": `.primary { white-space: normal !important; line-height: 1.2 !important; }`,
    ".": `
      ha-state-icon { display: inline-block; animation: var(--adw-opt, none); }
      @keyframes adw-opt-breathe {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50%      { transform: scale(1.12); filter: brightness(1.25); }
      }
      ha-card {
        ${adwDisabled(conn)}
        {% if is_state(config.entity, 'on') %}--adw-opt: adw-opt-breathe 3s ease-in-out infinite;{% endif %}
        ${AW_FLAT}
        --icon-size: 32px;
        --spacing: 6px;
        --card-primary-font-size: 0.85rem;
        --card-secondary-font-size: 0.8rem;
      }` } },
});

// ── the builder ───────────────────────────────────────────────────────────────────────────
const ADW_PROGS = ["Auto", "Eco", "Intensive", "Machine Care", "Normal90", "Quick30", "Quick60", "Rinse"];
// under-dial + LED short names (nothing may truncate at 390/360 — "Machine Care" won't fit
// under a 48px knob in a 5-across row)
const ADW_PROG_SHORT = {
  "Auto": "Auto", "Eco": "Eco", "Intensive": "Intensive", "Machine Care": "Care",
  "Normal90": "Normal 90", "Quick30": "Quick 30", "Quick60": "Quick 60", "Rinse": "Rinse",
};
const ADW_PROG_LED = {
  "Auto": "AUTO", "Eco": "ECO", "Intensive": "INTNSV", "Machine Care": "CARE",
  "Normal90": "NORM90", "Quick30": "QCK30", "Quick60": "QCK60", "Rinse": "RINSE",
};
// water hardness in a sensible display order (the entity's option list is alphabetical)
const ADW_HARD = ["Soft", "Medium", "Hard", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8", "Step 9", "Step 10"];
const ADW_DELAYS = [
  { value: 0, label: "Off" }, { value: 60, label: "1 h" }, { value: 120, label: "2 h" },
  { value: 180, label: "3 h" }, { value: 240, label: "4 h" }, { value: 360, label: "6 h" },
  { value: 480, label: "8 h" }, { value: 720, label: "12 h" },
];

const ADW_PROG_RGB = "63, 81, 181";    // indigo — the programme accent
const ADW_HARD_RGB = "33, 150, 243";   // blue — water hardness
const ADW_DELAY_RGB = "103, 58, 183";  // deep purple — delay start
const ADW_RINSE_RGB = "0, 172, 193";   // cyan — rinse aid
const ADW_SOUND_RGB = "255, 152, 0";   // orange — end-of-cycle sound

const adwMake = (c) => {
  const base = (c.entity || "sensor.dishwasher_connectivitystate")
    .split(".")[1]
    .replace(/_(appliancestate|appliancemode|cyclephase|connectivitystate|timetoend|remotecontrol|alerts|totalcyclecounter|condtwosoil|userselections_(ecoscore|energyscore|waterscore))$/, "");

  const conn = `sensor.${base}_connectivitystate`;
  const app = `sensor.${base}_appliancestate`;
  const ph = `sensor.${base}_cyclephase`;
  const tte = `sensor.${base}_timetoend`;
  const remote = `sensor.${base}_remotecontrol`;
  const alerts = `sensor.${base}_alerts`;
  const door = `binary_sensor.${base}_doorstate`;
  const eco = `binary_sensor.${base}_miscellaneousstate_ecomode`;
  const prog = `select.${base}_userselections_programuid`;
  const hard = `select.${base}_waterhardness`;
  const sound = `select.${base}_endofcyclesound`;
  const rinse = `number.${base}_rinseaidlevel`;
  const delay = `number.${base}_starttime`;
  // execute-command buttons, in the integration's registration order
  const btnPause = `button.${base}_executecommand`;
  const btnResume = `button.${base}_executecommand_2`;
  const btnStart = `button.${base}_executecommand_3`;
  const btnStop = `button.${base}_executecommand_4`;

  const statePre = adwStatePre(conn, app, ph);
  // Jinja bool fragments for the button LEDs (composite state, same rules as statePre)
  const jRunning = `(states('${ph}') not in ['Unavailable', 'unavailable', 'unknown', 'none', ''] or (states('${app}') | lower | replace('_', ' ')) in ['running', 'washing'])`;
  const jPaused = `(states('${app}') | lower) in ['paused', 'pause']`;

  // ── the glass door window (LEFT half of the hero) ────────────────────────────────────────
  const glassCard = {
    type: "custom:mushroom-template-card",
    entity: tte,
    layout: "vertical",
    icon: "mdi:dishwasher",
    tap_action: { action: "more-info" },
    hold_action: { action: "more-info" },
    card_mod: { style: {
      "mushroom-shape-icon$": adwGlass(".shape", "--icon-size: 88px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
      "ha-tile-icon$": adwGlass(".container", "width: 88px !important; height: 88px !important;"),
      ".": `
        mushroom-shape-icon { --icon-size: 88px; display: flex; margin: 0 !important; }
        ha-tile-icon { --tile-icon-size: 88px; width: 88px; height: 88px; }
        /* the glass IS the machine — the mdi glyph would float on it, so hide it */
        ha-state-icon, ha-icon { display: none; }
        ha-tile-info, mushroom-state-info { display: none !important; }
        ha-card {
          ${statePre}
          {% if fault %}{% set rgb = '244, 67, 54' %}
          {% elif running %}{% set rgb = '3, 169, 244' %}
          {% elif paused %}{% set rgb = '255, 152, 0' %}
          {% elif delayed %}{% set rgb = '100, 170, 255' %}
          {% elif finished %}{% set rgb = '76, 175, 80' %}
          {% else %}{% set rgb = '96, 135, 170' %}{% endif %}
          --adw-rgb: {{ rgb }};
          {% if fault %}--adw-pulse: adw-pulse 0.8s ease-in-out infinite; --adw-arm: none; --adw-slosh: none; --adw-water: 26%; --adw-op: 1;
          {% elif running %}--adw-pulse: adw-pulse 2s ease-in-out infinite; --adw-arm: adw-arm 1.4s linear infinite; --adw-slosh: adw-slosh 5s linear infinite; --adw-water: 30%; --adw-op: 1;
          {% elif paused %}--adw-pulse: adw-pulse 3.5s ease-in-out infinite; --adw-arm: adw-arm 8s linear infinite; --adw-slosh: adw-slosh 12s linear infinite; --adw-water: 30%; --adw-op: 0.95;
          {% elif delayed %}--adw-pulse: adw-pulse 4s ease-in-out infinite; --adw-arm: none; --adw-slosh: none; --adw-water: 14%; --adw-op: 1;
          {% elif finished %}--adw-pulse: none; --adw-arm: none; --adw-slosh: none; --adw-water: 8%; --adw-op: 1;
          {% else %}--adw-pulse: none; --adw-arm: none; --adw-slosh: none; --adw-water: 8%; --adw-op: 0.92;{% endif %}
          ${AW_FLAT}
          display: flex; align-items: center; justify-content: center;
          padding: 2px 0;
          min-height: 112px;
        }`,
    } },
  };

  // ── the LED screen (RIGHT half of the hero) — glyphs + big digits, washer-style ──────────
  // Digits: time-to-end while running (bright green) / paused (amber blink) / delayed (blue);
  // dimmed programme duration while idle (timetoend stays live on this integration); a red
  // blinking EEEE on offline/error. No progress track — the integration has no total-time
  // sensor to compute a fraction from.
  const ledScreen = {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips: [
      // machine-state glyph (single fault glyph on offline/error — the fault lives here + EEEE)
      { type: "template",
        icon: `${statePre}{% if fault %}mdi:alert{% elif running %}mdi:sync{% elif paused %}mdi:pause-circle{% elif delayed %}mdi:timer-sand{% elif finished %}mdi:check-circle{% else %}mdi:power{% endif %}`,
        icon_color: `${statePre}{% if fault %}red{% elif running %}light-blue{% elif paused %}orange{% elif delayed %}blue{% elif finished %}green{% else %}grey{% endif %}`,
        tap_action: { action: "more-info", entity: conn } },
      // door open / closed
      { type: "template",
        icon: `{% if is_state('${door}', 'on') %}mdi:door-open{% else %}mdi:door{% endif %}`,
        icon_color: `{% if is_state('${door}', 'on') %}orange{% else %}green{% endif %}`,
        tap_action: { action: "more-info", entity: door } },
      // eco mode leaf (renders nothing when off)
      { type: "template",
        icon: `{% if is_state('${eco}', 'on') %}mdi:leaf{% endif %}`,
        icon_color: "green",
        tap_action: { action: "more-info", entity: eco } },
      // cycle line: short programme name + live phase, printed small on the screen
      { type: "template",
        content: `{% set pmap = {'Auto': 'AUTO', 'Eco': 'ECO', 'Intensive': 'INTNSV', 'Machine Care': 'CARE', 'Normal90': 'NORM90', 'Quick30': 'QCK30', 'Quick60': 'QCK60', 'Rinse': 'RINSE'} %}{% set p = states('${prog}') %}{% set ph = states('${ph}') %}{% if p in pmap %}{{ pmap[p] }}{% endif %}{% if ph not in ['Unavailable', 'unavailable', 'unknown', 'none', ''] %}·{{ ph | upper | truncate(8, true, '') }}{% endif %}`,
        tap_action: { action: "more-info", entity: prog } },
    ],
    card_mod: { style: `
      @keyframes adw-led-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.28; } }
      ha-card {
        ${statePre}
        {% set mins = states('${tte}') | float(0) | int %}
        {% set clock = (mins // 60) ~ ':' ~ ('%02d' | format(mins % 60)) %}
        {% if fault %}{% set led = 'EEEE' %}{% set ledc = '#ff6b6b' %}{% set leda = 'adw-led-blink 0.8s steps(1) infinite' %}{% set glow = '255, 90, 90' %}
        {% elif running %}{% set led = clock %}{% set ledc = '#7cfc98' %}{% set leda = 'none' %}{% set glow = '80, 240, 130' %}
        {% elif paused %}{% set led = clock %}{% set ledc = '#ffc66d' %}{% set leda = 'adw-led-blink 1.4s steps(1) infinite' %}{% set glow = '255, 180, 80' %}
        {% elif delayed %}{% set led = clock %}{% set ledc = '#8fc7ff' %}{% set leda = 'none' %}{% set glow = '110, 170, 255' %}
        {% elif finished %}{% set led = '0:00' %}{% set ledc = '#8fe4a3' %}{% set leda = 'none' %}{% set glow = '120, 220, 150' %}
        {% else %}{% set led = clock if mins > 0 else '-:--' %}{% set ledc = '#5d7a6e' %}{% set leda = 'none' %}{% set glow = '70, 90, 110' %}{% endif %}
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
        --chip-spacing: 5px;
        --primary-text-color: #9fb4ad;
        --secondary-text-color: #9fb4ad;
        --adw-led-text: "{{ led }}";
        --adw-led-color: {{ ledc }};
        --adw-led-anim: {{ leda }};
        --adw-cycle-color: {% if fault or running or paused or delayed %}#9fb4ad{% else %}#556158{% endif %};
        filter: drop-shadow(0 0 4px rgba({{ glow }}, 0.5));
      }
      .chip-container { flex-wrap: nowrap !important; }
      mushroom-template-chip .content, mushroom-chip .content {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 13px; letter-spacing: 1px; font-weight: 700; color: var(--adw-cycle-color, #9fb4ad);
        text-shadow: 0 0 5px rgba(120, 200, 170, 0.4);
      }
      ha-card::before {
        content: var(--adw-led-text, "-:--");
        position: absolute; left: 0; right: 0; top: 26px; bottom: 10px;
        display: flex; align-items: center; justify-content: center;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 34px; font-weight: 700; letter-spacing: 3px;
        color: var(--adw-led-color, #5d7a6e);
        text-shadow: 0 0 9px currentColor, 0 0 2px currentColor;
        white-space: nowrap;
        animation: var(--adw-led-anim, none);
        z-index: 1; pointer-events: none;
      }` },
  };

  const hero = { type: "horizontal-stack", cards: [glassCard, ledScreen] };

  // ── the readout chip row: programme scores + cycle counter, and an alert chip that appears
  // ONLY when an alarm attribute is literally "ON" (the alerts sensor's count includes
  // suppressed WARNING-NOT_NEEDED entries, so the count alone would cry wolf). ─────────────
  const scoreChips = {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips: [
      { type: "template",
        icon: `{% if states('sensor.${base}_userselections_ecoscore') not in ['unavailable', 'unknown'] %}mdi:leaf{% endif %}`,
        icon_color: "green",
        content: `{% set v = states('sensor.${base}_userselections_ecoscore') %}{% if v not in ['unavailable', 'unknown'] %}Eco {{ v }}{% endif %}`,
        tap_action: { action: "more-info", entity: `sensor.${base}_userselections_ecoscore` } },
      { type: "template",
        icon: `{% if states('sensor.${base}_userselections_energyscore') not in ['unavailable', 'unknown'] %}mdi:lightning-bolt{% endif %}`,
        icon_color: "amber",
        content: `{% set v = states('sensor.${base}_userselections_energyscore') %}{% if v not in ['unavailable', 'unknown'] %}{{ v }}{% endif %}`,
        tap_action: { action: "more-info", entity: `sensor.${base}_userselections_energyscore` } },
      { type: "template",
        icon: `{% if states('sensor.${base}_userselections_waterscore') not in ['unavailable', 'unknown'] %}mdi:water-outline{% endif %}`,
        icon_color: "blue",
        content: `{% set v = states('sensor.${base}_userselections_waterscore') %}{% if v not in ['unavailable', 'unknown'] %}{{ v }}{% endif %}`,
        tap_action: { action: "more-info", entity: `sensor.${base}_userselections_waterscore` } },
      { type: "template",
        icon: `{% if states('sensor.${base}_totalcyclecounter') not in ['unavailable', 'unknown'] %}mdi:counter{% endif %}`,
        icon_color: "blue-grey",
        content: `{% set v = states('sensor.${base}_totalcyclecounter') %}{% if v not in ['unavailable', 'unknown'] %}{{ v }}×{% endif %}`,
        tap_action: { action: "more-info", entity: `sensor.${base}_totalcyclecounter` } },
      { type: "template",
        icon: `{% set st = states['${alerts}'] %}{% set n = (st.attributes.values() | select('eq', 'ON') | list | count) if st != None else 0 %}{% if n > 0 %}mdi:alert{% endif %}`,
        icon_color: "amber",
        content: `{% set st = states['${alerts}'] %}{% set n = (st.attributes.values() | select('eq', 'ON') | list | count) if st != None else 0 %}{% if n > 0 %}{{ n }} alert{{ 's' if n > 1 }}{% endif %}`,
        tap_action: { action: "more-info", entity: alerts } },
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
      ha-card { ${adwDisabled(conn)} }
      .chip-container { min-height: 0 !important; }` },
  };

  // ── controls: programme dial + Start / Pause / Resume / Stop ─────────────────────────────
  const progHash = `#adw-prog-${base}`;
  const hardHash = `#adw-hard-${base}`;
  const delayHash = `#adw-delay-${base}`;

  const progLabel = `{% set m = {'Auto': 'Auto', 'Eco': 'Eco', 'Intensive': 'Intensive', 'Machine Care': 'Care', 'Normal90': 'Normal 90', 'Quick30': 'Quick 30', 'Quick60': 'Quick 60', 'Rinse': 'Rinse'} %}{% set v = states('${prog}') %}{{ m[v] if v in m else '—' }}`;
  const progDial = adwSelDial(prog, conn, ADW_PROGS, progLabel, progHash);
  const progPopup = awPopup(progHash, "Programme", "mdi:dishwasher", prog, ADW_PROG_RGB,
    ADW_PROGS.map((v) => ({ value: v, label: ADW_PROG_SHORT[v] })));

  const controls = { type: "horizontal-stack", cards: [
    progDial,
    adwButton(btnStart, conn, remote, "Start", "mdi:play", "76, 175, 80", jRunning),
    adwButton(btnPause, conn, remote, "Pause", "mdi:pause", "255, 152, 0", jPaused),
    adwButton(btnResume, conn, remote, "Resume", "mdi:play-pause", "3, 169, 244", `false`),
    // faults show ONLY in the LED (EEEE + the alert glyph) — Stop's LED never lights
    adwButton(btnStop, conn, remote, "Stop", "mdi:stop", "244, 67, 54", `false`,
      "Stop the dishwasher? The programme will be cancelled."),
  ] };

  // ── settings: water-hardness + delay-start dials, then rinse-aid | sound segmented bars ──
  const hardLabel = `{% set v = states('${hard}') %}{% if v in ['unavailable', 'unknown'] %}—{% else %}{{ v }}{% endif %}`;
  const hardDial = adwSelDial(hard, conn, ADW_HARD, hardLabel, hardHash);
  const hardPopup = awPopup(hardHash, "Water hardness", "mdi:water", hard, ADW_HARD_RGB,
    ADW_HARD.map((v) => ({ value: v, label: v })));

  // the delay dial: pointer = the preset's index (scaled for off-preset values), label = "Xh Ym"
  const delayLabel = `{% set m = states('${delay}') | int(0) %}{% if m <= 0 %}No delay{% else %}{{ m // 60 }}h{% if m % 60 %} {{ m % 60 }}m{% endif %}{% endif %}`;
  const delayDial = {
    type: "custom:mushroom-template-card",
    entity: delay,
    primary: delayLabel,
    icon: "mdi:knob",
    layout: "vertical",
    tap_action: { action: "navigate", navigation_path: delayHash },
    card_mod: { style: {
      "ha-tile-icon$": awDialFace(".container", "width: 48px !important; height: 48px !important;"),
      "mushroom-shape-icon$": awDialFace(".shape", "--icon-size: 48px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
      ".": `
        ha-tile-icon { --tile-icon-size: 48px; width: 48px; height: 48px; }
        mushroom-shape-icon { --icon-size: 48px; }
        ha-state-icon, ha-icon { display: none; }
        ha-tile-info { padding: 0 !important; width: 100% !important; box-sizing: border-box; }
        ha-tile-info [slot="primary"] { display: block !important; width: 100% !important; white-space: normal !important; text-overflow: clip !important; overflow: visible !important; text-align: center !important; line-height: 1.15 !important; }
        ha-card {
          ${adwDisabled(conn)}
          {% set m = states('${delay}') | int(0) %}
          {% set presets = [0, 60, 120, 180, 240, 360, 480, 720] %}
          --aw-dial: {{ presets.index(m) if m in presets else ((m / 1440) * 7) | round | int }};
          ${AW_FLAT}
          --card-primary-font-size: 0.8rem;
          --card-primary-font-weight: 600;
        }`,
    } },
  };
  const delayPopup = adwNumPopup(delayHash, "Delay start", "mdi:timer-sand", delay, ADW_DELAY_RGB, ADW_DELAYS);

  const rinseSeg = adwSeg(rinse, conn, ADW_RINSE_RGB,
    [0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, glyph: String(n) })), true);
  const soundSeg = adwSeg(sound, conn, ADW_SOUND_RGB, [
    { value: "No Sound", glyph: "○" },
    { value: "Short Sound", glyph: "♪" },
  ], false);

  const segBlock = {
    type: "vertical-stack",
    cards: [
      { type: "horizontal-stack", cards: [
        awSegLabel("Rinse aid", ADW_RINSE_RGB, 10),
        awSegLabel("Sound", ADW_SOUND_RGB, 10),
      ] },
      { type: "horizontal-stack", cards: [rinseSeg, soundSeg] },
    ],
  };

  // ── option toggles ───────────────────────────────────────────────────────────────────────
  const toggles1 = { type: "horizontal-stack", cards: [
    adwToggle(`switch.${base}_userselections_glasscareoption`, conn, "Glass care", "mdi:glass-wine", "cyan"),
    adwToggle(`switch.${base}_userselections_sanitizeoption`, conn, "Sanitize", "mdi:water-thermometer", "red"),
    adwToggle(`switch.${base}_userselections_extrapoweroption`, conn, "Extra power", "mdi:flash", "amber"),
  ] };
  const toggles2 = { type: "horizontal-stack", cards: [
    adwToggle(`switch.${base}_userselections_extrasilentoption`, conn, "Extra silent", "mdi:volume-off", "blue-grey"),
    adwToggle(`switch.${base}_userselections_autodooropener`, conn, "Auto door", "mdi:door-open", "green"),
  ] };

  // pop-overs render nothing inline but still occupy stack slots — they all sit at the END
  // of the list so any residual spacing collapses below the last visible row.
  const cards = [
    hero,
    scoreChips,
    awGap(2, controls),
    awGap(14, { type: "horizontal-stack", cards: [hardDial, delayDial] }),
    segBlock,
    awGap(14, toggles1),
    awGap(4, toggles2),
    progPopup, hardPopup, delayPopup,
  ];

  // One machine, one fascia: the wrapper's white gradient is the ONLY painted surface —
  // every child stays AW_FLAT-transparent (never re-point --ha-card-background here).
  return {
    type: "custom:vertical-stack-in-card",
    cards,
    card_mod: { style: `
      ha-card {
        background: linear-gradient(180deg, #f7f8f9 0%, #eceef0 60%, #e3e6e9 100%) !important;
        border: 1px solid #cfd5d9 !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35) !important;
        ${AW_TEXT}
        border-radius: 22px;
        padding: 12px 12px 14px;
      }
      #root { background: transparent !important; }` },
    grid_options: { columns: 12, rows: "auto" },
  };
};

registerKind("advanced-dishwasher", {
  label: "Advanced Dishwasher",
  desc: "A whole AEG/Electrolux dishwasher on one white fascia — glass door + spray arm, LED display, programme dial with pop-over, Start/Pause/Resume/Stop, option toggles and settings",
  domains: ["sensor"],
  entitySelector: { entity: { domain: "sensor" } },
  schema: [],
  help: {
    entity: "Any of the dishwasher's sensors (connectivity state is ideal) — every other control derives from the electrolux_status entity prefix",
  },
  docs: `Built for AEG/Electrolux dishwashers on the \`electrolux_status\` integration, which
exposes sibling entities on one id prefix (\`sensor.<base>_connectivitystate\`,
\`sensor.<base>_cyclephase\`, \`select.<base>_userselections_programuid\`,
\`button.<base>_executecommand[_N]\`, …). Pick any of the machine's sensors; everything else is
derived from the prefix. The fascia carries a glass door window with a spinning spray arm, a
seven-segment LED (time to end; the selected programme's duration dimmed while idle; a red
blinking "EEEE" when offline or faulted), a programme dial + water-hardness and delay-start
dials that each open a Bubble-Card bottom pop-over, embossed Start/Pause/Resume/Stop command
buttons (soft-disabled when the appliance's remote control isn't Enabled), rinse-aid and
end-of-cycle-sound segmented bars, and the option toggles (glass care, sanitize, extra power,
extra silent, auto door opener). NB \`sensor.<base>_appliancestate\` ships registry-disabled by
the integration — the card composes its state from connectivity + cycle phase, and picks the
richer states (paused / delayed start / end of cycle) up automatically if you enable it.`,
  make: (c) => adwMake(c),
});

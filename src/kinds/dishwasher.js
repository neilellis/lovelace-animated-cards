// kinds/dishwasher.js — Animated Dishwasher.
//
// upstream: appliances #1 - Smart Dishwasher, #5 - Dumb Dishwasher (smart plug)
//           appliances_v2 #1 - Smart Dishwasher / #1 - Dumb Dishwasher (smart plug)
//             (same drawing re-hosted on button-card; its extra door-corner marker and
//              elapsed-time badge both fold into the secondary line here — a dishwasher door
//              left open is normal, so it doesn't earn a second coloured chrome element)
//           README #14 - Dishwasher  → the compact `swash` variant
//
// The drawing (`liquid`): the icon disc is a wash tub — a fat rounded blob spins inside it
// with its top edge parked at the fill level, under a bubbles / steam / sparkle overlay.
// Status badge top-right, programme bar along the bottom edge.

const DW_FX = `
      @keyframes dw-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes dw-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(5deg) translateY(-1px); } 75% { transform: rotate(-5deg) translateY(1px); } }
      @keyframes dw-bubbles { 0% { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-20px); opacity: 0; } }
      @keyframes dw-steam { 0% { opacity: 0; transform: translateY(5px); } 50% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-10px); } }
      @keyframes dw-sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }`;

// The tub, drawn identically into BOTH icon structures (DESIGN.md rule 2). Everything here is
// static CSS: the fill level, tint, wave and overlay all arrive as inherited custom properties,
// all defaulting to "idle" — a dishwasher is off most of the day.
const dwTub = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        transform-origin: 50% 60%;
        background: rgba(140, 150, 160, 0.10) !important;
        border: 1px solid rgba(140, 150, 160, 0.22);
        opacity: var(--dw-op, 1);
        animation: var(--dw-shake, none);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--dw-level, 0%));
        background: rgba(var(--dw-rgb, 120, 130, 140), 0.55);
        border-radius: 40%;
        transition: top 0.6s ease;
        animation: var(--dw-wave, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--dw-overlay, none);
        background-size: 100% 100%;
        animation: var(--dw-fx, none);
        z-index: 1;
      }${DW_FX}`;

// README #14's spray-arm swash — scale + rotate + a widening glow ring. Upstream interpolated
// `--rgb-{{ config.icon_color }}` into the keyframe; here it rides a plain rgb var so the
// keyframe stays state-free.
const dwSwashBlock = (root, size) => `
      ${root} {
        ${size}
        transform-origin: 50% 55%;
        opacity: var(--dw-op, 0.8);
        animation: var(--dw-swash, none);
      }
      @keyframes dw-swash {
        0%   { transform: scale(1) rotate(0deg);      box-shadow: 0 0 0 0 rgba(var(--dw-rgb, 33, 150, 243), 0.8),  0 0 0 0 rgba(var(--dw-rgb, 33, 150, 243), 0.3); }
        25%  { transform: scale(1.03) rotate(10deg);  box-shadow: 0 0 10px 3px rgba(var(--dw-rgb, 33, 150, 243), 0.9), 0 0 18px 8px rgba(var(--dw-rgb, 33, 150, 243), 0.3); }
        50%  { transform: scale(0.98) rotate(-15deg); box-shadow: 0 0 14px 6px rgba(var(--dw-rgb, 33, 150, 243), 0.7), 0 0 26px 12px rgba(var(--dw-rgb, 33, 150, 243), 0.2); }
        75%  { transform: scale(1.04) rotate(15deg);  box-shadow: 0 0 10px 3px rgba(var(--dw-rgb, 33, 150, 243), 0.9), 0 0 18px 8px rgba(var(--dw-rgb, 33, 150, 243), 0.3); }
        100% { transform: scale(1) rotate(0deg);      box-shadow: 0 0 0 0 rgba(var(--dw-rgb, 33, 150, 243), 0),   0 0 0 0 rgba(var(--dw-rgb, 33, 150, 243), 0); }
      }`;

// badge (top-right) + programme bar (bottom edge) — light DOM, so they live in the host block
const DW_CHROME = `
      ha-card::before {
        content: var(--dw-badge, "");
        position: absolute;
        top: 8px; right: 10px;
        background: rgba(var(--dw-rgb, 120, 130, 140), 0.15);
        color: rgb(var(--dw-rgb, 120, 130, 140));
        border: 1px solid rgba(var(--dw-rgb, 120, 130, 140), 0.3);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase;
        white-space: nowrap;
        z-index: 5;
      }
      ha-card::after {
        content: '';
        position: absolute;
        left: 0; bottom: 0;
        height: 4px;
        width: var(--dw-level, 0%);
        background: rgb(var(--dw-rgb, 120, 130, 140));
        box-shadow: 0 0 10px rgba(var(--dw-rgb, 120, 130, 140), 0.9);
        display: var(--dw-bar, none);
        transition: width 0.6s ease;
        z-index: 2;
      }`;

// minutes-remaining parser — sensors ship a timestamp, H:M(:S) or a plain minute count
const dwRemaining = (ent) => `
        {% set raw = states('${ent}') | string %}
        {% if '-' in raw and ':' in raw %}
          {% set dt = raw | as_datetime %}
          {% set rem = (((dt - now()).total_seconds() / 60) | int) if dt else 0 %}
        {% elif ':' in raw %}
          {% set p = raw.split(':') %}
          {% set rem = (p[0] | int(0) * 60) + (p[1] | int(0)) %}
        {% else %}
          {% set rem = raw | float(0) | int %}
        {% endif %}
        {% set rem = [rem, 0] | max %}`;

const dwList = (s, fallback) => (s || fallback).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).join(",");

registerKind("dishwasher", {
  label: "Animated Dishwasher",
  desc: "Wash tub swirls and fills — bubbles washing, steam drying, sparkle when the cycle ends",
  domains: ["sensor", "binary_sensor", "switch"],
  schema: [
    F.variant(["liquid", "swash"]),
    { name: "source", selector: { select: { mode: "dropdown", options: ["status", "power"] } } },
    F.icon,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "switch_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
    { name: "running_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "remaining_entity", selector: { entity: { domain: "sensor" } } },
    { name: "door_entity", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
    { name: "percent_entity", selector: { entity: { domain: "sensor" } } },
    { name: "max_minutes", selector: { number: { min: 1, step: 1, mode: "box", unit_of_measurement: "min" } } },
    { name: "running_states", selector: { text: {} } },
    { name: "drying_states", selector: { text: {} } },
    { name: "done_states", selector: { text: {} } },
    { name: "active_above", selector: { number: { min: 0, step: 0.5, mode: "box", unit_of_measurement: "W" } } },
    { name: "heat_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
    F.glow,
  ],
  help: {
    source: "status = a smart dishwasher's programme sensor; power = a dumb machine on a metering plug",
    switch_entity: "Plug switch — gives the distinct 'Plug Off' (red) and 'Offline' (grey) states",
    running_entity: "Optional debounced running latch (see docs) — its last_changed drives the elapsed line",
    remaining_entity: "Time-remaining sensor: timestamp, H:MM(:SS) or minutes — all parsed",
    door_entity: "Optional door contact — noted on the secondary line while open (never alarmed: an open door is normal here)",
    percent_entity: "Progress-percent sensor; without it progress is derived from Max cycle minutes",
    max_minutes: "Full programme length, used to derive progress when there's no percent sensor (default 120)",
    running_states: "Comma-separated states that count as washing (default: wash, washing, rinse, rinsing, pre-wash)",
    drying_states: "Comma-separated drying states (default: dry, drying)",
    done_states: "Comma-separated finished states (default: finished, complete, end)",
    active_above: "Watts above which the machine counts as running in power mode (default 5)",
    heat_above: "Watts above which it's heating water rather than washing (default 1000)",
    glow: "Swash-variant glow colour as R, G, B (default 33, 150, 243)",
  },
  docs: `Power mode reads the plug's power sensor directly — no helper entity is required. For a
debounced "running" latch that survives a cycle's low-power soak phases (and to get a real
elapsed-time readout, taken from the latch's \`last_changed\`), add the upstream template
binary_sensor and pass it as \`running_entity\`:

\`\`\`yaml
template:
  - binary_sensor:
      - name: "Dishwasher Active delay"
        unique_id: dishwasher_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:dishwasher
\`\`\`

In status mode any entity works as long as its states are listed in the running/drying/done
options — an appliance integration's programme sensor, or your own template sensor.`,
  make: (c) => {
    const icon = c.icon || "mdi:dishwasher";
    const name = c.name || friendly(c.entity);
    const glow = c.glow || "33, 150, 243";
    const power = c.power_entity;
    const powerTxt = power
      ? `{% set w = states('${power}') | float(-1) %}{% set pw = (' • ' ~ (w | round(0) | int) ~ 'W') if w >= 0 else '' %}`
      : `{% set pw = '' %}`;

    if ((c.variant || "liquid") === "swash") {
      // upstream: README #14 — a compact tile; the whole disc pulses/rotates while running.
      const on = power
        ? `{% set on = states('${power}') | float(-1) > ${c.active_above ?? 5} %}`
        : `{% set on = states(config.entity) not in ['off', 'idle', 'standby', 'unavailable', 'unknown'] %}`;
      return {
        type: "custom:mushroom-template-card",
        entity: c.entity,
        primary: name,
        secondary: power
          ? `{% set w = states('${power}') | float(-1) %}{% if w < 0 %}Unavailable{% elif w > ${c.active_above ?? 5} %}Running · {{ w | round(0) | int }} W{% else %}Idle{% endif %}`
          : `{{ states(entity) | replace('_', ' ') | title }}`,
        icon,
        icon_color: power
          ? `{% set w = states('${power}') | float(-1) %}{{ 'blue' if w > ${c.active_above ?? 5} else ('disabled' if w < 0 else 'blue-grey') }}`
          : `{{ 'blue' if states(entity) not in ['off','idle','standby','unavailable','unknown'] else 'blue-grey' }}`,
        tap_action: { action: "more-info" },
        card_mod: { style: {
          "mushroom-shape-icon$": dwSwashBlock(".shape", "--icon-size: 60px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
          "ha-tile-icon$": dwSwashBlock(".container", "width: 60px; height: 60px; border-radius: 9999px;"),
          ".": `
      mushroom-shape-icon { --icon-size: 60px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 34px; }
      ha-card {
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        ${on}
        --dw-rgb: ${glow};
        --dw-swash: {{ 'dw-swash 1.5s ease-in-out infinite' if on else 'none' }};
        --dw-op: {{ '1' if on else '0.75' }};
      }`,
        } },
        grid_options: { columns: 6, rows: 2 },
      };
    }

    // ── liquid variant ───────────────────────────────────────────────────────────────────
    const maxMin = c.max_minutes > 0 ? c.max_minutes : 120;
    const pct = c.percent_entity;
    const remEnt = c.remaining_entity;
    const runList = dwList(c.running_states, "wash, washing, rinse, rinsing, pre-wash");
    const dryList = dwList(c.drying_states, "dry, drying");
    const doneList = dwList(c.done_states, "finished, complete, end");
    const activeW = c.active_above ?? 5;
    const heatW = c.heat_above ?? 1000;
    const sw = c.switch_entity;
    const run = c.running_entity;

    // secondary line: what the upstream v2 card put in its second badge (time), plus the
    // door warning, which is the one thing worth stealing attention in a quiet kitchen.
    // upstream v2 drew the door as a red corner marker; a dishwasher/dryer door standing
    // open is normal (you're loading it), so it gets a quiet mention, not an animation
    const doorTail = c.door_entity
      ? `{% if states('${c.door_entity}') in ['on', 'open'] %} · door open{% endif %}`
      : "";
    const secondary = (c.source === "power"
      ? `{% set w = states('${power || c.entity}') | float(-1) %}` +
        (run
          ? `{% set o = states['${run}'] %}{% set secs = (as_timestamp(now()) - as_timestamp(o.last_changed)) if o is not none else 0 %}` +
            `{% if w < 0 %}Unavailable{% elif is_state('${run}', 'on') %}{% if secs > 60 %}Running {{ (secs / 3600) | int }}h {{ '%02d' | format(((secs % 3600) / 60) | int) }}m{% else %}Just started{% endif %}{% else %}Idle · {{ w | round(0) | int }} W{% endif %}`
          : `{% if w < 0 %}Unavailable{% elif w > ${activeW} %}Running · {{ w | round(0) | int }} W{% else %}Idle · {{ w | round(0) | int }} W{% endif %}`)
      : `{% set s = states(entity) %}{% if s in ['unavailable', 'unknown'] %}Offline{% else %}` +
        (remEnt
          ? `${dwRemaining(remEnt)}{% if rem > 0 %}{{ (rem / 60) | int }}h {{ '%02d' | format(rem % 60) }}m left{% else %}{{ s | replace('_', ' ') | title }}{% endif %}`
          : `{{ s | replace('_', ' ') | title }}`) +
        `{% endif %}`) + doorTail;

    const iconColor = c.source === "power"
      ? `{% set w = states('${power || c.entity}') | float(-1) %}{% if w < 0 %}disabled{% elif w > ${heatW} %}orange{% elif w > ${activeW} %}blue{% else %}blue-grey{% endif %}`
      : `{% set s = states(entity) | lower %}{% if s in ['unavailable', 'unknown'] %}disabled{% elif s in '${dryList}'.split(',') %}orange{% elif s in '${doneList}'.split(',') %}green{% elif s in '${runList}'.split(',') %}blue{% else %}blue-grey{% endif %}`;

    // one {colour, wave, overlay+fx, shake, level, badge} tuple per state — DESIGN §2
    const stateTable = c.source === "power"
      ? `
        {% set w = states('${power || c.entity}') | float(-1) %}
        {% set pw = (' • ' ~ (w | round(0) | int) ~ 'W') if w >= 0 else '' %}
        {% set plug = states('${sw || power || c.entity}') %}
        {% set running = ${run ? `is_state('${run}', 'on')` : `w > ${activeW}`} %}
        {% if ${sw ? `plug == 'off'` : `false`} %}
          {% set rgb = '244, 67, 54' %}{% set badge = 'Plug Off' %}{% set lvl = 0 %}{% set op = '0.6' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif w < 0 or ${sw ? `plug in ['unavailable', 'unknown']` : `false`} %}
          {% set rgb = '120, 124, 130' %}{% set badge = 'Offline' %}{% set lvl = 0 %}{% set op = '0.4' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif running and w > ${heatW} %}
          {% set rgb = '255, 152, 0' %}{% set badge = 'Heating' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'dw-wave 4s linear infinite' %}{% set fx = 'dw-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.5), transparent)' %}
        {% elif running %}
          {% set rgb = '33, 150, 243' %}{% set badge = 'Washing' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'dw-wave 4s linear infinite' %}{% set fx = 'dw-bubbles 1s linear infinite' %}{% set shake = 'dw-shake 0.8s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% else %}
          {% set rgb = '120, 130, 140' %}{% set badge = 'Idle' ~ pw %}{% set lvl = 0 %}{% set op = '0.7' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% endif %}`
      : `
        ${powerTxt}
        {% set s = states(config.entity) | lower | trim %}
        {% set dead = s in ['unavailable', 'unknown', 'none'] %}
        {% set is_dry = s in '${dryList}'.split(',') %}
        {% set is_done = s in '${doneList}'.split(',') %}
        {% set is_run = s in '${runList}'.split(',') %}
        ${remEnt ? dwRemaining(remEnt) : `{% set rem = 0 %}`}
        {% set raw_pct = ${pct ? `states('${pct}') | float(-1)` : `-1`} %}
        {% if not (is_dry or is_done or is_run) %}{% set lvl = 0 %}
        {% elif raw_pct >= 0 %}{% set lvl = [[raw_pct | int, 0] | max, 100] | min %}
        ${remEnt
          ? `{% else %}{% set lvl = [[(((${maxMin} - rem) / ${maxMin} * 100) | int), 5] | max, 100] | min %}{% endif %}`
          /* no percent AND no remaining sensor — a neutral half-full tub beats a bar that
             claims the programme is finished the moment it starts */
          : `{% else %}{% set lvl = 60 %}{% endif %}`}
        {% set status = s | replace('_', ' ') | replace('-', ' ') | title %}
        {% if dead %}
          {% set rgb = '120, 124, 130' %}{% set badge = 'Offline' %}{% set lvl = 0 %}{% set op = '0.4' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif is_dry %}
          {% set rgb = '255, 152, 0' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'dw-wave 4s linear infinite' %}{% set fx = 'dw-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.5), transparent)' %}
        {% elif is_done %}
          {% set rgb = '76, 175, 80' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'dw-wave 4s linear infinite' %}{% set fx = 'dw-sparkle 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 60%)' %}
        {% elif is_run %}
          {% set rgb = '33, 150, 243' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'dw-wave 4s linear infinite' %}{% set fx = 'dw-bubbles 1s linear infinite' %}{% set shake = 'dw-shake 0.8s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% else %}
          {% set rgb = '120, 130, 140' %}{% set badge = status ~ pw %}{% set op = '0.7' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% endif %}`;

    return {
      type: "custom:mushroom-template-card",
      entity: c.entity,
      primary: name,
      secondary,
      icon,
      icon_color: iconColor,
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": dwTub(".shape", "--icon-size: 64px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": dwTub(".container", "width: 64px; height: 64px;"),
        ".": `
      mushroom-shape-icon { --icon-size: 64px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 36px; }
      /* the icon is slotted in both structures — keep it above the tub's fill/overlay */
      ha-state-icon, ha-icon { position: relative; z-index: 3; }
      ha-card {${stateTable}
        --dw-rgb: {{ rgb }};
        --dw-level: {{ lvl }}%;
        --dw-wave: {{ wave }};
        --dw-fx: {{ fx }};
        --dw-shake: {{ shake }};
        --dw-overlay: {{ overlay }};
        --dw-op: {{ op }};
        --dw-badge: "{{ badge }}";
        --dw-bar: {{ 'block' if lvl > 0 else 'none' }};
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        transition: all 0.5s ease;
      }${DW_CHROME}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

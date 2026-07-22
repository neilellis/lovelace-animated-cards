// kinds/washer-dryer-combo.js — Animated Washer-Dryer Combo.
//
// upstream: appliances #4 - Smart Combo Washing machine & Dryer,
//           appliances #8 - Dumb Combo Washing machine & Dryer (smart plug)
//           appliances_v2 #4 (both) — the same drawing on button-card, only the spin tint
//             differs (pure cyan 0,255,255 → the calmer teal 0,170,170 used here), so there
//             is no v1/v2 `variant`: one look, v2's colour.
//
// The one machine that has to tell you WHICH half is running, so each phase gets its own
// tuple: wash = blue bubbles + shake, spin = teal drum rotation with a bright inner ring,
// dry = orange steam, cool-down = blue breeze + wobble, done = green sparkle, idle = silent.

const CB_FX = `
      @keyframes cb-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes cb-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(5deg) translateY(-1px); } 75% { transform: rotate(-5deg) translateY(1px); } }
      @keyframes cb-wobble { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(5deg); } }
      @keyframes cb-spin {
        0%   { transform: rotate(0deg) translate(0, 0);       box-shadow: inset 0 0 0 2px rgba(var(--cb-rgb, 0, 170, 170), 0.7); }
        25%  { transform: rotate(90deg) translate(0.5px, 0.5px); }
        50%  { transform: rotate(180deg) translate(0, 0); }
        75%  { transform: rotate(270deg) translate(-0.5px, -0.5px); }
        100% { transform: rotate(360deg) translate(0, 0);     box-shadow: inset 0 0 0 2px rgba(var(--cb-rgb, 0, 170, 170), 0.7); }
      }
      @keyframes cb-bubbles { 0% { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-20px); opacity: 0; } }
      @keyframes cb-steam { 0% { opacity: 0; transform: translateY(10px) scale(0.9); } 50% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-20px) scale(1.1); } }
      @keyframes cb-breeze { 0% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.05); } 100% { opacity: 0.2; transform: scale(0.95); } }
      @keyframes cb-sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }`;

// The drum, drawn identically into BOTH icon structures (DESIGN.md rule 2). Pure CSS — every
// dynamic quantity is an inherited custom property, all defaulting to idle.
const cbDrum = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        transform-origin: 50% 50%;
        background: rgba(140, 150, 160, 0.10) !important;
        border: 1px solid rgba(140, 150, 160, 0.22);
        opacity: var(--cb-op, 1);
        animation: var(--cb-shake, none);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--cb-level, 0%));
        background: rgba(var(--cb-rgb, 120, 130, 140), 0.55);
        border-radius: 40%;
        transition: top 0.6s ease;
        animation: var(--cb-wave, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--cb-overlay, none);
        background-size: 100% 100%;
        animation: var(--cb-fx, none);
        z-index: 1;
      }${CB_FX}`;

const CB_CHROME = `
      ha-card::before {
        content: var(--cb-badge, "");
        position: absolute;
        top: 8px; right: 10px;
        background: rgba(var(--cb-rgb, 120, 130, 140), 0.15);
        color: rgb(var(--cb-rgb, 120, 130, 140));
        border: 1px solid rgba(var(--cb-rgb, 120, 130, 140), 0.3);
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
        width: var(--cb-level, 0%);
        background: rgb(var(--cb-rgb, 120, 130, 140));
        box-shadow: 0 0 10px rgba(var(--cb-rgb, 120, 130, 140), 0.9);
        display: var(--cb-bar, none);
        transition: width 0.6s ease;
        z-index: 2;
      }`;

const cbRemaining = (ent) => `
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

const cbList = (s, fallback) => (s || fallback).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).join(",");

registerKind("washer-dryer-combo", {
  label: "Animated Washer-Dryer Combo",
  desc: "One drum, five phases — wash bubbles, spin rotation, dry steam, cool breeze, done sparkle",
  domains: ["sensor", "binary_sensor", "switch"],
  schema: [
    { name: "source", selector: { select: { mode: "dropdown", options: ["status", "power"] } } },
    F.icon,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "switch_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
    { name: "running_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "drying_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "remaining_entity", selector: { entity: { domain: "sensor" } } },
    { name: "door_entity", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
    { name: "percent_entity", selector: { entity: { domain: "sensor" } } },
    { name: "max_minutes", selector: { number: { min: 1, step: 1, mode: "box", unit_of_measurement: "min" } } },
    { name: "washing_states", selector: { text: {} } },
    { name: "spinning_states", selector: { text: {} } },
    { name: "drying_states", selector: { text: {} } },
    { name: "cooling_states", selector: { text: {} } },
    { name: "done_states", selector: { text: {} } },
    { name: "active_above", selector: { number: { min: 0, step: 0.5, mode: "box", unit_of_measurement: "W" } } },
    { name: "spin_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
  ],
  help: {
    source: "status = a smart machine's programme sensor; power = a dumb machine on a metering plug",
    power_entity: "Plug power sensor — the truth source in power mode, a badge suffix in status mode",
    switch_entity: "Plug switch — gives the distinct 'Plug Off' (red) and 'Offline' (grey) states",
    running_entity: "Optional debounced running latch (see docs) — its last_changed drives the elapsed line",
    drying_entity: "Optional drying-mode latch (see docs); without it power mode never claims 'Drying'",
    remaining_entity: "Time-remaining sensor: timestamp, H:MM(:SS) or minutes — all parsed",
    door_entity: "Optional door contact — noted on the secondary line while open (never alarmed: an open door is normal here)",
    percent_entity: "Progress-percent sensor; without it progress is derived from Max cycle minutes",
    max_minutes: "Full programme length, used to derive progress when there's no percent sensor (default 180)",
    washing_states: "Comma-separated wash/rinse states (default: wash, washing, rinse, rinsing, pre-wash, soak)",
    spinning_states: "Comma-separated spin/drain states (default: spin, spinning, drain)",
    drying_states: "Comma-separated drying states (default: dry, drying, tumble, tumbling)",
    cooling_states: "Comma-separated cool-down states (default: cooling, cool down, anti-crease)",
    done_states: "Comma-separated finished states (default: finished, complete, end)",
    active_above: "Watts above which the machine counts as running in power mode (default 5)",
    spin_above: "Watts above which the drum is spinning rather than washing (default 800)",
  },
  docs: `Power mode reads the plug's power sensor directly. A combo machine can't be told apart from
its draw alone — a wash heater and a dryer element both pull hundreds of watts — so upstream
uses two template binary_sensors: a debounced "running" latch and a sustained-high-power
"drying" detector. Pass them as \`running_entity\` and \`drying_entity\`; without the second one
the card never claims "Drying" (it stays on the wash/spin split, which is the safe default).

\`\`\`yaml
template:
  - binary_sensor:
      - name: "Combo Machine Active Delay"
        unique_id: combo_machine_active_delay
        device_class: running
        icon: mdi:washing-machine
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"        # wait 5 min before calling it idle

      - name: "Combo Machine Drying Detector"
        unique_id: combo_machine_drying_detector
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 800 }}"
        delay_on: "00:15:00"         # sustained high draw = drying, not a wash heater cycling
        delay_off: "00:05:00"        # stay 'drying' through the cool-down
\`\`\``,
  make: (c) => {
    const icon = c.icon || "mdi:washing-machine";
    const name = c.name || friendly(c.entity);
    const power = c.power_entity;
    const maxMin = c.max_minutes > 0 ? c.max_minutes : 180;
    const pct = c.percent_entity;
    const remEnt = c.remaining_entity;
    const washList = cbList(c.washing_states, "wash, washing, rinse, rinsing, pre-wash, soak");
    const spinList = cbList(c.spinning_states, "spin, spinning, drain");
    const dryList = cbList(c.drying_states, "dry, drying, tumble, tumbling");
    const coolList = cbList(c.cooling_states, "cooling, cool down, anti-crease");
    const doneList = cbList(c.done_states, "finished, complete, end");
    const activeW = c.active_above ?? 5;
    const spinW = c.spin_above ?? 800;
    const sw = c.switch_entity;
    const run = c.running_entity;
    const dry = c.drying_entity;
    const powerTxt = power
      ? `{% set w = states('${power}') | float(-1) %}{% set pw = (' • ' ~ (w | round(0) | int) ~ 'W') if w >= 0 else '' %}`
      : `{% set pw = '' %}`;

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
          ? `${cbRemaining(remEnt)}{% if rem > 0 %}{{ (rem / 60) | int }}h {{ '%02d' | format(rem % 60) }}m left{% else %}{{ s | replace('_', ' ') | title }}{% endif %}`
          : `{{ s | replace('_', ' ') | title }}`) +
        `{% endif %}`) + doorTail;

    const iconColor = c.source === "power"
      ? `{% set w = states('${power || c.entity}') | float(-1) %}{% if w < 0 %}disabled{% elif ${dry ? `is_state('${dry}', 'on')` : `false`} %}orange{% elif w > ${spinW} %}teal{% elif w > ${activeW} %}blue{% else %}blue-grey{% endif %}`
      : `{% set s = states(entity) | lower %}{% if s in ['unavailable', 'unknown'] %}disabled{% elif s in '${dryList}'.split(',') %}orange{% elif s in '${coolList}'.split(',') %}blue{% elif s in '${spinList}'.split(',') %}teal{% elif s in '${washList}'.split(',') %}blue{% elif s in '${doneList}'.split(',') %}green{% else %}blue-grey{% endif %}`;

    const stateTable = c.source === "power"
      ? `
        {% set w = states('${power || c.entity}') | float(-1) %}
        {% set pw = (' • ' ~ (w | round(0) | int) ~ 'W') if w >= 0 else '' %}
        {% set plug = states('${sw || power || c.entity}') %}
        {% set running = ${run ? `is_state('${run}', 'on')` : `w > ${activeW}`} %}
        {% set drying = ${dry ? `is_state('${dry}', 'on')` : `false`} %}
        {% if ${sw ? `plug == 'off'` : `false`} %}
          {% set rgb = '244, 67, 54' %}{% set badge = 'Plug Off' %}{% set lvl = 0 %}{% set op = '0.6' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif w < 0 or ${sw ? `plug in ['unavailable', 'unknown']` : `false`} %}
          {% set rgb = '120, 124, 130' %}{% set badge = 'Offline' %}{% set lvl = 0 %}{% set op = '0.4' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif running and drying %}
          {% set rgb = '255, 152, 0' %}{% set badge = 'Drying' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'cb-wave 4s linear infinite' %}{% set fx = 'cb-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.4), transparent)' %}
        {% elif running and w > ${spinW} %}
          {% set rgb = '0, 170, 170' %}{% set badge = 'Spinning' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'cb-wave 2s linear infinite' %}{% set fx = 'cb-bubbles 2s linear infinite' %}{% set shake = 'cb-spin 0.8s linear infinite' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 60%)' %}
        {% elif running %}
          {% set rgb = '33, 150, 243' %}{% set badge = 'Washing' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'cb-wave 4s linear infinite' %}{% set fx = 'cb-bubbles 2s linear infinite' %}{% set shake = 'cb-shake 2s ease-in-out infinite' %}
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
        {% set is_cool = s in '${coolList}'.split(',') %}
        {% set is_spin = s in '${spinList}'.split(',') %}
        {% set is_wash = s in '${washList}'.split(',') %}
        {% set is_done = s in '${doneList}'.split(',') %}
        ${remEnt ? cbRemaining(remEnt) : `{% set rem = 0 %}`}
        {% set raw_pct = ${pct ? `states('${pct}') | float(-1)` : `-1`} %}
        {% if not (is_dry or is_cool or is_spin or is_wash or is_done) %}{% set lvl = 0 %}
        {% elif raw_pct >= 0 %}{% set lvl = [[raw_pct | int, 0] | max, 100] | min %}
        ${remEnt
          ? `{% else %}{% set lvl = [[(((${maxMin} - rem) / ${maxMin} * 100) | int), 5] | max, 100] | min %}{% endif %}`
          /* no percent AND no remaining sensor — a neutral half-full drum beats a bar that
             claims the programme is finished the moment it starts */
          : `{% else %}{% set lvl = 60 %}{% endif %}`}
        {% set status = s | replace('_', ' ') | replace('-', ' ') | title %}
        {% if dead %}
          {% set rgb = '120, 124, 130' %}{% set badge = 'Offline' %}{% set lvl = 0 %}{% set op = '0.4' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif is_dry %}
          {% set rgb = '255, 152, 0' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'cb-wave 4s linear infinite' %}{% set fx = 'cb-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.4), transparent)' %}
        {% elif is_cool %}
          {% set rgb = '33, 150, 243' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'cb-wave 6s linear infinite' %}{% set fx = 'cb-breeze 3s ease-in-out infinite' %}{% set shake = 'cb-wobble 2s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)' %}
        {% elif is_spin %}
          {% set rgb = '0, 170, 170' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'cb-wave 2s linear infinite' %}{% set fx = 'none' %}{% set shake = 'cb-spin 0.8s linear infinite' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 60%)' %}
        {% elif is_wash %}
          {% set rgb = '33, 150, 243' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'cb-wave 4s linear infinite' %}{% set fx = 'cb-bubbles 1s linear infinite' %}{% set shake = 'cb-shake 1.5s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% elif is_done %}
          {% set rgb = '76, 175, 80' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'cb-wave 4s linear infinite' %}{% set fx = 'cb-sparkle 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 60%)' %}
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
        "mushroom-shape-icon$": cbDrum(".shape", "--icon-size: 64px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": cbDrum(".container", "width: 64px; height: 64px;"),
        ".": `
      mushroom-shape-icon { --icon-size: 64px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 36px; }
      /* the icon is slotted in both structures — keep it above the drum's fill/overlay */
      ha-state-icon, ha-icon { position: relative; z-index: 3; }
      ha-card {${stateTable}
        --cb-rgb: {{ rgb }};
        --cb-level: {{ lvl }}%;
        --cb-wave: {{ wave }};
        --cb-fx: {{ fx }};
        --cb-shake: {{ shake }};
        --cb-overlay: {{ overlay }};
        --cb-op: {{ op }};
        --cb-badge: "{{ badge }}";
        --cb-bar: {{ 'block' if lvl > 0 else 'none' }};
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        transition: all 0.5s ease;
      }${CB_CHROME}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

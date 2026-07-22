// kinds/dryer.js — Animated Tumble Dryer.
//
// upstream: appliances #3 - Smart Dryer, #7 - Dumb Dryer (smart plug)
//           appliances_v2 #3 - Smart Dryer / #3 - Dumb Dryer (smart plug)
//             (byte-for-byte the same drawing, thresholds and state table, re-hosted on
//              button-card — so there is no v1/v2 `variant` here, only one look)
//
// Metaphor split (upstream's, kept): HEAT is orange with steam rising off the drum and a still
// icon; AIR is blue with a breeze swell and a slow wobble — a dryer on cool-down is doing the
// gentler thing and should look it. Done goes green and sparkles. Idle is silent and dimmed.

const DR_FX = `
      @keyframes dr-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes dr-wobble { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(5deg); } }
      @keyframes dr-steam { 0% { opacity: 0; transform: translateY(10px) scale(0.9); } 50% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-20px) scale(1.1); } }
      @keyframes dr-breeze { 0% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.05); } 100% { opacity: 0.2; transform: scale(0.95); } }
      @keyframes dr-sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }`;

// The drum, drawn identically into BOTH icon structures (DESIGN.md rule 2). Pure CSS; every
// dynamic quantity arrives as an inherited custom property defaulting to idle — a dryer runs
// for an hour a week.
const drDrum = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        transform-origin: 50% 50%;
        background: rgba(140, 150, 160, 0.10) !important;
        border: 1px solid rgba(140, 150, 160, 0.22);
        opacity: var(--dr-op, 1);
        animation: var(--dr-shake, none);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--dr-level, 0%));
        background: rgba(var(--dr-rgb, 120, 130, 140), 0.55);
        border-radius: 40%;
        transition: top 0.6s ease;
        animation: var(--dr-wave, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--dr-overlay, none);
        background-size: 100% 100%;
        animation: var(--dr-fx, none);
        z-index: 1;
      }${DR_FX}`;

const DR_CHROME = `
      ha-card::before {
        content: var(--dr-badge, "");
        position: absolute;
        top: 8px; right: 10px;
        background: rgba(var(--dr-rgb, 120, 130, 140), 0.15);
        color: rgb(var(--dr-rgb, 120, 130, 140));
        border: 1px solid rgba(var(--dr-rgb, 120, 130, 140), 0.3);
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
        width: var(--dr-level, 0%);
        background: rgb(var(--dr-rgb, 120, 130, 140));
        box-shadow: 0 0 10px rgba(var(--dr-rgb, 120, 130, 140), 0.9);
        display: var(--dr-bar, none);
        transition: width 0.6s ease;
        z-index: 2;
      }`;

const drRemaining = (ent) => `
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

const drList = (s, fallback) => (s || fallback).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).join(",");

registerKind("dryer", {
  label: "Animated Tumble Dryer",
  desc: "Drum fills and turns — orange steam on heat, blue breeze on cool-down, sparkle when done",
  domains: ["sensor", "binary_sensor", "switch"],
  schema: [
    { name: "source", selector: { select: { mode: "dropdown", options: ["status", "power"] } } },
    F.icon,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "switch_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
    { name: "running_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "remaining_entity", selector: { entity: { domain: "sensor" } } },
    { name: "door_entity", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
    { name: "percent_entity", selector: { entity: { domain: "sensor" } } },
    { name: "max_minutes", selector: { number: { min: 1, step: 1, mode: "box", unit_of_measurement: "min" } } },
    { name: "drying_states", selector: { text: {} } },
    { name: "cooling_states", selector: { text: {} } },
    { name: "done_states", selector: { text: {} } },
    { name: "active_above", selector: { number: { min: 0, step: 0.5, mode: "box", unit_of_measurement: "W" } } },
    { name: "heat_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
  ],
  help: {
    source: "status = a smart dryer's programme sensor; power = a dumb machine on a metering plug",
    switch_entity: "Plug switch — gives the distinct 'Plug Off' (red) and 'Offline' (grey) states",
    running_entity: "Optional debounced running latch (see docs) — its last_changed drives the elapsed line",
    remaining_entity: "Time-remaining sensor: timestamp, H:MM(:SS) or minutes — all parsed",
    door_entity: "Optional door contact — noted on the secondary line while open (never alarmed: an open door is normal here)",
    percent_entity: "Progress-percent sensor; without it progress is derived from Max cycle minutes",
    max_minutes: "Full programme length, used to derive progress when there's no percent sensor (default 160)",
    drying_states: "Comma-separated heating/tumbling states (default: drying, tumble, dry, heat, heating, tumbling)",
    cooling_states: "Comma-separated cool-down states (default: cooling, cool down, anti-crease, air fluff)",
    done_states: "Comma-separated finished states (default: finished, complete, end)",
    active_above: "Watts above which the dryer counts as running in power mode (default 5)",
    heat_above: "Watts above which the element is on (Drying) rather than just tumbling (default 500)",
  },
  docs: `Power mode reads the plug's power sensor directly — no helper entity is required. For a
debounced "running" latch (and a real elapsed-time readout, taken from the latch's
\`last_changed\`), add the upstream template binary_sensor and pass it as \`running_entity\`:

\`\`\`yaml
template:
  - binary_sensor:
      - name: "Dryer Active delay"
        unique_id: dryer_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:tumble-dryer
\`\`\`

In power mode the Drying/Tumbling split is inferred from the draw: a heating element pulls
hundreds of watts, a bare drum motor does not. Watch a real cycle before trusting the default.`,
  make: (c) => {
    const icon = c.icon || "mdi:tumble-dryer";
    const name = c.name || friendly(c.entity);
    const power = c.power_entity;
    const maxMin = c.max_minutes > 0 ? c.max_minutes : 160;
    const pct = c.percent_entity;
    const remEnt = c.remaining_entity;
    const dryList = drList(c.drying_states, "drying, tumble, dry, heat, heating, tumbling");
    const coolList = drList(c.cooling_states, "cooling, cool down, anti-crease, air fluff");
    const doneList = drList(c.done_states, "finished, complete, end");
    const activeW = c.active_above ?? 5;
    const heatW = c.heat_above ?? 500;
    const sw = c.switch_entity;
    const run = c.running_entity;
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
          ? `${drRemaining(remEnt)}{% if rem > 0 %}{{ (rem / 60) | int }}h {{ '%02d' | format(rem % 60) }}m left{% else %}{{ s | replace('_', ' ') | title }}{% endif %}`
          : `{{ s | replace('_', ' ') | title }}`) +
        `{% endif %}`) + doorTail;

    const iconColor = c.source === "power"
      ? `{% set w = states('${power || c.entity}') | float(-1) %}{% if w < 0 %}disabled{% elif w > ${heatW} %}orange{% elif w > ${activeW} %}blue{% else %}blue-grey{% endif %}`
      : `{% set s = states(entity) | lower %}{% if s in ['unavailable', 'unknown'] %}disabled{% elif s in '${dryList}'.split(',') %}orange{% elif s in '${coolList}'.split(',') %}blue{% elif s in '${doneList}'.split(',') %}green{% else %}blue-grey{% endif %}`;

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
          {% set rgb = '255, 152, 0' %}{% set badge = 'Drying' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'dr-wave 4s linear infinite' %}{% set fx = 'dr-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.4), transparent)' %}
        {% elif running %}
          {% set rgb = '33, 150, 243' %}{% set badge = 'Tumbling' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'dr-wave 4s linear infinite' %}{% set fx = 'dr-breeze 3s ease-in-out infinite' %}{% set shake = 'dr-wobble 2s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)' %}
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
        {% set is_done = s in '${doneList}'.split(',') %}
        ${remEnt ? drRemaining(remEnt) : `{% set rem = 0 %}`}
        {% set raw_pct = ${pct ? `states('${pct}') | float(-1)` : `-1`} %}
        {% if not (is_dry or is_cool or is_done) %}{% set lvl = 0 %}
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
          {% set wave = 'dr-wave 4s linear infinite' %}{% set fx = 'dr-steam 2s ease-in-out infinite' %}{% set shake = 'none' %}
          {% set overlay = 'linear-gradient(0deg, transparent, rgba(255,255,255,0.4), transparent)' %}
        {% elif is_cool %}
          {% set rgb = '33, 150, 243' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'dr-wave 6s linear infinite' %}{% set fx = 'dr-breeze 3s ease-in-out infinite' %}{% set shake = 'dr-wobble 2s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)' %}
        {% elif is_done %}
          {% set rgb = '76, 175, 80' %}{% set badge = status ~ pw %}{% set op = '1' %}
          {% set wave = 'dr-wave 4s linear infinite' %}{% set fx = 'dr-sparkle 2s ease-in-out infinite' %}{% set shake = 'none' %}
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
        "mushroom-shape-icon$": drDrum(".shape", "--icon-size: 64px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": drDrum(".container", "width: 64px; height: 64px;"),
        ".": `
      mushroom-shape-icon { --icon-size: 64px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 36px; }
      /* the icon is slotted in both structures — keep it above the drum's fill/overlay */
      ha-state-icon, ha-icon { position: relative; z-index: 3; }
      ha-card {${stateTable}
        --dr-rgb: {{ rgb }};
        --dr-level: {{ lvl }}%;
        --dr-wave: {{ wave }};
        --dr-fx: {{ fx }};
        --dr-shake: {{ shake }};
        --dr-overlay: {{ overlay }};
        --dr-op: {{ op }};
        --dr-badge: "{{ badge }}";
        --dr-bar: {{ 'block' if lvl > 0 else 'none' }};
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        transition: all 0.5s ease;
      }${DR_CHROME}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

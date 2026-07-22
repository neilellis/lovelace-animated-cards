// kinds/washer-plug.js — Animated Washing Machine (smart plug).
//
// upstream: appliances #6 - Dumb Washing Machine (smart plug)
//           appliances_v2 #2 - Dumb Washing Machine (smart plug)
//             (same drawing; v2 adds a "Heating" band above ~1500 W and drops the spin
//              threshold to 150 W — both are options here, so one look covers both)
//
// The dumb sibling of the built-in `washer` kind: no machine_status enum to read, so the
// phase is INFERRED from the plug's draw — heater band, spin band, wash band, idle. Per
// design-principles §5 the plug's SWITCH state is not the machine state and on some plugs
// isn't even truthful, so the draw is the signal and the switch only distinguishes
// "Plug Off" (red, deliberate) from "Offline" (grey, dead) — never from "Idle".

const WSP_FX = `
      @keyframes wsp-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes wsp-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(5deg) translateY(-1px); } 75% { transform: rotate(-5deg) translateY(1px); } }
      @keyframes wsp-spin {
        0%   { transform: rotate(0deg) translate(0, 0);          box-shadow: inset 0 0 0 2px rgba(var(--wsp-rgb, 0, 170, 170), 0.7); }
        25%  { transform: rotate(90deg) translate(0.5px, 0.5px); }
        50%  { transform: rotate(180deg) translate(0, 0); }
        75%  { transform: rotate(270deg) translate(-0.5px, -0.5px); }
        100% { transform: rotate(360deg) translate(0, 0);        box-shadow: inset 0 0 0 2px rgba(var(--wsp-rgb, 0, 170, 170), 0.7); }
      }
      @keyframes wsp-bubbles { 0% { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-20px); opacity: 0; } }`;

// The drum, drawn identically into BOTH icon structures (DESIGN.md rule 2). Pure CSS; the
// fill level, tint and both animations arrive as inherited vars, all defaulting to idle —
// a washing machine is off ~23 hours a day.
const wspDrum = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
        transform-origin: 50% 50%;
        background: rgba(140, 150, 160, 0.10) !important;
        border: 1px solid rgba(140, 150, 160, 0.22);
        opacity: var(--wsp-op, 1);
        animation: var(--wsp-shake, none);
      }
      ${root}::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%; height: 200%;
        top: calc(100% - var(--wsp-level, 0%));
        background: rgba(var(--wsp-rgb, 120, 130, 140), 0.55);
        border-radius: 40%;
        transition: top 0.6s ease;
        animation: var(--wsp-wave, none);
        z-index: 0;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--wsp-overlay, none);
        background-size: 100% 100%;
        animation: var(--wsp-fx, none);
        z-index: 1;
      }${WSP_FX}`;

const WSP_CHROME = `
      ha-card::before {
        content: var(--wsp-badge, "");
        position: absolute;
        top: 8px; right: 10px;
        background: rgba(var(--wsp-rgb, 120, 130, 140), 0.15);
        color: rgb(var(--wsp-rgb, 120, 130, 140));
        border: 1px solid rgba(var(--wsp-rgb, 120, 130, 140), 0.3);
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
        width: var(--wsp-level, 0%);
        background: rgb(var(--wsp-rgb, 120, 130, 140));
        box-shadow: 0 0 10px rgba(var(--wsp-rgb, 120, 130, 140), 0.9);
        display: var(--wsp-bar, none);
        transition: width 0.6s ease;
        z-index: 2;
      }`;

registerKind("washer-plug", {
  label: "Animated Washing Machine (smart plug)",
  desc: "Dumb washer read off its plug — wash bubbles, spin rotation and a heater band, from watts alone",
  domains: ["sensor", "binary_sensor", "switch"],
  entitySelector: { entity: { domain: ["sensor", "binary_sensor", "switch"] } },
  schema: [
    F.icon,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    { name: "switch_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
    { name: "running_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "door_entity", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
    { name: "active_above", selector: { number: { min: 0, step: 0.5, mode: "box", unit_of_measurement: "W" } } },
    { name: "spin_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
    { name: "heat_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
  ],
  help: {
    power_entity: "The plug's power sensor — the truth source. Defaults to the card's own entity",
    switch_entity: "Plug switch — gives the distinct 'Plug Off' (red) and 'Offline' (grey) states",
    running_entity: "Optional debounced running latch (see docs) — its last_changed drives the elapsed line",
    door_entity: "Optional door contact — noted on the secondary line while open (never alarmed: an open door is normal here)",
    active_above: "Watts above which the machine counts as running (default 5)",
    spin_above: "Watts above which the drum is spinning (default 300 — upstream v2 uses 150)",
    heat_above: "Watts above which it's heating water (default 1500; raise it out of range to disable)",
  },
  docs: `Point \`entity\` (or \`power_entity\`) at the plug's power sensor and the card works with no
helpers: running = draw above \`active_above\`, then the spin and heater bands split the phases.

A raw threshold flaps during a cycle's low-power soak phases, so upstream debounces it with a
template binary_sensor. Pass it as \`running_entity\` and the card also gets a real elapsed-time
readout (from the latch's \`last_changed\`):

\`\`\`yaml
template:
  - binary_sensor:
      - name: "Washing Machine Active delay"
        unique_id: washing_machine_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:washing-machine
\`\`\`

Thresholds are machine-specific — watch one real cycle in the history graph before trusting
the defaults. For a machine that reports a proper \`machine_status\` enum, use the \`washer\`
kind instead.`,
  make: (c) => {
    const icon = c.icon || "mdi:washing-machine";
    const name = c.name || friendly(c.entity);
    const power = c.power_entity || c.entity;
    const sw = c.switch_entity;
    const run = c.running_entity;
    const activeW = c.active_above ?? 5;
    const spinW = c.spin_above ?? 300;
    const heatW = c.heat_above ?? 1500;
    // upstream v2 drew the door as a red corner marker; a washer door standing open is normal
    // (you're loading it), so it gets a quiet mention, not an animation
    const doorTail = c.door_entity
      ? `{% if states('${c.door_entity}') in ['on', 'open'] %} · door open{% endif %}`
      : "";

    return {
      type: "custom:mushroom-template-card",
      entity: c.entity,
      primary: name,
      // the upstream card's second badge (elapsed time) becomes the secondary line — one less
      // pseudo-element to fight for, and it stays legible at a distance
      secondary: `{% set w = states('${power}') | float(-1) %}` +
        (run
          ? `{% set o = states['${run}'] %}{% set secs = (as_timestamp(now()) - as_timestamp(o.last_changed)) if o is not none else 0 %}` +
            `{% if w < 0 %}Unavailable{% elif is_state('${run}', 'on') %}{% if secs > 60 %}Running {{ (secs / 3600) | int }}h {{ '%02d' | format(((secs % 3600) / 60) | int) }}m{% else %}Just started{% endif %}{% else %}Idle · {{ w | round(0) | int }} W{% endif %}`
          : `{% if w < 0 %}Unavailable{% elif w > ${activeW} %}Running · {{ w | round(0) | int }} W{% else %}Idle · {{ w | round(0) | int }} W{% endif %}`) + doorTail,
      icon,
      // template-cards apply icon_color unconditionally, so colour it by the DRAW — otherwise
      // an idle machine sits there looking live
      icon_color: `{% set w = states('${power}') | float(-1) %}{% if w < 0 %}disabled{% elif w > ${heatW} %}deep-orange{% elif w > ${spinW} %}teal{% elif w > ${activeW} %}blue{% else %}blue-grey{% endif %}`,
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": wspDrum(".shape", "--icon-size: 64px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": wspDrum(".container", "width: 64px; height: 64px;"),
        ".": `
      mushroom-shape-icon { --icon-size: 64px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 36px; }
      /* the icon is slotted in both structures — keep it above the drum's fill/overlay */
      ha-state-icon, ha-icon { position: relative; z-index: 3; }
      ha-card {
        {% set w = states('${power}') | float(-1) %}
        {% set pw = (' • ' ~ (w | round(0) | int) ~ 'W') if w >= 0 else '' %}
        {% set plug = states('${sw || power}') %}
        {% set running = ${run ? `is_state('${run}', 'on')` : `w > ${activeW}`} %}
        {% if ${sw ? `plug == 'off'` : `false`} %}
          {% set rgb = '244, 67, 54' %}{% set badge = 'Plug Off' %}{% set lvl = 0 %}{% set op = '0.6' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif w < 0 or ${sw ? `plug in ['unavailable', 'unknown']` : `false`} %}
          {% set rgb = '120, 124, 130' %}{% set badge = 'Offline' %}{% set lvl = 0 %}{% set op = '0.4' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% elif running and w > ${heatW} %}
          {% set rgb = '255, 87, 34' %}{% set badge = 'Heating' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'wsp-wave 4s linear infinite' %}{% set fx = 'wsp-bubbles 2s linear infinite' %}{% set shake = 'none' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% elif running and w > ${spinW} %}
          {% set rgb = '0, 170, 170' %}{% set badge = 'Spinning' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'wsp-wave 2s linear infinite' %}{% set fx = 'wsp-bubbles 2s linear infinite' %}{% set shake = 'wsp-spin 0.8s linear infinite' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% elif running %}
          {% set rgb = '33, 150, 243' %}{% set badge = 'Washing' ~ pw %}{% set lvl = 60 %}{% set op = '1' %}
          {% set wave = 'wsp-wave 4s linear infinite' %}{% set fx = 'wsp-bubbles 2s linear infinite' %}{% set shake = 'wsp-shake 2s ease-in-out infinite' %}
          {% set overlay = 'radial-gradient(2px 2px at 20% 80%, white, transparent), radial-gradient(2px 2px at 50% 70%, white, transparent)' %}
        {% else %}
          {% set rgb = '120, 130, 140' %}{% set badge = 'Idle' ~ pw %}{% set lvl = 0 %}{% set op = '0.7' %}
          {% set wave = 'none' %}{% set fx = 'none' %}{% set shake = 'none' %}{% set overlay = 'none' %}
        {% endif %}
        --wsp-rgb: {{ rgb }};
        --wsp-level: {{ lvl }}%;
        --wsp-wave: {{ wave }};
        --wsp-fx: {{ fx }};
        --wsp-shake: {{ shake }};
        --wsp-overlay: {{ overlay }};
        --wsp-op: {{ op }};
        --wsp-badge: "{{ badge }}";
        --wsp-bar: {{ 'block' if lvl > 0 else 'none' }};
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        transition: all 0.5s ease;
      }${WSP_CHROME}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

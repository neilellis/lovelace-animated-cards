// kinds/fridge.js — Animated Fridge / Freezer.
//
// upstream: README #39 - Freezer / Refrigerator            → variant `snowfall`
//           README #39 - Freezer / Refrigerator (frosted glass) → variant `frosted`
//           appliances_v2 #5 - Smart Fridge + #5 - Fridge (smart plug) → variant `status`
//
// All three are the same weather system: snow falls across the card while the compressor is
// pulling, and the icon rumbles. `snowfall`/`frosted` are the binary on/off looks (icy card vs
// transparent card, snow behind); `status` adds the cooling → super-cool → defrost ladder, a
// frost ring on the icon, defrost drips, and a loud red door-open alert.
//
// Door-open is the one genuinely urgent state a fridge has, so it outranks everything: the
// icon flips to mdi:fridge-alert, goes red and shakes, and all the calm weather stops.

const FR_SNOW1 = `
          radial-gradient(circle at 20px 30px, white 2px, transparent 3px),
          radial-gradient(circle at 50px 160px, white 2px, transparent 3px),
          radial-gradient(circle at 90px 40px, white 2px, transparent 3px),
          radial-gradient(circle at 130px 80px, white 2px, transparent 3px),
          radial-gradient(circle at 160px 120px, white 2px, transparent 3px),
          radial-gradient(circle at 240px 300px, white 2px, transparent 3px),
          radial-gradient(circle at 280px 100px, white 2px, transparent 3px)`;
const FR_SNOW2 = `
          radial-gradient(circle at 10px 10px, rgba(255,255,255,0.7) 1px, transparent 2px),
          radial-gradient(circle at 30px 90px, rgba(255,255,255,0.7) 1px, transparent 2px),
          radial-gradient(circle at 80px 50px, rgba(255,255,255,0.7) 1px, transparent 2px),
          radial-gradient(circle at 110px 190px, rgba(255,255,255,0.7) 1px, transparent 2px),
          radial-gradient(circle at 150px 100px, rgba(255,255,255,0.7) 1px, transparent 2px),
          radial-gradient(circle at 220px 250px, rgba(255,255,255,0.7) 1px, transparent 2px)`;

// frost ring + defrost drips, drawn identically into BOTH icon structures (DESIGN.md rule 2).
// Both images are STATIC; only their display/animation vars come from the template.
const frDisc = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        overflow: visible;
        /* the disc carries the state tint (upstream's img_cell) — cyan cooling, orange
           defrost, red door-open — so the colour reads even before the snow starts */
        background: rgba(var(--fr-rgb, 120, 130, 140), 0.10) !important;
        border: 1px solid rgba(var(--fr-rgb, 120, 130, 140), 0.30);
        opacity: var(--fr-op, 1);
        transition: background 0.5s ease, border-color 0.5s ease;
      }
      ${root}::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        pointer-events: none;
        box-shadow: var(--fr-frost, none);
        animation: var(--fr-frost-anim, none);
        z-index: 1;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        pointer-events: none;
        display: var(--fr-drip-d, none);
        background-repeat: no-repeat;
        background-image:
          radial-gradient(ellipse at center, rgba(255,193,7,0.8) 0%, transparent 60%),
          radial-gradient(ellipse at center, rgba(255,193,7,0.6) 0%, transparent 60%);
        animation: var(--fr-drip, none);
        z-index: 1;
      }
      @keyframes fr-frost { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 0.8; transform: scale(1); } }
      @keyframes fr-drip {
        0%   { background-position: 30% 10%, 70% 20%;   background-size: 0px 0px, 0px 0px;    opacity: 0; }
        40%  { background-position: 30% 30%, 70% 40%;   background-size: 8px 12px, 12px 16px; opacity: 1; }
        80%  { background-position: 30% 80%, 70% 90%;   background-size: 8px 18px, 12px 22px; opacity: 0.8; }
        100% { background-position: 30% 100%, 70% 110%; background-size: 6px 20px, 10px 25px; opacity: 0; }
      }`;

// the two snow layers + the slotted-icon animations. Light DOM, so they live in the host block
// (static text — only the Jinja inside `ha-card { }` re-renders).
const FR_WEATHER = `
      /* lift every light-DOM child clear of the snow layers */
      ha-card > * { position: relative; z-index: 1; }
      ha-state-icon, ha-icon {
        position: relative;
        z-index: 2;
        transform-origin: 50% 60%;
        animation: var(--fr-icon-anim, none);
        display: inline-block;
      }
      ha-card::before {
        content: '';
        display: var(--fr-snow, none);
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: var(--fr-snow-z, 0);
        background-image:${FR_SNOW1};
        background-size: 300px 400px;
        background-repeat: repeat;
        opacity: var(--fr-snow1-op, 0.9);
        animation: fr-snow1 var(--fr-snow1-dur, 10s) linear infinite;
      }
      ha-card::after {
        content: '';
        display: var(--fr-snow, none);
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: var(--fr-snow-z, 0);
        background-image:${FR_SNOW2};
        background-size: 300px 300px;
        background-repeat: repeat;
        opacity: var(--fr-snow2-op, 0.6);
        animation: fr-snow2 var(--fr-snow2-dur, 5s) linear infinite;
      }
      @keyframes fr-snow1 { from { background-position: 0 0; } to { background-position: 0 400px; } }
      @keyframes fr-snow2 { from { background-position: 0 0; } to { background-position: 0 300px; } }
      @keyframes fr-rumble {
        0%   { transform: translate(0, 0); }
        25%  { transform: translate(-1px, 0.5px); }
        50%  { transform: translate(1px, -0.5px); }
        75%  { transform: translate(-0.5px, 0.5px); }
        100% { transform: translate(0, 0); }
      }
      @keyframes fr-alert {
        0%, 100% { transform: rotate(0deg); }
        25%      { transform: rotate(5deg) translateY(-1px); }
        75%      { transform: rotate(-5deg) translateY(1px); }
      }`;

const frList = (s, fallback) => (s || fallback).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).join(",");

registerKind("fridge", {
  label: "Animated Fridge / Freezer",
  desc: "Snow falls and the compressor rumbles while it cools; loud red alert when a door is left open",
  domains: ["switch", "sensor", "binary_sensor", "input_boolean"],
  schema: [
    F.variant(["snowfall", "frosted", "status"]),
    F.icon,
    F.active,
    { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
    F.powerAbove,
    { name: "door_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "door2_entity", selector: { entity: { domain: "binary_sensor" } } },
    { name: "fridge_temp_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
    { name: "freezer_temp_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
    { name: "max_fridge_temp", selector: { number: { min: -40, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
    { name: "max_freezer_temp", selector: { number: { min: -40, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
    { name: "super_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
    { name: "defrost_above", selector: { number: { min: 0, step: 10, mode: "box", unit_of_measurement: "W" } } },
    { name: "cooling_states", selector: { text: {} } },
    { name: "super_states", selector: { text: {} } },
    { name: "defrost_states", selector: { text: {} } },
  ],
  help: {
    variant: "snowfall = icy card (README #39); frosted = transparent card, snow behind; status = the cooling/super/defrost ladder",
    active: "State that counts as cooling in snowfall/frosted mode (default: on)",
    power_entity: "Plug power sensor — when set, 'is it cooling' comes from the draw, not the switch state",
    power_above: "Watts above which the compressor counts as running (default 0.5)",
    door_entity: "Door contact — open outranks every other state: red, shaking, mdi:fridge-alert",
    door2_entity: "Second door contact (e.g. the freezer drawer)",
    fridge_temp_entity: "Fridge-compartment temperature, shown on the secondary line",
    freezer_temp_entity: "Freezer-compartment temperature, shown on the secondary line",
    max_fridge_temp: "Warn (⚠) above this fridge temperature (default 6 °C)",
    max_freezer_temp: "Warn (⚠) above this freezer temperature (default -10 °C)",
    super_above: "status variant: watts above which it's super-cooling rather than cooling (default 180)",
    defrost_above: "status variant: watts above which it's defrosting (default 300)",
    cooling_states: "status variant, no power sensor: states that mean cooling (default: cool, cooling, running, active)",
    super_states: "status variant: super-cool states (default: super_cool, rapid, boost)",
    defrost_states: "status variant: defrost states (default: defrost, defrosting)",
  },
  docs: `No helper entities are needed. \`snowfall\` and \`frosted\` need nothing but the plug switch (or
a power sensor + threshold, which is the honest signal on a plug whose switch state lies).

\`status\` drives the cooling → super-cool → defrost ladder from \`power_entity\` when you set one,
falling back to matching the card entity's own state against the three state lists — so it
covers both upstream fridge cards (the smart one with a status sensor, and the dumb one on a
metering plug) without a second kind.

Compartment temperatures and the door contacts are optional; each only draws when supplied.
Upstream drew the temperatures as a second badge — here they share the secondary line, which
survives a narrow card better.`,
  make: (c) => {
    const variant = c.variant || "snowfall";
    const icon = c.icon || "mdi:fridge";
    const name = c.name || friendly(c.entity);
    const power = c.power_entity;
    const above = c.power_above ?? 0.5;
    const d1 = c.door_entity;
    const d2 = c.door2_entity;
    const tf = c.fridge_temp_entity;
    const tz = c.freezer_temp_entity;
    const maxF = c.max_fridge_temp ?? 6;
    const maxZ = c.max_freezer_temp ?? -10;
    const superW = c.super_above ?? 180;
    const defrostW = c.defrost_above ?? 300;
    const coolList = frList(c.cooling_states, "cool, cooling, running, active");
    const superList = frList(c.super_states, "super_cool, rapid, boost");
    const defrostList = frList(c.defrost_states, "defrost, defrosting");

    // door test, reused by icon / colour / secondary / the style block
    const doorOpen = [d1, d2].filter(Boolean)
      .map((e) => `(states('${e}') in ['on', 'open'])`).join(" or ") || "false";

    // temperature tail for the secondary line — only the sensors you actually gave
    const tempTail =
      (tf ? `{% set f = states('${tf}') | float(-999) %}{% if f > -900 %} · {{ '⚠ ' if f > ${maxF} else '' }}{{ f | round(1) }}°{% endif %}` : ``) +
      (tz ? `{% set z = states('${tz}') | float(-999) %}{% if z > -900 %} | {{ '⚠ ' if z > ${maxZ} else '' }}{{ z | round(1) }}°{% endif %}` : ``);

    // "is the compressor pulling" — the draw when it's metered, else the switch state
    const onTestJ = power
      ? `{% set w = states('${power}') | float(-1) %}{% set on = w > ${above} %}{% set dead = w < 0 %}`
      : `{% set s = states(config.entity) %}{% set on = s == '${c.active || "on"}' %}{% set dead = s in ['unavailable', 'unknown'] %}`;

    const secondaryHead = variant === "status"
      ? (power
        ? `{% set w = states('${power}') | float(-1) %}{% if ${doorOpen} %}⚠ Door open{% elif w < 0 %}Offline{% elif w > ${defrostW} %}Defrost · {{ w | round(0) | int }} W{% elif w > ${superW} %}Super cool · {{ w | round(0) | int }} W{% elif w > ${above} %}Cooling · {{ w | round(0) | int }} W{% else %}Idle · {{ w | round(0) | int }} W{% endif %}`
        : `{% set s = states(entity) | lower %}{% if ${doorOpen} %}⚠ Door open{% elif s in ['unavailable', 'unknown'] %}Offline{% else %}{{ s | replace('_', ' ') | title }}{% endif %}`)
      : (power
        ? `{% set w = states('${power}') | float(-1) %}{% if ${doorOpen} %}⚠ Door open{% elif w < 0 %}Unavailable{% elif w > ${above} %}Cooling · {{ w | round(0) | int }} W{% else %}Idle{% endif %}`
        : `{% if ${doorOpen} %}⚠ Door open{% else %}{{ states(entity) | replace('_', ' ') | title }}{% endif %}`);

    // ── the state table: one {tint, snow, frost, drip, icon-motion} tuple per state ────────
    const stateTable = variant === "status"
      ? `
        ${power
          ? `{% set w = states('${power}') | float(-1) %}
        {% set dead = w < 0 %}
        {% set is_defrost = w > ${defrostW} %}
        {% set is_super = (not is_defrost) and w > ${superW} %}
        {% set is_cool = (not is_defrost) and (not is_super) and w > ${above} %}`
          : `{% set s = states(config.entity) | lower | trim %}
        {% set dead = s in ['unavailable', 'unknown', 'none'] %}
        {% set is_defrost = s in '${defrostList}'.split(',') %}
        {% set is_super = s in '${superList}'.split(',') %}
        {% set is_cool = s in '${coolList}'.split(',') %}`}
        {% set door = ${doorOpen} %}
        {% if door %}
          {% set rgb = '244, 67, 54' %}{% set op = '1' %}{% set snow = 'none' %}
          {% set frost = 'none' %}{% set frost_anim = 'none' %}{% set drip = 'none' %}{% set drip_d = 'none' %}
          {% set icon_anim = 'fr-alert 0.5s ease-in-out infinite' %}
          {% set glow = 'inset 0 0 50px rgba(244, 67, 54, 0.15)' %}
        {% elif dead %}
          {% set rgb = '120, 124, 130' %}{% set op = '0.4' %}{% set snow = 'none' %}
          {% set frost = 'none' %}{% set frost_anim = 'none' %}{% set drip = 'none' %}{% set drip_d = 'none' %}
          {% set icon_anim = 'none' %}{% set glow = 'none' %}
        {% elif is_defrost %}
          {% set rgb = '255, 152, 0' %}{% set op = '1' %}{% set snow = 'none' %}
          {% set frost = 'none' %}{% set frost_anim = 'none' %}
          {% set drip = 'fr-drip 3s ease-in infinite' %}{% set drip_d = 'block' %}
          {% set icon_anim = 'none' %}{% set glow = 'inset 0 0 40px rgba(255, 152, 0, 0.08)' %}
        {% elif is_super %}
          {% set rgb = '0, 188, 212' %}{% set op = '1' %}{% set snow = 'block' %}
          {% set frost = 'inset 0 0 25px 5px rgba(0, 188, 212, 0.6)' %}{% set frost_anim = 'fr-frost 1.5s ease-in-out infinite' %}
          {% set drip = 'none' %}{% set drip_d = 'none' %}
          {% set icon_anim = 'fr-rumble 0.1s linear infinite' %}{% set glow = 'inset 0 0 60px rgba(0, 188, 212, 0.15)' %}
        {% elif is_cool %}
          {% set rgb = '129, 212, 250' %}{% set op = '1' %}{% set snow = 'block' %}
          {% set frost = 'inset 0 0 15px 2px rgba(129, 212, 250, 0.5)' %}{% set frost_anim = 'fr-frost 3s ease-in-out infinite' %}
          {% set drip = 'none' %}{% set drip_d = 'none' %}
          {% set icon_anim = 'fr-rumble 0.3s linear infinite' %}{% set glow = 'inset 0 0 40px rgba(129, 212, 250, 0.1)' %}
        {% else %}
          {% set rgb = '120, 130, 140' %}{% set op = '0.7' %}{% set snow = 'none' %}
          {% set frost = 'none' %}{% set frost_anim = 'none' %}{% set drip = 'none' %}{% set drip_d = 'none' %}
          {% set icon_anim = 'none' %}{% set glow = 'none' %}
        {% endif %}
        {% set snow1_dur = '8s' if is_super else '16s' %}
        {% set snow2_dur = '4s' if is_super else '8s' %}
        {% set snow1_op = '0.15' if is_super else '0.08' %}
        {% set snow2_op = '0.10' if is_super else '0.05' %}`
      : `
        ${onTestJ}
        {% set door = ${doorOpen} %}
        {% if door %}
          {% set rgb = '244, 67, 54' %}{% set op = '1' %}{% set snow = 'none' %}
          {% set icon_anim = 'fr-alert 0.5s ease-in-out infinite' %}
          {% set glow = 'inset 0 0 50px rgba(244, 67, 54, 0.15)' %}
        {% elif dead %}
          {% set rgb = '120, 124, 130' %}{% set op = '0.4' %}{% set snow = 'none' %}
          {% set icon_anim = 'none' %}{% set glow = 'none' %}
        {% elif on %}
          {% set rgb = '178, 235, 242' %}{% set op = '1' %}{% set snow = 'block' %}
          {% set icon_anim = 'fr-rumble 0.2s linear infinite' %}
          {% set glow = 'inset 0 0 30px rgba(200, 255, 255, 0.6)' %}
        {% else %}
          {% set rgb = '120, 130, 140' %}{% set op = '0.7' %}{% set snow = 'none' %}
          {% set icon_anim = 'none' %}{% set glow = 'none' %}
        {% endif %}
        {% set snow1_dur = '10s' %}{% set snow2_dur = '5s' %}
        {% set snow1_op = '0.9' %}{% set snow2_op = '0.6' %}
        {% set frost = 'none' %}{% set frost_anim = 'none' %}{% set drip = 'none' %}{% set drip_d = 'none' %}`;

    // `snowfall` paints the icy cabinet interior onto the card; `frosted` leaves the card
    // transparent (whatever theme/background shows through) with the snow tucked behind it.
    const bgLines = variant === "snowfall"
      ? `
        background: {{ 'linear-gradient(to bottom, #2C5364, #203A43, #0F2027)' if snow == 'block' else 'var(--ha-card-background, var(--card-background-color, transparent))' }} !important;
        --primary-text-color: {{ '#e0f7fa' if snow == 'block' else 'var(--primary-text-color)' }};
        --secondary-text-color: {{ '#b2ebf2' if snow == 'block' else 'var(--secondary-text-color)' }};
        --fr-snow-z: 0;`
      : variant === "frosted"
        ? `
        background: transparent !important;
        isolation: isolate;
        --primary-text-color: {{ '#e0f7fa' if snow == 'block' else 'var(--primary-text-color)' }};
        --secondary-text-color: {{ '#b2ebf2' if snow == 'block' else 'var(--secondary-text-color)' }};
        --fr-snow-z: -1;`
        : `
        --fr-snow-z: 0;`;

    return {
      type: "custom:mushroom-template-card",
      entity: c.entity,
      primary: name,
      secondary: secondaryHead + (variant === "status" || tf || tz ? tempTail : ""),
      icon: (d1 || d2) ? `{{ 'mdi:fridge-alert' if ${doorOpen} else '${icon}' }}` : icon,
      icon_color: variant === "status"
        ? (power
          ? `{% set w = states('${power}') | float(-1) %}{% if ${doorOpen} %}red{% elif w < 0 %}disabled{% elif w > ${defrostW} %}orange{% elif w > ${superW} %}cyan{% elif w > ${above} %}light-blue{% else %}blue-grey{% endif %}`
          : `{% set s = states(entity) | lower %}{% if ${doorOpen} %}red{% elif s in ['unavailable', 'unknown'] %}disabled{% elif s in '${defrostList}'.split(',') %}orange{% elif s in '${superList}'.split(',') %}cyan{% elif s in '${coolList}'.split(',') %}light-blue{% else %}blue-grey{% endif %}`)
        : (power
          ? `{% set w = states('${power}') | float(-1) %}{% if ${doorOpen} %}red{% elif w < 0 %}disabled{% elif w > ${above} %}light-blue{% else %}blue-grey{% endif %}`
          : `{% if ${doorOpen} %}red{% elif states(entity) in ['unavailable', 'unknown'] %}disabled{% elif is_state(entity, '${c.active || "on"}') %}light-blue{% else %}blue-grey{% endif %}`),
      // README #39 toggles the plug on tap; the status variant is a readout, not a switch
      tap_action: { action: variant === "status" ? "more-info" : "toggle" },
      hold_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": frDisc(".shape", "--icon-size: 60px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": frDisc(".container", "width: 60px; height: 60px;"),
        ".": `
      mushroom-shape-icon { --icon-size: 60px; display: flex; margin: 0 !important; }
      ha-tile-icon { --mdc-icon-size: 34px; }
      ha-card {${stateTable}
        --fr-rgb: {{ rgb }};
        --fr-op: {{ op }};
        --fr-snow: {{ snow }};
        --fr-snow1-dur: {{ snow1_dur }};
        --fr-snow2-dur: {{ snow2_dur }};
        --fr-snow1-op: {{ snow1_op }};
        --fr-snow2-op: {{ snow2_op }};
        --fr-frost: {{ frost }};
        --fr-frost-anim: {{ frost_anim }};
        --fr-drip: {{ drip }};
        --fr-drip-d: {{ drip_d }};
        --fr-icon-anim: {{ icon_anim }};
        box-shadow: {{ glow if glow != 'none' else 'var(--ha-card-box-shadow, none)' }} !important;${bgLines}
        position: relative;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, 12px);
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
        transition: background 0.8s ease, box-shadow 0.8s ease;
      }${FR_WEATHER}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

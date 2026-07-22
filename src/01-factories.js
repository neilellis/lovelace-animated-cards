// animated-cards.mjs — animated Mushroom + card-mod cards, adapted from
// github.com/Anashost/HA-Animated-cards (card-mod CSS animations on Mushroom cards).
//
// These need the SAME stack home-deluxe already uses: Mushroom + card-mod (no extra HACS).
// card-mod becomes LOAD-BEARING for these (unlike the gloss elsewhere) — if card-mod/HACS
// breaks they degrade to a plain Mushroom card. The home-showcase dashboard stays the safe
// built-in fallback. Each card animates only while its entity is "active"; otherwise it dims.
//
// ── INSTANT-ANIMATION CONTRACT (perf) ─────────────────────────────────────────────────────
// card-mod only applies a style string AFTER it renders any Jinja in it (a server-side
// render_template round-trip over WebSocket). With ~30 cards that means a visible delay before
// animations "pop in". So we keep the heavy part STATIC and the dynamic part in CSS variables:
//   • the `mushroom-shape-icon$` (shadow) block is PURE CSS — keyframes + an always-defined
//     `animation: var(--shape-animation, <active default>)` — so it paints/animates immediately;
//   • the `.` (host ha-card) block carries the Jinja and only SETS variables that inherit down
//     through the shadow boundary: --shape-animation (or `none` when idle), the glow colour
//     (--ig-rgb / --temp-rgb / --wash-rgb) and --ig-op (dim when idle).
// Trade-off: for a beat after paint a card animates with its default colour / as-if-active,
// then the template settles it (idle cards stop, colours correct). Motion gives instant motion.
//
// Note vs upstream: the BATCH-1 LED-Strip/Vacuum/Media cards omit the consumer `animation:` line
// (so as-published they don't animate) — fixed here; also fixed the `20pxx` vacuum-margin typo.

// Shared icon placement: an enlarged but CENTRED icon (no negative-margin reposition — the
// upstream cards pull the icon up/left, which lands off-centre in HA's sections grid).
const clip = `
      mushroom-shape-icon {
        --icon-size: 56px;
        display: flex;
        margin: 0 !important;
      }
      ha-card {
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
      }`;

// ── TRUTHFUL "ON" ─────────────────────────────────────────────────────────────────────────
// Several of this house's dumb appliances hang off Tuya plugs whose SWITCH state LIES — the BenQ
// monitor reports `off` while visibly drawing 1 W. Where the plug meters power, that reading is the
// only trustworthy signal, so the factories below take an optional `power: {entity, above}` and
// derive "is it on" from the draw, while the card still TOGGLES the switch on tap. `float(-1)` makes
// `unavailable` fall through as off rather than coercing to a plausible 0.
// See .claude/skills/animated-cards/design-principles.md §5.
const onTest = (active, power) => power
  ? `{% set on = states('${power.entity}') | float(-1) > ${power.above ?? 0.5} %}`
  : `{% set on = states(config.entity) == '${active}' %}`;

// ── TWO ICON STRUCTURES (Mushroom on HA 2026.7) ──────────────────────────────────────────
// mushroom-entity-card / -light-card / -media-player-card still render the classic
// `mushroom-shape-icon` (our `mushroom-shape-icon$` shadow blocks bind). But
// **mushroom-template-card is now built on HA's native TILE framework**: its shadow tree is
// ha-card > .container > .content > `ha-tile-icon` (shadow: 36px round div.container) with
// `ha-state-icon` SLOTTED in the card's own tree. A `mushroom-shape-icon$` block silently
// no-ops there (card-mod never finds the element — this cost a real debugging session: the
// washer stayed tile-sized with zero errors anywhere). So every template-card factory carries
// BOTH: the legacy shape block AND an `ha-tile-icon$` mirror, with icon-spin rules at HOST
// level (ha-state-icon is slotted → reachable from the card tree in both structures).

// When a card is power-driven, the entity's OWN state text is a lie (the BenQ's switch says `off`
// at 1 W) — so an entity-card's secondary line would contradict the animation next to it. These
// cards therefore become template-cards, whose secondary we can compute: the truthful on/off plus
// the live draw. `primary` falls back to the entity's friendly name when no name is passed.
const powerFace = (entity, name, power, color) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: name || `{{ state_attr('${entity}', 'friendly_name') }}`,
  secondary: `{% set w = states('${power.entity}') | float(-1) %}{% if w < 0 %}Unavailable{% elif w > ${power.above ?? 0.5} %}On · {{ w | round(0) }} W{% else %}Off{% endif %}`,
  // template-cards apply icon_color unconditionally, unlike entity-cards which grey an off icon by
  // state — so colour it by the DRAW, or an idle device sits there looking live.
  icon_color: `{% set w = states('${power.entity}') | float(-1) %}{{ '${color}' if w > ${power.above ?? 0.5} else 'disabled' }}`,
});

// #11 LED Strip — glow in the strip's own colour while on. Vertical layout (glowing orb on top,
// name centred below) so the 2-per-row tiles stay balanced and names get the full card width.
const animLedStrip = (entity, name, { icon = "mdi:led-strip-variant", color = "blue", active = "on" } = {}) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon, icon_color: color,
  layout: "vertical", fill_container: true,
  tap_action: { action: "toggle" },
  card_mod: { style: {
    // STATIC (paints instantly): keyframes + an always-defined animation; colour/on-off via vars.
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, strip-glow 2.2s ease-in-out infinite);
      }
      @keyframes strip-glow {
        0%   { filter: brightness(1);    box-shadow: 0 0 10px 3px rgba(var(--ig-rgb, 255, 240, 200), 0.55); }
        50%  { filter: brightness(1.25); box-shadow: 0 0 22px 9px rgba(var(--ig-rgb, 255, 240, 200), 1); }
        100% { filter: brightness(1);    box-shadow: 0 0 10px 3px rgba(var(--ig-rgb, 255, 240, 200), 0.55); }
      }`,
    // TEMPLATED (settles a beat later): icon placement + the state-driven vars on the host.
    ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        {% set rgb = state_attr(config.entity, 'rgb_color') %}
        {% if rgb is not none %}--ig-rgb: {{ rgb[0]|int }}, {{ rgb[1]|int }}, {{ rgb[2]|int }};{% endif %}
        --shape-animation: {{ 'strip-glow 2.2s ease-in-out infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.4' }};
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// Switch/plug — a steady glow pulse in a fixed colour while ON (switches carry no rgb_color,
// so the glow colour is a build-time `glow` rgb string, default amber). For smart-plug devices
// (fan, super-bright light, monitor power) where animLamp's brightness/colour controls don't
// apply. Same instant-paint contract as animLedStrip: static keyframes, on/off via --shape-animation.
const animSwitch = (entity, name, { icon = "mdi:power-socket", color = "amber", glow = "255, 193, 7", active = "on", power = null } = {}) => ({
  ...(power ? powerFace(entity, name, power, color) : { type: "custom:mushroom-entity-card", entity, name, icon_color: color }),
  icon,
  layout: "vertical", fill_container: true,
  tap_action: { action: "toggle" },
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, switch-glow 2s ease-in-out infinite);
      }
      @keyframes switch-glow {
        0%   { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 255, 193, 7), 0.5); }
        50%  { filter: brightness(1.2); box-shadow: 0 0 18px 7px rgba(var(--ig-rgb, 255, 193, 7), 0.95); }
        100% { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 255, 193, 7), 0.5); }
      }`,
    // tile-based template-card mirror (see the TWO ICON STRUCTURES note above)
    "ha-tile-icon$": `
      .container {
        border-radius: 9999px;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, switch-glow 2s ease-in-out infinite);
      }
      @keyframes switch-glow {
        0%   { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 255, 193, 7), 0.5); }
        50%  { filter: brightness(1.2); box-shadow: 0 0 18px 7px rgba(var(--ig-rgb, 255, 193, 7), 0.95); }
        100% { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 255, 193, 7), 0.5); }
      }`,
    ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --ig-rgb: ${glow};
        --shape-animation: {{ 'switch-glow 2s ease-in-out infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.4' }};
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// Fan — the icon (blades) SPINS while on, with a soft steady glow; idle = still + dimmed. For a
// fan wired as a `switch` (so Mushroom's native fan-card spin can't bind). `speed` tunes the spin.
const animFan = (entity, name, { icon = "mdi:fan", color = "teal", glow = "0, 200, 180", active = "on", speed = "1.6s", power = null } = {}) => ({
  ...(power ? powerFace(entity, name, power, color) : { type: "custom:mushroom-entity-card", entity, name, icon_color: color }),
  icon,
  layout: "vertical", fill_container: true,
  tap_action: { action: "toggle" },
  card_mod: { style: {
    // STATIC: spin keyframes exist immediately; the shape carries a soft glow, the icon spins.
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        box-shadow: var(--fan-glow, none);
        transition: box-shadow .3s ease;
      }`,
    // tile-based template-card mirror (see the TWO ICON STRUCTURES note above)
    "ha-tile-icon$": `
      .container {
        border-radius: 9999px;
        opacity: var(--ig-op, 1);
        box-shadow: var(--fan-glow, none);
        transition: box-shadow .3s ease;
      }`,
    // TEMPLATED: on/off → start/stop the spin and the glow. The spinning ha-state-icon is
    // SLOTTED (card tree) in both structures, so the spin lives HERE, not in a shadow block —
    // a shadow-side `ha-state-icon {}` rule never matched slotted content anyway.
    ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --fan-spin: {{ 'fan-rot ${speed} linear infinite' if on else 'none' }};
        --fan-glow: {{ '0 0 14px 4px rgba(${glow}, 0.5)' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.4' }};
      }
      ha-state-icon, ha-icon {
        transform-origin: 50% 50%;
        animation: var(--fan-spin, fan-rot ${speed} linear infinite);
        display: inline-block;
      }
      @keyframes fan-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// Contact (door/window) — calm & dimmed when shut; a pulsing RED alert glow + "open" icon when
// OPEN. For a binary_sensor with device_class door/window/opening, where state 'on' == open. The
// icon flips closed↔open, so this is a template-card (entity-card icons are static); same instant-
// paint contract as animSwitch (static keyframes, on/off via --shape-animation). tap → more-info.
const animContact = (entity, name, { icon = "mdi:window-closed-variant", openIcon = "mdi:window-open-variant", color = "blue-grey", glow = "244, 67, 54", active = "on" } = {}) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: name,
  secondary: `{{ 'Open' if is_state('${entity}', '${active}') else 'Closed' }}`,
  icon: `{{ '${openIcon}' if is_state('${entity}', '${active}') else '${icon}' }}`,
  icon_color: `{{ 'red' if is_state('${entity}', '${active}') else '${color}' }}`,
  layout: "vertical", fill_container: true,
  tap_action: { action: "more-info" },
  card_mod: { style: {
    // STATIC: alert keyframes exist immediately; the shape pulses while --shape-animation is set.
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, contact-alert 1.4s ease-in-out infinite);
      }
      @keyframes contact-alert {
        0%   { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 244, 67, 54), 0.5); }
        50%  { filter: brightness(1.3); box-shadow: 0 0 20px 8px rgba(var(--ig-rgb, 244, 67, 54), 1); }
        100% { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 244, 67, 54), 0.5); }
      }`,
    // tile-based template-card mirror (see the TWO ICON STRUCTURES note above)
    "ha-tile-icon$": `
      .container {
        border-radius: 9999px;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, contact-alert 1.4s ease-in-out infinite);
      }
      @keyframes contact-alert {
        0%   { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 244, 67, 54), 0.5); }
        50%  { filter: brightness(1.3); box-shadow: 0 0 20px 8px rgba(var(--ig-rgb, 244, 67, 54), 1); }
        100% { filter: brightness(1);   box-shadow: 0 0 8px 2px rgba(var(--ig-rgb, 244, 67, 54), 0.5); }
      }`,
    // TEMPLATED: open → start the red pulse; shut → still + dimmed.
    ".": `${clip}
      ha-card {
        {% set open = is_state(config.entity, '${active}') %}
        --ig-rgb: ${glow};
        --shape-animation: {{ 'contact-alert 1.4s ease-in-out infinite' if open else 'none' }};
        --ig-op: {{ '1' if open else '0.45' }};
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// #16 Vacuum — robot drives a wandering path while cleaning. Bound to vacuum.deebot.
const animVacuum = (entity, name, { icon = "mdi:robot-vacuum", color = "blue", active = "cleaning" } = {}) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon, icon_color: color,
  tap_action: { action: "more-info" },
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, robo-path 3.4s linear infinite);
      }
      @keyframes robo-path {
        0%   { transform: translate(0, 0) scale(1); }
        10%  { transform: translate(6px, -2px) rotate(8deg) scale(0.98); }
        20%  { transform: translate(10px, 4px) rotate(-6deg) scale(1); }
        30%  { transform: translate(4px, 8px) rotate(-14deg) scale(1.02); }
        40%  { transform: translate(-6px, 10px) rotate(4deg) scale(0.98); }
        50%  { transform: translate(-10px, 2px) rotate(16deg) scale(1.03); }
        60%  { transform: translate(-6px, -6px) rotate(-8deg) scale(1); }
        70%  { transform: translate(2px, -10px) rotate(10deg) scale(0.97); }
        80%  { transform: translate(8px, -6px) rotate(-6deg) scale(1.02); }
        90%  { transform: translate(4px, -2px) rotate(4deg) scale(1.01); }
        100% { transform: translate(0, 0) rotate(0deg) scale(1); }
      }`,
    ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        --shape-animation: {{ 'robo-path 3.4s linear infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.7' }};
      }`,
  } },
  grid_options: { columns: 4, rows: 2 },
});

// #10 Heater — flame glow + ember pulse on a climate card while the zone is heating.
// Triggers on heat mode OR hvac_action == 'heating' (so it reacts to actual demand, not just mode).
// NOTE: currently UNUSED (animClimate replaced it); kept for reference.
const animHeater = (entity, name, { flameColor = "deep-orange", active = "heat" } = {}) => ({
  type: "custom:mushroom-climate-card",
  entity, name,
  collapsible_controls: false,
  show_temperature_control: true,
  fill_container: false,
  hvac_modes: ["auto", "heat_cool", "cool", "heat", "dry", "fan_only", "off"],
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        --flame-color-rgb: var(--rgb-${flameColor});
        {% set trigger_active = (is_state('${entity}','${active}') or state_attr('${entity}','hvac_action') == 'heating') %}
        {% if trigger_active %}
          --flame-layer1: flame-layers 1.8s infinite;
          --flame-layer2: ember-pulse 2.4s infinite;
          opacity: 1;
        {% else %}
          --flame-layer1: none;
          --flame-layer2: none;
          opacity: 0.6;
        {% endif %}
        position: relative;
        transform-origin: 50% 75%;
      }
      .shape::before, .shape::after {
        content: "";
        position: absolute;
        inset: -8px;
        border-radius: inherit;
        pointer-events: none;
        filter: blur(3px);
      }
      .shape::before { animation: var(--flame-layer1); }
      .shape::after  { animation: var(--flame-layer2); }
      @keyframes flame-layers {
        0%   { box-shadow: 0 0 14px 8px rgba(var(--flame-color-rgb), 0.8), 0 -12px 24px -6px rgba(255, 200, 0, 0.4); }
        33%  { box-shadow: 0 0 20px 10px rgba(var(--flame-color-rgb), 1),  0 -16px 30px -8px rgba(255, 160, 0, 0.5); }
        66%  { box-shadow: 0 0 18px 9px rgba(var(--flame-color-rgb), 0.9), 0 -8px 20px -6px rgba(255, 220, 0, 0.35); }
        100% { box-shadow: 0 0 14px 8px rgba(var(--flame-color-rgb), 0.8), 0 -12px 24px -6px rgba(255, 200, 0, 0.4); }
      }
      @keyframes ember-pulse {
        0%   { box-shadow: 0 0 30px 10px rgba(var(--flame-color-rgb), 0.25), 0 0 60px 20px rgba(255, 120, 0, 0.15); }
        50%  { box-shadow: 0 0 50px 18px rgba(var(--flame-color-rgb), 0.5),  0 0 90px 35px rgba(255, 150, 0, 0.25); }
        100% { box-shadow: 0 0 30px 10px rgba(var(--flame-color-rgb), 0.25), 0 0 60px 20px rgba(255, 120, 0, 0.15); }
      }`,
    ".": clip,
  } },
  grid_options: { columns: 4, rows: 2 },
});

// #28 Lamp — mushroom-light-card (keeps brightness/colour controls) with a glow pulse in the
// light's OWN rgb_color while on. Ideal general-purpose animated light.
const animLamp = (entity, name, { active = "on" } = {}) => ({
  type: "custom:mushroom-light-card",
  entity, name,
  use_light_color: true,
  show_brightness_control: true,
  show_color_temp_control: true,
  show_color_control: true,
  collapsible_controls: true,
  icon_color: "auto",
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, lamp-glow 1.4s ease-in-out infinite);
      }
      @keyframes lamp-glow {
        0%   { filter: brightness(1);    box-shadow: 0 0 6px 2px rgba(var(--ig-rgb, 255, 240, 200), 0.6); }
        20%  { filter: brightness(1.25); box-shadow: 0 0 14px 6px rgba(var(--ig-rgb, 255, 240, 200), 0.9); }
        30%  { filter: brightness(0.9);  box-shadow: 0 0 3px 1px rgba(var(--ig-rgb, 255, 240, 200), 0.4); }
        50%  { filter: brightness(1.3);  box-shadow: 0 0 16px 8px rgba(var(--ig-rgb, 255, 240, 200), 1); }
        80%  { filter: brightness(1.05); box-shadow: 0 0 8px 3px rgba(var(--ig-rgb, 255, 240, 200), 0.7); }
        100% { filter: brightness(1);    box-shadow: 0 0 6px 2px rgba(var(--ig-rgb, 255, 240, 200), 0.6); }
      }`,
    ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        {% set rgb = state_attr(config.entity, 'rgb_color') %}
        {% if rgb is not none %}--ig-rgb: {{ rgb[0]|int }}, {{ rgb[1]|int }}, {{ rgb[2]|int }};{% endif %}
        --shape-animation: {{ 'lamp-glow 1.4s ease-in-out infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.5' }};
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// #71 Motion — radar HUD: a "SCANNING" conic sweep while idle, red "DETECTED" sonar shockwave
// on motion, with a status badge + bottom scan bar. The radar ring (shadow block) is STATIC so
// it spins instantly; the badge/colour/which-state come from the templated host block. 2-across
// (columns 6) so names don't truncate on a phone.
const animMotion = (entity, name, { icon = "mdi:motion-sensor", columns = 6, rows = 2 } = {}) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon,
  primary_info: "name", secondary_info: "state",
  tap_action: { action: "more-info" },
  icon_color: "light-grey",
  card_mod: { style: {
    ".": `
      ha-card {
        {% set active_state = 'on' %}
        --custom-icon-size: 65px;
        {% set color_detected = '255, 50, 50' %}
        {% set color_scanning = '0, 200, 255' %}
        {% set text_detected = 'DETECTED' %}
        {% set text_scanning = 'SCANNING' %}
        {% set is_active = states(config.entity) == active_state %}
        {% if is_active %}
           {% set color = color_detected %}
           {% set badge = text_detected %}
           {% set bg_image = 'radial-gradient(circle at center, rgba('~color~', 0.15) 0%, transparent 70%)' %}
        {% else %}
           {% set color = color_scanning %}
           {% set badge = text_scanning %}
           {% set bg_image = 'none' %}
        {% endif %}
        --sonar-color: {{ color }};
        --sonar-bg: {{ bg_image }};
        --badge-text: "{{ badge }}";
        --anim-sweep: {{ 'block' if not is_active else 'none' }};
        --anim-pulse: {{ 'block' if is_active else 'none' }};
        background-image: var(--sonar-bg) !important;
        transition: background-image 0.5s ease;
        border-radius: 12px;
        border: none;
        overflow: hidden;
      }
      ha-card::before {
        content: var(--badge-text, "SCANNING");
        position: absolute;
        top: 10px; right: 10px;
        font-size: 10px; font-weight: 900; letter-spacing: 1px;
        color: rgb(var(--sonar-color, 0, 200, 255));
        background: rgba(var(--sonar-color, 0, 200, 255), 0.15);
        border: 1px solid rgba(var(--sonar-color, 0, 200, 255), 0.3);
        box-shadow: 0 0 10px rgba(var(--sonar-color, 0, 200, 255), 0.2);
        padding: 3px 8px; border-radius: 6px; z-index: 2;
      }
      ha-card::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0; height: 4px;
        background: rgb(var(--sonar-color, 0, 200, 255));
        box-shadow: 0 0 15px rgb(var(--sonar-color, 0, 200, 255));
        opacity: 0.7;
        transition: all 0.5s ease;
      }`,
    // STATIC: the ring + both animations exist immediately; defaults show the SCANNING sweep in
    // cyan until the template confirms idle/active.
    "mushroom-shape-icon$": `
      .shape {
        --shape-color: var(--sonar-color, 0, 200, 255);
        --icon-size: var(--custom-icon-size, 65px) !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        border-radius: 50% !important;
        background: transparent !important;
        position: relative;
        display: flex; align-items: center; justify-content: center;
        overflow: visible !important;
        border: 2px solid rgba(var(--shape-color), 0.2);
        box-shadow: inset 0 0 15px rgba(var(--shape-color), 0.1);
        transition: border-color 0.3s ease;
      }
      .shape::before {
        content: '';
        display: var(--anim-sweep, block);
        position: absolute; inset: -2px; border-radius: 50%;
        background: conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(var(--shape-color), 0.1) 280deg, rgba(var(--shape-color), 1) 360deg);
        animation: radar-spin 2.5s linear infinite;
        z-index: 1;
      }
      .shape::after {
        content: '';
        display: var(--anim-pulse, none);
        position: absolute; inset: 0; border-radius: 50%; z-index: 0;
        animation: sonar-shockwave 2s infinite;
      }
      ha-icon {
        position: relative; z-index: 5;
        color: rgba(var(--shape-color), 1) !important;
        filter: drop-shadow(0 0 8px rgba(var(--shape-color), 0.8));
        transition: color 0.3s ease;
      }
      @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes sonar-shockwave {
        0%   { box-shadow: 0 0 0 0 rgba(var(--shape-color), 0.8), 0 0 0 0 rgba(var(--shape-color), 0.8); }
        40%  { box-shadow: 0 0 0 20px rgba(var(--shape-color), 0.3), 0 0 0 0 rgba(var(--shape-color), 0.8); }
        80%  { box-shadow: 0 0 0 40px rgba(var(--shape-color), 0), 0 0 0 20px rgba(var(--shape-color), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--shape-color), 0), 0 0 0 0 rgba(var(--shape-color), 0); }
      }`,
  } },
  grid_options: { columns, rows },
});

// #23 Android TV — media-player card whose icon does an RGB "screen glow" pulse while the
// player is not off/idle. Bind to any media_player. (Defaults to no glow — most-of-the-time the
// TV is off — so the glow only kicks in when the template confirms it's playing.)
const animMedia = (entity, name, { icon } = {}) => ({
  type: "custom:mushroom-media-player-card",
  entity, ...(name ? { name } : {}), ...(icon ? { icon } : {}),
  volume_controls: ["volume_mute", "volume_set", "volume_buttons"],
  media_controls: ["on_off", "previous", "play_pause_stop", "next"],
  show_volume_level: true,
  use_media_info: true,
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--shape-animation, none);
      }
      @keyframes tv-rgb {
        0%   { filter: brightness(1.0);  box-shadow: 0 0 6px 2px rgba(var(--ig-rgb, 255, 0, 0), 0.4), -4px 0 8px -4px rgba(255, 0, 0, 0.4), 4px 0 8px -4px rgba(0, 128, 255, 0.4); }
        40%  { filter: brightness(1.25); box-shadow: 0 0 16px 6px rgba(var(--ig-rgb, 255, 0, 0), 0.9), -6px 0 12px -4px rgba(255, 0, 0, 0.7), 6px 0 12px -4px rgba(0, 128, 255, 0.7); }
        100% { filter: brightness(1.0);  box-shadow: 0 0 6px 2px rgba(var(--ig-rgb, 255, 0, 0), 0.4), -4px 0 8px -4px rgba(255, 0, 0, 0.4), 4px 0 8px -4px rgba(0, 128, 255, 0.4); }
      }`,
    ".": `${clip}
      ha-card {
        {% set s = states(config.entity) %}
        {% set on = s not in ['off', 'unavailable', 'standby', 'idle', 'unknown'] %}
        --shape-animation: {{ 'tv-rgb 1.4s linear infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.7' }};
      }`,
  } },
  grid_options: { columns: 12, rows: 2 },
});

// Minimal climate tile (Neil's spec): the icon is COLOURED + glows by the current room temp
// (blue→red), the secondary shows "current → target", tap toggles the zone on/off, and there
// are NO +/- or mode controls. Compact (rows 1) and 2-per-row → reads well on mobile.
// Comfort gradient (Neil's spec): blue=cold → green=slightly cold → yellow=target/comfortable
// → orange=warm → red=too hot. Absolute °C scale (yellow ≈ a comfortable 20°C), so it stays
// sane even when a zone is off (its setpoint reads 5°).
const TEMP_RGB = `
        {% set t = state_attr(config.entity,'current_temperature') | float(-99) %}
        {% if t < -90 %}{% set c = '120, 120, 120' %}
        {% elif t < 16 %}{% set c = '33, 150, 243' %}     {# blue — cold #}
        {% elif t < 20 %}{% set c = '76, 175, 80' %}      {# green — slightly cold #}
        {% elif t < 22.5 %}{% set c = '255, 235, 59' %}   {# yellow — target #}
        {% elif t < 24 %}{% set c = '255, 152, 0' %}      {# orange — warm #}
        {% else %}{% set c = '244, 67, 54' %}{% endif %}  {# red — too hot #}`;
const animClimate = (entity, name) => ({
  type: "custom:mushroom-template-card",
  entity,
  primary: name,
  secondary: `{% set cur = state_attr(entity,'current_temperature') %}{% set tgt = state_attr(entity,'temperature') %}{{ (cur|round(1)) if cur is not none else '?' }}°{% if is_state(entity,'off') or tgt is none %} · {{ states(entity)|capitalize }}{% else %} → {{ tgt|round(1) }}°{% endif %}`,
  icon: "mdi:thermometer",
  icon_color: `{% set t = state_attr(entity,'current_temperature')|float(-99) %}{% if t < -90 %}grey{% elif t < 16 %}blue{% elif t < 20 %}green{% elif t < 22.5 %}yellow{% elif t < 24 %}orange{% else %}red{% endif %}`,
  tap_action: { action: "toggle" },
  hold_action: { action: "more-info" },
  card_mod: { style: {
    // STATIC: the pulse runs instantly with a neutral grey; the templated host block recolours
    // it to the temperature and tunes speed/opacity.
    "mushroom-shape-icon$": `
      .shape {
        opacity: var(--ig-op, 1);
        animation: temp-pulse var(--ig-dur, 2.6s) ease-in-out infinite;
      }
      @keyframes temp-pulse {
        0%   { box-shadow: 0 0 6px 2px rgba(var(--temp-rgb, 120, 120, 120), 0.35); }
        50%  { box-shadow: 0 0 16px 6px rgba(var(--temp-rgb, 120, 120, 120), 0.85); }
        100% { box-shadow: 0 0 6px 2px rgba(var(--temp-rgb, 120, 120, 120), 0.35); }
      }`,
    ".": `
      ha-card {
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));${TEMP_RGB}
        --temp-rgb: {{ c }};
        {% if is_state(config.entity,'off') %}--ig-dur: 4s; --ig-op: 0.6;{% else %}--ig-dur: 2.6s; --ig-op: 1;{% endif %}
      }`,
  } },
  grid_options: { columns: 6, rows: 1 },
});

// #NEW Temperature comfort card (adapted from upstream env_with_graph #1) — a big glowing
// thermometer whose colour + breathing pace follow the room temperature. The upstream card
// paints 22 °C alarm-red; this one uses the floorplan's CALM ramp (comfort 20–23 °C reads as a
// quiet near-white slow breath; only genuine cold or heat saturates and speeds up) so the same
// room tells the same story on the plan and in its subview. Vertical tile, 2-across.
// The value is the PRIMARY line (primary_info: state) — it's a readout, not a switch.
const COMFORT_RAMP = `
        {% set t = states(config.entity) | float(-999) %}
        {% if t < -900 %}{% set rgb = '86, 92, 100' %}{% set dur = '' %}{% set op = '0.4' %}
        {% elif t < 15 %}{% set rgb = '122, 184, 255' %}{% set dur = '2.4s' %}{% set op = '1' %}
        {% elif t < 18 %}{% set rgb = '166, 211, 228' %}{% set dur = '3.2s' %}{% set op = '1' %}
        {% elif t < 20 %}{% set rgb = '207, 218, 219' %}{% set dur = '4s' %}{% set op = '0.9' %}
        {% elif t < 23 %}{% set rgb = '234, 238, 242' %}{% set dur = '4.6s' %}{% set op = '0.9' %}
        {% elif t < 24.5 %}{% set rgb = '240, 196, 133' %}{% set dur = '3.2s' %}{% set op = '1' %}
        {% elif t < 26.5 %}{% set rgb = '247, 155, 92' %}{% set dur = '2.4s' %}{% set op = '1' %}
        {% else %}{% set rgb = '255, 122, 104' %}{% set dur = '1.8s' %}{% set op = '1' %}{% endif %}`;
const animTemp = (entity, name = "Temperature") => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon: "mdi:thermometer",
  primary_info: "state", secondary_info: "name",
  layout: "vertical", fill_container: true,
  tap_action: { action: "more-info" },
  card_mod: { style: {
    // STATIC: breathe/glow keyframes exist immediately, tinted by --temp-rgb (neutral until set).
    "mushroom-shape-icon$": `
      .shape {
        /* size + neutral disc in the SHADOW block (host-side --icon-size is ignored by this
           Mushroom build) — the default blue sensor disc fights the ramp tint */
        --icon-size: 52px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        background-color: rgba(120, 130, 140, 0.12) !important;
        transform-origin: 50% 55%;
        --icon-color: rgba(var(--temp-rgb, 150, 160, 170), 1) !important;
        opacity: var(--ig-op, 0.9);
        animation: var(--shape-animation, comfort-breathe 4s ease-in-out infinite);
      }
      @keyframes comfort-breathe {
        0%   { transform: scale(0.97); box-shadow: 0 0 8px 2px rgba(var(--temp-rgb, 150, 160, 170), 0.35); }
        50%  { transform: scale(1.03); box-shadow: 0 0 20px 7px rgba(var(--temp-rgb, 150, 160, 170), 0.8); }
        100% { transform: scale(0.97); box-shadow: 0 0 8px 2px rgba(var(--temp-rgb, 150, 160, 170), 0.35); }
      }`,
    // TEMPLATED: only the ramp variables. A dead sensor gets grey + a frozen (0s ≈ static) breath.
    ".": `${clip}
      ha-card {${COMFORT_RAMP}
        --temp-rgb: {{ rgb }};
        --shape-animation: {{ 'none' if dur == '' else 'comfort-breathe ' ~ dur ~ ' ease-in-out infinite' }};
        --ig-op: {{ op }};
        --card-primary-font-size: 1.3rem;
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// #NEW Humidity comfort card (adapted from upstream env_with_graph #2) — a water-percent icon
// that bobs like a droplet, colour-banded: parched amber < 40 %, calm slate-blue in the healthy
// 40–60 % band, saturating cyan→deep blue as it climbs past 60 % (shower steam, drying laundry).
const animHum = (entity, name = "Humidity") => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon: "mdi:water-percent",
  primary_info: "state", secondary_info: "name",
  layout: "vertical", fill_container: true,
  tap_action: { action: "more-info" },
  card_mod: { style: {
    "mushroom-shape-icon$": `
      .shape {
        --icon-size: 52px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        background-color: rgba(120, 130, 140, 0.12) !important;
        transform-origin: 50% 50%;
        --icon-color: rgba(var(--hum-rgb, 150, 160, 170), 1) !important;
        opacity: var(--ig-op, 0.9);
        animation: var(--shape-animation, hum-bob 4s ease-in-out infinite);
      }
      @keyframes hum-bob {
        0%   { transform: translateY(0);    box-shadow: 0 0 8px 2px rgba(var(--hum-rgb, 150, 160, 170), 0.35); }
        50%  { transform: translateY(-3px); box-shadow: 0 0 18px 6px rgba(var(--hum-rgb, 150, 160, 170), 0.75); }
        100% { transform: translateY(0);    box-shadow: 0 0 8px 2px rgba(var(--hum-rgb, 150, 160, 170), 0.35); }
      }`,
    ".": `${clip}
      ha-card {
        {% set h = states(config.entity) | float(-999) %}
        {% if h < -900 %}{% set rgb = '86, 92, 100' %}{% set dur = '' %}{% set op = '0.4' %}
        {% elif h < 40 %}{% set rgb = '240, 196, 133' %}{% set dur = '3s' %}{% set op = '1' %}
        {% elif h < 60 %}{% set rgb = '141, 166, 195' %}{% set dur = '4.6s' %}{% set op = '0.9' %}
        {% elif h < 70 %}{% set rgb = '79, 195, 247' %}{% set dur = '3s' %}{% set op = '1' %}
        {% else %}{% set rgb = '41, 121, 255' %}{% set dur = '2.2s' %}{% set op = '1' %}{% endif %}
        --hum-rgb: {{ rgb }};
        --shape-animation: {{ 'none' if dur == '' else 'hum-bob ' ~ dur ~ ' ease-in-out infinite' }};
        --ig-op: {{ op }};
        --card-primary-font-size: 1.3rem;
      }`,
  } },
  grid_options: { columns: 6, rows: 2 },
});

// #NEW Washing machine — a big, full-width hero card (it earns more real estate than the
// tile-sized devices). The drum (icon) spins + the shape glows water-blue while RUNNING,
// amber when PAUSED, red when ALARM, dimmed grey when idle/off. A program-progress bar across
// the bottom edge advances as the wash completes ((total-remaining)/total). Bind the
// machine_status enum sensor as `entity`; pass the companion sensor ids for time/temp/spin/door.
// machine_status states: off | standby | running | paused | alarm.
const animWasher = (entity, name, { remaining, total, temp, spin, door } = {}) => {
  const remId = remaining || entity;
  const totId = total || remaining || entity;
  const tempPart = temp ? ` · {{ states('${temp}') }}°` : ``;
  const spinPart = spin ? ` · {{ states('${spin}') }} spin` : ``;
  const doorPart = door ? `{% if states('${door}') == 'open' %}door open{% else %}ready{% endif %}` : `ready`;
  return {
    type: "custom:mushroom-template-card",
    entity,
    primary: name,
    secondary: `{% set s = states(entity) %}{% set rem = states('${remId}')|int(0) %}{% set time = ((rem//60)~'h '~('%02d'|format(rem%60))~'m') if rem >= 60 else (rem~' min') %}{% if s == 'running' %}{{ time }} left${tempPart}${spinPart}{% elif s == 'paused' %}Paused · {{ time }} left{% elif s == 'alarm' %}⚠ Check machine{% elif s == 'off' %}Off{% else %}Idle · ${doorPart}{% endif %}`,
    icon: "mdi:washing-machine",
    icon_color: `{% set s = states(entity) %}{% if s == 'running' %}light-blue{% elif s == 'paused' %}orange{% elif s == 'alarm' %}red{% else %}blue-grey{% endif %}`,
    tap_action: { action: "more-info" },
    hold_action: { action: "more-info" },
    card_mod: { style: {
      // STATIC: glow + drum-spin keyframes exist immediately; both default to `none` (the machine
      // is idle most of the time) and the templated host block turns them on per state.
      "mushroom-shape-icon$": `
        .shape {
          --icon-size: 76px !important;
          width: var(--icon-size) !important;
          height: var(--icon-size) !important;
          transform-origin: 50% 50%;
          opacity: var(--ig-op, 1);
          animation: var(--shape-animation, none);
        }
        @keyframes wash-pulse {
          0%   { box-shadow: 0 0 8px 2px rgba(var(--wash-rgb, 120, 130, 140), 0.35); }
          50%  { box-shadow: 0 0 24px 9px rgba(var(--wash-rgb, 120, 130, 140), 0.9); }
          100% { box-shadow: 0 0 8px 2px rgba(var(--wash-rgb, 120, 130, 140), 0.35); }
        }`,
      // tile-based template-card mirror — mushroom-template-card has NO mushroom-shape-icon on
      // this Mushroom build (see the TWO ICON STRUCTURES note); the hero size lives here.
      "ha-tile-icon$": `
        .container {
          width: 76px; height: 76px;
          border-radius: 9999px;
          opacity: var(--ig-op, 1);
          animation: var(--shape-animation, none);
        }
        @keyframes wash-pulse {
          0%   { box-shadow: 0 0 8px 2px rgba(var(--wash-rgb, 120, 130, 140), 0.35); }
          50%  { box-shadow: 0 0 24px 9px rgba(var(--wash-rgb, 120, 130, 140), 0.9); }
          100% { box-shadow: 0 0 8px 2px rgba(var(--wash-rgb, 120, 130, 140), 0.35); }
        }`,
      ".": `
        mushroom-shape-icon { --icon-size: 76px; display: flex; margin: 0 !important; }
        ha-tile-icon { --mdc-icon-size: 44px; }
        ha-state-icon, ha-icon {
          transform-origin: 50% 50%;
          animation: var(--drum-animation, none);
          display: inline-block;
        }
        @keyframes drum-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ha-card {
          {% set s = states(config.entity) %}
          {% set rem = states('${remId}')|float(0) %}
          {% set tot = states('${totId}')|float(0) %}
          {% set frac = ((tot - rem) / tot) if tot > 0 else 0 %}
          {% set frac = [[frac, 0]|max, 1]|min %}
          {% if s == 'running' %}{% set rgb = '3, 169, 244' %}
          {% elif s == 'paused' %}{% set rgb = '255, 152, 0' %}
          {% elif s == 'alarm' %}{% set rgb = '244, 67, 54' %}
          {% else %}{% set rgb = '96, 135, 170' %}{% endif %}
          --wash-rgb: {{ rgb }};
          --wash-frac: {{ frac|round(3) }};
          --bar-display: {{ 'block' if s in ['running', 'paused'] else 'none' }};
          {% if s == 'running' %}--shape-animation: wash-pulse 2s ease-in-out infinite; --drum-animation: drum-spin 2s linear infinite; --ig-op: 1; --bubble-dur: 7s;
          {% elif s == 'paused' %}--shape-animation: wash-pulse 3.5s ease-in-out infinite; --drum-animation: drum-spin 7s linear infinite; --ig-op: 0.95; --bubble-dur: 10s;
          {% elif s == 'alarm' %}--shape-animation: wash-pulse 0.8s ease-in-out infinite; --drum-animation: none; --ig-op: 1; --bubble-dur: 6s;
          {% else %}--shape-animation: wash-pulse 5s ease-in-out infinite; --drum-animation: none; --ig-op: 0.8; --bubble-dur: 13s;{% endif %}
          position: relative;
          overflow: hidden;
          clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
          background-image:
            radial-gradient(circle 7px at 12% 88%, rgba(var(--wash-rgb), 0.22) 0 7px, transparent 8px),
            radial-gradient(circle 4px at 27% 64%, rgba(var(--wash-rgb), 0.16) 0 4px, transparent 5px),
            radial-gradient(circle 6px at 43% 82%, rgba(var(--wash-rgb), 0.20) 0 6px, transparent 7px),
            radial-gradient(circle 3px at 58% 58%, rgba(var(--wash-rgb), 0.14) 0 3px, transparent 4px),
            radial-gradient(circle 5px at 72% 74%, rgba(var(--wash-rgb), 0.18) 0 5px, transparent 6px),
            radial-gradient(circle 4px at 88% 86%, rgba(var(--wash-rgb), 0.16) 0 4px, transparent 5px);
          background-size: 100% 220px;
          background-repeat: repeat;
          animation: wash-bubbles var(--bubble-dur, 12s) linear infinite;
        }
        @keyframes wash-bubbles { from { background-position-y: 0; } to { background-position-y: -220px; } }
        ha-card::before {
          content: '';
          position: absolute; left: 0; right: 0; bottom: 0; height: 5px;
          background: rgba(var(--wash-rgb, 96, 135, 170), 0.16);
          display: var(--bar-display, none); z-index: 1;
        }
        ha-card::after {
          content: '';
          position: absolute; left: 0; bottom: 0; height: 5px;
          width: calc(100% * var(--wash-frac, 0));
          background: rgb(var(--wash-rgb, 96, 135, 170));
          box-shadow: 0 0 12px rgba(var(--wash-rgb, 96, 135, 170), 0.9);
          display: var(--bar-display, none);
          transition: width 0.8s ease; z-index: 2;
        }`,
    } },
    grid_options: { columns: 12, rows: 3 },
  };
};

// #74 Curtains — the card draws the window itself: a pane on the right with two fabric panels whose
// widths track `current_position` (open → panels shrink to nothing; closed → they meet in the
// middle), over glass that shifts day-blue → night-dark as it shuts. Position is the animated
// quantity (background-size), so a move reads as fabric sliding rather than a number snapping.
// The icon pulses only while the motor is actually running (opening/closing) — a settled curtain
// is still, per the idle-is-quiet rule.
//
// Fabric defaults match the drapes drawn on the floorplan SVG (.drape, #c2a06a) so the same window
// reads the same in both places. `unavailable` gets its own dimmed grey look — without that a dead
// cover reports position 0 and cosplays as "fully closed".
const animCurtain = (entity, name, {
  icon = "mdi:curtains", fabric = "#c2a06a", fabricShadow = "#9c7f4f",
  paneOpen = "#4fc3f7", paneShut = "#243240", windowWidth = "40%", height = "104px",
} = {}) => ({
  type: "custom:mushroom-entity-card",
  entity, name, icon,
  primary_info: "name",
  secondary_info: "state",
  icon_color: `{% set p = state_attr(config.entity, 'current_position') | int(0) %}{% if states(config.entity) in ['unavailable','unknown'] %}grey{% elif p > 60 %}amber{% elif p > 0 %}orange{% else %}blue-grey{% endif %}`,
  tap_action: { action: "more-info" },
  card_mod: { style: {
    // STATIC: the pulse keyframe exists immediately; --cur-anim defaults to none (a curtain is
    // parked almost always, so `none` is the probable truth during the pre-template beat).
    "mushroom-shape-icon$": `
      .shape {
        --icon-size: 52px !important;
        animation: var(--cur-anim, none);
      }
      @keyframes curtain-pulse {
        0%, 100% { transform: scale(0.94); box-shadow: 0 0 0 0 rgba(var(--rgb-state-cover, 255, 152, 0), 0.6); }
        50%      { transform: scale(1);    box-shadow: 0 0 12px 0 rgba(var(--rgb-state-cover, 255, 152, 0), 1); }
      }`,
    ".": `
      ha-card {
        {% set s = states(config.entity) %}
        {% set dead = s in ['unavailable', 'unknown'] %}
        {% set pos = state_attr(config.entity, 'current_position') | int(0) %}
        {% set pos = [[pos, 0]|max, 100]|min %}
        /* each panel covers half of whatever is still shut: 0% open → 50% + 50% meeting centre */
        --cur-panel: {{ (100 - pos) / 2 }}%;
        --cur-pane: {{ '#2b3138' if dead else ('${paneShut}' if pos < 10 else '${paneOpen}') }};
        --cur-fabric: {{ '#6b7280' if dead else '${fabric}' }};
        --cur-fabric-shadow: {{ '#565e6b' if dead else '${fabricShadow}' }};
        --cur-anim: {{ 'curtain-pulse 1.4s ease-in-out infinite' if s in ['opening', 'closing'] else 'none' }};
        opacity: {{ '0.55' if dead else '1' }};
        /* keep the name/state clear of the window drawing */
        padding-right: calc(${windowWidth} + 14px) !important;
        position: relative;
        height: ${height} !important;
      }
      /* the pane + both fabric panels: one gradient anchored left, one right, each sized by state */
      ha-card::after {
        content: '';
        position: absolute; top: 12px; bottom: 12px; right: 12px;
        width: ${windowWidth};
        border-radius: 8px;
        box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.45);
        background-color: var(--cur-pane, ${paneShut});
        background-image:
          repeating-linear-gradient(90deg,
            var(--cur-fabric) 0%, var(--cur-fabric) 10%,
            var(--cur-fabric-shadow) 15%, var(--cur-fabric) 20%),
          repeating-linear-gradient(-90deg,
            var(--cur-fabric) 0%, var(--cur-fabric) 10%,
            var(--cur-fabric-shadow) 15%, var(--cur-fabric) 20%);
        background-size: var(--cur-panel, 50%) 100%;
        background-position: left top, right top;
        background-repeat: no-repeat;
        /* the whole point: fabric slides, glass fades */
        transition: background-size 0.9s cubic-bezier(0.25, 1, 0.5, 1), background-color 1.2s ease;
      }
      /* glass reflection, above the fabric so the pane reads as glazed */
      ha-card::before {
        content: '';
        position: absolute; top: 12px; bottom: 12px; right: 12px;
        width: ${windowWidth};
        border-radius: 8px;
        background: linear-gradient(120deg, rgba(255, 255, 255, 0.22) 0%, transparent 42%);
        pointer-events: none;
        z-index: 2;
      }`,
  } },
  grid_options: { columns: 12, rows: 2 },
});

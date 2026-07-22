// upstream: README #55 - Mushroom Alarm  +  README #19 - Alarm
// Two upstream cards, one kind, two variants:
//   panel (#55) — a real `alarm_control_panel`: a shield disc with a per-state tuple
//                 (colour · disc animation · inner sheen/radar · outer sonar ring · icon beat)
//                 plus a card-filling glow. Disarmed floats calmly green, armed sweeps a red
//                 radar with sonar rings, pending breathes orange, triggered strobes + shakes.
//   siren (#19) — the plug/switch-driven siren: violent 0.6s shake with a hard red flash while
//                 sounding, still and quiet otherwise. (#19's `siren-armed` keyframe is declared
//                 but never consumed upstream — pruned.)
// All of #55's Jinja lived inside the shadow block, which re-renders (and restarts every
// animation) on each state change; here the shadow blocks are static and the host block sets
// the tuple as CSS vars.

const ALARM_PANEL_KEYFRAMES = `
      @keyframes shield-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      @keyframes sheen-scan { 0% { background-position: 0% 150%; opacity: 0; } 20%, 80% { opacity: 1; } 100% { background-position: 0% -50%; opacity: 0; } }
      @keyframes radar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes sonar-expand { 0% { transform: scale(1); opacity: 0.8; border-width: 2px; } 100% { transform: scale(2.5); opacity: 0; border-width: 0px; } }
      @keyframes panic-strobe {
        0%   { background-color: rgba(var(--al-rgb, 158, 158, 158), 0.2); box-shadow: 0 0 10px rgba(var(--al-rgb, 158, 158, 158), 1); }
        100% { background-color: rgba(var(--al-rgb, 158, 158, 158), 0.6); box-shadow: 0 0 50px rgba(var(--al-rgb, 158, 158, 158), 1); }
      }
      @keyframes arming-breathe {
        0%, 100% { box-shadow: 0 0 10px rgba(var(--al-rgb, 158, 158, 158), 0.5); }
        50%      { box-shadow: 0 0 30px rgba(var(--al-rgb, 158, 158, 158), 1); }
      }`;

const ALARM_ICON_KEYFRAMES = `
      @keyframes breathe-slow { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }
      @keyframes breathe-medium { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      @keyframes breathe-fast { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      @keyframes violent-shake {
        0%   { transform: translate(0, 0) rotate(0deg); }
        25%  { transform: translate(-3px, 3px) rotate(-5deg); }
        50%  { transform: translate(3px, -3px) rotate(5deg); }
        75%  { transform: translate(-3px, -3px) rotate(-5deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }`;

const SIREN_KEYFRAMES = `
      @keyframes siren-alert {
        0%   { transform: translate(0, 0) scale(1); box-shadow: 0 0 10px 4px rgba(var(--al-rgb, 233, 30, 99), 1); }
        10%  { transform: translate(-2px, -1px) rotate(-3deg) scale(1.02); }
        20%  { transform: translate(3px, 1px) rotate(2deg) scale(1.03); }
        30%  { transform: translate(-4px, 0) rotate(-4deg) scale(1.04); }
        40%  { transform: translate(4px, 2px) rotate(3deg) scale(1.05); }
        50%  { transform: translate(-2px, -2px) rotate(-2deg) scale(1.02); }
        60%  { transform: translate(2px, 1px) rotate(1deg) scale(1.03); }
        70%  { transform: translate(-3px, 0) rotate(-3deg) scale(1.04); }
        80%  { transform: translate(3px, -1px) rotate(2deg) scale(1.03); }
        100% { transform: translate(0, 0) rotate(0deg) scale(1); box-shadow: 0 0 20px 8px rgba(var(--al-rgb, 233, 30, 99), 0); }
      }`;

registerKind("alarm", {
  label: "Animated Alarm",
  desc: "Alarm panel shield — calm green disarmed, red radar + sonar armed, orange arming, strobing triggered",
  domains: ["alarm_control_panel", "switch", "binary_sensor", "siren", "input_boolean"],
  schema: [
    F.variant(["panel", "siren"]),
    F.icon, F.color, F.glow, F.speed, F.active,
    {
      name: "arm_states",
      selector: { select: { multiple: true, mode: "list", options: ["armed_home", "armed_away", "armed_night", "armed_vacation", "armed_custom_bypass"] } },
    },
  ],
  help: {
    variant: "panel = alarm_control_panel with arm/disarm buttons (upstream #55) · siren = a switch/binary_sensor that shakes while sounding (upstream #19)",
    arm_states: "panel variant: which arm buttons the card offers (default armed_home + armed_away)",
    icon: "siren variant only — the panel variant uses the domain's state icons",
    color: "siren variant: idle icon colour (default pink)",
    glow: "siren variant: flash colour as R, G, B (default 233, 30, 99)",
    speed: "siren variant: shake duration (default 0.6s) — keep it fast, this is an alarm",
    active: "siren variant: state that counts as sounding (default: on)",
  },
  make: (c) => {
    if (c.variant === "siren") {
      const glow = c.glow || "233, 30, 99";
      const speed = c.speed || "0.6s";
      const active = c.active || "on";
      return {
        type: "custom:mushroom-entity-card",
        entity: c.entity,
        name: c.name,
        icon: c.icon || "mdi:alarm-light",
        icon_color: c.color || "pink",
        layout: "vertical", fill_container: true,
        tap_action: { action: "toggle" },
        card_mod: { style: {
          // default `none` — an alarm that animates by default would cry wolf on every reload
          "mushroom-shape-icon$": `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--ig-op, 1);
        animation: var(--al-anim, none);
      }
      ${SIREN_KEYFRAMES}`,
          ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        --al-rgb: ${glow};
        --al-anim: {{ 'siren-alert ${speed} linear infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.7' }};
      }`,
        } },
        grid_options: { columns: 6, rows: 2 },
      };
    }

    return {
      type: "custom:mushroom-alarm-control-panel-card",
      entity: c.entity,
      ...(c.name ? { name: c.name } : {}),
      states: c.arm_states && c.arm_states.length ? c.arm_states : ["armed_home", "armed_away"],
      layout: "vertical", fill_container: true,
      primary_info: "state", secondary_info: "none",
      tap_action: { action: "none" },
      hold_action: { action: "none" },
      card_mod: { style: {
        // STATIC: the disc, both effect layers and every keyframe. Which of them runs (and in
        // what colour) arrives as vars from the host block. Grey + still is the honest default:
        // a panel whose state hasn't loaded is not "disarmed".
        "mushroom-shape-icon$": `
      .shape {
        background-color: rgba(var(--al-rgb, 158, 158, 158), 0.15) !important;
        --icon-color: rgb(var(--al-rgb, 158, 158, 158)) !important;
        color: rgb(var(--al-rgb, 158, 158, 158)) !important;
        box-shadow: 0 0 25px rgba(var(--al-rgb, 158, 158, 158), 0.3), inset 0 0 10px rgba(var(--al-rgb, 158, 158, 158), 0.1);
        border: 1px solid rgba(var(--al-rgb, 158, 158, 158), 0.3);
        border-radius: 50% !important;
        position: relative;
        overflow: visible !important;
        transition: background-color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease;
        animation: var(--al-disc, none);
      }
      /* inner layer: sheen wipe when disarmed, radar sweep when armed */
      .shape::before {
        content: '';
        position: absolute; inset: 0; border-radius: 50%; z-index: 1;
        background: var(--al-inner, none);
        background-size: 100% 200%;
        animation: var(--al-inner-anim, none);
      }
      /* outer layer: sonar ring / shockwave */
      .shape::after {
        content: '';
        display: var(--al-outer, none);
        position: absolute; inset: -2px; border-radius: 50%; z-index: -1;
        border: 2px solid rgba(var(--al-rgb, 158, 158, 158), 0.6);
        animation: var(--al-outer-anim, none);
      }
      ha-icon { position: relative; z-index: 2; }
      ${ALARM_PANEL_KEYFRAMES}`,
        "mushroom-alarm-control-panel-buttons-control$": `
      mushroom-button {
        --bg-color: rgba(var(--rgb-primary-text-color), 0.05) !important;
        --button-color: rgb(var(--rgb-primary-text-color)) !important;
        transition: all 0.2s ease;
      }
      mushroom-button:active {
        background-color: rgba(var(--rgb-primary-color), 0.2) !important;
      }`,
        // TEMPLATED: the state tuple, as vars only. The icon beat lives here because
        // ha-state-icon is SLOTTED — a shadow-side rule would never match it.
        ".": `
      ha-state-icon, ha-icon {
        position: relative; z-index: 2;
        transform-origin: center;
        display: inline-block;
        animation: var(--al-icon, none);
      }
      ${ALARM_ICON_KEYFRAMES}
      ha-card {
        {% set s = states(config.entity) %}
        {% if s == 'disarmed' %}
          --al-rgb: 76, 175, 80;
          --al-disc: shield-float 3s ease-in-out infinite;
          --al-inner: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.4), transparent);
          --al-inner-anim: sheen-scan 3s ease-in-out infinite;
          --al-outer: none; --al-outer-anim: none;
          --al-icon: breathe-slow 3s ease-in-out infinite;
          --al-card-speed: 2s;
        {% elif s == 'triggered' %}
          --al-rgb: 255, 87, 34;
          --al-disc: panic-strobe 0.5s steps(2) infinite;
          --al-inner: none; --al-inner-anim: none;
          --al-outer: block; --al-outer-anim: sonar-expand 0.5s linear infinite;
          --al-icon: violent-shake 0.1s linear infinite;
          --al-card-speed: 0.5s;
        {% elif s in ['arming', 'pending'] %}
          --al-rgb: 255, 152, 0;
          --al-disc: arming-breathe 1s ease-in-out infinite;
          --al-inner: none; --al-inner-anim: none;
          --al-outer: none; --al-outer-anim: none;
          --al-icon: breathe-medium 2s ease-in-out infinite;
          --al-card-speed: 1s;
        {% elif 'armed' in s %}
          --al-rgb: 244, 67, 54;
          --al-disc: none;
          --al-inner: conic-gradient(from 0deg, transparent 0%, rgba(var(--al-rgb), 0.6) 20%, transparent 40%);
          --al-inner-anim: radar-sweep 2s linear infinite;
          --al-outer: block; --al-outer-anim: sonar-expand 2s ease-out infinite;
          --al-icon: breathe-fast 2s ease-in-out infinite;
          --al-card-speed: 2s;
        {% else %}
          {# unavailable/unknown — grey and dead, never mistakable for "disarmed" #}
          --al-rgb: 158, 158, 158;
          --al-disc: none; --al-inner: none; --al-inner-anim: none;
          --al-outer: none; --al-outer-anim: none; --al-icon: none;
          --al-card-speed: 0s;
        {% endif %}
        --al-card-anim: {{ 'none' if s in ['unavailable', 'unknown'] else 'card-fill-pulse var(--al-card-speed, 2s) ease-in-out infinite alternate' }};
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
      }
      /* card-filling bloom, behind the content */
      ha-card::before {
        content: '';
        position: absolute; inset: 0; z-index: 0;
        background: radial-gradient(circle at center, rgba(var(--al-rgb, 158, 158, 158), 0.4) 0%, transparent 70%);
        opacity: 0;
        pointer-events: none;
        mix-blend-mode: screen;
        animation: var(--al-card-anim, none);
      }
      @keyframes card-fill-pulse {
        0%   { opacity: 0.1; transform: scale(0.8); }
        100% { opacity: 0.6; transform: scale(1.5); }
      }
      mushroom-shape-icon {
        --icon-size: 76px !important;
        display: flex; justify-content: center; align-items: center;
        margin: 12px 0 20px 0 !important;
        position: relative; z-index: 1;
      }`,
      } },
      grid_options: { columns: 12, rows: 3 },
    };
  },
});

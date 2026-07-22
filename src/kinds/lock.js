// upstream: README #6 - Lock
// Upstream binds its lock look to a *plug* (switch.plug_6_local) and only then branches on
// locked/locking/unlocked — so the interesting half of the design never fires. Rebuilt around
// a real `lock` entity: LOCKED is the resting state and is therefore QUIET (still shape, slow
// green halo); UNLOCKED tilts the shackle open in amber; locking/unlocking swings fast in blue;
// `jammed` gets its own red shudder; `unavailable` goes grey and dead (never "unlocked").
// Icon + colour flip with state, so this is a template-card → both icon structures below.

const LOCK_KEYFRAMES = `
      @keyframes lock-open {
        0%   { transform: rotate(10deg); }
        50%  { transform: rotate(18deg); }
        100% { transform: rotate(10deg); }
      }
      @keyframes lock-action {
        0%   { transform: rotate(-25deg) scale(0.96); }
        50%  { transform: rotate(25deg) scale(1.04); }
        100% { transform: rotate(-25deg) scale(0.96); }
      }
      @keyframes lock-jam {
        0%   { transform: translate(0, 0) rotate(0deg); }
        25%  { transform: translate(-3px, 1px) rotate(-6deg); }
        50%  { transform: translate(3px, -1px) rotate(6deg); }
        75%  { transform: translate(-2px, 0) rotate(-4deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      @keyframes lock-halo {
        0%   { opacity: 0.85; filter: brightness(1); }
        50%  { opacity: 1;    filter: brightness(1.4); }
        100% { opacity: 0.85; filter: brightness(1); }
      }`;

// Two nested glow rings (upstream's 3-layer "HUGE glow system", trimmed to what reads from a
// sofa). Stamped into both icon structures; halo defaults to the calm locked breath.
const lockIcon = (sel, extra = "") => `
      ${sel} {
        transform-origin: 50% 50%;
        position: relative;
        ${extra}
        opacity: var(--lk-op, 1);
        animation: var(--lk-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: inherit;
        pointer-events: none;
        animation: var(--lk-halo, lock-halo 4s ease-in-out infinite);
      }
      ${sel}::before {
        box-shadow:
          0 0 20px 6px rgba(var(--lk-rgb, 76, 175, 80), 0.85),
          0 0 48px 16px rgba(var(--lk-rgb, 76, 175, 80), 0.45);
      }
      ${sel}::after {
        inset: -16px;
        box-shadow: 0 0 90px 30px rgba(var(--lk-rgb, 76, 175, 80), 0.22);
      }
      ${LOCK_KEYFRAMES}`;

registerKind("lock", {
  label: "Animated Lock",
  desc: "Door lock — quiet green halo when locked, amber tilt when open, fast swing mid-turn, red shudder when jammed",
  domains: ["lock"],
  schema: [
    F.icon,
    { name: "open_icon", selector: { icon: {} } },
    { name: "locked_glow", selector: { text: {} } },
    { name: "unlocked_glow", selector: { text: {} } },
    { name: "moving_glow", selector: { text: {} } },
  ],
  help: {
    icon: "Icon shown while locked (default mdi:lock)",
    open_icon: "Icon shown while unlocked (default mdi:lock-open-variant)",
    locked_glow: "Locked halo as R, G, B (default 76, 175, 80)",
    unlocked_glow: "Unlocked halo as R, G, B (default 255, 152, 0)",
    moving_glow: "Locking/unlocking halo as R, G, B (default 33, 150, 243)",
  },
  docs: "Tap opens more-info rather than toggling — an accidental tap should never unlock a door. Use a hold/tap action on your own dashboard if you want one-tap locking.",
  make: (c) => {
    const icon = c.icon || "mdi:lock";
    const openIcon = c.open_icon || "mdi:lock-open-variant";
    const lockedGlow = c.locked_glow || "76, 175, 80";
    const unlockedGlow = c.unlocked_glow || "255, 152, 0";
    const movingGlow = c.moving_glow || "33, 150, 243";
    return {
      type: "custom:mushroom-template-card",
      entity: c.entity,
      primary: c.name || friendly(c.entity),
      secondary: `{% set s = states('${c.entity}') %}{% if s == 'locked' %}Locked{% elif s == 'unlocked' %}Unlocked{% elif s in ['locking', 'unlocking', 'opening'] %}{{ s | capitalize }}…{% elif s == 'jammed' %}⚠ Jammed{% else %}Unavailable{% endif %}`,
      icon: `{% if is_state('${c.entity}', 'locked') %}${icon}{% elif is_state('${c.entity}', 'jammed') %}mdi:lock-alert{% else %}${openIcon}{% endif %}`,
      icon_color: `{% set s = states('${c.entity}') %}{% if s == 'locked' %}green{% elif s == 'jammed' %}red{% elif s in ['locking', 'unlocking', 'opening'] %}blue{% elif s == 'unlocked' %}orange{% else %}grey{% endif %}`,
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": lockIcon(".shape"),
        "ha-tile-icon$": lockIcon(".container", "border-radius: 9999px;"),
        ".": `${clip}
      ha-card {
        {% set s = states(config.entity) %}
        {% if s == 'locked' %}
          --lk-rgb: ${lockedGlow}; --lk-anim: none;
          --lk-halo: lock-halo 4s ease-in-out infinite; --lk-op: 1;
        {% elif s in ['locking', 'unlocking', 'opening'] %}
          --lk-rgb: ${movingGlow}; --lk-anim: lock-action 0.7s ease-in-out infinite;
          --lk-halo: lock-halo 0.7s ease-in-out infinite; --lk-op: 1;
        {% elif s == 'jammed' %}
          --lk-rgb: 244, 67, 54; --lk-anim: lock-jam 0.5s linear infinite;
          --lk-halo: lock-halo 0.5s ease-in-out infinite; --lk-op: 1;
        {% elif s == 'unlocked' %}
          --lk-rgb: ${unlockedGlow}; --lk-anim: lock-open 1.6s ease-in-out infinite;
          --lk-halo: lock-halo 2.4s ease-in-out infinite; --lk-op: 1;
        {% else %}
          {# unavailable/unknown: dead grey, no halo — a dark card must not read as "unlocked" #}
          --lk-rgb: 120, 120, 120; --lk-anim: none; --lk-halo: none; --lk-op: 0.4;
        {% endif %}
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

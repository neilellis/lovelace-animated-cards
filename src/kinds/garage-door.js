// upstream: README #29 - Garage Door (variant `pulse`) and README #45 - Garage Door (variant `status`)
//
// One kind, two upstream looks:
//   pulse  (#29) — quiet while shut; a scaling ring pulse radiates while the door is open.
//   status (#45) — a full state machine: green with a slow sheen when closed, red heartbeat +
//                  ripple ring + breathing icon when open, orange with a nudging icon while moving.
// Upstream #29's dead `motion-scan` keyframes are pruned; #45's `.shape[style*="…"]::before`
// selector hack (it sniffs its own inline style to start the sheen) becomes a plain CSS var,
// and its `smooth-flow` keyframe — which re-declared the `background` shorthand every frame —
// becomes a speed change on the shared heartbeat, per "speed is the state signal".
// mushroom-cover-card uses the legacy shape structure → no ha-tile-icon mirror.

const GD_PULSE_FX = `
      .shape {
        transform-origin: 50% 50%;
        opacity: var(--gd-op, 0.7);
        animation: var(--gd-anim, none);
      }
      @keyframes gd-pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(var(--gd-rgb, 33, 150, 243), 0.9), 0 0 0 0 rgba(var(--gd-rgb, 33, 150, 243), 0.4);
        }
        40% {
          transform: scale(1.06);
          box-shadow: 0 0 0 6px rgba(var(--gd-rgb, 33, 150, 243), 0.5), 0 0 0 12px rgba(var(--gd-rgb, 33, 150, 243), 0.2);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 16px rgba(var(--gd-rgb, 33, 150, 243), 0), 0 0 0 24px rgba(var(--gd-rgb, 33, 150, 243), 0);
        }
      }`;

// STATIC: defaults describe a CLOSED door (green, slow sheen, no ring) — the base-rate truth.
const GD_STATUS_FX = `
      .shape {
        position: relative;
        overflow: visible !important;
        border-radius: 16px !important;
        background-color: rgba(var(--gd-rgb, 76, 175, 80), 0.2) !important;
        --shape-color: transparent !important;
        --icon-color: rgb(var(--gd-rgb, 76, 175, 80)) !important;
        color: rgb(var(--gd-rgb, 76, 175, 80)) !important;
        transition: background-color 0.5s ease, box-shadow 0.5s ease;
        animation: var(--gd-anim, none);
      }
      .shape::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.2) 50%, transparent 80%);
        background-size: 200% 100%;
        pointer-events: none;
        animation: var(--gd-sheen, gd-sheen 6s ease-in-out infinite);
      }
      .shape::after {
        content: '';
        display: var(--gd-ring, none);
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: rgba(var(--gd-rgb, 76, 175, 80), 0.8);
        z-index: -1;
        animation: gd-ripple 1s ease-out infinite;
      }
      @keyframes gd-sheen {
        0%, 100% { background-position: 150% 0; }
        50%      { background-position: -50% 0; }
      }
      @keyframes gd-beat {
        0%   { transform: scale(1);    box-shadow: 0 0 10px rgba(var(--gd-rgb, 76, 175, 80), 0.2); }
        50%  { transform: scale(1.03); box-shadow: 0 0 25px rgba(var(--gd-rgb, 76, 175, 80), 0.55); }
        100% { transform: scale(1);    box-shadow: 0 0 10px rgba(var(--gd-rgb, 76, 175, 80), 0.2); }
      }
      @keyframes gd-ripple {
        0%   { transform: scale(1);   opacity: 0.6; }
        100% { transform: scale(1.8); opacity: 0; }
      }`;

const garageDoorCard = (c) => {
  const status = c.variant === "status";
  const base = {
    type: "custom:mushroom-cover-card",
    entity: c.entity,
    ...(c.name ? { name: c.name } : {}),
    ...(c.icon ? { icon: c.icon } : {}),
    show_buttons_control: true,
    show_position_control: true,
    fill_container: false,
    grid_options: { columns: 12, rows: 2 },
  };
  if (!status) {
    const glow = c.glow || "33, 150, 243";
    const speed = c.speed || "1.4s";
    const active = c.active || "open";
    return { ...base, card_mod: { style: {
      "mushroom-shape-icon$": GD_PULSE_FX,
      ".": `${clip}
      ha-card {
        {% set on = states(config.entity) == '${active}' %}
        --gd-rgb: ${glow};
        --gd-anim: {{ 'gd-pulse ${speed} linear infinite' if on else 'none' }};
        --gd-op: {{ '1' if on else '0.7' }};
      }`,
    } } };
  }
  const closed = c.closed_glow || "76, 175, 80";
  const open = c.open_glow || "244, 67, 54";
  const moving = c.moving_glow || "255, 152, 0";
  return { ...base, card_mod: { style: {
    "mushroom-shape-icon$": GD_STATUS_FX,
    // icon motion lives here: ha-state-icon is SLOTTED, so a shadow-block rule never matches it
    ".": `${clip}
      ha-state-icon, ha-icon {
        transform-origin: 50% 50%;
        display: inline-block;
        animation: var(--gd-icon, none);
      }
      @keyframes gd-icon-pulse {
        0%   { transform: scale(1);   filter: drop-shadow(0 0 0 rgba(var(--gd-rgb), 0)); }
        50%  { transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(var(--gd-rgb), 0.6)); }
        100% { transform: scale(1);   filter: drop-shadow(0 0 0 rgba(var(--gd-rgb), 0)); }
      }
      @keyframes gd-nudge {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-3px); }
      }
      ha-card {
        {% set s = states(config.entity) %}
        {% if s == 'closed' %}
          --gd-rgb: ${closed};
          --gd-anim: none;
          --gd-sheen: gd-sheen 6s ease-in-out infinite;
          --gd-ring: none;
          --gd-icon: none;
        {% elif s == 'open' %}
          --gd-rgb: ${open};
          --gd-anim: gd-beat 3s ease-in-out infinite;
          --gd-sheen: none;
          --gd-ring: block;
          --gd-icon: gd-icon-pulse 3s ease-in-out infinite;
        {% elif s in ['opening', 'closing'] %}
          --gd-rgb: ${moving};
          --gd-anim: gd-beat 1.2s ease-in-out infinite;
          --gd-sheen: none;
          --gd-ring: none;
          --gd-icon: gd-nudge 1s ease-in-out infinite;
        {% else %}
          {# unavailable/unknown: dead grey, nothing moving — never a plausible "closed" #}
          --gd-rgb: 120, 126, 134;
          --gd-anim: none;
          --gd-sheen: none;
          --gd-ring: none;
          --gd-icon: none;
          opacity: 0.55;
        {% endif %}
      }`,
  } } };
};

registerKind("garage-door", {
  label: "Animated Garage Door",
  desc: "Cover card — ring pulse while open, or a green/red/orange closed-open-moving state machine",
  domains: ["cover"],
  deviceClass: ["garage", "door", "gate"],
  schema: [
    F.variant(["pulse", "status"]),
    F.icon,
    F.glow,
    F.speed,
    F.active,
    { name: "closed_glow", selector: { text: {} } },
    { name: "open_glow", selector: { text: {} } },
    { name: "moving_glow", selector: { text: {} } },
  ],
  help: {
    variant: "pulse = upstream #29 (quiet closed, ring pulse open); status = upstream #45 (three-colour state machine)",
    glow: "pulse variant: ring colour as R, G, B (default 33, 150, 243)",
    speed: "pulse variant: ring period, e.g. 1.4s",
    active: "pulse variant: state that counts as open (default: open)",
    closed_glow: "status variant: closed colour as R, G, B (default 76, 175, 80)",
    open_glow: "status variant: open colour as R, G, B (default 244, 67, 54)",
    moving_glow: "status variant: opening/closing colour as R, G, B (default 255, 152, 0)",
  },
  docs: "The `status` variant reads the cover's own states (`closed` / `open` / `opening` / `closing`); anything else — including `unavailable` — renders dead grey and still rather than faking a closed door. The `pulse` variant only needs an open state, so it also suits covers that report position only.",
  make: garageDoorCard,
});

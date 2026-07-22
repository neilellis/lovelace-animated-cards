// upstream: README #8 - Doorbell
// Three expanding shockwave rings + a bell-jolt while the button is pressed; dead still the
// rest of the time (the whole point: a doorbell's alert must be rare enough to mean something).
// Upstream binds it to a plug and shows only the entity's state; a ding sensor is `on` for a
// second or two, so the useful readout is "how long ago" — that needs a computed secondary,
// hence a template-card and both icon structures.

const DOORBELL_KEYFRAMES = `
      @keyframes doorbell-ring {
        0% {
          transform: scale(1.05);
          box-shadow: 0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 1),
                      0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 0.8),
                      0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 0.4);
        }
        30% {
          transform: scale(0.95);
          box-shadow: 0 0 0 4px rgba(var(--db-rgb, 244, 67, 54), 0.9),
                      0 0 0 10px rgba(var(--db-rgb, 244, 67, 54), 0.7),
                      0 0 0 18px rgba(var(--db-rgb, 244, 67, 54), 0.4);
        }
        60% {
          transform: scale(1.02);
          box-shadow: 0 0 0 10px rgba(var(--db-rgb, 244, 67, 54), 0),
                      0 0 0 18px rgba(var(--db-rgb, 244, 67, 54), 0.2),
                      0 0 0 26px rgba(var(--db-rgb, 244, 67, 54), 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 0),
                      0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 0),
                      0 0 0 0 rgba(var(--db-rgb, 244, 67, 54), 0);
        }
      }`;

// Default `none` — nobody is at the door 99.99 % of the time, so that's the honest pre-template
// picture. (Upstream's unused `doorbell-idle` keyframe is pruned: copy-paste residue.)
const doorbellIcon = (sel, extra = "") => `
      ${sel} {
        transform-origin: 50% 50%;
        ${extra}
        opacity: var(--ig-op, 1);
        animation: var(--db-anim, none);
      }
      ${DOORBELL_KEYFRAMES}`;

registerKind("doorbell", {
  label: "Animated Doorbell",
  desc: "Bell jolts and throws expanding rings while the button is pressed; silent and still otherwise",
  domains: ["binary_sensor", "event", "switch", "input_boolean"],
  deviceClass: ["sound", "occupancy", "motion", "doorbell"],
  schema: [F.icon, F.color, F.glow, F.speed, F.active],
  help: {
    icon: "Default mdi:bell",
    color: "Icon colour while idle (default blue-grey) — ringing always goes red",
    glow: "Ring colour as R, G, B (default 244, 67, 54)",
    speed: "Ring duration (default 0.9s)",
    active: "State that counts as ringing (default: on)",
  },
  docs: "Bind the doorbell's *ding* sensor (e.g. Ring's `binary_sensor.<door>_ding`), not the camera or the chime switch — the card's secondary line reads \"x ago\" from that entity's last state change.",
  make: (c) => {
    const icon = c.icon || "mdi:bell";
    const color = c.color || "blue-grey";
    const glow = c.glow || "244, 67, 54";
    const speed = c.speed || "0.9s";
    const active = c.active || "on";
    return {
      type: "custom:mushroom-template-card",
      entity: c.entity,
      primary: c.name || friendly(c.entity),
      // `states[...]` can be None for a removed entity — an unguarded .last_changed would raise
      // and take the whole style block down with it.
      secondary: `{% set o = states['${c.entity}'] %}{% if o is none or o.state in ['unavailable', 'unknown'] %}Unavailable{% elif o.state == '${active}' %}Ringing now{% else %}{{ relative_time(o.last_changed) }} ago{% endif %}`,
      icon: `{{ 'mdi:bell-ring' if is_state('${c.entity}', '${active}') else '${icon}' }}`,
      icon_color: `{{ 'red' if is_state('${c.entity}', '${active}') else '${color}' }}`,
      layout: "vertical", fill_container: true,
      tap_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": doorbellIcon(".shape"),
        "ha-tile-icon$": doorbellIcon(".container", "border-radius: 9999px;"),
        ".": `${clip}
      ha-card {
        {% set ringing = is_state(config.entity, '${active}') %}
        --db-rgb: ${glow};
        --db-anim: {{ 'doorbell-ring ${speed} ease-out infinite' if ringing else 'none' }};
        --ig-op: {{ '1' if ringing else '0.75' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

// upstream: README #72 - MailBox
//
// An envelope drops through the icon disc while there's post waiting, the icon itself waves
// like a raised flag, and a status bar glows along the bottom edge. Upstream stacks a
// mushroom-chips-card on top for the "ARRIVED AT 09:14" tap-to-clear chip; that chip is an
// `input_boolean.turn_off` call, so it only makes sense for helper-driven mailboxes — here it
// is opt-in (`clear_chip`) and only rendered for `input_boolean` entities.
//
// Empty is the base rate, so the drop animation defaults to `display: none` and the icon to
// still: the pre-template beat shows a quiet mailbox, not a phantom delivery.

registerKind("mailbox", {
  label: "Animated Mailbox",
  desc: "Envelope drops into the icon and the flag waves while post is waiting; glowing status bar",
  domains: ["input_boolean", "binary_sensor", "sensor", "switch"],
  schema: [
    F.icon,
    F.active,
    { name: "mail_color", selector: { text: {} } },
    { name: "empty_color", selector: { text: {} } },
    { name: "mail_text", selector: { text: {} } },
    { name: "empty_text", selector: { text: {} } },
    { name: "clear_chip", selector: { boolean: {} } },
  ],
  help: {
    icon: "Default mdi:mailbox",
    active: "State that means post is waiting (default: on)",
    mail_color: "Colour while post is waiting as R, G, B (default 255, 190, 50)",
    empty_color: "Colour while empty as R, G, B (default 158, 158, 158)",
    mail_text: "Badge text while post is waiting (default YOU'VE GOT MAIL)",
    empty_text: "Badge text while empty (default NO MAIL)",
    clear_chip: "Add upstream's arrival-time chip — tapping it clears the flag (input_boolean only)",
  },
  docs: "Built for a helper you set from an automation (`input_boolean.mail_arrived`) or a " +
    "mailbox contact sensor. The optional clear chip calls `input_boolean.turn_off`, so it is " +
    "only offered when the entity is an `input_boolean`.",
  make: (c) => {
    const active = c.active || "on";
    const mailRgb = c.mail_color || "255, 190, 50";
    const emptyRgb = c.empty_color || "158, 158, 158";
    // apostrophes are fine inside a CSS content: "…" string, but not inside the single-quoted
    // Jinja literal, so the badge text is baked in at build time rather than templated
    const mailText = (c.mail_text || "YOU'VE GOT MAIL").replace(/"/g, "'");
    const emptyText = (c.empty_text || "NO MAIL").replace(/"/g, "'");

    const card = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Mailbox",
      icon: c.icon || "mdi:mailbox",
      icon_color: "orange",
      primary_info: "name", secondary_info: "none",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        // STATIC: envelope geometry + both keyframes live in the icon's shadow root; only the
        // colour, the drop's display and the flag wave come down as vars.
        "mushroom-shape-icon$": `
      .shape {
        --icon-size: 65px !important;
        background: rgba(var(--mb-color, ${emptyRgb}), 0.15) !important;
        position: relative;
        overflow: hidden;
        transition: background 0.3s ease;
      }
      /* the envelope — a white block with two corner gradients faking the flap */
      .shape::before {
        content: '';
        display: var(--mb-drop, none);
        position: absolute;
        width: 28px; height: 18px;
        left: calc(50% - 14px);
        background: #fff;
        border-radius: 3px;
        background-image:
          linear-gradient(135deg, transparent 50%, #ccc 50%),
          linear-gradient(225deg, transparent 50%, #ccc 50%);
        background-size: 50% 100%;
        background-repeat: no-repeat;
        background-position: 0 0, 100% 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
        animation: mb-drop 1.5s ease-in-out infinite;
      }
      ha-icon {
        color: rgb(var(--mb-color, ${emptyRgb})) !important;
        transition: color 0.3s ease;
        animation: var(--mb-wave, none);
        z-index: 2;
      }
      @keyframes mb-drop {
        0%   { top: -30px; opacity: 0; transform: rotate(-10deg); }
        30%  { opacity: 1; transform: rotate(0deg); }
        60%  { top: 50%; opacity: 1; transform: rotate(5deg); }
        100% { top: 65%; opacity: 0; transform: rotate(0deg); }
      }
      @keyframes mb-wave {
        0%, 100% { transform: rotate(0deg); }
        25%      { transform: rotate(-10deg); }
        75%      { transform: rotate(5deg); }
      }`,
        ".": `
      ha-card {
        {% set mail = is_state(config.entity, '${active}') %}
        {% set dead = states(config.entity) in ['unavailable', 'unknown'] %}
        --mb-color: {{ '${emptyRgb}' if dead else ('${mailRgb}' if mail else '${emptyRgb}') }};
        --mb-badge: {{ '"${mailText}"' if mail else '"${emptyText}"' }};
        --mb-drop: {{ 'block' if mail else 'none' }};
        --mb-wave: {{ 'mb-wave 2s ease-in-out infinite' if mail else 'none' }};
        opacity: {{ '0.55' if dead else '1' }};
        background: var(--card-background-color, #1c1c1c);
        border-radius: var(--ha-card-border-radius, 12px) !important;
        overflow: hidden;
        position: relative;
        transition: all 0.5s ease;
      }
      /* upstream defines --mb-badge and never consumes it (dead code); wire it to a real badge */
      ha-card::before {
        content: var(--mb-badge, "${emptyText}");
        position: absolute; top: 10px; right: 10px; z-index: 2;
        font-size: 10px; font-weight: 900; letter-spacing: 0.5px;
        color: rgb(var(--mb-color, ${emptyRgb}));
        background: rgba(var(--mb-color, ${emptyRgb}), 0.15);
        border: 1px solid rgba(var(--mb-color, ${emptyRgb}), 0.3);
        padding: 2px 8px; border-radius: 6px;
        pointer-events: none;
      }
      /* status bar along the bottom edge — always present, colour is the state signal */
      ha-card::after {
        content: '';
        position: absolute; bottom: 0; left: 0;
        height: 4px; width: 100%;
        background: rgb(var(--mb-color, ${emptyRgb}));
        box-shadow: 0 0 15px rgb(var(--mb-color, ${emptyRgb}));
        transition: background 0.5s ease, box-shadow 0.5s ease;
        z-index: 1;
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };

    if (!c.clear_chip || !String(c.entity || "").startsWith("input_boolean.")) return card;

    // upstream's overlay chip: arrival time + tap-to-clear, shaking gently while mail is waiting
    return {
      type: "custom:vertical-stack-in-card",
      cards: [card, {
        type: "custom:mushroom-chips-card",
        alignment: "center",
        chips: [{
          type: "template",
          entity: c.entity,
          content: `{% if is_state(entity, '${active}') %}ARRIVED AT {{ as_timestamp(states[entity].last_changed) | timestamp_custom('%H:%M') }}{% else %}${emptyText}{% endif %}`,
          icon: `{{ 'mdi:mailbox-up' if is_state(entity, '${active}') else 'mdi:mailbox-outline' }}`,
          icon_color: `{{ 'orange' if is_state(entity, '${active}') else 'grey' }}`,
          tap_action: { action: "call-service", service: "input_boolean.turn_off", target: { entity_id: c.entity } },
          card_mod: { style: `
            ha-card {
              transition: all 0.3s ease;
              {% if is_state(config.entity, '${active}') %}
                background: rgba(255, 165, 0, 0.15) !important;
                border: 1px solid rgba(255, 165, 0, 0.5) !important;
                animation: mb-shake 2s ease-in-out infinite;
              {% else %}
                background: transparent !important;
                border: 1px solid rgba(158, 158, 158, 0.4) !important;
              {% endif %}
            }
            @keyframes mb-shake {
              0%, 100% { transform: rotate(0deg); }
              5%       { transform: rotate(5deg); }
              10%      { transform: rotate(-5deg); }
              15%      { transform: rotate(5deg); }
              20%      { transform: rotate(0deg); }
            }` },
        }],
        card_mod: { style: { ".": `
          ha-card {
            --chip-font-size: 11px;
            --chip-border-radius: 10px;
            --chip-height: 30px;
            margin: 8px 12px;
            position: absolute; top: 15px; right: 5px;
          }` } },
      }],
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

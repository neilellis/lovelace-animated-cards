// upstream: README #53 - Alarmo (Requires card-mod v3.4.6)
// The Alarmo keypad card, lit from the inside: a state-coloured inset glow that breathes when
// disarmed, pulses when armed or arming, and strobes when triggered. Separate from the `alarm`
// kind because it renders a completely different card (`custom:alarmo-card`, its own HACS
// install) — the shared bit is only the state machine.
//
// Two upstream problems fixed: the keyframes interpolated the Jinja-computed `{{ color }}`
// directly, so every state change rewrote the keyframe bodies and restarted the animation
// mid-cycle; and the animation declaration itself was templated. Here the keyframes are static
// and consume `--alarmo-rgb`, and the host rule only swaps `--alarmo-rgb` / `--alarmo-anim`.

registerKind("alarmo", {
  label: "Animated Alarmo Keypad",
  desc: "Alarmo keypad card with a state-coloured inner glow — breathing disarmed, pulsing armed, strobing triggered",
  domains: ["alarm_control_panel"],
  schema: [
    { name: "keep_keypad_visible", selector: { boolean: {} } },
    { name: "disarmed_glow", selector: { text: {} } },
    { name: "armed_glow", selector: { text: {} } },
    { name: "triggered_glow", selector: { text: {} } },
    { name: "pending_glow", selector: { text: {} } },
  ],
  help: {
    keep_keypad_visible: "Show the keypad even while disarmed (alarmo-card option)",
    disarmed_glow: "Disarmed glow as R, G, B (default 0, 255, 100)",
    armed_glow: "Armed-away glow as R, G, B (default 244, 67, 54) — armed_home stays blue",
    triggered_glow: "Triggered glow as R, G, B (default 255, 0, 0)",
    pending_glow: "Arming/pending glow as R, G, B (default 255, 152, 0)",
  },
  docs: "Needs the **Alarmo** integration plus its `custom:alarmo-card` frontend card, and **card-mod ≥ 3.4.6** — earlier card-mod cannot style non-Mushroom custom cards, and the card silently renders unstyled. `card_mod.style` here is a plain string (not the per-element map the Mushroom kinds use) for the same reason. If you only have a stock `alarm_control_panel`, use the `alarm` kind instead.",
  make: (c) => ({
    type: "custom:alarmo-card",
    entity: c.entity,
    ...(c.name ? { name: c.name } : {}),
    keep_keypad_visible: c.keep_keypad_visible !== false,
    card_mod: {
      // one flat string: alarmo-card is not a Mushroom card, so there is no shadow scope to
      // pierce — keyframes and consumer must share this single block anyway.
      style: `
      ha-card {
        {% set s = states(config.entity) %}
        {% if s == 'disarmed' %}
          --alarmo-rgb: ${c.disarmed_glow || "0, 255, 100"};
          --alarmo-anim: glow-breathe 4s ease-in-out infinite;
        {% elif s == 'triggered' %}
          --alarmo-rgb: ${c.triggered_glow || "255, 0, 0"};
          --alarmo-anim: glow-strobe 0.5s linear infinite;
        {% elif s == 'armed_home' %}
          --alarmo-rgb: 0, 191, 255;
          --alarmo-anim: glow-pulse 3s ease-in-out infinite;
        {% elif 'armed' in s %}
          --alarmo-rgb: ${c.armed_glow || "244, 67, 54"};
          --alarmo-anim: glow-pulse 3s ease-in-out infinite;
        {% elif s in ['arming', 'pending'] %}
          --alarmo-rgb: ${c.pending_glow || "255, 152, 0"};
          --alarmo-anim: glow-pulse 1s ease-in-out infinite;
        {% else %}
          {# unavailable/unknown: dead grey and still — a dark keypad is not a disarmed one #}
          --alarmo-rgb: 158, 158, 158;
          --alarmo-anim: none;
        {% endif %}
        /* keep HA's own card shadow in every shadow list, or it flickers away mid-animation */
        box-shadow: var(--ha-card-box-shadow, none), inset 0 0 20px rgba(var(--alarmo-rgb, 158, 158, 158), 0.2);
        animation: var(--alarmo-anim, none);
        transition: box-shadow 1s ease;
      }
      @keyframes glow-breathe {
        0%   { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 10px rgba(var(--alarmo-rgb, 158, 158, 158), 0.1); }
        50%  { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 60px rgba(var(--alarmo-rgb, 158, 158, 158), 0.4); }
        100% { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 10px rgba(var(--alarmo-rgb, 158, 158, 158), 0.1); }
      }
      @keyframes glow-pulse {
        0%   { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 20px rgba(var(--alarmo-rgb, 158, 158, 158), 0.2); }
        50%  { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 50px rgba(var(--alarmo-rgb, 158, 158, 158), 0.6); }
        100% { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 20px rgba(var(--alarmo-rgb, 158, 158, 158), 0.2); }
      }
      @keyframes glow-strobe {
        0%   { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 10px rgba(var(--alarmo-rgb, 158, 158, 158), 0.1); background: transparent; }
        50%  { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 100px rgba(var(--alarmo-rgb, 158, 158, 158), 0.9); background: rgba(var(--alarmo-rgb, 158, 158, 158), 0.1); }
        100% { box-shadow: var(--ha-card-box-shadow, none), inset 0 0 10px rgba(var(--alarmo-rgb, 158, 158, 158), 0.1); background: transparent; }
      }`,
    },
    // deliberately taller than the 12×2-3 house rule: a keypad with 12 buttons needs the rows
    grid_options: { columns: 12, rows: 4 },
  }),
});

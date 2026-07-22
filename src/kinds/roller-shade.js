// upstream: README #73 - Roller shade
//
// The curtain card's sibling, rotated 90°: the card draws the window on the right and a single
// slatted blind rolls down over it. Position is a TRANSITIONED `background-size` (one panel,
// `100% var(--rs-height)`), not a keyframe — the glide comes from the transition, so a move
// reads as fabric sliding rather than a number snapping. The icon pulses only while the motor
// is actually running; a settled blind is a still picture.
//
// Upstream's `closed_pct = 110 - pos` fudge is kept: oversizing the drawing by 10 % makes
// "fully closed" visually overshoot the frame, which reads right even though it isn't literal.
// `unavailable` gets its own dead grey look — otherwise a dropped cover reports position 0 and
// cosplays as fully closed.

registerKind("roller-shade", {
  label: "Animated Roller Shade",
  desc: "Draws the window — a slatted blind rolls down with position, glass fades day→night",
  domains: ["cover"],
  deviceClass: ["shade", "blind", "shutter", "awning", "window"],
  schema: [
    F.icon,
    { name: "slat", selector: { text: {} } },
    { name: "slat_shadow", selector: { text: {} } },
    { name: "pane_open", selector: { text: {} } },
    { name: "pane_shut", selector: { text: {} } },
    { name: "window_width", selector: { text: {} } },
    { name: "height", selector: { text: {} } },
  ],
  help: {
    slat: "Slat colour (CSS, default #e0e0e0)",
    slat_shadow: "Line between slats (default #bdbdbd)",
    pane_open: "Glass colour when open (default #4fc3f7)",
    pane_shut: "Glass colour when shut (default #263238)",
    window_width: "Window pane width (CSS, default 35%)",
    height: "Card height (CSS, default 100px)",
  },
  make: (c) => {
    const slat = c.slat || "#e0e0e0";
    const slatShadow = c.slat_shadow || "#bdbdbd";
    const paneOpen = c.pane_open || "#4fc3f7";
    const paneShut = c.pane_shut || "#263238";
    const w = c.window_width || "35%";
    const h = c.height || "100px";
    return {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Roller shade",
      ...(c.icon ? { icon: c.icon } : {}),
      icon_color: "white",
      primary_info: "name", secondary_info: "state",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        // STATIC: the keyframe lives in the icon's shadow root; --rs-anim defaults to none
        // because a blind is parked almost all of the time.
        "mushroom-shape-icon$": `
      .shape {
        --icon-size: 60px !important;
        animation: var(--rs-anim, none);
      }
      @keyframes rs-pulse {
        0%, 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(var(--rgb-state-cover, 255, 152, 0), 0.7); }
        50%      { transform: scale(1);   box-shadow: 0 0 10px 0 rgba(var(--rgb-state-cover, 255, 152, 0), 1); }
      }`,
        "mushroom-state-info$": `
      .container { margin-left: 0 !important; }`,
        ".": `
      ha-card {
        {% set s = states(config.entity) %}
        {% set dead = s in ['unavailable', 'unknown'] %}
        {% set pos = state_attr(config.entity, 'current_position') | int(0) %}
        {% set pos = [[pos, 0] | max, 100] | min %}
        /* 110 - pos: deliberately oversized so a fully-shut blind overshoots the frame */
        --rs-height: {{ 110 - pos }}%;
        --rs-pane: {{ '#2b3138' if dead else ('${paneShut}' if pos < 10 else '${paneOpen}') }};
        --rs-slat: {{ '#6b7280' if dead else '${slat}' }};
        --rs-slat-shadow: {{ '#565e6b' if dead else '${slatShadow}' }};
        --rs-anim: {{ 'rs-pulse 1.5s ease-in-out infinite' if s in ['opening', 'closing'] else 'none' }};
        opacity: {{ '0.55' if dead else '1' }};
        /* keep the name/state clear of the window drawing */
        padding-right: calc(${w} + 10px) !important;
        position: relative;
        height: ${h} !important;
        transition: height 0.4s;
      }
      /* the window: glass colour behind, slats drawn as a repeating gradient sized by position */
      ha-card::after {
        content: '';
        position: absolute; top: 12px; bottom: 12px; right: 12px;
        width: ${w};
        border-radius: 8px;
        box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
        background-color: var(--rs-pane, ${paneShut});
        background-image:
          linear-gradient(to top, #fff 4px, transparent 4px),
          repeating-linear-gradient(to bottom,
            var(--rs-slat) 0px, var(--rs-slat) 6px,
            var(--rs-slat-shadow) 6px, var(--rs-slat-shadow) 7px,
            transparent 7px, transparent 9px);
        background-size: 100% var(--rs-height, 10%);
        background-repeat: no-repeat;
        transition: background-size 0.8s cubic-bezier(0.25, 1, 0.5, 1), background-color 1s ease;
      }
      /* glass reflection, above the slats so the pane reads as glazed */
      ha-card::before {
        content: '';
        position: absolute; top: 12px; bottom: 12px; right: 12px;
        width: ${w};
        border-radius: 8px;
        background: linear-gradient(120deg, rgba(255, 255, 255, 0.2) 0%, transparent 40%);
        pointer-events: none;
        z-index: 2;
      }`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

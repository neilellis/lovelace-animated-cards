// badge.js — the badge/button maker.
// upstream: badge_maker #1 - Custom Button/Badge Card (state match)
// upstream: badge_maker #5 - Custom Button/Badge Card (numeric thresholds)
//
// Both upstream files are the SAME card — a one-chip `mushroom-chips-card` styled into a pill —
// differing only in how "active" is decided (state in a list vs a numeric threshold). Here
// that's one kind: set `below`/`above` and it switches to numeric mode, otherwise it matches
// `active_states`. badge_maker #2/#3/#4 and #6/#7 are the icon / icon-colour / content template
// snippets for the chip — they're the `icon`, `icon_color` and `content` options below.
//
// ⚠️ Deviation from upstream: upstream GENERATES its keyframes in Jinja (a for-loop emitting
// N beats plus a pause, keyed on the entity id). That breaks the bundle's instant-animation
// contract twice over — the block can't paint until the template round-trips, and every state
// change rewrites the `@keyframes` body, restarting the animation. Here each animation is a
// STATIC keyframe set that does its motion in the first ~20 % of the cycle and rests for the
// remainder, so `speed` alone tunes beat-plus-pause and only the on/off var flips at runtime.

const BADGE_ANIMS = {
  none: "",
  pulse: `
      @keyframes badge-pulse {
        0%        { transform: scale3d(1, 1, 1); }
        8%        { transform: scale3d(1.15, 1.15, 1); }
        16%, 100% { transform: scale3d(1, 1, 1); }
      }`,
  heartbeat: `
      @keyframes badge-heartbeat {
        0%        { transform: scale3d(1, 1, 1); }
        5%        { transform: scale3d(1.15, 1.15, 1); }
        10%       { transform: scale3d(1, 1, 1); }
        15%       { transform: scale3d(1.15, 1.15, 1); }
        20%, 100% { transform: scale3d(1, 1, 1); }
      }`,
  shake: `
      @keyframes badge-shake {
        0%        { transform: rotateZ(0deg); }
        5%        { transform: rotateZ(-10deg); }
        15%       { transform: rotateZ(10deg); }
        20%, 100% { transform: rotateZ(0deg); }
      }`,
  swing: `
      @keyframes badge-swing {
        0%        { transform: rotateZ(0deg); }
        6%        { transform: rotateZ(15deg); }
        12%       { transform: rotateZ(-10deg); }
        18%, 100% { transform: rotateZ(0deg); }
      }`,
  wobble: `
      @keyframes badge-wobble {
        0%        { transform: translate3d(0, 0, 0); }
        6%        { transform: translate3d(-15%, 0, 0) rotateZ(-5deg); }
        12%       { transform: translate3d(10%, 0, 0) rotateZ(3deg); }
        18%, 100% { transform: translate3d(0, 0, 0); }
      }`,
  flash: `
      @keyframes badge-flash {
        0%        { opacity: 1; }
        8%        { opacity: 0; }
        16%, 100% { opacity: 1; }
      }`,
  vibrate: `
      @keyframes badge-vibrate {
        0%        { transform: translate3d(0, 0, 0); }
        3%        { transform: translate3d(-2px, 2px, 0); }
        6%        { transform: translate3d(-2px, -2px, 0); }
        9%        { transform: translate3d(2px, 2px, 0); }
        12%       { transform: translate3d(2px, -2px, 0); }
        15%, 100% { transform: translate3d(0, 0, 0); }
      }`,
};

registerKind("badge", {
  label: "Animated Badge / Button",
  desc: "Configurable chip pill — colours, icon and animation flip on a state match or threshold",
  domains: ["sensor", "binary_sensor", "switch", "light", "input_boolean", "person", "device_tracker", "cover", "lock", "climate", "media_player"],
  schema: [
    F.icon,
    { name: "content", selector: { text: {} } },
    { name: "icon_color", selector: { select: { mode: "dropdown", custom_value: true, options: MUSHROOM_COLORS } } },
    { name: "active_states", selector: { text: {} } },
    { name: "below", selector: { number: { step: 0.1, mode: "box" } } },
    { name: "above", selector: { number: { step: 0.1, mode: "box" } } },
    { name: "animation", selector: { select: { mode: "dropdown", options: Object.keys(BADGE_ANIMS) } } },
    { name: "always_animate", selector: { boolean: {} } },
    F.speed,
    { name: "active_bg", selector: { text: {} } },
    { name: "active_fg", selector: { text: {} } },
    { name: "active_border", selector: { text: {} } },
    { name: "active_opacity", selector: { number: { min: 0, max: 1, step: 0.05, mode: "box" } } },
    { name: "inactive_bg", selector: { text: {} } },
    { name: "inactive_fg", selector: { text: {} } },
    { name: "inactive_border", selector: { text: {} } },
    { name: "inactive_opacity", selector: { number: { min: 0, max: 1, step: 0.05, mode: "box" } } },
    { name: "overlay", selector: { boolean: {} } },
    { name: "position", selector: { select: { mode: "dropdown", options: ["top-right", "top-left", "bottom-right", "bottom-left"] } } },
    { name: "offset_y", selector: { text: {} } },
    { name: "offset_x", selector: { text: {} } },
    { name: "icon_size", selector: { text: {} } },
    { name: "text_size", selector: { text: {} } },
    { name: "radius", selector: { text: {} } },
    { name: "border_width", selector: { text: {} } },
  ],
  help: {
    content: "Badge text — plain text or a template, e.g. {{ states(entity) }}. Leave empty for a round icon-only badge",
    icon: "Icon, or a template: {% if states(entity) == 'on' %}mdi:bell{% else %}mdi:bell-off{% endif %}",
    icon_color: "Optional Mushroom colour (or template) for the icon; leave empty to use the active/inactive colours below",
    active_states: "Comma-separated states that count as active (default: on). Ignored when a threshold is set",
    below: "Numeric mode — active at or below this value",
    above: "Numeric mode — active at or above this value",
    animation: "Motion while active: pulse, heartbeat, shake, swing, wobble, flash, vibrate (default none)",
    always_animate: "Animate even while inactive (default off — idle should be quiet)",
    speed: "One beat-plus-pause cycle, e.g. 2s (default 2s)",
    active_bg: "Active fill colour, any CSS colour (default white)",
    active_fg: "Active icon + text colour (default white)",
    active_border: "Active outline colour (default white)",
    active_opacity: "Active fill opacity 0–1 (default 0.3)",
    inactive_bg: "Inactive fill colour (default grey)",
    inactive_fg: "Inactive icon + text colour (default grey)",
    inactive_border: "Inactive outline colour (default transparent)",
    inactive_opacity: "Inactive fill opacity 0–1 (default 0.3)",
    overlay: "Pin the badge absolutely so it floats over the card above it in a stack",
    position: "Corner used when overlay is on (default top-right)",
    offset_y: "Vertical inset from that corner (default 12px)",
    offset_x: "Horizontal inset from that corner (default 12px)",
    icon_size: "Icon size (default 16px)",
    text_size: "Text size (default 13px)",
    radius: "Corner radius (default 8px)",
    border_width: "Outline thickness (default 1px)",
  },
  docs: "Standalone it's a chip-sized button. Turn on `overlay` and drop it AFTER another card " +
    "inside a `custom:stack-in-card` / `custom:vertical-stack-in-card` to get upstream's " +
    "floating corner badge (that's all badge_maker's example cards #8–#12 do — a normal card " +
    "plus one or more of these). An unavailable entity always renders inactive and extra-dim, " +
    "so a dead sensor never shows a confident badge.",
  make: (c) => {
    const anim = BADGE_ANIMS[c.animation] ? c.animation : "none";
    const dur = c.speed || "2s";
    const animOn = anim === "none" ? "none" : `badge-${anim} ${dur} linear infinite`;
    const hasContent = !!(c.content && String(c.content).trim());
    const iconSize = c.icon_size || "16px";
    const textSize = c.text_size || "13px";
    const radius = c.radius || "8px";
    const border = c.border_width || "1px";
    const [posY, posX] = (c.position || "top-right").split("-");
    const offY = c.offset_y || "12px";
    const offX = c.offset_x || "12px";

    const aBg = c.active_bg || "white";
    const aFg = c.active_fg || "white";
    const aBd = c.active_border || "white";
    const aOp = c.active_opacity ?? 0.3;
    const iBg = c.inactive_bg || "grey";
    const iFg = c.inactive_fg || "grey";
    const iBd = c.inactive_border || "transparent";
    const iOp = c.inactive_opacity ?? 0.3;
    const fade = (col, op) => `color-mix(in srgb, ${col}, transparent ${Math.round((1 - op) * 100)}%)`;

    // numeric mode as soon as either threshold is set; otherwise a state match. The `-99999`
    // sentinel keeps a non-numeric/unavailable state from satisfying a "below" test.
    const numeric = c.below !== undefined && c.below !== null && c.below !== ""
      || c.above !== undefined && c.above !== null && c.above !== "";
    const states = (c.active_states || "on").split(",").map((s) => `'${s.trim()}'`).join(", ");
    const onTestJinja = numeric
      ? `{% set n = st | float(-99999) %}{% set on = n != -99999 and (${[
          c.below !== undefined && c.below !== null && c.below !== "" ? `n <= ${c.below}` : null,
          c.above !== undefined && c.above !== null && c.above !== "" ? `n >= ${c.above}` : null,
        ].filter(Boolean).join(" or ")}) %}`
      : `{% set on = st in [${states}] %}`;

    return {
      type: "custom:mushroom-chips-card",
      alignment: "end",
      chips: [prune({
        type: "template",
        entity: c.entity,
        icon: c.icon || "mdi:bell-ring",
        icon_color: c.icon_color,
        content: hasContent ? c.content : undefined,
        tap_action: { action: "more-info" },
      })],
      card_mod: { style: {
        // Single host block (a chips card has no shape/tile icon shadow to pierce). The keyframes
        // below are pure CSS; the Jinja above them only sets vars.
        ".": `
      ha-card {
        {% set st = states('${c.entity}') %}
        {% set dead = st in ['unavailable', 'unknown', 'none'] %}
        ${onTestJinja}
        {% set on = false if dead else on %}
        --chip-background: {{ '${fade(aBg, aOp)}' if on else '${fade(iBg, iOp)}' }} !important;
        --chip-box-shadow: 0 0 0 ${border} {{ '${aBd}' if on else '${iBd}' }} !important;
        --color: {{ '${aFg}' if on else '${iFg}' }} !important;
        --text-color: {{ '${aFg}' if on else '${iFg}' }} !important;
        --primary-text-color: {{ '${aFg}' if on else '${iFg}' }} !important;
        --secondary-text-color: {{ '${aFg}' if on else '${iFg}' }} !important;
        --badge-anim: {{ '${animOn}' if (on ${c.always_animate ? "or true" : ""}) and not dead else 'none' }};
        opacity: {{ '0.45' if dead else '1' }};
        --chip-border-width: 0px !important;
        --ha-card-border-width: 0px !important;
        --chip-font-size: ${textSize} !important;
        --chip-icon-size: ${iconSize} !important;
        --mdc-icon-size: ${iconSize} !important;
        --chip-height: auto !important;
        --chip-border-radius: ${radius};
        border: none !important;
        border-radius: ${radius} !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        overflow: visible !important;
        will-change: transform;
        transition: opacity 0.3s ease;
        animation: var(--badge-anim, none);
        ${c.overlay ? `position: absolute !important;
        ${posY}: ${offY};
        ${posX}: ${offX};
        z-index: 1;` : ``}
        ${hasContent
          ? `padding: 0 10px !important;`
          : `padding: 5px !important; border-radius: 50% !important; aspect-ratio: 1 / 1; justify-content: center;`}
      }
      ha-state-icon, ha-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${iconSize} !important;
        height: ${iconSize} !important;
      }
      ${hasContent ? `.content { padding-left: 5px; font-weight: bold; }` : `.content { display: none; }`}${BADGE_ANIMS[anim]}`,
      } },
      grid_options: { columns: 6, rows: 1 },
    };
  },
});

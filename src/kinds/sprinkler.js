// upstream: README #9 - Sprinkler + #9 "icon in corner version"
// The two upstream files are byte-identical apart from the icon's margin, so they become ONE
// kind with a `variant` select: `centred` (our shared `clip` placement) and `corner` (upstream's
// pulled-up, oversized icon that bleeds toward the card's top-left). The card itself: the head
// bobs upward, three droplet shadows arc out and up in sequence, and a blurred mist layer
// breathes over the top. Idle = still, dimmed, no spray. (Upstream's `irrig-idle` keyframe is
// declared but never consumed — pruned.)

const SPRINKLER_KEYFRAMES = `
      @keyframes irrig-bob {
        0%   { transform: translateY(0) scale(1); }
        25%  { transform: translateY(-2px) scale(1.02); }
        50%  { transform: translateY(-4px) scale(1.03); }
        75%  { transform: translateY(-2px) scale(1.02); }
        100% { transform: translateY(0) scale(1); }
      }
      @keyframes irrig-heads {
        0%   { box-shadow: -10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),   0 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),   10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0); }
        20%  { box-shadow: -10px 4px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.9),  0 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),   10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0); }
        40%  { box-shadow: -10px -2px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.4), 0 4px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.9), 10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0); }
        60%  { box-shadow: -10px -8px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.1), 0 -2px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.4), 10px 4px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.9); }
        80%  { box-shadow: -10px -12px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),  0 -8px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.1), 10px -2px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0.4); }
        100% { box-shadow: -10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),   0 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0),   10px 10px 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0); }
      }
      @keyframes irrig-fog {
        0%   { filter: blur(0); }
        50%  { filter: blur(0.7px); box-shadow: 0 -14px 18px -8px rgba(var(--sp-rgb, 33, 150, 243), 0.45); }
        100% { filter: blur(0); box-shadow: 0 0 0 0 rgba(var(--sp-rgb, 33, 150, 243), 0); }
      }`;

const sprinklerIcon = (sel, extra = "") => `
      ${sel} {
        position: relative;
        ${extra}
        opacity: var(--ig-op, 1);
        animation: var(--sp-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
      }
      ${sel}::before { animation: var(--sp-heads, none); }
      ${sel}::after  { animation: var(--sp-fog, none); }
      ${SPRINKLER_KEYFRAMES}`;

// upstream's corner placement, minus the `20pxx` typo in the margin shorthand
const SPRINKLER_CORNER = `
      mushroom-shape-icon {
        --icon-size: 65px;
        display: flex;
        margin: -17px 0 10px -17px !important;
        padding-right: 10px;
      }
      ha-tile-icon { margin: -8px 0 0 -8px !important; }
      ha-card {
        clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
      }`;

registerKind("sprinkler", {
  label: "Animated Sprinkler",
  desc: "Head bobs and throws arcing droplets with a mist haze while the valve is open",
  domains: ["switch", "valve", "input_boolean"],
  schema: [F.icon, F.color, F.glow, F.speed, F.variant(["centred", "corner"]), F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Water colour as R, G, B (default 33, 150, 243)",
    speed: "Bob duration (default 2s)",
    variant: "centred = icon centred in the tile; corner = upstream's oversized top-left icon",
  },
  make: (c) => {
    const color = c.color || "blue";
    const glow = c.glow || "33, 150, 243";
    const speed = c.speed || "2s";
    const active = c.active || "on";
    const power = powerOf(c);
    const placement = c.variant === "corner" ? SPRINKLER_CORNER : clip;
    return {
      ...(power
        ? powerFace(c.entity, c.name, power, color)
        : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
      icon: c.icon || "mdi:sprinkler-variant",
      layout: "vertical", fill_container: true,
      tap_action: { action: "toggle" },
      card_mod: { style: {
        "mushroom-shape-icon$": sprinklerIcon(".shape"),
        "ha-tile-icon$": sprinklerIcon(".container", "border-radius: 9999px;"),
        ".": `${placement}
      ha-card {
        ${onTest(active, power)}
        --sp-rgb: ${glow};
        --sp-anim: {{ 'irrig-bob ${speed} ease-in-out infinite' if on else 'none' }};
        --sp-heads: {{ 'irrig-heads 1.6s ease-out infinite' if on else 'none' }};
        --sp-fog: {{ 'irrig-fog ${speed} ease-in-out infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.75' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

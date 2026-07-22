// upstream: README #7 - Projector
// Lamp housing hums (a tiny lateral wobble), a soft beam fans out of the left edge and the
// lens keeps a breathing focus glow. Off = still, beam fully hidden (opacity 0, not a faint
// ghost — a dark projector must not look like it's throwing light). Upstream's number-mode
// block becomes the shared power_entity/power_above override, which is what you actually want
// for a projector on a smart plug: the plug's switch state lies, the lamp draw doesn't.

const PROJECTOR_KEYFRAMES = `
      @keyframes proj-hum {
        0%   { transform: translateX(0) scale(1); }
        25%  { transform: translateX(1px) scale(1.02); }
        50%  { transform: translateX(0) scale(1.03); }
        75%  { transform: translateX(-1px) scale(1.02); }
        100% { transform: translateX(0) scale(1); }
      }
      @keyframes proj-beam {
        0%   { opacity: 0.7; filter: blur(1px);   transform: scaleX(1) scaleY(1); }
        50%  { opacity: 1;   filter: blur(0.5px); transform: scaleX(1.15) scaleY(1.05); }
        100% { opacity: 0.7; filter: blur(1px);   transform: scaleX(1) scaleY(1); }
      }
      @keyframes proj-focus {
        0%   { box-shadow: 0 0 10px 3px rgba(var(--pj-rgb, 3, 169, 244), 0.7); }
        50%  { box-shadow: 0 0 20px 8px rgba(var(--pj-rgb, 3, 169, 244), 1); }
        100% { box-shadow: 0 0 10px 3px rgba(var(--pj-rgb, 3, 169, 244), 0.7); }
      }`;

// Stamped into both icon structures. Everything defaults OFF — a projector is dark most of
// the day, so the pre-template beat should show a dark projector.
const projectorIcon = (sel, extra = "") => `
      ${sel} {
        transform-origin: 30% 50%;
        position: relative;
        ${extra}
        opacity: var(--ig-op, 1);
        animation: var(--pj-anim, none);
      }
      ${sel}::before, ${sel}::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: inherit;
        pointer-events: none;
      }
      ${sel}::before {
        background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.6), transparent 55%);
        transform-origin: 20% 50%;
        opacity: var(--pj-beam-op, 0);
        animation: var(--pj-beam, none);
      }
      ${sel}::after { animation: var(--pj-focus, none); }
      ${PROJECTOR_KEYFRAMES}`;

registerKind("projector", {
  label: "Animated Projector",
  desc: "Lamp hums, a beam fans out of the lens and the focus glow breathes while it's running",
  domains: ["switch", "input_boolean", "media_player", "light"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  help: {
    glow: "Focus-glow colour as R, G, B — e.g. 3, 169, 244",
    speed: "Hum/beam duration (default 1.7s)",
    power_entity: "Optional lamp-power sensor — the honest signal for a projector on a smart plug",
  },
  make: (c) => {
    const color = c.color || "accent";
    const glow = c.glow || "3, 169, 244";
    const speed = c.speed || "1.7s";
    const active = c.active || "on";
    const power = powerOf(c);
    return {
      ...(power
        ? powerFace(c.entity, c.name, power, color)
        : { type: "custom:mushroom-entity-card", entity: c.entity, name: c.name, icon_color: color }),
      icon: c.icon || "mdi:projector",
      layout: "vertical", fill_container: true,
      tap_action: { action: "toggle" },
      card_mod: { style: {
        "mushroom-shape-icon$": projectorIcon(".shape"),
        "ha-tile-icon$": projectorIcon(".container", "border-radius: 9999px;"),
        ".": `${clip}
      ha-card {
        ${onTest(active, power)}
        --pj-rgb: ${glow};
        --pj-anim: {{ 'proj-hum ${speed} ease-in-out infinite' if on else 'none' }};
        --pj-beam: {{ 'proj-beam ${speed} ease-in-out infinite' if on else 'none' }};
        --pj-beam-op: {{ '0.8' if on else '0' }};
        --pj-focus: {{ 'proj-focus 1.2s ease-in-out infinite' if on else 'none' }};
        --ig-op: {{ '1' if on else '0.65' }};
      }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

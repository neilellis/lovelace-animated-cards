// upstream: README #59 - water leak (card-wide liquid bar) · #60 - water leak (liquid fills the icon)
//
// Two upstream takes on the same binary_sensor, merged into one kind via `variant`:
//   bar  — #59: the card floods left-to-right, a spinning blob makes the waterline wobble,
//          a Wet/Dry badge sits on the right
//   icon — #60: the icon disc itself fills with liquid; the card only gets a soft ambient glow
// Dry is the base rate for a leak sensor, so every animation defaults to `none` and every
// level to 0 — the pre-template beat shows a calm dry card, not a flood.

const WL_KEYFRAMES = `
      @keyframes wl-spin-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// #60 — the liquid lives inside the icon's shadow root, so keyframes + consumers are fully
// static here and only the four vars come from the host. The textbook version of the contract.
const WL_ICON_SHADOW = `
      .shape {
        background: rgba(255, 255, 255, 0.05) !important;
        overflow: hidden !important;
        position: relative;
        box-shadow: var(--wl-shadow, none) !important;
      }
      /* an oversized rounded block spun slowly = a wavy surface crossing the disc */
      .shape::before {
        content: '';
        position: absolute;
        left: -50%;
        width: 200%;
        height: 200%;
        top: calc(100% - var(--wl-level, 0%));
        background: var(--wl-color, rgba(29, 130, 150, 0));
        border-radius: 40%;
        opacity: 0.85;
        animation: var(--wl-anim, none);
        transition: top 0.5s ease;
      }
      ha-icon {
        position: relative;
        z-index: 2;
        mix-blend-mode: overlay;
        color: white !important;
      }
      @keyframes wl-liquid-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

registerKind("water-leak", {
  label: "Animated Water Leak",
  desc: "Leak sensor that floods — the card (or the icon) fills with wobbling water when wet",
  domains: ["binary_sensor"],
  deviceClass: ["moisture"],
  entitySelector: { entity: { domain: "binary_sensor", device_class: "moisture" } },
  schema: [
    F.variant(["bar", "icon"]),
    F.icon,
    { name: "water", selector: { text: {} } },
    { name: "level", selector: { number: { min: 5, max: 100, step: 5, mode: "slider" } } },
    { name: "wet_text", selector: { text: {} } },
    { name: "dry_text", selector: { text: {} } },
  ],
  help: {
    variant: "bar = the whole card floods (upstream #59); icon = the icon disc fills (upstream #60)",
    icon: "Default mdi:pipe-leak",
    water: HELP.glow.replace("Glow colour", "Water colour") + " (default 29, 130, 150)",
    level: "How far the water rises when wet — a leak is binary, so this is decoration (default 70 bar / 50 icon)",
    wet_text: "Badge text while wet (default Wet)",
    dry_text: "Badge text while dry (default Dry)",
  },
  docs: "Binary — `on` means wet. The fill level is cosmetic (a leak sensor has no depth); pick " +
    "whatever reads best on your dashboard.",
  make: (c) => {
    const rgb = c.water || "29, 130, 150";
    const icon = c.icon || "mdi:pipe-leak";
    const wet = c.wet_text || "Wet";
    const dry = c.dry_text || "Dry";
    const base = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name,
      icon,
      icon_color: "white",
      primary_info: "name", secondary_info: "none",
      tap_action: { action: "more-info" },
    };

    if (c.variant === "icon") {
      const level = c.level || 50;
      return {
        ...base,
        card_mod: { style: {
          "mushroom-shape-icon$": WL_ICON_SHADOW,
          ".": `
      ha-card {
        {% set wet = is_state(config.entity, 'on') %}
        {% set dead = states(config.entity) in ['unavailable', 'unknown'] %}
        --wl-level: {{ '${level}%' if wet else '0%' }};
        --wl-color: rgba(${rgb}, {{ '0.8' if wet else '0' }});
        --wl-shadow: {{ '0 0 12px rgba(${rgb}, 0.45)' if wet else 'none' }};
        --wl-anim: {{ 'wl-liquid-wave 6s linear infinite' if wet else 'none' }};
        --wl-badge: "{{ '${wet}' if wet else '${dry}' }}";
        --wl-badge-color: {{ 'rgb(50, 151, 200)' if wet else 'white' }};
        --wl-ambient: {{ 'radial-gradient(circle at 24px 24px, rgba(${rgb}, 0.15) 0%, transparent 60%)' if wet else 'none' }};
        opacity: {{ '0.5' if dead else '1' }};
        background: #1c1c1c !important;
        background-image: var(--wl-ambient, none) !important;
        border: none !important;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        transition: all 0.5s ease;
        --card-primary-font-size: 16px;
        --card-primary-font-weight: 700;
        --card-secondary-font-size: 12px;
      }
      ha-card::before {
        content: var(--wl-badge, "${dry}");
        position: absolute; top: 30%; right: 10px;
        font-size: 1.1rem; font-weight: 700;
        color: var(--wl-badge-color, white);
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2px 8px; border-radius: 6px;
        pointer-events: none;
      }
      ha-state-icon { color: var(--wl-badge-color, white) !important; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
      mushroom-shape-icon { --icon-size: 60px; display: flex; padding-right: 15px; }`,
        } },
        grid_options: { columns: 6, rows: 2 },
      };
    }

    // bar (default) — #59. The fill gradient, the blob's position and the badge are all vars;
    // only the wave's `display` and the gradient string change with state.
    const level = c.level || 70;
    return {
      ...base,
      card_mod: { style: {
        ".": `
      ha-card {
        {% set wet = is_state(config.entity, 'on') %}
        {% set dead = states(config.entity) in ['unavailable', 'unknown'] %}
        --wl-level: ${level}%;
        --wl-color: rgb(${rgb});
        --wl-fill: {{ 'linear-gradient(90deg, rgba(${rgb}, 1) 0%, rgba(${rgb}, 1) ${level - 10}%, transparent ${level}%, transparent 100%)' if wet else 'none' }};
        --wl-wave: {{ 'block' if wet else 'none' }};
        --wl-badge: "{{ '${wet}' if wet else '${dry}' }}";
        --wl-badge-color: {{ 'rgb(50, 151, 200)' if wet else 'white' }};
        --wl-icon-color: {{ 'white' if wet else 'rgb(50, 151, 200)' }};
        opacity: {{ '0.5' if dead else '1' }};
        background-color: #1c1c1c !important;
        background-image: var(--wl-fill, none) !important;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        z-index: 0;
        transition: all 0.5s ease;
        --card-primary-font-size: 16px;
        --card-primary-font-weight: bold;
        --card-secondary-font-size: 12px;
      }
      ha-card::before {
        content: var(--wl-badge, "${dry}");
        position: absolute; top: 30%; right: 10px;
        font-size: 1.1rem; font-weight: 700;
        color: var(--wl-badge-color, white);
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2px 8px; border-radius: 6px;
        z-index: 3; pointer-events: none;
      }
      /* the waterline: a rounded block spun behind the fill so the edge never sits flat */
      ha-card::after {
        content: "";
        position: absolute; z-index: -1;
        display: var(--wl-wave, none);
        width: 120px; height: 120px;
        background: var(--wl-color, rgb(${rgb}));
        box-shadow: 0 0 25px rgba(${rgb}, 0.5);
        border-radius: 40%;
        left: calc(var(--wl-level, 0%) - 120px);
        top: calc(50% - 60px);
        animation: wl-spin-wave 1.5s linear infinite;
        transition: left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      .mushroom-state-item { z-index: 2; position: relative; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8); }
      mushroom-shape-icon { --icon-size: 60px; display: flex; margin: 0 !important; z-index: 2; }
      ha-state-icon { color: var(--wl-icon-color, white) !important; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
      ${WL_KEYFRAMES}`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

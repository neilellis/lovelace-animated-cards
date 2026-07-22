// upstream: README #68 - Printer (COLORS Ink) 1 · #69 - Printer (COLORS Ink) 2 · #70 - Printer (Black Only Ink)
//
// Three upstream takes on one printer, merged into `variant`:
//   bars  — #68: four CMYK ink bars drawn INSIDE the icon disc (the mdi icon is hidden);
//                one linear-gradient per colour, the hard colour stop IS the ink line
//   card  — #69: the same four bars become the CARD background (quarter-width each, plus a
//                gloss overlay), and the printer icon shakes while printing / breathes when idle
//   black — #70: a single black-ink level fills the icon from the bottom; the badge carries
//                the percentage
//
// State machine (one tuple per state — colour, badge, badge animation, icon motion):
//   OFFLINE grey · PRINTING blue + shake · LOW INK red + alert pulse · READY green + breathe.
// Upstream #68 has no offline state, so a dead printer reads READY there; all three variants
// get the offline branch here.
//
// Upstream's `printing_anim` is a hand-edited Jinja constant — here it's a build-time option,
// so no Jinja is spent on a value that never changes.

const PR_SCANS = {
  laser: "linear-gradient(90deg, transparent 20%, rgba(33, 150, 243, 0.2) 45%, rgba(33, 150, 243, 0.9) 50%, rgba(33, 150, 243, 0.2) 55%, transparent 80%)",
  glow: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)",
};
const PR_GLASS_IDLE = "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)";
const PR_GLASS_SWEEP = "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.1) 60%, transparent 100%)";
const PR_INK_THEMES = { black: ["20, 20, 20", "255, 255, 255"], grey: ["100, 100, 100", "255, 255, 255"], white: ["220, 220, 220", "50, 50, 50"] };

// Card-level furniture every variant shares: the status badge and the sweeping scanner beam,
// both fully static — Jinja only flips --pr-badge / --pr-status / --pr-scan.
const prBadge = (sel) => `
      ${sel} {
        content: var(--pr-badge, "READY");
        position: absolute; top: 10px; right: 10px; z-index: 5;
        font-size: 10px; font-weight: 900; letter-spacing: 0.5px;
        color: rgb(var(--pr-status, 76, 175, 80));
        background: rgba(var(--pr-status, 76, 175, 80), 0.15);
        border: 1px solid rgba(var(--pr-status, 76, 175, 80), 0.3);
        box-shadow: 0 0 10px rgba(var(--pr-status, 76, 175, 80), 0.4), inset 0 0 5px rgba(var(--pr-status, 76, 175, 80), 0.1);
        padding: 3px 8px; border-radius: 6px;
        pointer-events: none;
        animation: var(--pr-badge-anim, none);
      }`;
const prScanner = (sel, scanBg, skew, dur) => `
      ${sel} {
        content: "";
        display: var(--pr-scan, none);
        position: absolute; top: 0; left: 0; bottom: 0;
        width: 30%;
        background: ${scanBg};
        filter: blur(5px);
        z-index: 1;
        transform: skewX(${skew}) translateX(-200%);
        animation: pr-scan-sweep ${dur} ease-in-out infinite;
        pointer-events: none;
      }`;
const PR_CARD_KEYFRAMES = `
      @keyframes pr-scan-sweep {
        0%   { left: -50%; opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { left: 150%; opacity: 0; }
      }
      @keyframes pr-badge-pulse {
        0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--pr-status, 244, 67, 54), 0.7); }
        70%  { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(var(--pr-status, 244, 67, 54), 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--pr-status, 244, 67, 54), 0); }
      }`;
const PR_ICON_KEYFRAMES = `
      @keyframes pr-icon-sweep {
        from { background-position: 150% 0; }
        to   { background-position: -50% 0; }
      }
      @keyframes pr-shake {
        0%, 100% { transform: translate(0, 0); }
        20%      { transform: translate(-2px, 0); }
        40%      { transform: translate(2px, 0); }
        60%      { transform: translate(-2px, 0); }
        80%      { transform: translate(2px, 0); }
      }
      @keyframes pr-breathe {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.9; transform: scale(0.96); }
      }`;

registerKind("printer-ink", {
  label: "Animated Printer Ink",
  desc: "Ink levels drawn as CMYK bars (or a single black tank) with a scanning beam while printing",
  domains: ["sensor", "binary_sensor"],
  schema: [
    F.variant(["bars", "card", "black"]),
    F.icon,
    { name: "ink_c", selector: { entity: { domain: "sensor" } } },
    { name: "ink_m", selector: { entity: { domain: "sensor" } } },
    { name: "ink_y", selector: { entity: { domain: "sensor" } } },
    { name: "ink_k", selector: { entity: { domain: "sensor" } } },
    { name: "low_threshold", selector: { number: { min: 1, max: 90, step: 1, mode: "box", unit_of_measurement: "%" } } },
    { name: "printing_states", selector: { text: {} } },
    { name: "scan", selector: { select: { mode: "dropdown", options: ["icon_glow", "laser", "glow", "none"] } } },
    { name: "ink_theme", selector: { select: { mode: "dropdown", options: ["grey", "black", "white"] } } },
  ],
  help: {
    variant: "bars = ink bars inside the icon (#68); card = bars as the card background (#69); black = single black tank (#70)",
    icon: "Default mdi:printer (ignored by the `bars` variant, which hides the icon)",
    ink_c: "Cyan level sensor (0–100)",
    ink_m: "Magenta level sensor (0–100)",
    ink_y: "Yellow level sensor (0–100)",
    ink_k: "Black level sensor (0–100) — the only one the `black` variant uses",
    low_threshold: "Percent below which a cartridge counts as LOW INK (default 15)",
    printing_states: "Comma-separated states that mean it's busy (default printing, copying, scanning, running)",
    scan: "How printing is shown: icon_glow sweeps the icon, laser/glow sweep the whole card, none is still",
    ink_theme: "`black` variant only — how dark to draw the ink (grey / black / white)",
  },
  docs: "Bind the printer's **status** sensor as the entity and its per-cartridge percentage " +
    "sensors as ink_c/m/y/k. Missing cartridge sensors read 0 %, so leave them blank only on " +
    "the `black` variant. Levels are drawn as gradient colour stops — no keyframes involved — " +
    "so a level change glides via `transition` rather than restarting an animation.",
  make: (c) => {
    const variant = ["bars", "card", "black"].includes(c.variant) ? c.variant : "bars";
    const low = c.low_threshold || 15;
    const scan = c.scan || "icon_glow";
    const busy = JSON.stringify(String(c.printing_states || "printing,copying,scanning,running")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    const lvl = (e) => (e ? `states('${e}') | float(0) if states('${e}') | is_number else 0` : "0");
    const cardScan = scan === "laser" || scan === "glow";
    const iconScan = scan === "icon_glow";

    // shared state machine — one Jinja block, four tuples out
    const STATE = `
        {% set status = states(config.entity) | lower %}
        {% set c_ink = ${lvl(c.ink_c)} %}
        {% set m_ink = ${lvl(c.ink_m)} %}
        {% set y_ink = ${lvl(c.ink_y)} %}
        {% set k_ink = ${lvl(c.ink_k)} %}
        {% set offline = status in ['unavailable', 'unknown', 'off'] %}
        {% set busy = status in ${busy} %}
        {% set inks = ${variant === "black" ? "[k_ink]" : "[c_ink, m_ink, y_ink, k_ink]"} %}
        {# plain min, not a select() filter — a Jinja error would kill the whole style block #}
        {% set low = (inks | min) < ${low} %}
        {% if offline %}{% set st = '150, 150, 150' %}{% set badge = 'OFFLINE' %}{% set banim = 'none' %}{% set imotion = 'none' %}
        {% elif busy %}{% set st = '33, 150, 243' %}{% set badge = 'PRINTING' %}{% set banim = 'none' %}{% set imotion = 'pr-shake 1s ease-in-out infinite' %}
        {% elif low %}{% set st = '244, 67, 54' %}{% set badge = 'LOW INK' %}{% set banim = 'pr-badge-pulse 2s infinite' %}{% set imotion = 'none' %}
        {% else %}{% set st = '76, 175, 80' %}{% set badge = 'READY' %}{% set banim = 'none' %}{% set imotion = 'pr-breathe 4s ease-in-out infinite' %}{% endif %}
        ${variant === "black" ? `{% set badge = badge ~ ' • ' ~ (k_ink | round(0)) ~ '%' %}` : ""}
        --pr-status: {{ st }};
        --pr-badge: "{{ badge }}";
        --pr-badge-anim: {{ banim }};
        --pr-scan: {{ '${cardScan ? "block" : "none"}' if busy else 'none' }};
        --pr-icon-sweep: {{ '${iconScan ? "pr-icon-sweep 1.5s ease-in-out infinite" : "none"}' if busy else 'none' }};
        --pr-glass: {{ '${iconScan ? PR_GLASS_SWEEP : PR_GLASS_IDLE}' if busy else '${PR_GLASS_IDLE}' }};
        --pr-shadow: {{ '${iconScan ? "0 0 15px rgba(33, 150, 243, 0.6), inset 0 0 10px rgba(33, 150, 243, 0.2)" : "0 4px 8px rgba(0, 0, 0, 0.3)"}' if busy else '0 4px 8px rgba(0, 0, 0, 0.3)' }};
        --pr-motion: {{ imotion }};
        --pr-c: {{ c_ink | round(0) }}%;
        --pr-m: {{ m_ink | round(0) }}%;
        --pr-y: {{ y_ink | round(0) }}%;
        --pr-k: {{ k_ink | round(0) }}%;`;

    const base = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Printer",
      primary_info: "name", secondary_info: "state",
      tap_action: { action: "more-info" },
    };

    if (variant === "card") {
      // #69 — the card IS the ink tray: four quarter-width gradients + a gloss overlay.
      return {
        ...base,
        icon: c.icon || "mdi:printer",
        icon_color: "white",
        card_mod: { style: {
          "mushroom-shape-icon$": `
      .shape {
        --icon-size: 68px !important;
        position: relative;
        overflow: hidden;
        animation: var(--pr-motion, none);
        box-shadow: var(--pr-shadow, none) !important;
        transition: box-shadow 0.3s ease;
      }
      .shape::after {
        content: '';
        position: absolute; inset: 0; z-index: 20;
        background: var(--pr-glass, transparent);
        background-size: 200% 100%;
        animation: var(--pr-icon-sweep, none);
        pointer-events: none;
      }
      ${PR_ICON_KEYFRAMES}`,
          ".": `
      ha-card {${STATE}
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        z-index: 1;
        background-image:
          linear-gradient(90deg,
            rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 24%, transparent 25%,
            rgba(255,255,255,0.05) 26%, rgba(255,255,255,0.05) 49%, transparent 50%,
            rgba(255,255,255,0.05) 51%, rgba(255,255,255,0.05) 74%, transparent 75%,
            rgba(255,255,255,0.05) 76%, rgba(255,255,255,0.05) 100%),
          linear-gradient(to top, rgba(0, 255, 255, 0.6) var(--pr-c, 0%), rgba(0, 255, 255, 0.1) var(--pr-c, 0%)),
          linear-gradient(to top, rgba(255, 0, 255, 0.6) var(--pr-m, 0%), rgba(255, 0, 255, 0.1) var(--pr-m, 0%)),
          linear-gradient(to top, rgba(255, 255, 0, 0.6) var(--pr-y, 0%), rgba(255, 255, 0, 0.1) var(--pr-y, 0%)),
          linear-gradient(to top, rgba(0, 0, 0, 0.8) var(--pr-k, 0%), rgba(0, 0, 0, 0.2) var(--pr-k, 0%)) !important;
        background-size: 100% 100%, 25% 100%, 25% 100%, 25% 100%, 25% 100% !important;
        background-position: 0 0, 0% 0, 33.33% 0, 66.66% 0, 100% 0 !important;
        background-repeat: no-repeat !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      ${prScanner("ha-card::before", PR_SCANS[scan] || "none", "-20deg", "2.5s")}
      ${prBadge("ha-card::after")}
      /* the ink bars are light — the text needs its own shadow to survive on top of them */
      mushroom-state-info { z-index: 10; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8); }
      ha-state-icon { filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)); }
      ${PR_CARD_KEYFRAMES}`,
        } },
        grid_options: { columns: 12, rows: 2 },
      };
    }

    if (variant === "black") {
      // #70 — one tank. The fill is a `height` TRANSITION, not a keyframe.
      const [inkRgb, iconRgb] = PR_INK_THEMES[c.ink_theme] || PR_INK_THEMES.grey;
      return {
        ...base,
        icon: c.icon || "mdi:printer",
        icon_color: "white",
        card_mod: { style: {
          "mushroom-shape-icon$": `
      .shape {
        --icon-size: 68px !important;
        background: rgba(${inkRgb}, 0.15) !important;
        border: 1px solid rgba(${inkRgb}, 0.3);
        border-radius: 12px !important;
        position: relative;
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        animation: var(--pr-motion, none);
        box-shadow: var(--pr-shadow, none) !important;
        transition: box-shadow 0.3s ease;
      }
      .shape::before {
        content: '';
        position: absolute; bottom: 0; left: 0; right: 0;
        height: var(--pr-k, 0%);
        background: linear-gradient(to top, rgba(${inkRgb}, 1) 0%, rgba(${inkRgb}, 0.8) 100%);
        transition: height 1s cubic-bezier(0.25, 0.8, 0.25, 1);
        z-index: 0;
      }
      .shape::after {
        content: '';
        position: absolute; inset: 0; z-index: 1;
        background: var(--pr-glass, transparent);
        background-size: 200% 100%;
        animation: var(--pr-icon-sweep, none);
        pointer-events: none;
      }
      ha-icon {
        z-index: 5;
        color: rgb(${iconRgb}) !important;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
      }
      ${PR_ICON_KEYFRAMES}`,
          ".": `
      ha-card {${STATE}
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      ${prScanner("ha-card::after", PR_SCANS[scan] || "none", "-20deg", "2.5s")}
      ${prBadge("ha-card::before")}
      ${PR_CARD_KEYFRAMES}`,
        } },
        grid_options: { columns: 6, rows: 2 },
      };
    }

    // bars (default) — #68. Four ink bars inside the icon disc; the mdi icon is hidden.
    return {
      ...base,
      icon: "mdi:printer",
      card_mod: { style: {
        "mushroom-shape-icon$": `
      .shape {
        color: transparent !important;
        --icon-size: 68px !important;
        border-radius: 12px !important;
        background: #222 !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
        box-shadow: var(--pr-shadow, 0 4px 8px rgba(0, 0, 0, 0.3)) !important;
        transition: box-shadow 0.3s ease;
      }
      /* four cartridges: one gradient each, the hard colour stop IS the ink line */
      .shape::before {
        content: '';
        position: absolute; inset: 2px; z-index: 2;
        border-radius: 8px;
        background-image:
          linear-gradient(to top, #00BCD4 var(--pr-c, 0%), rgba(0, 188, 212, 0.2) var(--pr-c, 0%)),
          linear-gradient(to top, #E91E63 var(--pr-m, 0%), rgba(233, 30, 99, 0.2) var(--pr-m, 0%)),
          linear-gradient(to top, #FFEB3B var(--pr-y, 0%), rgba(255, 235, 59, 0.2) var(--pr-y, 0%)),
          linear-gradient(to top, #9E9E9E var(--pr-k, 0%), rgba(158, 158, 158, 0.2) var(--pr-k, 0%));
        background-size: 23% 100%;
        background-repeat: no-repeat;
        background-position: 0% 0, 34% 0, 67% 0, 100% 0;
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
      }
      /* glass sheen when idle, a sweeping beam while printing — same element, swapped var */
      .shape::after {
        content: '';
        position: absolute; inset: 0; z-index: 3;
        background: var(--pr-glass, ${PR_GLASS_IDLE});
        background-size: 200% 100%;
        animation: var(--pr-icon-sweep, none);
        pointer-events: none;
      }
      ha-icon { display: none; }
      ${PR_ICON_KEYFRAMES}`,
        ".": `
      ha-card {${STATE}
        position: relative;
        overflow: hidden;
        transition: all 0.5s ease;
      }
      ${prScanner("ha-card::after", PR_SCANS[scan] || "none", "-10deg", "2s")}
      ${prBadge("ha-card::before")}
      ${PR_CARD_KEYFRAMES}`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

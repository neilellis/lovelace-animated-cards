// upstream: env_with_graph #2 - Humidity
// (README #48 is the same design without the graph — covered by the base `humidity` kind.)
//
// Loud sibling of the base `humidity` kind: three bands (dry / healthy / humid), each with its
// own keyframe, glow ring and screen-blended halo, plus a 24 h sparkline in the corner.
// withMiniGraph()/graphRows()/graphHelp()/graphDocs() live in kinds/temp-graph.js.

const HG_SHADOW = `
      .shape {
        --icon-size: 60px !important;
        width: var(--icon-size) !important;
        height: var(--icon-size) !important;
        background-color: rgba(77, 77, 77, 0.2) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.06);
        --icon-color: rgba(var(--hg-rgb, 150, 160, 170), 1) !important;
        position: relative;
        opacity: var(--ig-op, 1);
        transform-origin: 50% 60%;
        animation: var(--hg-anim, hg-good-breathe 3.4s ease-in-out infinite);
      }
      .shape::before, .shape::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        pointer-events: none;
      }
      .shape::before { inset: -8px;  animation: var(--hg-glow, none); }
      .shape::after  { inset: -22px; animation: var(--hg-halo, none); mix-blend-mode: screen; }

      /* GOOD — 40–60 %, the band you want to be in: a slow, even breath */
      @keyframes hg-good-breathe {
        0%, 100% { transform: scale(0.98); }
        50%      { transform: scale(1.04); }
      }
      @keyframes hg-good-glow {
        0%, 100% { box-shadow: 0 0 18px 0 rgba(var(--hg-rgb), 0.55), 0 0 30px 4px rgba(var(--hg-rgb), 0.6); }
        50%      { box-shadow: 0 0 24px 4px rgba(var(--hg-rgb), 0.9), 0 0 44px 10px rgba(var(--hg-rgb), 0.85); }
      }
      @keyframes hg-good-halo {
        0%, 100% { box-shadow: 0 0 80px 24px rgba(var(--hg-rgb), 0.35), 0 18px 70px -12px rgba(180, 230, 255, 0.3); }
        50%      { box-shadow: 0 0 120px 40px rgba(var(--hg-rgb), 0.45), 0 26px 90px -10px rgba(200, 240, 255, 0.45); }
      }

      /* HUMID — > 60 %: a sideways wave, like water finding a level */
      @keyframes hg-mid-wave {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-1px); }
        50%      { transform: translateX(1px) translateY(-1px); }
        75%      { transform: translateX(-1px); }
      }
      @keyframes hg-mid-glow {
        0%, 100% { box-shadow: 0 0 20px 0 rgba(var(--hg-rgb), 0.6), 0 0 32px 4px rgba(var(--hg-rgb), 0.7); }
        50%      { box-shadow: 0 0 28px 3px rgba(var(--hg-rgb), 0.95), 0 0 48px 10px rgba(var(--hg-rgb), 0.85); }
      }
      @keyframes hg-mid-halo {
        0%, 100% { box-shadow: 0 0 90px 26px rgba(var(--hg-rgb), 0.4), 0 18px 80px -12px rgba(80, 190, 255, 0.35); }
        50%      { box-shadow: 0 0 135px 42px rgba(var(--hg-rgb), 0.5), 0 28px 105px -10px rgba(100, 210, 255, 0.5); }
      }

      /* DRY — < 40 %: a tighter, faster pulse */
      @keyframes hg-bad-pulse {
        0%, 100% { transform: scale(0.97); }
        40%      { transform: scale(1.03); }
      }
      @keyframes hg-bad-glow {
        0%, 100% { box-shadow: 0 0 18px 0 rgba(var(--hg-rgb), 0.6), 0 0 28px 4px rgba(var(--hg-rgb), 0.7); }
        50%      { box-shadow: 0 0 26px 4px rgba(var(--hg-rgb), 0.95), 0 0 44px 12px rgba(var(--hg-rgb), 0.9); }
      }
      @keyframes hg-bad-halo {
        0%, 100% { box-shadow: 0 0 80px 22px rgba(var(--hg-rgb), 0.45), 0 18px 75px -10px rgba(0, 70, 160, 0.5); }
        50%      { box-shadow: 0 0 130px 40px rgba(var(--hg-rgb), 0.6), 0 26px 100px -8px rgba(0, 90, 190, 0.65); }
      }`;

registerKind("humidity-graph", {
  label: "Animated Humidity (graph)",
  desc: "Three-band droplet with glow + halo layers and a 24 h sparkline bled into the corner",
  domains: ["sensor"],
  deviceClass: ["humidity"],
  entitySelector: { entity: { domain: "sensor", device_class: "humidity" } },
  // upstream's 40/60 % comfort band is a health guideline, not a per-house preference, so it
  // stays a constant — only the graph is optional here.
  schema: [...graphRows()],
  help: { ...graphHelp() },
  docs: graphDocs(),
  make: (c) => {
    const card = {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Humidity",
      icon: "mdi:water-percent",
      primary_info: "state", secondary_info: "name",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": HG_SHADOW,
        ".": `${clip}
      ha-card {
        {% set h = states(config.entity) | float(-999) %}
        {% if h < -900 %}{% set rgb = '120, 120, 120' %}{% set a = 'none' %}{% set g = 'none' %}{% set l = 'none' %}{% set op = '0.4' %}
        {% elif h < 40 %}{% set rgb = '0, 80, 200' %}{% set a = 'hg-bad-pulse 2.8s ease-in-out infinite' %}{% set g = 'hg-bad-glow 2.52s ease-in-out infinite' %}{% set l = 'hg-bad-halo 3.08s ease-in-out infinite' %}{% set op = '1' %}
        {% elif h <= 60 %}{% set rgb = '120, 210, 255' %}{% set a = 'hg-good-breathe 3.4s ease-in-out infinite' %}{% set g = 'hg-good-glow 3.06s ease-in-out infinite' %}{% set l = 'hg-good-halo 3.74s ease-in-out infinite' %}{% set op = '1' %}
        {% else %}{% set rgb = '40, 140, 255' %}{% set a = 'hg-mid-wave 3s ease-in-out infinite' %}{% set g = 'hg-mid-glow 2.7s ease-in-out infinite' %}{% set l = 'hg-mid-halo 3.3s ease-in-out infinite' %}{% set op = '1' %}{% endif %}
        --hg-rgb: {{ rgb }};
        --hg-anim: {{ a }};
        --hg-glow: {{ g }};
        --hg-halo: {{ l }};
        --ig-op: {{ op }};
        --card-primary-font-size: 1.4rem;
        --card-primary-line-height: 1.3;
      }`,
      } },
      grid_options: c.graph === false ? { columns: 6, rows: 2 } : { columns: 12, rows: 2 },
    };
    if (c.graph === false) return card;
    return withMiniGraph(card, c.entity, { hours: c.graph_hours, lineColor: "lightblue" });
  },
});

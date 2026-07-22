// upstream: README #56 - Pollen grass · #57 - Pollen trees · #58 - Pollen weeds (all "kleenex")
//
// Three upstream cards that differ ONLY in entity, name and icon → one kind with a `pollen`
// select that picks the default icon + name. The drawing is a dark glass card with a huge
// blurred two-colour aura rotating behind it; the aura's colours and spin period are the state
// signal (green/blue 12 s calm → orange/yellow 7 s → red/orange 4 s), plus a numeric badge fed
// by an optional companion count sensor.
//
// ⚠ Contract note: this drawing lives on `ha-card::before`, which has no shadow root to hide
// static CSS in — so the keyframes share the templated host block (as upstream). The
// declaration itself is constant (`animation: rotate-aura var(--pollen-speed, 12s) …`) and
// only the vars are Jinja, so the animation only ever restarts when the pollen LEVEL changes,
// which is a couple of times a day.

const POLLEN_TYPES = {
  grass: { icon: "mdi:grass", name: "Grass" },
  trees: { icon: "mdi:forest", name: "Trees" },
  weeds: { icon: "mdi:cannabis", name: "Weeds" },
};

registerKind("pollen", {
  label: "Animated Pollen",
  desc: "Dark glass tile with a rotating two-colour aura — calm green, then amber, then red",
  domains: ["sensor"],
  schema: [
    F.variant(["grass", "trees", "weeds"]),
    F.icon,
    { name: "count_entity", selector: { entity: { domain: "sensor" } } },
    { name: "high_states", selector: { text: {} } },
    { name: "moderate_states", selector: { text: {} } },
  ],
  help: {
    variant: "Which pollen the card is for — sets the default icon and name",
    icon: "Overrides the icon the pollen type picks",
    count_entity: "Optional companion sensor with the raw count/index — shown as the right-hand badge",
    high_states: "Comma-separated states that count as HIGH (default high, very-high, red)",
    moderate_states: "Comma-separated states that count as MODERATE (default moderate, medium, orange)",
  },
  docs: "Bind the **level** sensor (a text state like `low`/`moderate`/`high`) as the entity, " +
    "and optionally its numeric sibling as `count_entity` for the badge — that's how the Kleenex " +
    "Pollen Radar integration this came from splits them.",
  make: (c) => {
    const t = POLLEN_TYPES[c.variant] || POLLEN_TYPES.grass;
    const list = (s, d) => JSON.stringify(String(s || d).split(",").map((x) => x.trim()).filter(Boolean));
    const high = list(c.high_states, "high,very-high,red");
    const mod = list(c.moderate_states, "moderate,medium,orange");
    const badge = c.count_entity ? `"{{ states('${c.count_entity}') }}"` : `""`;
    return {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || t.name,
      icon: c.icon || t.icon,
      icon_color: "light-grey",
      primary_info: "state", secondary_info: "name",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        ".": `
      ha-card {
        {% set s = states(config.entity) %}
        {% if s in ${high} %}
          {% set c1 = '255, 65, 108' %}{% set c2 = '255, 75, 43' %}{% set speed = '4s' %}
        {% elif s in ${mod} %}
          {% set c1 = '247, 151, 30' %}{% set c2 = '255, 210, 0' %}{% set speed = '7s' %}
        {% elif s in ['unavailable', 'unknown'] %}
          {% set c1 = '90, 96, 104' %}{% set c2 = '70, 76, 84' %}{% set speed = '24s' %}
        {% else %}
          {% set c1 = '0, 242, 96' %}{% set c2 = '5, 117, 230' %}{% set speed = '12s' %}
        {% endif %}
        --pollen-c1: rgba({{ c1 }}, 0.6);
        --pollen-c2: rgba({{ c2 }}, 0.6);
        --pollen-speed: {{ speed }};
        --pollen-badge: ${badge};
        background: #101010 !important;
        border-radius: 25px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
        position: relative;
        overflow: hidden;
        clip-path: inset(0 0 0 0 round 25px);
        --card-primary-font-size: 1.2rem;
        --card-primary-line-height: 1.3;
      }
      /* the aura: two blurred radial gradients on one oversized element, rotated as a whole */
      ha-card::before {
        content: "";
        position: absolute;
        top: -50%; left: -50%;
        width: 200%; height: 200%;
        z-index: 0;
        background-image:
          radial-gradient(circle at 50% 50%, var(--pollen-c1, rgba(0, 242, 96, 0.6)) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, var(--pollen-c2, rgba(5, 117, 230, 0.6)) 0%, transparent 50%);
        filter: blur(60px);
        opacity: 0.8;
        animation: pollen-aura var(--pollen-speed, 12s) linear infinite;
      }
      ha-card::after {
        content: var(--pollen-badge, "");
        position: absolute;
        top: 50%; right: 16px;
        transform: translateY(-50%);
        z-index: 10;
        color: white;
        font-weight: 700;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(4px);
        padding: 4px 10px;
        border-radius: 12px;
        text-shadow: 0 1px 2px black;
      }
      mushroom-shape-icon { --icon-size: 60px; display: flex; margin: 0 !important; --icon-color: white !important; }
      ha-state-icon { color: white !important; }
      .mushroom-state-info span.primary {
        color: white !important;
        font-weight: 600 !important;
        font-size: 16px !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }
      .mushroom-state-info span.secondary { color: rgba(255, 255, 255, 0.8) !important; }
      @keyframes pollen-aura { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
      } },
      grid_options: { columns: 6, rows: 2 },
    };
  },
});

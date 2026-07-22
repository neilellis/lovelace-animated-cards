// upstream: README #64 - Water Boiler (C) · #65 - Water Boiler (F)
//
// One kind, two scales. The card fills left-to-right with a solid bar whose width tracks the
// water temperature, with a rounded block spinning at the leading edge so the "waterline"
// wobbles instead of being a flat cut. Colour and spin speed step blue → orange → red.
//
// The two upstream cards are the same card with different arithmetic:
//   °C  <30 → 0–39 % blue 6s · <35 → 40–79 % orange 4s · else 80–96 % red 2s (capped)
//   °F  <100 → 0–35 % blue 6s · <150 → 36–71 % orange 4s · else 72–96 % red 2s (capped)
// Level is a TRANSITIONED width, not a keyframe — the glide comes from `transition`, which is
// what makes a temperature change read as the water rising.

const BOILER_SCALES = {
  c: { lo: 30, mid: 35, loSpan: 29, midSpan: 5, hiSpan: 10, loPct: 39, midBase: 40, midPct: 39, hiBase: 80, hiPct: 12, waveOff: 0 },
  f: { lo: 100, mid: 150, loSpan: 99, midSpan: 50, hiSpan: 40, loPct: 35, midBase: 36, midPct: 35, hiBase: 72, hiPct: 24, waveOff: 40 },
};

registerKind("boiler", {
  label: "Animated Water Boiler",
  desc: "Tank that fills with hot water — bar width tracks temperature, blue → orange → red",
  domains: ["sensor"],
  deviceClass: ["temperature"],
  entitySelector: { entity: { domain: "sensor", device_class: "temperature" } },
  schema: [F.variant(["c", "f"]), F.icon],
  help: {
    variant: "Temperature scale: c = 30/35 °C break points, f = 100/150 °F",
    icon: "Default mdi:water-boiler",
  },
  make: (c) => {
    const s = BOILER_SCALES[c.variant === "f" ? "f" : "c"];
    return {
      type: "custom:mushroom-entity-card",
      entity: c.entity,
      name: c.name || "Water Boiler",
      icon: c.icon || "mdi:water-boiler",
      icon_color: "white",
      primary_info: "state", secondary_info: "name",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        ".": `
      ha-card {
        {% set t = states(config.entity) | float(-999) %}
        {% if t < -900 %}
          {% set lvl = 0 %}{% set rgb = '90, 96, 104' %}{% set speed = '0s' %}{% set wave = 'none' %}
        {% elif t < ${s.lo} %}
          {% set lvl = (t / ${s.loSpan}) * ${s.loPct} %}{% set rgb = '29, 130, 150' %}{% set speed = '6s' %}{% set wave = 'block' %}
        {% elif t < ${s.mid} %}
          {% set lvl = ${s.midBase} + ((t - ${s.lo}) / ${s.midSpan}) * ${s.midPct} %}{% set rgb = '150, 109, 29' %}{% set speed = '4s' %}{% set wave = 'block' %}
        {% else %}
          {# hard cap at 96 % so a runaway reading can't push the blob off the card #}
          {% set raw = ${s.hiBase} + ((t - ${s.mid}) / ${s.hiSpan}) * ${s.hiPct} %}
          {% set lvl = 96 if raw > 96 else raw %}{% set rgb = '150, 29, 29' %}{% set speed = '2s' %}{% set wave = 'block' %}
        {% endif %}
        {% set lvl = [[lvl, 0] | max, 96] | min %}
        --bo-color: rgb({{ rgb }});
        --bo-level: {{ lvl | round(1) }}%;
        --bo-speed: {{ speed }};
        /* stone cold (or dead) = no wave; a still bar is the honest picture */
        --bo-wave: {{ 'none' if t <= ${s.waveOff} else wave }};
        --bo-shadow: {{ '0 0 25px rgba(' ~ rgb ~ ', 0.5)' }};
        opacity: {{ '0.5' if t < -900 else '1' }};
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        z-index: 0;
        transition: all 0.5s ease;
      }
      /* the body of the water */
      ha-card::before {
        content: "";
        position: absolute; top: 0; left: 0; bottom: 0; z-index: -1;
        width: calc(var(--bo-level, 0%) - 60px);
        background: var(--bo-color, rgb(90, 96, 104));
        transition: width 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      /* the leading edge — a rounded block spinning so the waterline is never flat */
      ha-card::after {
        content: "";
        position: absolute; z-index: -1;
        display: var(--bo-wave, none);
        width: 120px; height: 120px;
        background: var(--bo-color, rgb(90, 96, 104));
        box-shadow: var(--bo-shadow, none);
        border-radius: 40%;
        left: calc(var(--bo-level, 0%) - 120px);
        top: calc(50% - 60px);
        animation: bo-spin-wave var(--bo-speed, 6s) linear infinite;
        transition: left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      .mushroom-state-item { z-index: 2; position: relative; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8); }
      mushroom-shape-icon { --icon-size: 60px; display: flex; margin: 0 !important; z-index: 2; }
      ha-state-icon { color: white !important; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
      @keyframes bo-spin-wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});

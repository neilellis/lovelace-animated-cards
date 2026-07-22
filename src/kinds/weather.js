// weather.js — animated sky card.
// upstream: climate #1 - Animated Weather Card (+ #2 - Template, the 24 h trend helper)
//
// Upstream's version is a `custom:button-card` whose whole picture is built by a ~250-line JS
// blob in `custom_fields` (it composes <div>s per condition). This bundle is Mushroom +
// card-mod only — pulling in button-card would add a HACS dependency and put the drawing in a
// place card-mod can't reach — so the card is rebuilt on the corpus's own architecture: the sky
// is the card background, and TWO stacked pseudo-element layers carry the scenery. Jinja
// classifies the condition and picks which picture each layer shows (image / size / animation);
// every keyframe stays static, exactly like the rest of the bundle.

// ── layer artwork (kept close to upstream's CSS so the sky reads the same) ────────────────────
const WX = {
  sun: "radial-gradient(circle at 86% 20%, #fff9c4 0 13px, rgba(255, 202, 40, 0.95) 21px, rgba(255, 143, 0, 0.45) 31px, transparent 64px)",
  moon: "radial-gradient(circle at 86% 20%, #ffffff 0 11px, #cfd8dc 15px, rgba(176, 190, 197, 0.32) 23px, transparent 54px)",
  cloudDay: "radial-gradient(ellipse 62px 24px at 24% 62%, rgba(255, 255, 255, 0.85) 0 100%, transparent 101%), radial-gradient(ellipse 36px 32px at 38% 44%, rgba(255, 255, 255, 0.85) 0 100%, transparent 101%), radial-gradient(ellipse 28px 20px at 54% 56%, rgba(255, 255, 255, 0.85) 0 100%, transparent 101%)",
  cloudNight: "radial-gradient(ellipse 62px 24px at 24% 62%, rgba(200, 210, 225, 0.42) 0 100%, transparent 101%), radial-gradient(ellipse 36px 32px at 38% 44%, rgba(200, 210, 225, 0.42) 0 100%, transparent 101%), radial-gradient(ellipse 28px 20px at 54% 56%, rgba(200, 210, 225, 0.42) 0 100%, transparent 101%)",
  cloudFar: "radial-gradient(ellipse 46px 18px at 30% 60%, rgba(255, 255, 255, 0.5) 0 100%, transparent 101%), radial-gradient(ellipse 26px 24px at 44% 44%, rgba(255, 255, 255, 0.5) 0 100%, transparent 101%)",
  rain1: "radial-gradient(ellipse at 30px 20px, rgba(255, 255, 255, 0.6) 1px, transparent 3px), radial-gradient(ellipse at 80px 100px, rgba(255, 255, 255, 0.6) 1px, transparent 3px), radial-gradient(ellipse at 150px 60px, rgba(255, 255, 255, 0.6) 1px, transparent 3px), radial-gradient(ellipse at 250px 150px, rgba(255, 255, 255, 0.6) 1px, transparent 3px)",
  rain2: "radial-gradient(ellipse at 10px 50px, rgba(255, 255, 255, 0.4) 1px, transparent 2px), radial-gradient(ellipse at 60px 120px, rgba(255, 255, 255, 0.4) 1px, transparent 2px), radial-gradient(ellipse at 120px 30px, rgba(255, 255, 255, 0.4) 1px, transparent 2px), radial-gradient(ellipse at 200px 90px, rgba(255, 255, 255, 0.4) 1px, transparent 2px)",
  snow1: "radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.75) 0 3px, transparent 5px), radial-gradient(circle at 78% 32%, rgba(255, 255, 255, 0.7) 0 3px, transparent 5px), radial-gradient(circle at 42% 54%, rgba(255, 255, 255, 0.75) 0 2px, transparent 4px), radial-gradient(circle at 66% 78%, rgba(255, 255, 255, 0.7) 0 3px, transparent 5px)",
  snow2: "radial-gradient(circle at 12% 44%, rgba(255, 255, 255, 0.5) 0 2px, transparent 4px), radial-gradient(circle at 55% 18%, rgba(255, 255, 255, 0.5) 0 2px, transparent 3px), radial-gradient(circle at 88% 66%, rgba(255, 255, 255, 0.5) 0 2px, transparent 4px)",
  fog: "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.65), transparent)",
  stars: "radial-gradient(1.4px 1.4px at 18px 22px, rgba(255, 255, 255, 0.9), transparent), radial-gradient(1.2px 1.2px at 92px 44px, rgba(255, 255, 255, 0.6), transparent), radial-gradient(1.6px 1.6px at 132px 16px, rgba(255, 255, 255, 0.85), transparent), radial-gradient(1.2px 1.2px at 56px 88px, rgba(255, 255, 255, 0.55), transparent), radial-gradient(1.4px 1.4px at 148px 96px, rgba(255, 255, 255, 0.75), transparent)",
  flash: "linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95))",
};

// sky gradients, straight from upstream's bG table (day / twilight / night per category)
const SKY = {
  clear: { day: "#29b6f6, #0288d1", dusk: "#7986cb, #e1bee7, #ffe0b2", night: "#080c16, #162032" },
  partly: { day: "#4fc3f7, #1976d2", dusk: "#5c6bc0, #ce93d8, #ffccbc", night: "#111827, #1e293b" },
  cloudy: { day: "#607d8b, #455a64", dusk: "#455a64, #78909c, #ffebee", night: "#1f2937, #374151" },
  rain: { day: "#2c3e50, #4ca1af", dusk: "#3949ab, #7e57c2, #ffe0b2", night: "#0f172a, #1e293b" },
  snow: { day: "#94a3b8, #64748b", dusk: "#8b5cf6, #d8b4fe, #94a3b8", night: "#1e293b, #0f172a" },
  storm: { day: "#64748b, #334155", dusk: "#2b285b, #1e1b4b, #0f172a", night: "#0f172a, #1e293b" },
  fog: { day: "#9ca3af, #6b7280", dusk: "#8b5cf6, #c084fc, #9ca3af", night: "#1f2937, #111827" },
  dead: { day: "#3b4350, #2b323c", dusk: "#3b4350, #2b323c", night: "#3b4350, #2b323c" },
};

// one Jinja `{% set %}` run per scenery layer — the host block then just pipes these into vars
const wxLayer = (n, l) => {
  const d = l || { img: "none", size: "auto", pos: "0 0", rep: "no-repeat", anim: "none", op: "0", blend: "normal" };
  return `{% set l${n}i = '${d.img}' %}{% set l${n}s = '${d.size || "auto"}' %}{% set l${n}p = '${d.pos || "0 0"}' %}` +
    `{% set l${n}r = '${d.rep || "no-repeat"}' %}{% set l${n}a = '${d.anim || "none"}' %}` +
    `{% set l${n}o = '${d.op ?? "1"}' %}{% set l${n}b = '${d.blend || "normal"}' %}`;
};

const CELESTIAL = { size: "100% 100%", pos: "center", anim: "wx-breathe 6s ease-in-out infinite", op: "1" };
const L = {
  sun: { img: WX.sun, ...CELESTIAL },
  moon: { img: WX.moon, ...CELESTIAL },
  cloudDay: { img: WX.cloudDay, size: "300px 120px", pos: "0 18px", rep: "repeat-x", anim: "wx-drift 30s linear infinite", op: "0.95" },
  cloudNight: { img: WX.cloudNight, size: "300px 120px", pos: "0 18px", rep: "repeat-x", anim: "wx-drift 30s linear infinite", op: "0.95" },
  cloudFar: { img: WX.cloudFar, size: "220px 100px", pos: "0 54px", rep: "repeat-x", anim: "wx-drift2 46s linear infinite", op: "0.7" },
  rain1: { img: WX.rain1, size: "300px 200px", rep: "repeat", anim: "wx-fall 0.6s linear infinite", op: "0.8" },
  rain2: { img: WX.rain2, size: "300px 200px", rep: "repeat", anim: "wx-fall 1.2s linear infinite", op: "0.5" },
  snow1: { img: WX.snow1, size: "170px 260px", rep: "repeat", anim: "wx-snow 9s linear infinite", op: "0.85" },
  snow2: { img: WX.snow2, size: "130px 260px", rep: "repeat", anim: "wx-snow 5.5s linear infinite", op: "0.6" },
  fog1: { img: WX.fog, size: "200% 46px", pos: "-60% 62%", rep: "no-repeat", anim: "wx-fog 18s linear infinite alternate", op: "0.7" },
  fog2: { img: WX.fog, size: "250% 38px", pos: "30% 26%", rep: "no-repeat", anim: "wx-fog2 28s linear infinite alternate", op: "0.5" },
  stars: { img: WX.stars, size: "170px 140px", rep: "repeat", anim: "wx-twinkle 4.5s ease-in-out infinite", op: "0.9" },
  flash: { img: WX.flash, size: "100% 100%", anim: "wx-flash 7s steps(1) infinite", op: "1", blend: "overlay" },
};

// cat → the two layers, with a night swap where the sky object changes (sun→moon, clouds darken)
const wxScene = (cat) => {
  const pair = (a, b) => wxLayer(1, a) + wxLayer(2, b);
  switch (cat) {
    case "clear": return `{% if night %}${pair(L.moon, L.stars)}{% else %}${pair(L.sun, null)}{% endif %}`;
    case "partly": return `{% if night %}${pair(L.moon, L.cloudNight)}{% else %}${pair(L.sun, L.cloudDay)}{% endif %}`;
    case "cloudy": return `{% if night %}${pair(L.cloudNight, L.cloudFar)}{% else %}${pair(L.cloudDay, L.cloudFar)}{% endif %}`;
    case "rain": return pair(L.rain1, L.rain2);
    case "snow": return pair(L.snow1, L.snow2);
    case "fog": return pair(L.fog1, L.fog2);
    case "storm": return pair(L.flash, L.rain1);
    default: return pair(null, null); // dead / unknown — an empty sky, never a made-up one
  }
};

// Shared classifier. `dead` is its own category (upstream draws a red "-" badge; here the sky
// goes flat slate and every effect layer switches off — an unreachable forecast must not paint
// a confident sunny afternoon). Day/dusk/night comes from the sun entity's elevation, with
// `clear-night` as the fallback signal when there's no sun entity.
const WX_CLASSIFY = (condExpr, sun) => `
        {% set cond = ${condExpr} | lower %}
        /* a numeric "condition" means the card is pointed at the wrong entity — treat it as
           unknown rather than letting it fall through to a confident sunny sky */
        {% set dead = cond in ['unavailable', 'unknown', 'none', ''] or (cond | float(-9999)) != -9999 %}
        {% set el = state_attr('${sun}', 'elevation') | float(999) %}
        {% set night = (el < -4) if el < 900 else (cond == 'clear-night') %}
        {% set dusk = el < 900 and el >= -4 and el <= 10 %}
        {% if dead %}{% set cat = 'dead' %}
        {% elif 'lightning' in cond or 'thunder' in cond or cond == 'exceptional' %}{% set cat = 'storm' %}
        {% elif 'snow' in cond or 'hail' in cond or 'sleet' in cond %}{% set cat = 'snow' %}
        {% elif 'rain' in cond or 'pour' in cond or 'drizzle' in cond or 'shower' in cond %}{% set cat = 'rain' %}
        {% elif 'partly' in cond or 'partly-cloudy' in cond %}{% set cat = 'partly' %}
        {% elif 'fog' in cond or 'mist' in cond or 'haz' in cond %}{% set cat = 'fog' %}
        {% elif 'cloud' in cond or 'overcast' in cond or 'wind' in cond %}{% set cat = 'cloudy' %}
        {% else %}{% set cat = 'clear' %}{% endif %}`;

// sky-gradient chooser, generated from the SKY table
const WX_SKY = Object.entries(SKY)
  .map(([cat, s], i) => `        {% ${i ? "elif" : "if"} cat == '${cat}' %}{% set sky = '${s.night}' if night else ('${s.dusk}' if dusk else '${s.day}') %}`)
  .join("\n") + `\n        {% else %}{% set sky = '${SKY.dead.day}' %}{% endif %}`;

// scenery chooser
const WX_SCENE = ["clear", "partly", "cloudy", "rain", "snow", "fog", "storm"]
  .map((cat, i) => `        {% ${i ? "elif" : "if"} cat == '${cat}' %}${wxScene(cat)}`)
  .join("\n") + `\n        {% else %}${wxScene("dead")}{% endif %}`;

// 24 h trend strip (upstream climate #2's helper sensor). Banded colours rather than upstream's
// per-point RGB interpolation — five bands survive being 4 px tall on a TV across the room.
const WX_TREND = (trend) => trend ? `
        {% set hist = state_attr('${trend}', 'history') %}
        {% if hist is iterable and hist is not string and hist | length > 1 %}
          {% set n = hist | length %}
          {% set ns = namespace(stops=[]) %}
          {% for v in hist %}
            {% set t = v | float(0) %}
            {% set c = '33, 150, 243' if t < 5 else ('0, 188, 212' if t < 12 else ('76, 175, 80' if t < 18 else ('255, 167, 38' if t < 24 else '244, 67, 54'))) %}
            {% set ns.stops = ns.stops + ['rgb(' ~ c ~ ') ' ~ ((loop.index0 * 100 / (n - 1)) | round(1)) ~ '%'] %}
          {% endfor %}
          {% set trend = 'linear-gradient(to right, ' ~ (ns.stops | join(', ')) ~ ')' %}
        {% else %}{% set trend = 'none' %}{% endif %}` : `
        {% set trend = 'none' %}`;

registerKind("weather", {
  label: "Animated Weather",
  desc: "Living sky — sun/moon, drifting cloud, rain, snow, fog and lightning by condition",
  domains: ["weather", "sensor"],
  entitySelector: { entity: { domain: ["weather", "sensor"] } },
  schema: [
    F.icon,
    { name: "temp_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
    { name: "condition_entity", selector: { entity: { domain: ["sensor", "weather"] } } },
    { name: "feels_like_entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
    { name: "humidity_entity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
    { name: "wind_entity", selector: { entity: { domain: "sensor" } } },
    { name: "sun_entity", selector: { entity: { domain: "sun" } } },
    { name: "trend_entity", selector: { entity: { domain: "sensor" } } },
  ],
  help: {
    icon: "Overrides the automatic condition icon (sun/moon/cloud/rain/snow/fog/lightning)",
    temp_entity: "Temperature sensor — defaults to the weather entity's own temperature attribute",
    condition_entity: "Condition sensor — defaults to the weather entity's state",
    feels_like_entity: "Apparent-temperature sensor (optional); falls back to the weather entity's attribute",
    humidity_entity: "Humidity sensor (optional); falls back to the weather entity's attribute",
    wind_entity: "Wind-speed sensor (optional); falls back to the weather entity's attribute",
    sun_entity: "Sun entity used for day/dusk/night (default sun.sun)",
    trend_entity: "Optional 24 h temperature-history sensor — draws a trend strip along the bottom edge",
  },
  docs: "Rebuilt on Mushroom + card-mod (upstream shipped it as a `custom:button-card`), so no " +
    "extra HACS card is required. The trend strip needs upstream's companion template sensor " +
    "(climate #2), which stores 24 hourly readings in a `history` attribute:\n\n" +
    "```yaml\n" +
    "template:\n" +
    "  - trigger:\n" +
    "      - platform: time_pattern\n        minutes: \"/1\"\n" +
    "      - platform: homeassistant\n        event: start\n" +
    "    condition: >\n" +
    "      {{ (now().timestamp() - state_attr('sensor.temptrend_24h', 'last_update') | default(0, true) | float(0)) >= 3600 }}\n" +
    "    sensor:\n" +
    "      - name: \"Temptrend 24h\"\n        unique_id: temptrend_24h\n" +
    "        state: \"{{ states('sensor.your_temperature') | float(0) | round(1) }}\"\n" +
    "        attributes:\n" +
    "          last_update: \"{{ now().timestamp() }}\"\n" +
    "          history: >\n" +
    "            {% set current = states('sensor.your_temperature') | float(0) | round(1) %}\n" +
    "            {% set past = state_attr('sensor.temptrend_24h', 'history') | default([current] * 24, true) %}\n" +
    "            {{ (past + [current])[-24:] }}\n" +
    "```\n\n" +
    "Leave `trend_entity` empty and the strip is simply omitted. Before the first template " +
    "render the card shows a neutral slate sky with no effects — an absent forecast, never a " +
    "wrong one.",
  make: (c) => {
    const e = c.entity;
    const sun = c.sun_entity || "sun.sun";
    const isWeather = String(e).startsWith("weather.");
    const condExpr = c.condition_entity ? `states('${c.condition_entity}')` : `states('${e}')`;
    // weather entities keep the numbers in attributes; sensors keep them in their state
    const num = (ent, attr) => ent ? `states('${ent}') | float(-999)` : `state_attr('${e}', '${attr}') | float(-999)`;
    // bound to a plain sensor with no temp_entity? then the card's own state IS the temperature
    const temp = (!c.temp_entity && !isWeather) ? `states('${e}') | float(-999)` : num(c.temp_entity, "temperature");
    const feels = num(c.feels_like_entity, "apparent_temperature");
    const hum = num(c.humidity_entity, "humidity");
    const wind = num(c.wind_entity, "wind_speed");

    // secondary line: pretty condition, then whichever extras actually resolve
    const secondary =
      `{% set cond = ${condExpr} %}` +
      `{% set pretty = 'Unavailable' if (cond in ['unavailable', 'unknown', 'none'] or (cond | float(-9999)) != -9999) else (cond | replace('partlycloudy', 'partly cloudy') | replace('-', ' ') | replace('_', ' ') | title) %}` +
      `{% set f = ${feels} %}{% set h = ${hum} %}{% set w = ${wind} %}` +
      `{{ pretty }}` +
      `{% if f > -900 %} · Feels {{ f | round(0) | int }}°{% endif %}` +
      `{% if h > -900 %} · {{ h | round(0) | int }}%{% endif %}` +
      `{% if w > -900 %} · {{ w | round(0) | int }} wind{% endif %}`;

    return {
      type: "custom:mushroom-template-card",
      entity: e,
      primary: `{% set t = ${temp} %}{{ '—' if t < -900 else (t | round(0) | int ~ '°') }}`,
      secondary,
      multiline_secondary: false,
      icon: c.icon || (
        `{% set cond = ${condExpr} | lower %}` +
        `{% set el = state_attr('${sun}', 'elevation') | float(999) %}` +
        `{% set night = (el < -4) if el < 900 else (cond == 'clear-night') %}` +
        `{% if cond in ['unavailable', 'unknown', 'none'] or (cond | float(-9999)) != -9999 %}mdi:weather-cloudy-alert` +
        `{% elif 'lightning' in cond or 'thunder' in cond %}mdi:weather-lightning-rainy` +
        `{% elif 'snow' in cond or 'hail' in cond or 'sleet' in cond %}mdi:weather-snowy` +
        `{% elif 'pour' in cond %}mdi:weather-pouring` +
        `{% elif 'rain' in cond or 'drizzle' in cond or 'shower' in cond %}mdi:weather-rainy` +
        `{% elif 'fog' in cond or 'mist' in cond or 'haz' in cond %}mdi:weather-fog` +
        `{% elif 'partly' in cond %}{{ 'mdi:weather-night-partly-cloudy' if night else 'mdi:weather-partly-cloudy' }}` +
        `{% elif 'cloud' in cond or 'overcast' in cond %}mdi:weather-cloudy` +
        `{% elif 'wind' in cond %}mdi:weather-windy` +
        `{% else %}{{ 'mdi:weather-night' if night else 'mdi:weather-sunny' }}{% endif %}`
      ),
      icon_color: "white",
      fill_container: true,
      tap_action: { action: "more-info" },
      card_mod: { style: {
        // STATIC (both icon structures — see the TWO ICON STRUCTURES note in 01-factories.js):
        // the icon breathes gently like the sky object it mirrors, tinted by --wx-accent.
        "mushroom-shape-icon$": `
          .shape {
            background-color: rgba(255, 255, 255, 0.14) !important;
            box-shadow: 0 0 18px 4px rgba(var(--wx-accent, 255, 255, 255), 0.25);
            animation: var(--wx-icon-anim, wx-icon-breathe 6s ease-in-out infinite);
          }
          ha-icon, ha-state-icon { color: #ffffff !important; }
          @keyframes wx-icon-breathe {
            0%, 100% { box-shadow: 0 0 12px 3px rgba(var(--wx-accent, 255, 255, 255), 0.2); }
            50%      { box-shadow: 0 0 24px 8px rgba(var(--wx-accent, 255, 255, 255), 0.45); }
          }`,
        "ha-tile-icon$": `
          .container {
            border-radius: 9999px;
            background-color: rgba(255, 255, 255, 0.14) !important;
            box-shadow: 0 0 18px 4px rgba(var(--wx-accent, 255, 255, 255), 0.25);
            animation: var(--wx-icon-anim, wx-icon-breathe 6s ease-in-out infinite);
          }
          @keyframes wx-icon-breathe {
            0%, 100% { box-shadow: 0 0 12px 3px rgba(var(--wx-accent, 255, 255, 255), 0.2); }
            50%      { box-shadow: 0 0 24px 8px rgba(var(--wx-accent, 255, 255, 255), 0.45); }
          }`,
        // TEMPLATED: classify → sky gradient + the two scenery layers, as vars only.
        ".": `
          ha-card {${WX_CLASSIFY(condExpr, sun)}
${WX_SKY}
${WX_SCENE}${WX_TREND(c.trend_entity)}
            --wx-sky: linear-gradient(to bottom, {{ sky }});
            --wx-trend: {{ trend }};
            --wx-accent: {{ '255, 236, 179' if cat == 'clear' and not night else ('207, 216, 220' if night else '255, 255, 255') }};
            --wx-l1-img: {{ l1i }};   --wx-l2-img: {{ l2i }};
            --wx-l1-size: {{ l1s }};  --wx-l2-size: {{ l2s }};
            --wx-l1-pos: {{ l1p }};   --wx-l2-pos: {{ l2p }};
            --wx-l1-rep: {{ l1r }};   --wx-l2-rep: {{ l2r }};
            --wx-l1-anim: {{ l1a }};  --wx-l2-anim: {{ l2a }};
            --wx-l1-op: {{ l1o }};    --wx-l2-op: {{ l2o }};
            --wx-l1-blend: {{ l1b }}; --wx-l2-blend: {{ l2b }};
            --wx-icon-anim: {{ 'none' if dead else 'wx-icon-breathe 6s ease-in-out infinite' }};
            --card-primary-font-size: 34px !important;
            --card-primary-font-weight: 400 !important;
            --card-secondary-font-size: 13px !important;
            --primary-text-color: #ffffff !important;
            --secondary-text-color: rgba(255, 255, 255, 0.9) !important;
            color: #ffffff;
            /* trend strip rides the bottom edge as a second background layer — no pseudo-element
               needed, which keeps ::before/::after free for the scenery */
            background-image: var(--wx-trend, none), var(--wx-sky, linear-gradient(to bottom, #3b4350, #2b323c));
            background-size: 100% 5px, 100% 100%;
            background-position: bottom left, top left;
            background-repeat: no-repeat, no-repeat;
            position: relative;
            overflow: hidden;
            isolation: isolate;
            border: none;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
            transition: background-image 1.2s ease-in-out;
            clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
          }
          /* scenery layer 1 (sky object / near cloud / storm flash) */
          ha-card::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            transform-origin: 86% 20%;
            background-image: var(--wx-l1-img, none);
            background-size: var(--wx-l1-size, auto);
            background-position: var(--wx-l1-pos, 0 0);
            background-repeat: var(--wx-l1-rep, no-repeat);
            mix-blend-mode: var(--wx-l1-blend, normal);
            opacity: var(--wx-l1-op, 0);
            animation: var(--wx-l1-anim, none);
          }
          /* scenery layer 2 (precipitation / far cloud / stars) */
          ha-card::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            background-image: var(--wx-l2-img, none);
            background-size: var(--wx-l2-size, auto);
            background-position: var(--wx-l2-pos, 0 0);
            background-repeat: var(--wx-l2-rep, no-repeat);
            mix-blend-mode: var(--wx-l2-blend, normal);
            opacity: var(--wx-l2-op, 0);
            animation: var(--wx-l2-anim, none);
          }
          /* keep the readout above the weather */
          .container, .content, mushroom-card-content, mushroom-state-item, mushroom-state-info, ha-tile-icon {
            position: relative;
            z-index: 3;
          }
          @keyframes wx-breathe { 0%, 100% { transform: scale(0.97); } 50% { transform: scale(1.05); } }
          @keyframes wx-drift  { from { background-position: 0 18px; } to { background-position: -300px 18px; } }
          @keyframes wx-drift2 { from { background-position: 0 54px; } to { background-position: -220px 54px; } }
          @keyframes wx-fall   { from { background-position: 0 -200px; } to { background-position: 0 0; } }
          @keyframes wx-snow   { from { background-position: 0 -260px; } to { background-position: 0 0; } }
          @keyframes wx-fog    { 0% { background-position: -60% 62%; } 100% { background-position: 30% 62%; } }
          @keyframes wx-fog2   { 0% { background-position: 30% 26%; } 100% { background-position: -40% 26%; } }
          @keyframes wx-twinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
          @keyframes wx-flash {
            0%, 21%, 23%, 56%, 81%, 100% { opacity: 0; }
            20% { opacity: 0.45; }
            22% { opacity: 0.12; }
            55% { opacity: 0.6; }
            80% { opacity: 0.3; }
          }`,
      } },
      grid_options: { columns: 12, rows: 3 },
    };
  },
});

// kinds/bin-collection.js — Animated Bin Collection (large + small).
//
// House-original kind; nothing upstream. It answers ONE question — "which bin goes out, and
// when?" — for the `uk_bin_collection` integration (robbrad/UKBinCollectionData), which puts a
// sensor per bin type carrying a `next_collection` attribute as `DD/MM/YYYY`.
//
// Two things are load-bearing:
//
//   · **Dates are derived from `next_collection` against `now()`, never from the sensor's own
//     state string.** That string ("In 3 days") is computed at SCRAPE time. A council scraper may
//     poll every 12 hours — or, for the Selenium councils, fail a scrape entirely and serve
//     last-known-good data for a day — and the card would then cheerfully say "In 3 days" on the
//     morning of the collection. A Jinja template that touches `now()` re-renders every minute, so
//     deriving from the date is both correct and self-updating. This is the one rule not to
//     "simplify" later.
//
//   · **Bin colours are a per-council fact and cannot be guessed.** The integration exposes a
//     `colour` attribute but it is not usable — Brighton & Hove reports `black` for all four bins.
//     Worse, councils disagree about what a colour MEANS: Brighton's black bin is recycling and
//     its green bin is general waste, the inverse of most of England. So the `colours` option maps
//     bin type → colour, defaulting to the commonest English scheme, and anyone whose council
//     differs sets one line rather than forking the card.
//
// Bin TYPE is detected in JS from the entity id (`..._refuse`, `..._food_waste`), not in Jinja.
// The integration derives those ids from the bin names the council itself returns, so they are
// reliable, and resolving type at make() time means each chip's colour is a static value rather
// than a template — one less thing rendering per minute.

// ── palette ─────────────────────────────────────────────────────────────────────────────────
// Body colour, and the accent used for text/glow. A black bin needs a LIGHT accent: the body
// colour is invisible against a dark card, so the accent carries the identity instead.
const BIN_COLOURS = {
  green:  { body: "#2f7d32", lid: "#245f27", accent: "76, 175, 80" },
  // ⚠️ Drawn LIGHTER than a real black bin on purpose. These cards sit on a near-black surface
  // (#0d1116); a true #1a1c20 bin is a smudge you cannot identify at 46px. The rim light and the
  // pale accent carry the identity, and the bin still reads as "the dark one" beside the others.
  black:  { body: "#3a4048", lid: "#2a2f36", accent: "150, 158, 170" },
  grey:   { body: "#5b6470", lid: "#474e58", accent: "154, 166, 181" },
  blue:   { body: "#2a5fa8", lid: "#204a85", accent: "66, 133, 224" },
  brown:  { body: "#6d4c33", lid: "#553a26", accent: "161, 118, 84" },
  orange: { body: "#e07a2f", lid: "#b85f21", accent: "240, 145, 70" },
  red:    { body: "#a83232", lid: "#872828", accent: "224, 82, 82" },
  purple: { body: "#6b4a9c", lid: "#553a7d", accent: "165, 130, 224" },
  white:  { body: "#d8dde4", lid: "#b9c0ca", accent: "216, 221, 228" },
};

// The commonest English scheme — deliberately NOT Brighton's. See the note above.
const BIN_DEFAULT_COLOURS = "refuse:grey,recycling:blue,food:brown,garden:green";

// Keyword → canonical type. Order matters: "Food waste" contains "waste", so food is tested
// before the general-waste words or every caddy would come out as a refuse bin.
const BIN_TYPES = [
  ["food", ["food", "caddy"]],
  ["recycling", ["recycl", "dry mixed", "blue box", "paper", "glass", "cardboard"]],
  ["garden", ["garden", "green waste", "brown bin"]],
  ["refuse", ["refuse", "rubbish", "general", "domestic", "household", "landfill", "black bag", "waste"]],
];

const binType = (entityId) => {
  const s = String(entityId || "").toLowerCase();
  for (const [type, words] of BIN_TYPES) if (words.some((w) => s.includes(w))) return type;
  return "other";
};

// "refuse:green,food:grey/green" → { refuse: {...green}, food: {body grey, lid green} }.
// The `body/lid` form exists for the food caddy, which is commonly a two-tone box (Brighton's is
// a grey bucket with a green lid) rather than one colour.
const binColourMap = (spec) => {
  const map = {};
  for (const pair of String(spec || "").split(",")) {
    const [rawType, rawColour] = pair.split(":").map((s) => (s || "").trim().toLowerCase());
    if (!rawType || !rawColour) continue;
    const [bodyName, lidName] = rawColour.split("/").map((s) => s.trim());
    const base = BIN_COLOURS[bodyName];
    if (!base) continue;
    map[rawType] = lidName && BIN_COLOURS[lidName]
      ? { body: base.body, lid: BIN_COLOURS[lidName].body, accent: base.accent }
      : base;
  }
  return map;
};

const binColour = (type, spec) => {
  const map = { ...binColourMap(BIN_DEFAULT_COLOURS), ...binColourMap(spec) };
  return map[type] || BIN_COLOURS.grey;
};

// Food waste is a caddy — a square bucket with a carry handle — everywhere it is collected
// separately. Everything else is a wheelie bin. `containers` overrides per type.
const binShape = (type, spec) => {
  for (const pair of String(spec || "").split(",")) {
    const [t, s] = pair.split(":").map((x) => (x || "").trim().toLowerCase());
    if (t === type && (s === "caddy" || s === "wheelie")) return s;
  }
  return type === "food" ? "caddy" : "wheelie";
};

// ── the drawings ────────────────────────────────────────────────────────────────────────────
// Original isometric SVG (both repos are CC BY-NC-SA — no council or manufacturer artwork). Each
// is emitted as a data URI with its colours BAKED IN, because a data-URI background cannot read
// the CSS custom properties of the page that hosts it. The card pre-renders one variant per
// configured bin type and Jinja picks between them by setting `--bin-img`.
//
// ⚠️ `#` MUST be percent-encoded inside a data URI or the browser reads the rest as a fragment and
// the image silently fails to load. Single quotes inside, so the whole thing fits in url("…").
const binUri = (svg) =>
  `data:image/svg+xml,${svg.replace(/\s+/g, " ").trim().replace(/#/g, "%23").replace(/"/g, "'")}`;

// Both drawings keep their whole silhouette inside y 20–104 of the 120 box. The disc that hosts
// them is a CIRCLE and a background is clipped by its border-radius, so anything nearer the
// corners than that — the wheels, in the first draft — is quietly sliced off and a wheelie bin
// stops reading as a wheelie bin.
//
// The rim light along the top and left edges is what makes these legible at 46px: without it a
// dark bin on a dark card is a silhouette with no edges. It is drawn as explicit strokes rather
// than a filter so it survives the data-URI round trip.
// ⚠️ BODY and LID are separate images, sharing the same 120×120 box so they overlay exactly.
// That split is what lets the lid FLAP: a lid drawn into the same file could only ever move with
// the bin. Both layers are rendered `contain` at the same size, so the lid's hinge sits at a fixed
// fraction of the element and `transform-origin` can be a constant.
const binWheelieBody = ({ body }) => binUri(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <g stroke='rgba(0,0,0,0.40)' stroke-width='1.5' stroke-linejoin='round'>
      <circle cx='45' cy='98' r='7' fill='%2315171a' stroke='none'/>
      <circle cx='77' cy='98' r='7' fill='%2315171a' stroke='none'/>
      <path d='M32 42 L90 42 L83 96 L39 96 Z' fill='${body}'/>
      <path d='M32 42 L47 42 L44 96 L39 96 Z' fill='rgba(255,255,255,0.11)' stroke='none'/>
      <path d='M77 42 L90 42 L83 96 L75 96 Z' fill='rgba(0,0,0,0.18)' stroke='none'/>
      <path d='M33 45 L38 92' fill='none' stroke='rgba(255,255,255,0.16)' stroke-width='1.6' stroke-linecap='round'/>
    </g>
  </svg>`);

const binWheelieLid = ({ lid }) => binUri(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <g stroke='rgba(0,0,0,0.40)' stroke-width='1.5' stroke-linejoin='round'>
      <path d='M27 30 Q27 25 33 25 L88 25 Q94 25 94 30 L95 42 L26 42 Z' fill='${lid}'/>
      <rect x='52' y='29' width='17' height='4.5' rx='2.2' fill='rgba(0,0,0,0.32)' stroke='none'/>
      <path d='M27 27 Q30 25 34 25 L87 25' fill='none' stroke='rgba(255,255,255,0.30)' stroke-width='2' stroke-linecap='round'/>
    </g>
  </svg>`);

const binCaddyBody = ({ body }) => binUri(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <g stroke='rgba(0,0,0,0.40)' stroke-width='1.5' stroke-linejoin='round'>
      <path d='M45 34 Q60 14 75 34' fill='none' stroke='%23434a54' stroke-width='4.5' stroke-linecap='round'/>
      <path d='M36 58 L86 58 L80 100 L42 100 Z' fill='${body}'/>
      <path d='M36 58 L49 58 L46 100 L42 100 Z' fill='rgba(255,255,255,0.11)' stroke='none'/>
      <path d='M74 58 L86 58 L80 100 L72 100 Z' fill='rgba(0,0,0,0.18)' stroke='none'/>
      <path d='M37 61 L43 96' fill='none' stroke='rgba(255,255,255,0.16)' stroke-width='1.6' stroke-linecap='round'/>
    </g>
  </svg>`);

const binCaddyLid = ({ lid }) => binUri(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <g stroke='rgba(0,0,0,0.40)' stroke-width='1.5' stroke-linejoin='round'>
      <path d='M32 46 Q32 42 37 42 L85 42 Q90 42 90 46 L91 58 L31 58 Z' fill='${lid}'/>
      <rect x='53' y='45' width='15' height='4.2' rx='2.1' fill='rgba(0,0,0,0.30)' stroke='none'/>
      <path d='M32 44 Q35 42 39 42 L84 42' fill='none' stroke='rgba(255,255,255,0.30)' stroke-width='2' stroke-linecap='round'/>
    </g>
  </svg>`);

const binDrawing = (type, colours, containers) => {
  const caddy = binShape(type, containers) === "caddy";
  const col = binColour(type, colours);
  return (caddy ? binCaddyBody : binWheelieBody)(col);
};

const binLid = (type, colours, containers) => {
  const caddy = binShape(type, containers) === "caddy";
  const col = binColour(type, colours);
  return (caddy ? binCaddyLid : binWheelieLid)(col);
};

// The hinge, as a fraction of the element — the back-left corner of each lid in the 120 box.
const binHinge = (type, containers) =>
  binShape(type, containers) === "caddy" ? "27% 40%" : "22% 30%";

// ── the scan ────────────────────────────────────────────────────────────────────────────────
// One preamble, prefixed to EVERY option that reads it: each card option is rendered as its own
// template, so a `{% set %}` in one is invisible to the next (repo trap #1).
//
// `days` is (collection date − today) in whole days, so it flips at local midnight rather than at
// whatever time the scraper last ran. A row whose `next_collection` is missing or unparseable is
// dropped rather than rendered as an error — a council scraper that returns nothing should leave
// the card quiet, not shouting.
// The entity loop is unrolled in JS rather than written as a Jinja `{% for %}`, because the type
// and display name of each bin are resolved at make() time — inside a Jinja loop they would have
// to be looked up per render from entity ids, which is both slower and less reliable.
const binScan = (groups) => {
  const q = (s) => String(s == null ? "" : s).replace(/'/g, "");
  const parts = groups.map((g, i) => g.entities.map((e) => `
          {% set raw = state_attr('${e}', 'next_collection') %}
          {% if raw %}
            {% set dt = strptime(raw, '%d/%m/%Y').date() %}
            {% set ns.rows = ns.rows + [{
                 'e': '${e}', 'g': ${i}, 'grp': '${q(g.label)}',
                 'type': '${q(g.types[e] || "other")}',
                 'label': '${q(g.names[e] || "Bin")}',
                 'n': (dt - now().date()).days, 'dt': dt }] %}
          {% endif %}`).join("")).join("");
  return `
        {% set ns = namespace(rows=[]) %}${parts}
        {% set rows = ns.rows | sort(attribute='n') | list %}
        {% set nrows = rows | count %}
        {% set soon = (rows | first) if nrows > 0 else none %}
        {# same day AND same household — two households collected on one day are two separate
           answers ("put out Ellis's food caddy"), not one; without the group test the card says
           "Food waste + Food waste" #}
        {% set due = rows | selectattr('n', 'eq', soon.n) | selectattr('g', 'eq', soon.g) | list if soon else [] %}
        {% set ndue = due | count %}`;
};

const binJ = (groups, body) => `${binScan(groups)}${body}`;

// Today / Tomorrow / a weekday inside the week / a dated day beyond it. Past dates can happen —
// a missed collection, or a scraper serving stale data — and say so rather than counting down
// into negatives.
const BIN_WHEN = `{% if soon.n < 0 %}Missed{% elif soon.n == 0 %}Today` +
  `{% elif soon.n == 1 %}Tomorrow{% elif soon.n < 7 %}{{ soon.dt.strftime('%A') }}` +
  `{% else %}{{ soon.dt.strftime('%-d %b') }}{% endif %}`;

// Chips always carry the weekday AND the date beyond tomorrow ("Mon 3"). Weekday alone is
// ambiguous at exactly a week out — "Mon" could be either Monday — and mixing bare weekdays for
// near bins with bare dates for far ones ("Mon" beside "4 Aug") reads as two different units.
const BIN_ROW_WHEN = `{% if r.n < 0 %}Missed{% elif r.n == 0 %}Today` +
  `{% elif r.n == 1 %}Tomorrow{% else %}{{ r.dt.strftime('%a %-d') }}{% endif %}`;

// ── urgency ─────────────────────────────────────────────────────────────────────────────────
// DESIGN.md rule 10, idle is quiet: a collection days away is a static, dim card. Only "tomorrow"
// (the evening you actually put the bin out) and "today" move at all.
const binVars = (groups, colours, containers) => {
  const types = [...new Set(groups.flatMap((g) => Object.values(g.types)))];
  const pick = types.map((t) => `{% if soon.type == '${t}' %}` +
    `--bin-img: url("${binDrawing(t, colours, containers)}");` +
    `--bin-lid: url("${binLid(t, colours, containers)}");` +
    `--bin-hinge: ${binHinge(t, containers)};` +
    `--bin-rgb: ${binColour(t, colours).accent};{% endif %}`).join("");
  return `
        {% if soon %}${pick}
          {% if soon.n <= 0 %}
            --bin-wobble: bin-wobble 1.5s ease-in-out infinite;
            --bin-lid-anim: bin-lid-flap 2.6s ease-in-out infinite;
            --bin-bloom: 16px; --bin-wash: 0.13; --bin-fade: 1;
          {% elif soon.n == 1 %}
            --bin-wobble: bin-nudge 3.4s ease-in-out infinite;
            --bin-lid-anim: bin-lid-peek 5.2s ease-in-out infinite;
            --bin-bloom: 11px; --bin-wash: 0.10; --bin-fade: 1;
          {% else %}
            --bin-wobble: none; --bin-lid-anim: none;
            --bin-bloom: 0px; --bin-wash: 0.05; --bin-fade: 0.82;
          {% endif %}
        {% else %}
          --bin-rgb: 120, 124, 130; --bin-wobble: none; --bin-lid-anim: none;
          --bin-bloom: 0px; --bin-wash: 0.04; --bin-fade: 0.55;
        {% endif %}`;
};

// The drawing replaces the icon glyph entirely (::slotted hides the real icon), exactly as the
// Alexa cards do. The glow stays in CSS because it must be state-coloured AND animated, and
// animation inside a data-URI background is not something to rely on.
const binDisc = (root, size) => `
      ${root} {
        position: relative;
        ${size}
        border-radius: 9999px !important;
        background:
          radial-gradient(circle at 50% 58%, rgba(var(--bin-rgb, 150,158,170), 0.20) 0%, transparent 70%),
          var(--bin-img, none) center/86% 86% no-repeat !important;
        box-shadow: 0 0 var(--bin-bloom, 0px) rgba(var(--bin-rgb, 150,158,170), 0.50);
        opacity: var(--bin-fade, 1);
        animation: var(--bin-wobble, none);
        transform-origin: 50% 88%;
        transition: box-shadow 0.6s ease, opacity 0.6s ease;
      }
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--bin-lid, none) center/86% 86% no-repeat;
        transform-origin: var(--bin-hinge, 22% 30%);
        animation: var(--bin-lid-anim, none);
        pointer-events: none;
      }
      ${root} ::slotted(*) { display: none !important; }
      @keyframes bin-lid-peek {
        0%, 70%, 100% { transform: rotate(0deg); }
        80%, 88%      { transform: rotate(-17deg); }
      }
      @keyframes bin-lid-flap {
        0%, 55%, 100% { transform: rotate(0deg); }
        68%, 80%      { transform: rotate(-27deg); }
      }
      @keyframes bin-wobble {
        0%, 100% { transform: rotate(-5deg); }
        50%      { transform: rotate(5deg); }
      }
      @keyframes bin-nudge {
        0%, 82%, 100% { transform: rotate(0deg); }
        88%           { transform: rotate(-3.5deg); }
        94%           { transform: rotate(2.5deg); }
      }`;

// ⚠️ Mushroom slots primary/secondary into `ha-tile-info` as light-DOM spans that are
// `white-space: nowrap; text-overflow: ellipsis`. "Refuse + Recycling" is 17 characters and
// clipped to "Refuse + Recycl…" on the small tile without this (same trap as the battery card).
const BIN_WRAP = `
      ha-tile-info span[slot="primary"],
      ha-tile-info span[slot="secondary"] {
        white-space: normal !important;
        text-overflow: clip !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        line-height: 1.3 !important;
      }`;

const BIN_FLAT = `
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;`;

const binSurface = (radius) => `
      ha-card {
        position: relative;
        overflow: hidden;
        border-radius: ${radius}px;
        border: 1px solid rgba(var(--bin-rgb, 150,158,170), 0.20);
        background:
          radial-gradient(120% 85% at 50% 0%, rgba(var(--bin-rgb, 150,158,170), var(--bin-wash, 0.06)) 0%, transparent 64%),
          linear-gradient(165deg, #151a20 0%, #0d1116 62%, #090c10 100%) !important;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
        transition: border-color 0.8s ease, background 0.8s ease;
      }`;

// ── the hero ────────────────────────────────────────────────────────────────────────────────
// Names the bin(s) going out next and when. Two bins on one day is the normal case for most
// councils (refuse + recycling together), so the primary line joins them rather than picking one
// arbitrarily — "Refuse + Recycling" is the difference between putting out one bin and two.
//
// The household name appears only when a second household is configured AND it is that household's
// collection — on a one-household card it is noise.
const binHero = (c, groups, colours, containers, { size = 52, surface = false, radius = 18, compact = false } = {}) => {
  const multi = groups.length > 1;
  return {
    type: "custom:mushroom-template-card",
    // `unique`: two bins of the same kind due the same day within one household would otherwise
    // print twice, and a household with a duplicated sensor is a config mistake, not two bins.
    primary: binJ(groups, `{% if not soon %}No collection data` +
      `{% else %}{{ due | map(attribute='label') | unique | join(' + ') }}{% endif %}`),
    // The 6-column tile measured 145px on the battery card — there is no room there for
    // "Ellis · Friday · 31 Jul", so the small card drops the explicit date and keeps the day.
    secondary: binJ(groups, `{% if not soon %}—{% else %}` +
      (multi ? `{{ soon.grp }} · ` : "") +
      `${BIN_WHEN}` + (compact ? "" : `{% if soon.n > 1 %} · {{ soon.dt.strftime('%-d %b') }}{% endif %}`) +
      `{% endif %}`),
    icon: "mdi:trash-can",
    tap_action: { action: "none" },
    card_mod: { style: {
      "mushroom-shape-icon$": binDisc(".shape", `--icon-size: ${size}px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;`),
      "ha-tile-icon$": binDisc(".container", `width: ${size}px !important; height: ${size}px !important;`),
      ".": `
      mushroom-shape-icon { --icon-size: ${size}px; }
      ha-tile-icon { --tile-icon-size: ${size}px; }
      ha-card {${binScan(groups)}${binVars(groups, colours, containers)}
        ${surface ? "" : BIN_FLAT}
        position: relative;
        padding: ${surface ? "10px 12px" : "2px 4px"} !important;
        min-height: 0 !important;
        --card-primary-font-size: 1rem;
        --card-primary-font-weight: 600;
        --card-secondary-font-size: 0.78rem;
        --card-primary-color: #e8eef6;
        --card-secondary-color: #9aa6b5;
      }
      ${BIN_WRAP}${surface ? binSurface(radius) : ""}`,
    } },
  };
};

// ── the lineup ──────────────────────────────────────────────────────────────────────────────
// The bins standing at the kerb, drawn, with the day under each — not a row of text chips. This
// is the whole point of the card: you recognise "green one, Monday" by its shape and colour long
// before you read a word, which is exactly how you think about bins.
//
// Each bin is a vertical Mushroom template card (icon above, text below) inside a HORIZONTAL
// vertical-stack-in-card. Built-in `grid`/`horizontal-stack` were the obvious containers and are
// the wrong ones — card-mod is not applied inside them when they are nested in a
// vertical-stack-in-card (repo trap #4), which is precisely where these live.
//
// The one going out next stands full-colour and nudges; the rest are dimmed and desaturated so
// the answer is unmistakable at a glance. Every tile carries the FULL scan, not just its own
// entity, because "am I the next one out" is a question about the whole card.
const binTile = (groups, entity, type, label, colours, containers) => {
  const { accent } = binColour(type, colours);
  const drawing = binDrawing(type, colours, containers);
  const lidImg = binLid(type, colours, containers);
  const hinge = binHinge(type, containers);
  const mine = `{% set me = rows | selectattr('e', 'eq', '${entity}') | first %}` +
    `{% set next = soon and me and me.n == soon.n and me.g == soon.g %}`;
  return {
    type: "custom:mushroom-template-card",
    vertical: true,
    icon: "mdi:trash-can",
    primary: binJ(groups, `${mine}{% if not me %}—{% else %}{% set r = me %}${BIN_ROW_WHEN}{% endif %}`),
    secondary: label,
    tap_action: { action: "none" },
    card_mod: { style: {
      "mushroom-shape-icon$": binTileDisc(".shape", drawing, lidImg, hinge, accent),
      "ha-tile-icon$": binTileDisc(".container", drawing, lidImg, hinge, accent),
      ".": `
      mushroom-shape-icon { --icon-size: 46px; }
      ha-tile-icon { --tile-icon-size: 46px; }
      ha-card {${binScan(groups)}${mine}
        {% if next and me.n <= 0 %}
          --tile-fade: 1; --tile-sat: 1.08; --tile-lift: -3px;
          --tile-bloom: 17px; --tile-anim: bin-nudge 1.6s ease-in-out infinite;
          --lid-anim: bin-lid-flap 2.6s ease-in-out infinite;
          --tile-day: rgb(${accent}); --tile-shadow: 0.46;
        {% elif next %}
          --tile-fade: 1; --tile-sat: 1; --tile-lift: -2px;
          --tile-bloom: 13px; --tile-anim: bin-nudge 3.4s ease-in-out infinite;
          --lid-anim: bin-lid-peek 5.2s ease-in-out infinite;
          --tile-day: rgb(${accent}); --tile-shadow: 0.42;
        {% else %}
          /* still legible, just clearly not the answer — at 0.46/0.25 the far household's row
             read as broken rather than quiet */
          --tile-fade: 0.62; --tile-sat: 0.45; --tile-lift: 0px;
          --tile-bloom: 0px; --tile-anim: none; --lid-anim: none;
          --tile-day: #9aa6b5; --tile-shadow: 0.20;
        {% endif %}
        ${BIN_FLAT}
        padding: 4px 0 2px 0 !important;
        min-height: 0 !important;
        --card-primary-font-size: 0.80rem;
        --card-primary-font-weight: 700;
        --card-secondary-font-size: 0.66rem;
        --card-primary-color: var(--tile-day, #9aa6b5);
        --card-secondary-color: #7d8797;
        transition: opacity 0.6s ease;
      }
      /* the kerb shadow — an ellipse under the bin, not under the whole tile, so the bins look
         like they are standing on something rather than floating in a list */
      ha-card::before {
        content: '';
        position: absolute;
        left: 50%; top: 50px;
        width: 42px; height: 9px;
        transform: translateX(-50%);
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(0,0,0,var(--tile-shadow, 0.25)) 0%, transparent 72%);
        pointer-events: none;
      }
      ${BIN_WRAP}`,
    } },
  };
};

// The bin drawing is the tile's whole icon — no disc behind it. A filled circle under every bin
// turns the lineup into a row of buttons, which is both uglier and a lie: none of this is
// tappable (wall-tablet touch safety — readouts are never controls).
const binTileDisc = (root, drawing, lidImg, hinge, accent) => `
      ${root} {
        position: relative;
        width: 46px !important;
        height: 46px !important;
        --icon-size: 46px !important;
        background: url("${drawing}") center/contain no-repeat !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        filter: drop-shadow(0 0 var(--tile-bloom, 0px) rgba(${accent}, 0.65))
                saturate(var(--tile-sat, 1)) opacity(var(--tile-fade, 1));
        transform: translateY(var(--tile-lift, 0px));
        transform-origin: 50% 92%;
        animation: var(--tile-anim, none);
        transition: filter 0.7s ease, transform 0.5s ease;
      }
      /* the lid, as its own layer so it can hinge. It is the whole reason the drawing is split
         in two: the bin that is going out lifts its lid, which is the single most bin-like thing
         a bin can do, and it costs one extra element. */
      ${root}::after {
        content: '';
        position: absolute;
        inset: 0;
        background: url("${lidImg}") center/contain no-repeat;
        transform-origin: ${hinge};
        animation: var(--lid-anim, none);
        pointer-events: none;
      }
      ${root} ::slotted(*) { display: none !important; }
      @keyframes bin-nudge {
        0%, 82%, 100% { transform: translateY(var(--tile-lift, 0px)) rotate(0deg); }
        88%           { transform: translateY(var(--tile-lift, 0px)) rotate(-4deg); }
        94%           { transform: translateY(var(--tile-lift, 0px)) rotate(3deg); }
      }
      /* tomorrow: one unhurried breath of a lid every few seconds */
      @keyframes bin-lid-peek {
        0%, 70%, 100% { transform: rotate(0deg); }
        80%, 88%      { transform: rotate(-17deg); }
      }
      /* collection day: it is properly awake — a wider flap, twice as often */
      @keyframes bin-lid-flap {
        0%, 55%, 100% { transform: rotate(0deg); }
        68%, 80%      { transform: rotate(-27deg); }
      }`;

// One household's bins, side by side, on a kerb line, **in date order left to right**.
//
// The order cannot be decided when the card is built — it depends on dates that only exist at
// render time, and it changes as collections pass. So the tiles are emitted in config order and
// re-ordered with CSS `order` on the flex children, computed in the wrapper's own Jinja (which
// has the full scan). Restyling beats re-rendering: no card is rebuilt when the order changes.
//
// ⚠️ MEASURED, and not what it looks like: a horizontal vertical-stack-in-card puts ALL its
// children inside ONE flex div (`ha-card > div > mushroom-template-card × n`), not one div each.
// The obvious `ha-card > div:nth-of-type(k)` therefore matches that single wrapper every time —
// every tile then reports the same computed `order` and nothing moves. The flex items are the
// cards themselves.
const binOrder = (groupIndex, entities) => entities.map((e, i) => `
      ha-card > div > mushroom-template-card:nth-of-type(${i + 1}) {
        order: {% set o = namespace(v=${i + 1}) %}
               {% for r in rows | selectattr('g', 'eq', ${groupIndex}) | sort(attribute='n') %}
                 {% if r.e == '${e}' %}{% set o.v = loop.index %}{% endif %}
               {% endfor %}{{ o.v }};
      }`).join("");

const binLineup = (groups, group, groupIndex, colours, containers) => ({
  type: "custom:vertical-stack-in-card",
  horizontal: true,
  cards: group.entities.map((e) =>
    binTile(groups, e, group.types[e] || "other", group.names[e] || "Bin", colours, containers)),
  card_mod: { style: { ".": `
      ha-card {${binScan(groups)}
        ${BIN_FLAT}
        position: relative;
        padding: 0 6px 6px 6px !important;
      }
      /* display:flex is needed for 'order' to mean anything, but it also makes the children
         shrink-to-fit and pack left. flex:1 1 0 puts them back on an even grid — otherwise the
         bins bunch at one end and the kerb line runs out from under the last of them. */
      ha-card > div > mushroom-template-card { flex: 1 1 0; min-width: 0; }
      ${binOrder(groupIndex, group.entities)}
      /* the kerb itself — a hairline the bins stand on, fading out at both ends */
      ha-card::after {
        content: '';
        position: absolute;
        left: 12px; right: 12px; top: 60px;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%,
                    rgba(var(--bin-rgb, 150,158,170), 0.28) 18%,
                    rgba(var(--bin-rgb, 150,158,170), 0.28) 82%, transparent 100%);
        pointer-events: none;
      }` } },
});

// A household's name, when there are two of them. Deliberately a chip rather than a card title:
// it is a divider, not a heading, and a full title row costs more vertical space than the label
// is worth.
const binGroupLabel = (label) => ({
  type: "custom:mushroom-chips-card",
  alignment: "start",
  chips: [{ type: "template", content: label, tap_action: { action: "none" } }],
  card_mod: { style: `
      ha-card {
        ${BIN_FLAT}
        padding: 6px 10px 0 10px !important;
        --chip-background: none;
        --chip-border-width: 0;
        --chip-height: 20px;
        --chip-font-size: 0.72rem;
        --chip-spacing: 0;
      }
      mushroom-template-chip { --chip-padding: 0; opacity: 0.62; letter-spacing: 0.04em; }` },
});

// ── config → groups ─────────────────────────────────────────────────────────────────────────
// Bin type and display name are resolved HERE, once, from the entity id — see the header note.
// The display name strips the household prefix the integration bakes into every friendly name
// ("Ellis Bins Refuse" → "Refuse"), because the card already says whose bins these are.
const binGroups = (c) => {
  const build = (entities, label) => {
    const list = (Array.isArray(entities) ? entities : entities ? [entities] : []).filter(Boolean);
    if (!list.length) return null;
    const types = {}, names = {};
    for (const e of list) {
      types[e] = binType(e);
      const tail = String(e).split(".")[1] || "";
      const word = tail.replace(/_/g, " ").split(" ").slice(-3).join(" ");
      names[e] = types[e] === "other"
        ? word.replace(/\b\w/g, (m) => m.toUpperCase())
        : { food: "Food waste", recycling: "Recycling", garden: "Garden waste", refuse: "Refuse" }[types[e]];
    }
    return { entities: list, label: label || "", types, names };
  };
  return [build(c.entities, c.label), build(c.entities_2, c.label_2)].filter(Boolean);
};

// ── registration ────────────────────────────────────────────────────────────────────────────
const BIN_COMMON = {
  entityOptional: true,
  domains: ["sensor"],
  stub: ["bin", "refuse", "recycling", "collection"],
  schema: [
    { name: "entities", selector: { entity: { multiple: true, domain: "sensor" } } },
    { name: "label", selector: { text: {} } },
    { name: "entities_2", selector: { entity: { multiple: true, domain: "sensor" } } },
    { name: "label_2", selector: { text: {} } },
    { name: "colours", selector: { text: {} } },
    { name: "containers", selector: { text: {} } },
    F.name,
  ],
  help: {
    entities: "The bin sensors — the main one per bin type, the one carrying a next_collection attribute",
    label: "Household name, shown only when a second household is configured",
    entities_2: "A second household's bin sensors — leave empty for an ordinary single-household card",
    label_2: "The second household's name",
    colours: `Bin type → colour, e.g. ${BIN_DEFAULT_COLOURS} (the default). Brighton & Hove inverts the usual scheme: refuse:green,recycling:black,food:orange. Use body/lid for a two-tone caddy, e.g. food:grey/green. Colours: ${Object.keys(BIN_COLOURS).join(", ")}`,
    containers: "Override the drawing per bin type, e.g. food:caddy,garden:wheelie. Food defaults to a caddy, everything else to a wheelie bin.",
    name: "Unused — the card names the bin that is going out",
  },
};

const BIN_DOCS = `For the [UK Bin Collection Data](https://github.com/robbrad/UKBinCollectionData)
integration. Bind the **main sensor for each bin type** — the one whose attributes include
\`next_collection\` — and the card does the rest.

- **Dates are computed from \`next_collection\` against \`now()\`, never from the sensor's state.**
  That state ("In 3 days") is worked out when the council was last scraped, so it goes stale between
  polls and is simply wrong if a scrape fails and the integration serves last-known-good data. The
  card re-derives every minute, so it is right even when the data behind it is a day old.
- **Colours must be configured** (\`colours\`). The integration's own \`colour\` attribute is not
  usable — Brighton & Hove, for one, reports \`black\` for every bin. And councils disagree about
  meaning: Brighton's **black** bin is recycling and its **green** bin is general waste, the inverse
  of most of England. The default is the commonest English scheme; one line changes it.
- **Two households on one card.** Fill in \`entities_2\` and \`label_2\` for a second address — a
  shared house, a corner property on two rounds, or an elderly relative's collections. Leave them
  empty and it is an ordinary one-household card with no labels.
- **Food waste is drawn as a caddy**, everything else as a wheelie bin; \`containers\` overrides it.
  A two-tone caddy (grey bucket, green lid) is \`food:grey/green\`.

Idle is quiet: a collection days out is a dim, still card. The evening before, the bin nudges and
the colour comes up; on the day it wobbles. A bin whose date has passed says "Missed" rather than
counting into negative days.

The large card needs **vertical-stack-in-card** (HACS).`;

registerKind("bin-collection", {
  ...BIN_COMMON,
  label: "Animated Bin Collection (large)",
  desc: "Which bin goes out and when — every bin, in its real colour, for one or two households",
  docs: BIN_DOCS,
  make: (c) => {
    const groups = binGroups(c);
    if (!groups.length) {
      return { type: "custom:mushroom-template-card", primary: "Bin Collection",
        secondary: "Pick your bin sensors", icon: "mdi:trash-can", tap_action: { action: "none" } };
    }
    const cards = [binHero(c, groups, c.colours, c.containers)];
    groups.forEach((g, i) => {
      if (groups.length > 1 && g.label) cards.push(binGroupLabel(g.label));
      cards.push(binLineup(groups, g, i, c.colours, c.containers));
    });
    return {
      type: "custom:vertical-stack-in-card",
      cards,
      card_mod: { style: { ".": `
      ha-card {${binScan(groups)}${binVars(groups, c.colours, c.containers)}}
      ${binSurface(18)}` } },
      grid_options: { columns: 12, rows: "auto" },
    };
  },
});

registerKind("bin-collection-small", {
  ...BIN_COMMON,
  label: "Animated Bin Collection (small)",
  desc: "The next bin out, at a glance — one tile, in the bin's own colour",
  docs: BIN_DOCS,
  make: (c) => {
    const groups = binGroups(c);
    if (!groups.length) {
      return { type: "custom:mushroom-template-card", primary: "Bin Collection",
        secondary: "Pick your bin sensors", icon: "mdi:trash-can", tap_action: { action: "none" } };
    }
    const hero = binHero(c, groups, c.colours, c.containers, { size: 46, surface: true, compact: true });
    hero.grid_options = { columns: 6, rows: "auto" };
    return hero;
  },
});

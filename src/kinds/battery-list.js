// kinds/battery-list.js — Animated Battery List (a Battery Notes shopping list).
//
// House-original kind; nothing upstream. It answers ONE question — "which batteries do I need to
// buy, and what goes where?" — and is deliberately empty the rest of the time (DESIGN.md rule 10,
// idle is quiet).
//
// The data all comes from the **Battery Notes** integration, which puts three entities on every
// battery device: a `binary_sensor.*_battery_plus_low` (state `on` = needs replacing, and it
// carries `battery_type`/`battery_quantity`/`device_name` as attributes), a
// `sensor.*_battery_plus` (the level %) and a `button.*_battery_replaced`. So there is nothing to
// bind: the card discovers the whole fleet with `integration_entities('battery_notes')` and needs
// no entity at all (`entityOptional`).
//
// Two things are opinionated:
//   · **Rechargeables are excluded.** "Which batteries do I need to buy" has no answer for a
//     phone or an iPad — you charge those. Battery Notes types them literally `Rechargeable`.
//     `include_rechargeable` opts them back in.
//   · **Grouping defaults to battery TYPE, not room**, because the default use is a shopping list
//     ("3× CR2450") rather than a repair round. `group_by: area` flips it.
//
// A device is listed when EITHER test fires:
//   · its level is at or below `threshold` (default **25 %**) — Battery Notes' own
//     `battery_low_threshold` is 10 %, which is the point where a remote has already stopped
//     working. 25 % is "put it on the shopping list", which is what this card is for; or
//   · Battery Notes itself says `on` — that respects a per-device threshold set higher than 25,
//     and it is the only signal for devices that report low/ok without a percentage at all.
//
// An `unknown`/`unavailable` low-sensor with no level is NOT a flat battery — plenty of devices
// here (every Tado TRV) never report a level, and listing those would make the card cry wolf.

const BL_LOW_RGB = "255, 152, 0";      // amber — something needs buying
const BL_OK_RGB = "52, 199, 89";       // green — nothing to do
const BL_DEAD_RGB = "120, 124, 130";   // grey — Battery Notes isn't there
const BL_NO_AREA = "Elsewhere";        // devices with no area assigned
const BL_THRESHOLD = 25;               // % at or below which a battery goes on the list

// ── the scan ────────────────────────────────────────────────────────────────────────────────
// One preamble, prefixed to EVERY option that reads it. Each card option is rendered as its own
// template, so a `{% set %}` here is invisible to the next option (repo trap #1) — hence blJ().
//
// Sort keys, not display values, carry the ordering: `sort` pushes an unknown level (-1) to the
// end instead of the front (it is the least urgent row, not the most), and `tkey`/`akey` prefix
// the catch-all groups with `~` (ASCII 126, after every letter) so "Unknown" and "Elsewhere"
// group last without the display name changing.
const blScan = (rech, thr) => `
        {% set ns = namespace(rows=[], tracked=0) %}
        {% for e in integration_entities('battery_notes')
             if e.startswith('binary_sensor.') and '_battery_plus_low' in e %}
          {% set ns.tracked = ns.tracked + 1 %}
          {% set t = state_attr(e, 'battery_type') or 'Unknown' %}
          {% set is_rech = 'rechargeable' in (t | lower) %}
          {% set lv = states(e | replace('binary_sensor.', 'sensor.')
                               | replace('_battery_plus_low', '_battery_plus')) | float(-1) %}
          {% if (is_state(e, 'on') or (lv >= 0 and lv <= ${thr})) and ${rech ? "true" : "not is_rech"} %}
            {% set a = area_name(e) or '${BL_NO_AREA}' %}
            {% set ns.rows = ns.rows + [{
                 'dev': state_attr(e, 'device_name') or e,
                 'type': t,
                 'tkey': ('~' ~ t) if t == 'Unknown' else t,
                 'qty': state_attr(e, 'battery_quantity') | int(1),
                 'area': a,
                 'akey': ('~' ~ a) if a == '${BL_NO_AREA}' else a,
                 'lvl': lv | round(0) | int,
                 'sort': (lv | round(0) | int) if lv >= 0 else 999 }] %}
          {% endif %}
        {% endfor %}
        {% set lows = ns.rows | sort(attribute='sort') | list %}
        {% set nlow = lows | count %}
        {% set dead = ns.tracked == 0 %}
        {% set ns2 = namespace(parts=[]) %}
        {% for t, rs in lows | groupby('tkey') %}
          {% set ns2.parts = ns2.parts + [(rs | map(attribute='qty') | sum) | string ~ '× ' ~ (rs | first).type] %}
        {% endfor %}
        {% set need = ns2.parts | join(' · ') %}`;

const blJ = (rech, thr, body) => `${blScan(rech, thr)}${body}`;

// ── the icon disc, in both structures ───────────────────────────────────────────────────────
// DESIGN.md rule 2: a Mushroom template card is TILE-based since 2026.7, so `mushroom-shape-icon$`
// silently no-ops there and the `ha-tile-icon$` mirror is what actually lands. Both are written.
const blDisc = (root, size) => `
      ${root} {
        ${size}
        /* !important: the tile icon's own radius arrives via adoptedStyleSheets and wins the tie
           otherwise — the disc renders as a squircle on some loads and a circle on others */
        border-radius: 9999px !important;
        background: rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.16) !important;
        box-shadow: 0 0 var(--bl-bloom, 0px) rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.55);
        animation: var(--bl-disc-anim, none);
        transition: background 0.6s ease, box-shadow 0.6s ease;
      }
      @keyframes bl-breathe {
        0%, 100% { box-shadow: 0 0 var(--bl-bloom, 8px) rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.35); }
        50%      { box-shadow: 0 0 calc(var(--bl-bloom, 8px) * 2.2) rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.75); }
      }`;

// colour + liveliness from the count alone. Nothing to buy = green and completely still.
const blVars = (rgb) => `
        {% if dead %}
          --bl-rgb: ${BL_DEAD_RGB}; --bl-bloom: 0px; --bl-bar-op: 0.25; --bl-sweep: none; --bl-disc-anim: none;
        {% elif nlow == 0 %}
          --bl-rgb: ${BL_OK_RGB}; --bl-bloom: 6px; --bl-bar-op: 0.45; --bl-sweep: none; --bl-disc-anim: none;
        {% else %}
          --bl-rgb: ${rgb}; --bl-bloom: 12px; --bl-bar-op: 0.9; --bl-sweep: bl-sweep 4.5s linear infinite;
          --bl-disc-anim: bl-breathe 3.4s ease-in-out infinite;
        {% endif %}`;

// children of a vertical-stack-in-card must be transparent or they repaint as opaque tiles over
// the wrapper (the "stack of pills" — see the repo's session gotchas)
const BL_FLAT = `
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;`;

const blBar = (pseudo) => `
      ha-card::${pseudo} {
        content: '';
        position: absolute;
        bottom: 0; left: 0;
        height: 3px; width: 100%;
        pointer-events: none;
        opacity: var(--bl-bar-op, 0.6);
        background: linear-gradient(90deg,
          rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.30) 0%,
          rgb(var(--bl-rgb, ${BL_LOW_RGB})) 18%,
          rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.30) 38%,
          rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.30) 100%);
        background-size: 260% 100%;
        box-shadow: 0 0 12px rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.55);
        animation: var(--bl-sweep, none);
        transition: opacity 0.8s ease;
      }
      @keyframes bl-sweep {
        from { background-position: 130% 0; }
        to   { background-position: -60% 0; }
      }`;

// how many devices need a battery — readable across the room without reading the rows
const BL_BADGE = `
      ha-card::after {
        content: '{% if dead %}—{% elif nlow == 0 %}✓{% else %}{{ nlow }}{% endif %}';
        position: absolute;
        top: 50%; right: 6px;
        transform: translateY(-50%);
        min-width: 26px;
        padding: 2px 8px;
        border-radius: 9px;
        text-align: center;
        font-size: 13px;
        font-weight: 800;
        color: rgb(var(--bl-rgb, ${BL_LOW_RGB}));
        background: rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.14);
        border: 1px solid rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.32);
        pointer-events: none;
      }`;

const BL_BODY_SURFACE = `
      ha-card {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        padding: 10px 10px 12px !important;
        border: 1px solid rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.20);
        background:
          radial-gradient(120% 80% at 50% 0%, rgba(var(--bl-rgb, ${BL_LOW_RGB}), var(--bl-wash, 0.07)) 0%, transparent 62%),
          linear-gradient(165deg, #151a20 0%, #0d1116 60%, #090c10 100%) !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.40);
        transition: border-color 0.8s ease, background 0.8s ease;
      }
      ${blBar("after")}`;

// ── header ──────────────────────────────────────────────────────────────────────────────────
// ⚠️ MEASURED (2026-07-26): Mushroom slots the primary/secondary text as light-DOM `<span>`s into
// `ha-tile-info`, and those spans are `white-space: nowrap; text-overflow: ellipsis`. The summary
// line — the entire point of this card's header — measured **273px of text in a 195px slot** and
// arrived as "Need: 2× AAA · 1× CR2 · 1× CR2…". It has to be allowed to wrap, and the card then
// needs right padding so the count badge doesn't sit on top of the second line.
// `overflow-wrap: anywhere` because a battery TYPE can be one long unbreakable token —
// "Need 2× Rechargeable" on a 145px tile clipped to "Need 2× Rechargeabl" without it.
const BL_WRAP = `
      ha-tile-info span[slot="secondary"] {
        white-space: normal !important;
        text-overflow: clip !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        line-height: 1.35 !important;
      }
      ha-tile-info span[slot="primary"] {
        white-space: normal !important;
        text-overflow: clip !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
      }`;

// `summary: false` gives the tile a count phrase instead of the full shopping list — the small
// tile is 145px wide (measured), and 273px of "2× AAA · 1× CR2 · …" cannot be made to fit at any
// font size worth reading. It says how many, and names the type only when there's just one.
const blHeader = (c, rgb, rech, thr, { badge = true, size = 46, summary = true } = {}) => ({
  type: "custom:mushroom-template-card",
  primary: c.name || "Batteries",
  secondary: blJ(rech, thr, `{% if dead %}No Battery Notes devices` +
    // "All batteries OK" wraps to three lines on a 145px tile — it says "All OK" there instead
    (summary
      ? `{% elif nlow == 0 %}All batteries OK{% else %}Need: {{ need }}{% endif %}`
      : `{% elif nlow == 0 %}All OK` +
        `{% elif ns2.parts | count == 1 %}Need {{ need }}` +
        `{% else %}{{ nlow }} to replace{% endif %}`)),
  icon: c.icon || blJ(rech, thr, `{% if dead %}mdi:battery-off-outline` +
    `{% elif nlow == 0 %}mdi:battery-check-outline` +
    `{% else %}mdi:battery-alert-variant-outline{% endif %}`),
  // a CSS colour rather than a Mushroom name, so a custom `color` reaches the icon too
  icon_color: blJ(rech, thr, `{% if dead %}disabled` +
    `{% elif nlow == 0 %}rgb(${BL_OK_RGB}){% else %}rgb(${rgb}){% endif %}`),
  tap_action: { action: "none" },
  card_mod: { style: {
    "mushroom-shape-icon$": blDisc(".shape", `--icon-size: ${size}px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;`),
    "ha-tile-icon$": blDisc(".container", `width: ${size}px !important; height: ${size}px !important;`),
    ".": `
      mushroom-shape-icon { --icon-size: ${size}px; }
      ha-tile-icon { --tile-icon-size: ${size}px; }
      ha-card {${blScan(rech, thr)}${blVars(rgb)}
        ${BL_FLAT}
        position: relative;
        /* right gap = room for the badge, so a wrapped summary never runs under it */
        padding: 2px ${badge ? "46px" : "4px"} 2px 4px !important;
        min-height: 0 !important;
        --card-primary-font-size: 1rem;
        --card-primary-font-weight: 600;
        --card-secondary-font-size: 0.78rem;
        --card-primary-color: #e8eef6;
        --card-secondary-color: #9aa6b5;
      }
      ${BL_WRAP}${badge ? BL_BADGE : ""}`,
  } },
});

// ── body ────────────────────────────────────────────────────────────────────────────────────
// HA's own markdown card, templated. Markdown (not a template card's secondary line) because the
// body needs real GROUP HEADINGS and rows — `###### h6` + `- li` are two selectors card-mod can
// style separately, where one text blob is just one blob.
//
// Whitespace control matters more than it looks: markdown needs `###### ` and `- ` at the START
// of a line, and Jinja's default is to keep the newline after a block tag. Hence `{%- ... -%}`
// on every tag that isn't meant to emit a line of its own.
const blRow = (byArea) => byArea
  // grouped by room: the type is what you need to know per row
  ? `- **{{ r.dev }}** · {{ r.type }}{% if r.qty > 1 %} ×{{ r.qty }}{% endif %}{% if r.lvl >= 0 %} · {{ r.lvl }}%{% endif %}`
  // grouped by type: the heading already said the type, so the row says where it lives
  : `- **{{ r.dev }}** · {{ r.area }}{% if r.lvl >= 0 %} · {{ r.lvl }}%{% endif %}`;

const blContent = (rech, thr, byArea) => {
  const key = byArea ? "akey" : "tkey";
  // `(rs | first).area` / `.type`, not the groupby key — the key carries the `~` sort prefix
  const heading = byArea
    ? `###### {{ (rs | first).area }}`
    : `###### {{ (rs | first).type }} · need ×{{ rs | map(attribute='qty') | sum }}`;
  return `${blScan(rech, thr)}
{%- for k, rs in lows | groupby('${key}') %}
${heading}
{% for r in rs %}${blRow(byArea)}
{% endfor %}
{%- endfor -%}`;
};

// ⚠️ MEASURED, not guessed (2026-07-26): the rendered markdown lives in **ha-markdown's SHADOW
// root** (ha-markdown #shadow → ha-markdown-element → h6/ul/li), so descendant selectors written
// in the card's own style block — `ha-markdown h6 { … }` — cannot reach it and style NOTHING.
// The first cut of this card did exactly that and shipped browser defaults: `ul` with **40px**
// left padding and 14px margins, `h6` with a 21.9px top margin, 14px rows, bullets. That sprawl
// is the whole difference between "a list" and "rubbish". Everything typographic therefore goes
// in the `ha-markdown$` block below, which card-mod injects INTO that shadow root.
const BL_MARKDOWN = `
      /* group heading — a quiet type-chip, not an h6-sized shout */
      h6 {
        margin: 9px 0 1px !important;
        font-size: 0.72rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.6px !important;
        text-transform: uppercase !important;
        color: rgb(var(--bl-rgb, ${BL_LOW_RGB})) !important;
        opacity: 0.95;
      }
      h6:first-child { margin-top: 1px !important; }
      /* the bullet and its 40px indent are pure noise — rows line up with the heading instead */
      ul {
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }
      /* Hanging indent: a row that wraps ("… Remote Control N2 · Top / Floor Kitchen · 100%")
         puts its continuation 10px in, so the device names stay the only things on the left
         margin and a wrapped row still reads as one row. */
      li {
        margin: 0 !important;
        padding: 1.5px 0 1.5px 10px !important;
        text-indent: -10px !important;
        font-size: 0.82rem !important;
        line-height: 1.4 !important;
        color: #93a0af !important;
      }
      /* the device name is what you scan for; where it lives is context */
      li strong { color: #dbe3ec !important; font-weight: 600 !important; }
      p { margin: 0 !important; }`;

const blBodyStyle = (rech, thr, maxH) => `
      ha-card {${blScan(rech, thr)}${BL_FLAT}
        padding: 0 4px 2px !important;
        /* nothing to buy → no empty shell, no padding, no hole (repo trap #2: display:none needs
           !important, Mushroom/HA adoptedStyleSheets cascade after card-mod's injected style) */
        display: {{ 'none' if (dead or nlow == 0) else 'block' }} !important;
        /* a pathological list must not turn the card into a page — scroll inside it. No fade mask
           here (unlike the todo card): CSS can't tell whether it actually overflows, and a
           permanent gradient over the last row dims a row that is usually the final one. */
        max-height: ${maxH}px;
        overflow-y: auto;
        scrollbar-width: thin;
      }`;

const blBody = (c, rech, thr, byArea) => ({
  type: "markdown",
  content: blContent(rech, thr, byArea),
  card_mod: { style: {
    "ha-markdown$": BL_MARKDOWN,
    ".": blBodyStyle(rech, thr, Number(c.max_height) > 0 ? Number(c.max_height) : 420),
  } },
});

// ── registration ────────────────────────────────────────────────────────────────────────────
const BL_COMMON = {
  entityOptional: true,
  schema: [
    { name: "group_by", selector: { select: { mode: "dropdown", options: ["type", "area"] } } },
    { name: "threshold", selector: { number: { min: 1, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
    { name: "include_rechargeable", selector: { boolean: {} } },
    F.name,
    F.icon,
    { name: "color", selector: { text: {} } },
  ],
  help: {
    group_by: "type = group by battery type, a shopping list (default) · area = group by room, a repair round",
    threshold: `List a battery at or below this % (default ${BL_THRESHOLD}). Battery Notes' own "low" flag always counts too, whatever this is set to.`,
    include_rechargeable: "Also list rechargeable devices (phones, tablets, curtain rails) — off by default, you charge those rather than buy them",
    name: "Card title (default: Batteries)",
    icon: "Overrides the state icon (alert when something is low, tick when not)",
    color: "Colour while something needs replacing, as R, G, B (default 255, 152, 0). All-OK is always green.",
  },
};

const BL_DOCS = `**No entity to bind** — the card finds every device tracked by the
[Battery Notes](https://github.com/andrew-codechimp/HA-Battery-Notes) integration by itself
(\`integration_entities('battery_notes')\`) and lists the ones whose battery needs replacing.

- **Grouped by battery type by default** — "CR2450 · need ×3" — because the usual question is
  what to buy. \`group_by: area\` regroups by room for the round of actually swapping them.
- **Lists anything at or below ${BL_THRESHOLD} %** (\`threshold\`), *or* whatever Battery Notes
  itself flags as low. Battery Notes' own default is 10 %, which is roughly the point where a
  remote has already stopped working — too late to be a shopping list. Both tests apply, so a
  per-device threshold set higher than ${BL_THRESHOLD} still counts.
- **Rechargeables are left out.** A phone or an iPad has no battery to buy; Battery Notes types
  those \`Rechargeable\`. \`include_rechargeable\` puts them back.
- **A level-less device is not a flat battery.** Plenty here (every Tado TRV) never report a
  percentage; they appear only if Battery Notes actually flags them, never on the threshold alone.
- Rows show the device, where it is (or the type, when grouped by room), and the level % when the
  device reports one — most urgent first, and devices with no area group under "Elsewhere", last.

Idle is quiet: with nothing to replace the card is a single green line — "All batteries OK", a ✓
badge, the body hidden entirely and no animation at all. Anything low turns it amber, sweeps the
bottom bar and breathes the icon disc. If the integration isn't installed the card says so in grey
rather than erroring.

Rows are read-only on purpose: pressing "battery replaced" resets the tracking date, so it belongs
in the device's own dialog, not one tap away from a list you're reading.

Needs **vertical-stack-in-card** (HACS) for the large size, like the other two-part cards here.`;

registerKind("battery-list", {
  ...BL_COMMON,
  label: "Animated Battery List (large)",
  desc: "Every battery that needs replacing, grouped by type (or room), with what to buy — from the Battery Notes integration, no entity needed",
  docs: BL_DOCS,
  schema: [...BL_COMMON.schema, { name: "max_height", selector: { number: { min: 60, max: 800, step: 10, mode: "box", unit_of_measurement: "px" } } }],
  help: { ...BL_COMMON.help, max_height: "How tall the list may get before it scrolls inside the card (default 420)" },
  make: (c) => {
    const rgb = c.color || BL_LOW_RGB;
    const rech = !!c.include_rechargeable;
    const thr = Number(c.threshold) > 0 ? Number(c.threshold) : BL_THRESHOLD;
    const byArea = c.group_by === "area";
    return {
      type: "custom:vertical-stack-in-card",
      cards: [blHeader(c, rgb, rech, thr), blBody(c, rech, thr, byArea)],
      card_mod: { style: { ".": `
      ha-card {${blScan(rech, thr)}${blVars(rgb)}
        --bl-wash: {{ '0.04' if (dead or nlow == 0) else '0.11' }};
      }
      ${BL_BODY_SURFACE}` } },
      grid_options: { columns: 12, rows: "auto" },
    };
  },
});

registerKind("battery-list-small", {
  ...BL_COMMON,
  label: "Animated Battery List (small)",
  desc: "Battery shopping tile — how many need replacing; tap-free glance, no list",
  docs: BL_DOCS,
  make: (c) => {
    const rgb = c.color || BL_LOW_RGB;
    const rech = !!c.include_rechargeable;
    const thr = Number(c.threshold) > 0 ? Number(c.threshold) : BL_THRESHOLD;
    // No badge at 6 columns — measured on the todo card, it lands on the name. And no full
    // shopping line either: this card measured **145px wide against 273px of text**, so
    // `summary: false` swaps it for a count ("5 to replace"), naming the type only when there
    // is just one ("Need 3× CR2450"). The large card is where the breakdown belongs.
    const card = blHeader(c, rgb, rech, thr, { badge: false, size: 40, summary: false });
    // the tile IS the whole card here, so it carries the surface itself
    card.card_mod.style["."] = card.card_mod.style["."]
      .replace(BL_FLAT, `
        border-radius: 18px;
        border: 1px solid rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.20);
        background:
          radial-gradient(120% 90% at 50% 0%, rgba(var(--bl-rgb, ${BL_LOW_RGB}), 0.08) 0%, transparent 65%),
          linear-gradient(160deg, #151a20 0%, #0b0f14 100%) !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
        overflow: hidden;`)
      // NB must match blHeader's badge-less padding exactly, or the tile keeps the 2px inset
      .replace("padding: 2px 4px 2px 4px !important;", "padding: 10px 12px !important;");
    card.card_mod.style["."] += blBar("after");
    card.grid_options = { columns: 6, rows: "auto" };
    return card;
  },
});

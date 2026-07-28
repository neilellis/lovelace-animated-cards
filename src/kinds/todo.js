// kinds/todo.js — Animated To-do / Shopping list.
//
// A `todo.*` entity's STATE is the number of outstanding items and nothing else — the item
// summaries are not attributes, they only arrive over the todo websocket API. So this card
// does two things and keeps them honest about which is which:
//
//   · the **header** is a Mushroom template card driven by that count — the icon, the badge,
//     the bar colour and every animation come from "how many are left" and "was it just
//     touched";
//   · the **list** underneath is HA's own `todo-list` card, nested. Ticking an item off has to
//     write back (to Alexa, to a local list, to CalDAV); a template card drawing rows would be
//     a read-only imitation. Same reasoning as the Alexa card's optional list section.
//
// Motion means something (DESIGN.md): empty is still and green, outstanding items sweep the
// bottom bar, and the card pulses for a few minutes after the list actually changed — the
// "someone just added something" beat. `unavailable` goes grey and dead still.

const TD_DEFAULT_RGB = "0, 202, 255";
const TD_DONE_RGB = "52, 199, 89";
const TD_DEAD_RGB = "120, 124, 130";

// the icon disc, drawn into BOTH icon structures (DESIGN.md rule 2: template-cards need the
// mushroom-shape-icon shadow block AND its ha-tile-icon mirror, because Mushroom's template
// card is tile-based since 2026.7 and mushroom-shape-icon$ silently no-ops there).
const tdDisc = (root, size) => `
      ${root} {
        ${size}
        /* !important: the tile icon own border-radius arrives via adoptedStyleSheets and wins
           the tie otherwise — the disc renders as a squircle on some loads and a circle on others */
        border-radius: 9999px !important;
        background: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.16) !important;
        box-shadow: 0 0 var(--td-bloom, 0px) rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.55);
        animation: var(--td-disc-anim, none);
        transition: background 0.6s ease, box-shadow 0.6s ease;
      }
      @keyframes td-breathe {
        0%, 100% { box-shadow: 0 0 var(--td-bloom, 8px) rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.35); }
        50%      { box-shadow: 0 0 calc(var(--td-bloom, 8px) * 2.2) rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.75); }
      }`;

// One preamble, prefixed to every option that reads the state. Each card option is rendered as
// its OWN template — a `{% set %}` in `icon` is invisible to `secondary` (see alexa-echo.js).
const tdState = (e) => `
        {% set raw = states('${e}') %}
        {% set dead = raw in ['unavailable', 'unknown'] %}
        {% set n = raw | int(0) %}
        {% set nm = (state_attr('${e}', 'friendly_name') or '') | lower %}
        {% set shop = 'shop' in nm or 'grocer' in nm or 'cart' in nm %}
        {% set fresh = not dead and (as_timestamp(now()) - as_timestamp(states['${e}'].last_changed, 0)) < 300 %}`;

const tdJ = (e, body) => `${tdState(e)}${body}`;

const tdIcon = (c) => c.icon
  ? `${c.icon}`
  : `{{ 'mdi:cart-outline' if shop else ('mdi:playlist-check' if n == 0 else 'mdi:format-list-checks') }}`;

// colour + how lively the card is, from the count alone
const tdVars = (rgb) => `
        {% if dead %}
          --td-rgb: ${TD_DEAD_RGB}; --td-bloom: 0px; --td-bar-op: 0.25; --td-sweep: none; --td-disc-anim: none;
        {% elif n == 0 %}
          --td-rgb: ${TD_DONE_RGB}; --td-bloom: 6px; --td-bar-op: 0.45; --td-sweep: none; --td-disc-anim: none;
        {% elif fresh %}
          --td-rgb: ${rgb}; --td-bloom: 14px; --td-bar-op: 1; --td-sweep: td-sweep 2.2s linear infinite;
          --td-disc-anim: td-breathe 2.2s ease-in-out infinite;
        {% else %}
          --td-rgb: ${rgb}; --td-bloom: 8px; --td-bar-op: 0.8; --td-sweep: td-sweep 4.5s linear infinite;
          --td-disc-anim: none;
        {% endif %}`;

// children of a vertical-stack-in-card must be transparent or they repaint as opaque tiles
// over the wrapper (the "stack of pills" — see the repo's session gotchas)
const TD_FLAT = `
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;`;

// the sweeping status bar, as a pseudo-element rule — the large card hangs it off the WRAPPER's
// ::after, the small tile off its own ::before (its ::after is the badge)
const tdBar = (pseudo) => `
      ha-card::${pseudo} {
        content: '';
        position: absolute;
        bottom: 0; left: 0;
        height: 3px; width: 100%;
        pointer-events: none;
        opacity: var(--td-bar-op, 0.6);
        background: linear-gradient(90deg,
          rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.30) 0%,
          rgb(var(--td-rgb, ${TD_DEFAULT_RGB})) 18%,
          rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.30) 38%,
          rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.30) 100%);
        background-size: 260% 100%;
        box-shadow: 0 0 12px rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.55);
        animation: var(--td-sweep, none);
        transition: opacity 0.8s ease;
      }
      @keyframes td-sweep {
        from { background-position: 130% 0; }
        to   { background-position: -60% 0; }
      }`;

// the count, as a badge — readable across the room without counting rows. Only on the large
// card: a 6-column tile is too narrow to carry it without landing on top of the name (measured
// — it overlapped "Shop 1 item to go"), and there the secondary line already says the count.
const tdBadge = (e) => `
      ha-card::after {
        content: '{% if dead %}—{% elif n == 0 %}✓{% else %}{{ n }}{% endif %}';
        position: absolute;
        top: 50%; right: 6px;
        transform: translateY(-50%);
        min-width: 26px;
        padding: 2px 8px;
        border-radius: 9px;
        text-align: center;
        font-size: 13px;
        font-weight: 800;
        color: rgb(var(--td-rgb, ${TD_DEFAULT_RGB}));
        background: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.14);
        border: 1px solid rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.32);
        pointer-events: none;
      }`;

// the wrapper's surface: dark panel, tinted wash, and the sweeping bar along the bottom edge
const TD_BODY = `
      ha-card {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        padding: 10px 10px 12px !important;
        border: 1px solid rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.20);
        background:
          radial-gradient(120% 80% at 50% 0%, rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), var(--td-wash, 0.07)) 0%, transparent 62%),
          linear-gradient(165deg, #151a20 0%, #0d1116 60%, #090c10 100%) !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.40);
        transition: border-color 0.8s ease, background 0.8s ease;
      }
      ${tdBar("after")}`;

const tdHeader = (c, rgb, { badge = true, size = 46 } = {}) => {
  const e = c.entity;
  return {
    type: "custom:mushroom-template-card",
    entity: e,
    primary: c.name || `{{ state_attr('${e}', 'friendly_name') }}`,
    secondary: tdJ(e, `{% if dead %}Unavailable` +
      `{% elif n == 0 %}All done` +
      `{% else %}{{ n }} item{{ '' if n == 1 else 's' }} to go{% endif %}` +
      `{% if fresh %} · just updated{% endif %}`),
    icon: tdJ(e, tdIcon(c)),
    // a CSS colour, not a Mushroom name, so a custom `color` reaches the icon too
    icon_color: tdJ(e, `{% if dead %}disabled{% elif n == 0 %}rgb(${TD_DONE_RGB}){% else %}rgb(${rgb}){% endif %}`),
    tap_action: { action: "more-info" },
    card_mod: { style: {
      "mushroom-shape-icon$": tdDisc(".shape", `--icon-size: ${size}px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;`),
      "ha-tile-icon$": tdDisc(".container", `width: ${size}px !important; height: ${size}px !important;`),
      ".": `
      mushroom-shape-icon { --icon-size: ${size}px; }
      ha-tile-icon { --tile-icon-size: ${size}px; }
      ha-card {${tdState(e)}${tdVars(rgb)}
        ${TD_FLAT}
        position: relative;
        padding: 2px 4px !important;
        min-height: 0 !important;
        --card-primary-font-size: 1rem;
        --card-primary-font-weight: 600;
        --card-secondary-font-size: 0.78rem;
        --card-primary-color: #e8eef6;
        --card-secondary-color: #9aa6b5;
      }${badge ? tdBadge(e) : ""}`,
    } },
  };
};

const tdList = (c) => ({
  type: "todo-list",
  entity: c.entity,
  // A shopping list keeps every ticked-off item forever (an Alexa list can carry hundreds), so
  // completed items bury the answer to "what do I still need". Opt in with `show_completed`.
  hide_completed: !c.show_completed,
  card_mod: { style: `
      ha-card {
        ${TD_FLAT}
        padding: 0 2px 2px !important;
        /* a long list must not turn the card into a page — scroll inside it instead */
        max-height: ${Number(c.max_height) > 0 ? Number(c.max_height) : 220}px;
        overflow-y: auto;
        /* fade the last row so a cut-off item reads as "scroll me", not as a glitch */
        -webkit-mask: linear-gradient(#000 calc(100% - 22px), transparent);
        mask: linear-gradient(#000 calc(100% - 22px), transparent);
      }
      /* the header row above already names the list and counts it */
      ha-card .header, ha-card h1, .card-header { display: none !important; }
      /* HA's "You have no to-do items!" is 53px of hole once completed items are hidden, and
         the badge already says ✓. Probed selector, not guessed. */
      p.empty { display: none !important; }
      /* ⚠️ MEASURED, not guessed (2026-07-25, HA 2026.7): the add field is an ha-input
         wrapping a wa-input — NOT the ha-textfield older card-mod snippets style, so those
         rules are dead here. Stock it is a 16px-padded row 80px tall, which on a 352px card is
         the single biggest block of whitespace; this halves it. */
      div.addRow {
        padding: 2px 2px 0 !important;
        ${c.hide_add ? "display: none !important;" : ""}
      }
      ha-input {
        padding-bottom: 0 !important;
        /* the stock field is an opaque #1A222C slab — the heaviest object on a dark card, and
           the one thing you look at least. These three names all resolve to that fill in
           2026.7 (probed), so all three are set rather than betting on which one wins. */
        --ha-color-form-background: rgba(255, 255, 255, 0.045);
        --mdc-text-field-fill-color: rgba(255, 255, 255, 0.045);
        --input-fill-color: rgba(255, 255, 255, 0.045);
        --wa-form-control-height: 38px;
        --wa-form-control-border-radius: 12px;
        --wa-form-control-value-color: #e8eef6;
        /* and its underline belongs to the card, not to the stock form palette */
        --wa-form-control-border-color: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.25);
        --mdc-text-field-idle-line-color: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.30);
        --mdc-text-field-hover-line-color: rgb(var(--td-rgb, ${TD_DEFAULT_RGB}));
      }
      /* left edges: the checkbox lines up with the header's icon disc rather than sitting
         20px inboard of it — three competing left edges is what makes a card look untidy */
      ha-check-list-item {
        padding: 0 6px !important;
        --mdc-typography-body1-font-size: 0.88rem;
        --mdc-theme-text-primary-on-background: #dbe3ec;
      }
      ha-checkbox {
        --mdc-checkbox-unchecked-color: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.55);
        --mdc-theme-secondary: rgb(var(--td-rgb, ${TD_DEFAULT_RGB}));
      }
      ha-list { --mdc-list-vertical-padding: 2px; }` },
});

// ── "Copy as plain text" ──────────────────────────────────────────────────────────────────
// A card kind emits Lovelace CONFIG, which has no way to run JS on a tap — so the copy button
// has to be a real custom element. It is deliberately NOT registered in window.customCards: it
// is a part of the to-do card, not something to pick from the card picker on its own.
const TD_COPY_TAG = "anim-todo-copy";

// ⚠️⚠️ THREE STAGES, AND THE THIRD IS NOT OPTIONAL (2026-07-29, reported from Neil's phone).
//
// 1. navigator.clipboard — needs a SECURE CONTEXT. This house's HA is plain http:// on the LAN,
//    so this only exists over the Nabu Casa https URL.
// 2. document.execCommand("copy") — the classic fallback. It works in desktop Chrome even on
//    http (verified), which is exactly why testing there gave a false pass: **iOS WKWebView, i.e.
//    the HA companion app, refuses it**. That was the actual report — "copy failed on mobile".
// 3. Give up on the clipboard and SHOW the text, selectable, for a long-press → Copy. Ugly, but
//    it cannot fail, and a copy button that silently does nothing is worse than an ugly one.
//
// So: never gate stage 1 on `isSecureContext` alone (some webviews expose the API anyway), always
// try/catch down the chain, and never assume stage 2 covers mobile.
const tdWriteClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through */ }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Must live in the LIGHT dom — execCommand("copy") does not see a selection inside a shadow
    // root. And it must be REAL-SIZED and on-screen-ish: iOS refuses to select a 1px, opacity-0
    // element, and a font-size under 16px makes Safari zoom the page.
    ta.setAttribute("readonly", "");
    ta.style.cssText =
      "position:absolute;left:-9999px;top:" + (window.pageYOffset || 0) +
      "px;width:2em;height:2em;padding:0;border:0;margin:0;font-size:16px;";
    document.body.appendChild(ta);
    // iOS Safari ignores .select() on a plain textarea; it needs a contentEditable range too.
    ta.contentEditable = "true";
    ta.readOnly = false;
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, 999999);
    let ok = false;
    try { ok = document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    if (ok) return true;
  } catch (e) { /* fall through */ }

  return false;   // caller falls back to showing the text
};

// ⚠️ `typeof customElements` guard, not a bare `customElements.get(...)`: build.mjs regenerates
// the README index by importing the concatenated bundle IN NODE (everything except the shell), so
// a kind file that touches a DOM global at load time fails the build. The shell gets away with its
// bare defines only because the probe excludes it.
if (typeof customElements !== "undefined" && !customElements.get(TD_COPY_TAG)) {
  class AnimTodoCopy extends HTMLElement {
    setConfig(config) {
      if (!config || !config.entity) throw new Error("anim-todo-copy: `entity` is required");
      this._config = config;
      this._build();
    }
    set hass(hass) { this._hass = hass; }
    getCardSize() { return 1; }

    _build() {
      if (this._built) return;
      this._built = true;
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          /* the list above ends in a fade mask hard against its last row — this padding is what
             keeps the button from looking welded to it */
          :host { display: block; padding: 4px 6px 6px; }
          button {
            width: 100%;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            margin: 0; padding: 9px 12px;
            font: inherit; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em;
            color: rgb(var(--td-rgb, ${TD_DEFAULT_RGB}));
            background: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.10);
            border: 1px solid rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.28);
            border-radius: 12px;
            cursor: pointer;
            transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
            -webkit-tap-highlight-color: transparent;
          }
          button:hover { background: rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.18); }
          button:active { transform: translateY(1px); }
          button.ok {
            color: rgb(${TD_DONE_RGB});
            background: rgba(${TD_DONE_RGB}, 0.16);
            border-color: rgba(${TD_DONE_RGB}, 0.42);
          }
          button.bad {
            color: #ff8a80;
            background: rgba(255, 138, 128, 0.14);
            border-color: rgba(255, 138, 128, 0.40);
          }
          svg { width: 15px; height: 15px; fill: currentColor; flex: none; }
          /* stage 3: the clipboard refused, so show the text and let them take it by hand */
          .fb { margin-top: 8px; }
          .fb[hidden] { display: none; }
          textarea {
            width: 100%; box-sizing: border-box;
            /* 16px or iOS zooms the page when it gets focus */
            font: 400 16px/1.45 var(--ha-font-family-body, inherit);
            color: #e8eef6;
            background: rgba(255, 255, 255, 0.045);
            border: 1px solid rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.28);
            border-radius: 12px;
            padding: 10px 12px;
            resize: vertical;
            -webkit-user-select: text; user-select: text;
          }
          .hint {
            margin: 6px 2px 0;
            font-size: 0.72rem; line-height: 1.35;
            color: #9aa6b5;
          }
        </style>
        <button type="button">
          <svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Copy list as text</span>
        </button>
        <div class="fb" hidden>
          <textarea readonly rows="6"></textarea>
          <div class="hint">Your browser wouldn't let the page copy for you. Long-press the text → <b>Select All</b> → <b>Copy</b>.</div>
        </div>`;
      root.querySelector("button").addEventListener("click", () => this._copy());
    }

    _flash(cls, label) {
      const btn = this.shadowRoot.querySelector("button");
      const span = btn.querySelector("span");
      clearTimeout(this._t);
      btn.classList.remove("ok", "bad");
      if (cls) btn.classList.add(cls);
      span.textContent = label;
      this._t = setTimeout(() => {
        btn.classList.remove("ok", "bad");
        span.textContent = "Copy list as text";
      }, 2000);
    }

    async _copy() {
      if (!this._hass) return this._flash("bad", "Not ready");
      try {
        // todo/item/list is the same WS command HA's own todo-list card uses. It returns EVERY
        // item including completed ones, so the filter is not optional — an Alexa shopping list
        // carries ~100 ticked-off items behind the handful that are actually outstanding.
        const res = await this._hass.callWS({ type: "todo/item/list", entity_id: this._config.entity });
        const all = res.items || [];
        const items = this._config.copy_completed ? all : all.filter((i) => i.status === "needs_action");
        if (!items.length) return this._flash("bad", "Nothing to copy");
        const text = items.map((i) => (this._config.copy_bullets ? `- ${i.summary}` : i.summary)).join("\n");

        if (await tdWriteClipboard(text)) {
          this._hideFallback();
          this._flash("ok", `Copied ${items.length} item${items.length === 1 ? "" : "s"}`);
        } else {
          // The clipboard is not available to us (iOS WKWebView over plain http). Don't just say
          // "failed" — put the text on screen so it can still be taken by hand.
          this._showFallback(text);
          this._flash(null, "Copy the text below");
        }
      } catch (err) {
        console.error("anim-todo-copy:", err);
        this._flash("bad", "Couldn't read the list");
      }
    }

    _showFallback(text) {
      const fb = this.shadowRoot.querySelector(".fb");
      const ta = fb.querySelector("textarea");
      ta.value = text;
      ta.rows = Math.min(12, Math.max(3, text.split("\n").length));
      fb.hidden = false;
      // pre-select, so on iOS a single long-press offers Copy straight away
      ta.focus();
      ta.setSelectionRange(0, ta.value.length);
    }

    _hideFallback() {
      const fb = this.shadowRoot.querySelector(".fb");
      if (fb) { fb.hidden = true; fb.querySelector("textarea").value = ""; }
    }
  }
  customElements.define(TD_COPY_TAG, AnimTodoCopy);
}

const tdCopy = (c) => ({
  type: `custom:${TD_COPY_TAG}`,
  entity: c.entity,
  copy_completed: !!c.show_completed,
  copy_bullets: !!c.copy_bullets,
});

const TD_COMMON = {
  domains: ["todo"],
  stub: ["todo", "shopping", "list"],
  schema: [
    F.icon,
    { name: "color", selector: { text: {} } },
    { name: "show_completed", selector: { boolean: {} } },
    { name: "hide_add", selector: { boolean: {} } },
    { name: "copy_button", selector: { boolean: {} } },
    { name: "copy_bullets", selector: { boolean: {} } },
    { name: "max_height", selector: { number: { min: 60, max: 800, step: 10, mode: "box", unit_of_measurement: "px" } } },
  ],
  help: {
    entity: "The to-do list — any `todo.*` entity (Alexa list, local to-do list, CalDAV, Google Tasks)",
    icon: "Defaults to a trolley for lists whose name says shopping, a checklist otherwise",
    color: "Colour while items are outstanding, as R, G, B (default 0, 202, 255). Done is always green.",
    show_completed: "Also show ticked-off items — off by default, because a shopping list never forgets one",
    hide_add: "Hide the 'Add item' field (view only)",
    copy_button: "Add a 'Copy list as text' button, so the whole list can be pasted into a message (large card only)",
    copy_bullets: "Copy each item as a '- ' bullet rather than a bare line",
    max_height: "How tall the list may get before it scrolls inside the card (default 220)",
  },
};

const TD_DOCS = `Works with **any \`todo.*\` entity** — an Alexa list, HA's own local to-do lists,
CalDAV, Google Tasks. Bind the list; nothing else to configure.

The list itself is **HA's own \`todo-list\` card nested inside**, so ticking an item off really
writes back to the source (and, for an Alexa list, removes it from what the Echo reads back).
Everything around it is the animation:

- **Empty is quiet** — green, still, a ✓ badge instead of a number.
- **Outstanding items** light the bottom bar in the accent colour and sweep it slowly.
- **Just changed** (something added or ticked in the last 5 minutes) speeds the sweep up and
  makes the icon disc breathe — the "someone put something on the list" beat.
- **Unavailable** goes grey and completely still.

**\`copy_button\`** adds a *Copy list as text* button under the list, so the whole thing can be
pasted into a message — one line per outstanding item (\`copy_bullets\` prefixes each with "- ").
It copies what the list actually holds at the moment you tap it, not what the card last drew.
⚠️ Large card only, and note that \`navigator.clipboard\` needs an **https** context: over a plain
\`http://\` LAN address the button falls back to the old \`execCommand\` path, which is why that
code is still there.

The count badge is the entity's state; a \`todo\` entity's state is exactly its number of
outstanding items. Tap the header for the full list dialog, including completed items.

Needs **vertical-stack-in-card** (HACS) for the large size, like the other two-part cards here.`;

registerKind("todo", {
  ...TD_COMMON,
  label: "Animated To-do List (large)",
  desc: "A working to-do/shopping list — tick items off, with a live count badge and a status bar that sweeps while anything is outstanding",
  docs: TD_DOCS,
  make: (c) => {
    const rgb = c.color || TD_DEFAULT_RGB;
    return {
      type: "custom:vertical-stack-in-card",
      cards: c.copy_button
        ? [tdHeader(c, rgb), tdList(c), tdCopy(c)]
        : [tdHeader(c, rgb), tdList(c)],
      card_mod: { style: { ".": `
      ha-card {${tdState(c.entity)}${tdVars(rgb)}
        --td-wash: {{ '0.04' if (dead or n == 0) else ('0.13' if fresh else '0.08') }};
      }
      ${TD_BODY}` } },
      grid_options: { columns: 12, rows: "auto" },
    };
  },
});

registerKind("todo-small", {
  ...TD_COMMON,
  label: "Animated To-do List (small)",
  desc: "List tile — how many items are left, sweeping bar while anything is outstanding; tap for the list",
  docs: TD_DOCS,
  make: (c) => {
    const rgb = c.color || TD_DEFAULT_RGB;
    // No badge at 6 columns (it lands on the name) and a 40px disc, so the count in the
    // secondary line — "1 item to go" — keeps its own row.
    const card = tdHeader(c, rgb, { badge: false, size: 40 });
    // the tile IS the whole card here, so it carries the surface itself rather than sitting
    // flat on a wrapper's, and the sweeping bar is its own ::after
    card.card_mod.style["."] = card.card_mod.style["."].replace(TD_FLAT, `
        border-radius: 18px;
        border: 1px solid rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.20);
        background:
          radial-gradient(120% 90% at 50% 0%, rgba(var(--td-rgb, ${TD_DEFAULT_RGB}), 0.08) 0%, transparent 65%),
          linear-gradient(160deg, #151a20 0%, #0b0f14 100%) !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
        overflow: hidden;`).replace("padding: 2px 4px !important;", "padding: 10px 12px !important;");
    card.card_mod.style["."] += tdBar("after");
    card.grid_options = { columns: 6, rows: "auto" };
    return card;
  },
});

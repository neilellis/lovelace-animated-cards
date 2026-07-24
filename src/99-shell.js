// 99-shell.js — turns every registered kind into a real, pickable Lovelace card.
//
// Each kind gets a custom element `anim-<kind>-card` (plus the generic `animated-card`
// with a kind dropdown). setConfig() runs the kind's make() to produce the exact
// Mushroom + card-mod config, then renders it with HA's own createCardElement — the same
// path vertical-stack uses, so card-mod picks up the nested card_mod exactly as it does
// inside a stack. Requirements: Mushroom + card-mod (both HACS) must be installed.

const schemaFor = (kind, generic) => {
  const def = KINDS[kind];
  const rows = [];
  if (generic) {
    rows.push({ name: "kind", required: true, selector: { select: {
      mode: "dropdown",
      options: Object.entries(KINDS)
        .sort((a, b) => a[1].label.localeCompare(b[1].label))
        .map(([k, d]) => ({ value: k, label: d.label })),
    } } });
  }
  if (def) {
    // entityOptional kinds (buttons that act on a list, chip rows) still offer the field —
    // it just isn't required, and drives `active`/more-info when set.
    rows.push({ name: "entity", required: !def.entityOptional,
      selector: def.entitySelector || { entity: def.domains ? { domain: def.domains } : {} } });
    rows.push(F.name);
    rows.push(...(def.schema || []));
  }
  return rows;
};

// ── picker preview: pick a plausible demo entity ────────────────────────────────────────
// HA calls getStubConfig both for the picker preview and for the config you get when you add
// the card. "First entity of a fitting domain" gave nonsense — the Backup Manager sensor
// previewing as a fridge — so candidates are scored instead: the kind's own words in the
// object_id/friendly name win, house plumbing (updates, backups, HACS, identify buttons)
// loses, and a live entity breaks ties so the preview actually animates rather than sitting
// dark. A kind can override the words with `stub: ["playstation", "xbox"]`.
const STUB_STOP = new Set(["animated", "card", "cards", "device", "plug", "any", "kind", "the", "and", "for"]);
const STUB_JUNK = /^(update|persistent_notification|automation|script|scene|button|conversation|stt|tts|ai_task)\.|backup|hacs|supervisor|watchdog|firmware|_uptime|identify|reboot|restart|do_not_disturb|_rssi|linkquality/;
const STUB_DULL = new Set(["off", "closed", "locked", "unavailable", "unknown", "none", "idle", "0", "standby", "not_home", "disarmed"]);
const stubWords = (kind, def) => {
  const words = def.stub || [...new Set(
    `${kind} ${def.label}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")
      .filter((w) => w.length > 2 && !STUB_STOP.has(w)))];
  // whole words only: a "washer" card must not adopt the *dish*washer
  return words.length ? new RegExp(`\\b(${words.join("|")})\\b`) : null;
};

// A card with no entity yet — the picker preview in a house that owns nothing fitting (no
// garage door, no CO₂ sensor), or one cleared in the editor. A muted tile in the kind's own
// icon reads better there than HA's bare description text or a red error card.
const placeholderFor = (def) => {
  let icon = "mdi:card-outline";
  let grid;
  try {
    const c = def.make({ entity: "" });
    grid = c.grid_options;
    if (typeof c.icon === "string" && /^mdi:[\w-]+$/.test(c.icon)) icon = c.icon;
  } catch (e) { /* kind can't render entity-less — the generic icon still works */ }
  return {
    type: "custom:mushroom-template-card",
    primary: def.label.replace(/^Animated /, ""),
    secondary: "Pick an entity",
    icon, icon_color: "disabled",
    tap_action: { action: "none" },
    grid_options: grid || { columns: 6, rows: 2 },
  };
};

// ha-form is defined lazily by HA — force-load it via a built-in card editor
let haFormReady;
const ensureHaForm = () => haFormReady || (haFormReady = (async () => {
  if (customElements.get("ha-form")) return;
  const helpers = await window.loadCardHelpers();
  const probe = helpers.createCardElement({ type: "entities", entities: [] });
  await probe.constructor.getConfigElement?.();
})());

class AnimCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  set kind(k) { this._kind = k; }        // fixed kind (per-kind cards)
  set generic(g) { this._generic = g; }  // kind picked in the form (animated-card)

  _render() {
    if (!this._config) return;
    const kind = this._generic ? this._config.kind : this._kind;
    const def = KINDS[kind];
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) =>
        s.name.replace(/_entity$/, " sensor").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      this._form.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        const value = e.detail.value || {};
        const config = { ...this._config, ...value };
        for (const row of this._form.schema || []) {
          const v = value[row.name];
          if (v === undefined || v === null || v === "") delete config[row.name];
        }
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        if (this._generic) this._render(); // kind may have changed → new schema
      });
      this.appendChild(this._form);
    }
    this._form.computeHelper = (s) => def?.help?.[s.name] ?? HELP[s.name];
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = schemaFor(kind, this._generic);
  }
}
if (!customElements.get("anim-card-editor")) customElements.define("anim-card-editor", AnimCardEditor);

class AnimatedCardBase extends HTMLElement {
  static kind = ""; // per-kind subclasses pin this; the generic card reads config.kind

  setConfig(config) {
    const kind = this.constructor.kind || config.kind;
    const def = KINDS[kind];
    if (!def) throw new Error(`animated-card: unknown kind "${kind ?? ""}" — use one of: ${Object.keys(KINDS).sort().join(", ")}`);
    this._config = config;
    this._inner = (!config.entity && !def.entityOptional) ? placeholderFor(def) : def.make(config);
    this._build();
  }

  async _build() {
    const token = (this._buildToken = {});
    if (!AnimatedCardBase._helpers) AnimatedCardBase._helpers = await window.loadCardHelpers();
    if (token !== this._buildToken) return; // superseded by a newer setConfig
    const el = AnimatedCardBase._helpers.createCardElement(this._inner);
    // hui-error-card fires ll-rebuild once a missing element gets defined (e.g. Mushroom
    // loading after us) — rebuild so the real card appears without a refresh.
    el.addEventListener("ll-rebuild", (e) => { e.stopPropagation(); this._build(); }, { once: true });
    if (this._hass) el.hass = this._hass;
    this._card = el;
    this.replaceChildren(el);
  }

  set hass(h) { this._hass = h; if (this._card) this._card.hass = h; }

  getCardSize() {
    return this._card?.getCardSize ? this._card.getCardSize() : (this._inner?.grid_options?.rows ?? 2);
  }
  // Sections-view default footprint = the kind's grid_options; resizable in the layout tab.
  getGridOptions() {
    const g = this._inner?.grid_options || {};
    return { columns: g.columns ?? 6, rows: g.rows ?? 2 };
  }
  getLayoutOptions() { // pre-2024.11 name, kept for older frontends
    const g = this.getGridOptions();
    return { grid_columns: g.columns, grid_rows: g.rows };
  }

  static async getConfigElement() {
    await ensureHaForm();
    const el = document.createElement("anim-card-editor");
    el.kind = this.kind;
    el.generic = !this.kind;
    return el;
  }

  static getStubConfig(hass, entities, entitiesFallback) {
    const kind = this.kind || "lamp";
    const def = KINDS[kind] || KINDS.lamp;
    const wrap = (entity) => (this.kind ? { entity } : { kind: "lamp", entity });
    if (!def.domains) return this.kind ? {} : { kind: "lamp" };
    const states = hass?.states || {};
    const fits = (id) => {
      if (!def.domains.includes(id.split(".")[0])) return false;
      if (!def.deviceClass) return true;
      return def.deviceClass.includes(states[id]?.attributes?.device_class);
    };
    const words = stubWords(kind, def);
    const nameOf = (id) => states[id]?.attributes?.friendly_name || id;
    const score = (id) => {
      const st = states[id];
      const state = String(st?.state ?? "").toLowerCase();
      const hay = `${id.split(".").slice(1).join(".")} ${st?.attributes?.friendly_name || ""}`.toLowerCase();
      let s = def.domains.length - def.domains.indexOf(id.split(".")[0]); // the kind's own domain first
      if (words?.test(hay)) s += 12;                                 // it IS one of these things
      if (STUB_JUNK.test(id) || STUB_JUNK.test(hay)) s -= 25;        // plumbing, not a device
      if (["unavailable", "unknown", "none", ""].includes(state)) s -= 6; // don't preview a dead device
      else if (!STUB_DULL.has(state)) s += 3;                        // live → the preview animates
      return s;
    };
    const pool = [...new Set([...(entities || []), ...(entitiesFallback || []), ...Object.keys(states)])].filter(fits);
    if (!pool.length) return wrap("");
    // ties break on the tidier name — a 40-character sub-sensor makes an ugly preview
    pool.sort((a, b) => score(b) - score(a) || nameOf(a).length - nameOf(b).length || a.localeCompare(b));
    return wrap(pool[0]);
  }
}

window.customCards = window.customCards || [];
for (const [kind, def] of Object.entries(KINDS)) {
  const el = `anim-${kind}-card`;
  if (customElements.get(el)) continue; // e.g. dev resource + HACS resource both loaded
  const cls = class extends AnimatedCardBase {};
  cls.kind = kind;
  customElements.define(el, cls);
  window.customCards.push({
    type: el, name: def.label, description: `${def.desc} (Mushroom + card-mod)`,
    preview: true, documentationURL: "https://github.com/neilellis/lovelace-animated-cards",
  });
}
if (!customElements.get("animated-card")) {
  class AnimatedCard extends AnimatedCardBase {}
  customElements.define("animated-card", AnimatedCard);
  window.customCards.push({
    type: "animated-card", name: "Animated Card (any kind)",
    description: "One card, every animated kind — pick the kind in the editor",
    preview: true, documentationURL: "https://github.com/neilellis/lovelace-animated-cards",
  });
}

console.info(
  `%c ANIMATED-CARDS %c v${ANIM_CARDS_VERSION} — ${Object.keys(KINDS).length + 1} cards registered `,
  "background:#03a9f4;color:#fff;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#37474f;color:#fff;border-radius:0 4px 4px 0;padding:2px 6px",
);

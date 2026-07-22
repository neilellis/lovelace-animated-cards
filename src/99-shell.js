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
    if (!config.entity && !def.entityOptional) throw new Error(`${def.label}: entity is required`);
    this._config = config;
    this._inner = def.make(config);
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
    const def = KINDS[this.kind] || KINDS.lamp;
    if (!def.domains) return this.kind ? {} : { kind: "lamp" };
    const fits = (id) => {
      if (!def.domains.includes(id.split(".")[0])) return false;
      if (!def.deviceClass) return true;
      const dc = hass?.states?.[id]?.attributes?.device_class;
      return def.deviceClass.includes(dc);
    };
    const entity = (entities || []).find(fits)
      || (entitiesFallback || []).find(fits)
      || Object.keys(hass?.states || {}).find(fits)
      || "";
    return this.kind ? { entity } : { kind: "lamp", entity };
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

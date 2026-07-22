// 00-core.js — kind registry + shared helpers for the animated-cards bundle.
//
// The bundle (dist/animated-cards.js) is a single ES module concatenated by build.mjs:
//   00-core.js → 01-factories.js → 10-kinds-base.js → kinds/*.js (sorted) → 99-shell.js
// Everything shares one module scope; there are no imports/exports between src files.
//
// ── KIND CONTRACT (what kinds/*.js files register) ──────────────────────────────────────
// registerKind("<kebab-name>", {
//   label:   "Animated Foo",              // picker name
//   desc:    "one-line picker blurb",     // picker description (suffix added by shell)
//   domains: ["switch", ...],             // entity domains (stub config + entity selector)
//   deviceClass: ["motion", ...],         // optional — narrows stub-config entity choice
//   entitySelector: { entity: {...} },    // optional — overrides the editor's entity selector
//   schema:  [ ...ha-form rows... ],      // editor fields beyond entity + name (use F.* where possible)
//   help:    { field: "helper text" },    // optional — editor helper text (merged over HELP)
//   make:    (c) => ({ ...mushroom card config with card_mod + grid_options... }),
// });
//
// `make` receives the FLAT card config (entity, name, plus schema field values) and returns
// a complete Mushroom + card-mod card config — the same shape you'd paste as YAML. Rules
// (see DESIGN.md): keyframes live STATIC in the shadow blocks with
// `animation: var(--x-anim, <likely-truth default>)`; Jinja only sets CSS custom properties
// on the host `.` block; template-cards need BOTH `mushroom-shape-icon$` and an
// `ha-tile-icon$` mirror; icon spin/transform rules go in the host block (ha-state-icon is
// slotted); parameterise every entity id and colour.

const KINDS = {};
const registerKind = (name, def) => {
  if (KINDS[name]) console.warn(`animated-cards: kind "${name}" registered twice — keeping the first`);
  else KINDS[name] = def;
};

// drop unset/empty option values so factory defaults apply
const prune = (o) => {
  const r = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") r[k] = v;
  return r;
};

// Jinja that renders the entity's friendly name — the default `primary` for template-cards
const friendly = (entity) => `{{ state_attr('${entity}', 'friendly_name') }}`;

// NB there is deliberately no "derive on/off from a power sensor" option here. It existed until
// 2026-07-22 and was removed: it was a workaround for a flaky Tuya cloud link (stale states read
// as a lying switch), and it masked the real fault. A card reflects its entity's state.

const MUSHROOM_COLORS = [
  "primary", "accent", "red", "pink", "purple", "deep-purple", "indigo", "blue",
  "light-blue", "cyan", "teal", "green", "light-green", "lime", "yellow", "amber",
  "orange", "deep-orange", "brown", "light-grey", "grey", "blue-grey", "black", "white",
];

// common ha-form rows — reuse these in kind schemas so editors stay consistent
const F = {
  name: { name: "name", selector: { text: {} } },
  icon: { name: "icon", selector: { icon: {} } },
  color: { name: "color", selector: { select: { mode: "dropdown", custom_value: true, options: MUSHROOM_COLORS } } },
  glow: { name: "glow", selector: { text: {} } },
  active: { name: "active", selector: { text: {} } },
  speed: { name: "speed", selector: { text: {} } },
  variant: (options) => ({ name: "variant", selector: { select: { mode: "dropdown", options } } }),
};

// shared editor helper text (kind defs can override/extend via def.help)
const HELP = {
  name: "Defaults to the entity's friendly name",
  glow: "Glow colour as R, G, B — e.g. 255, 193, 7",
  active: "State that counts as active (default: on)",
  speed: "Animation duration, e.g. 1.6s (smaller = faster)",
  variant: "Which of the upstream designs to render",
};

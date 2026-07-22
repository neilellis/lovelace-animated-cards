# Converting an upstream card into a kind

Source corpus: `Anashost/HA-Animated-cards` (CC BY-NC-SA 4.0) — one markdown file per card
under the `animated-cards` skill's `reference/` tree. Each file holds a YAML Mushroom card
with a `card_mod` style block, hardcoded to the author's entities. A "kind" is that card
generalised: entities/colours/thresholds become options, and the config is produced by a
`make(c)` function registered with `registerKind` (contract in `src/00-core.js`).

## File layout

One kind per file in `src/kinds/<kind>.js`. The file may hold local `const`s (keyframes,
ramps, shared Jinja snippets) plus exactly the `registerKind` call(s) it owns. No imports,
no exports, no `window`/`customElements` access — the file is concatenated into one module
scope where the helpers from `src/00-core.js` (`prune`, `friendly`, `powerOf`, `F`, `HELP`,
`MUSHROOM_COLORS`) and every factory in `src/01-factories.js` are already in scope.
Validate with `node --check src/kinds/<file>.js` (parse only — globals are fine).

## Non-negotiable rules (each learned the hard way — see also the upstream
`design-principles.md` in the skill)

1. **Instant-animation contract.** card-mod applies a style block only after any Jinja in it
   round-trips through the server. So: `@keyframes` + an always-present
   `animation: var(--x-anim, <most-likely-truth default>)` live STATIC in the shadow block;
   the host `.` block carries ALL the Jinja and only sets CSS custom properties
   (`--x-anim`, colour vars, opacity vars) that inherit through the shadow boundary.
   Default = what's probably true before the template settles (a washer is usually idle →
   default `none`; a light card glows by default only if that's the common state).
2. **Two icon structures.** On current Mushroom, `mushroom-template-card` is TILE-based:
   no `mushroom-shape-icon` exists and a `mushroom-shape-icon$` block silently no-ops.
   Every template-card kind carries BOTH blocks: the legacy `mushroom-shape-icon$`
   (target `.shape`) AND an `ha-tile-icon$` mirror (target `.container`, add
   `border-radius: 9999px`), keyframes duplicated into each block.
   `mushroom-entity-card`/`-light-card`/`-media-player-card` only need the legacy block.
3. **Slotted icons.** `ha-state-icon` is slotted in both structures — icon spin/transform
   rules go in the HOST `.` block (`ha-state-icon, ha-icon { … }`), never in a `$` block.
4. **Parameterise everything.** Entity ids, colours, thresholds, texts. The card's own
   entity is `c.entity` — reference it as `config.entity` inside Jinja where possible;
   companion sensors interpolate as literal ids. Colour options: Mushroom colour names via
   `F.color`-style selects for `icon_color`, and `R, G, B` strings for glow/rgba vars.
5. **Helper-template cards.** Upstream "dumb appliance" cards lean on a separate template
   sensor. Prefer inlining the logic (power-threshold Jinja like `onTest` in
   `01-factories.js`); if real statefulness is required (delayed "finished" detection),
   keep the card driveable by any state-reporting entity and document the expected states
   in `docs`.
6. **Truthful defaults.** `float(-1)`-style fallbacks so `unavailable` reads as off/dead,
   never as a plausible 0. Dead entities get a dimmed grey look, not a lie.
7. **Variants, not kind explosions.** Where upstream ships the same device with 2–3 looks,
   register ONE kind with a `variant` select (`F.variant([...])`) and branch in `make`.
8. **Footprint.** `grid_options` on every config: vertical tiles `{columns: 6, rows: 2}`,
   compact rows `{columns: 6, rows: 1}`, wide/hero cards `{columns: 12, rows: 2–3}`.
9. **Kind def extras.** `label` ("Animated Foo"), one-line `desc`, `domains`,
   `deviceClass` where it helps entity pickers, `schema` rows (reuse `F.*`), `help` text for
   every non-obvious option, and an optional `docs` paragraph (rendered into the README)
   for required companion sensors or caveats.

## Style

Match `src/10-kinds-base.js` and the factories: terse, comment only the non-obvious
(why a default, why a structure), keep the upstream card number in a comment
(`// upstream: README #22 - Kettle`) so provenance survives.

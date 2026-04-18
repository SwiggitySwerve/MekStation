# Change: Add SPA Picker Component

## Why

Phase 5 (Pilot SPA UI) needs a shared, reusable surface for browsing the
91-entry unified SPA catalog that already lives in `src/lib/spa/`. Every
downstream Phase 5 change — pilot editor integration, pilot-sheet display,
designation persistence — expects a single picker component so the browsing
UX (tabs, search, filters, source badges, cost labels, designation prompts)
is consistent everywhere. Without this component, each consumer would
re-implement the same list rendering + filter logic and the UX would drift.

Phase 5 can run in parallel with Phases 1, 2, and 3; the picker touches only
UI and the existing catalog module, so it will not conflict with in-flight
engine work in Lane A.

## What Changes

- Add `SPAPicker` React component under `src/components/spa/SPAPicker/`
  that renders the 91-entry catalog with category tabs (Piloting, Gunnery,
  Miscellaneous, Infantry, aToW, Manei Domini / Bioware, Unofficial, Edge).
- Add search input that filters by `displayName`, `description`, and
  `source` across all categories.
- Add source-filter chips (`CamOps`, `MaxTech`, `ATOW`, `ManeiDomini`,
  `Unofficial`, `Legacy`).
- Each entry row shows `displayName`, `description`, XP cost badge (or
  "Origin-Only" / "Flaw" badge when applicable), source badge, and category
  color swatch.
- Clicking a row emits a `(spa, designation?)` selection event; when the SPA
  has `requiresDesignation = true`, the picker opens a secondary
  designation prompt keyed on `designationType` (weapon type, weapon
  category, target, range bracket, skill, terrain) before resolving the
  selection.
- Add new spec `spa-ui` to own every requirement for the picker surface.

## Dependencies

- **Requires**: unified SPA catalog at `src/lib/spa/` (exists), pilot types
  at `src/types/spa/SPADefinition.ts` (exists), `spa-combat-integration`
  spec (exists, unmodified here).
- **Related**: can land in parallel with Phases 1/2/3 since it is pure UI.
- **Required By**: `add-pilot-spa-editor-integration`,
  `add-spa-display-on-pilot-sheet-and-unit-card`,
  `add-spa-designation-persistence`.

## Impact

- Affected specs: new `spa-ui` spec (ADDED), `pilot-system` (MODIFIED —
  adds a UI-layer picker contract for pilots to browse abilities).
- Affected code: new `src/components/spa/SPAPicker/` module (component,
  tab bar, filter bar, row renderer, designation prompt, tests). No
  changes to the catalog or the existing combat modifier layer.
- Non-goals: purchase flow (belongs to the editor change), pilot-sheet
  rendering (belongs to the display change), persistence of designation
  choices (belongs to the designation change).
- Database: no changes.

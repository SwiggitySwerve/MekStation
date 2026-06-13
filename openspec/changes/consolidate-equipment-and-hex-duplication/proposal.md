# Change: Consolidate Equipment and Hex Duplication

## Why

The 2026-06-12 full codebase review (Wave 3, cluster H-ARCH) found load-bearing
duplication that taxes every future parity edit and is the mechanical cause of
the silent-BV-gap class of bugs.

- **H-1 (high)** — four divergent `normalizeEquipmentId` implementations produce
  *different keys for the same input*. The catalog-driven normalizer at
  `src/utils/construction/equipmentBV/normalization.ts:20` resolves through the
  catalog, name-mappings, aliases, abbreviations, and regex patterns. The MTF
  importer at `src/services/conversion/MTFParser.mapping.ts:75` only does
  `lower → space-to-hyphen → strip () → slash-to-hyphen` (`'Ultra AC/5'` →
  `ultra-ac-5`). The unit-loader at
  `src/services/units/unitLoaderService/equipmentResolution.ts:132` collapses
  separators, strips a `clan-` prefix, and regex-maps to short forms
  (`ultra-ac-5` → `uac-5`). The sim hydration path at
  `src/simulation/runner/UnitHydration.ts:710` strips leading digits, lowercases,
  and removes *all* non-alphanumerics (`ultra-ac-5` → `ultraac5`). Equipment
  resolved on one pipeline can mismatch the same item on another — the exact
  drift class the review names as the cause of most parity findings.
- **[med] dead cube-rounding picker** — `_pixelToHex`/`_roundHex` at
  `src/components/gameplay/HexMapDisplay/renderHelpers.ts:39` round through the
  cube constraint correctly but have zero importers, while the *live* picker
  `pixelToHex` at `src/constants/hexMap.ts:96` rounds `q` and `r`
  independently with `Math.round`, which does not preserve `q + r + s = 0` — so
  the live picker can select the wrong hex near tile boundaries.
- **[med] types-layer runtime leak** — `src/types/equipment/weapons/index.ts:25`
  re-exports `@/utils/equipment/weapons/utilities` (which pulls a runtime
  `getEquipmentLoader` import) back into the type layer for backward
  compatibility — a half-done migration that puts runtime code behind a type
  import root.
- **[med] store name collision + ownership overlap** — `useForceStore`
  (`src/stores/useForceStore.ts:33`) and `useForcesStore`
  (`src/stores/campaign/useCampaignStore.ts`) collide by name with no
  documented ownership boundary, part of a ~55-store proliferation with 3-way
  roster/forces overlap.
- **[low] hex math copies** — `hexDistance` is duplicated at
  `src/constants/hexMap.ts:110` (Manhattan-style `/2` form) and
  `src/utils/gameplay/hexMath.ts:111` (axial `max(|dq|,|dr|,|ds|)` form); a third
  copy lives at `src/utils/gameplay/aerospace/movement.ts:83`. `hexToPixel` is
  copied at `src/constants/hexMap.ts:83`,
  `src/components/gameplay/HexMapDisplay/renderHelpers.ts:29`, and
  `src/components/gameplay/DeploymentZonePreview.tsx:95`.
- **[low] backward-compat re-export shims** accumulate around all three sites.

This is a remediation *plan* — it specifies the consolidation work and pins the
target behavior into the three owning capability specs so the duplication cannot
silently re-grow.

## What Changes

- Designate the catalog-driven `normalizeEquipmentId`
  (`equipmentBV/normalization.ts`) as the single canonical equipment-ID
  normalizer, and route the MTF importer, the unit-loader resolution path, and
  the sim-runner hydration path through it (or a shared adapter that delegates to
  it). Remove the three divergent local implementations; replace them with thin
  re-exports only if external importers require source-stable paths.
- Delete the dead `_pixelToHex`/`_roundHex` from `renderHelpers.ts` and make the
  live picker cube-round through the correct algorithm, so the only live
  pixel-to-hex path preserves `q + r + s = 0`.
- Consolidate `hexToPixel` / `pixelToHex` / `hexDistance` into a single
  hex-coordinate math module (`utils/gameplay/hexMath.ts` for axial math; one
  pixel-conversion home for layout math), with every caller importing from it;
  remaining same-name exports are re-export shims, not independent copies.
- Move the runtime `utilities` re-export out of the
  `types/equipment/weapons` barrel; consumers import the runtime utilities from
  `@/utils/equipment/weapons/utilities` directly. The type barrel re-exports only
  types/interfaces/enums.
- Document store ownership for the `useForceStore` (deployment/force-builder) vs
  `useForcesStore` (campaign roster) split so the name collision is intentional
  and bounded, with a single owning store per concern.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `equipment-services`: gains a "Canonical Equipment ID Normalization"
  requirement mandating a single normalizer routed by every equipment-resolution
  pipeline (MTF import, unit-loader, sim hydration, BV catalog).
- `hex-coordinate-system`: the existing "Distance Calculation" requirement is
  tightened to mandate a single shared distance implementation; a new
  "Pixel-Hex Conversion" requirement mandates one cube-rounded picker and one
  layout module.
- `unit-store-architecture`: gains a "Force Store Ownership Boundary"
  requirement disambiguating `useForceStore` from `useForcesStore`.

## Impact

- `src/utils/construction/equipmentBV/normalization.ts` (canonical normalizer —
  unchanged behavior, becomes the single source).
- `src/services/conversion/MTFParser.mapping.ts:75`,
  `src/services/units/unitLoaderService/equipmentResolution.ts:132`,
  `src/simulation/runner/UnitHydration.ts:710` (route through canonical
  normalizer; remove local impls).
- `src/components/gameplay/HexMapDisplay/renderHelpers.ts` (delete dead picker,
  re-export `hexToPixel`), `src/constants/hexMap.ts` (cube-round picker; re-export
  `hexDistance`), `src/utils/gameplay/hexMath.ts` (canonical axial math),
  `src/utils/gameplay/aerospace/movement.ts:83`,
  `src/components/gameplay/DeploymentZonePreview.tsx:95`.
- `src/types/equipment/weapons/index.ts:25` (drop runtime re-export).
- `src/stores/useForceStore.ts`, `src/stores/campaign/useCampaignStore.ts`
  (ownership comment/doc; no behavior change).

## Non-goals

- No change to *how* any one normalizer or hex formula computes — the canonical
  implementations are kept; only the duplicates are removed and routed. This is a
  consolidation, not a parity correction (BV-value parity is owned by
  `restore-bv-parity-reproducibility`).
- No store-count reduction beyond the named `useForceStore`/`useForcesStore`
  ownership boundary; the broader ~55-store proliferation is out of scope.
- No tactical-map perf or legibility work (cluster T, owned by
  `fix-tactical-map-perf-and-legibility` and the active legibility/extrusion
  changes).
- No new equipment IDs, catalog entries, or hex API surface — existing public
  signatures are preserved.

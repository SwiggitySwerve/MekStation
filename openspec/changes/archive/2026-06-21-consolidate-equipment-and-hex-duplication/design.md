# Design: Consolidate Equipment and Hex Duplication

## Context

Three distinct duplication sites surfaced in the 2026-06-12 review's H-ARCH
cluster. Each has the same shape: a correct, complete implementation coexists
with one or more divergent copies, and the divergence is silent because no test
pins the copies to agree. The most dangerous is H-1 — four `normalizeEquipmentId`
functions produce different keys for `'Ultra AC/5'` depending on which pipeline
(MTF import / unit-loader / sim hydration / BV catalog) calls them, so the same
physical item resolves differently across the stack. The hex picker and
hexToPixel/hexDistance copies are lower risk but identical in kind, and the
types-barrel runtime leak is a half-finished migration that will be re-imported
incorrectly if left.

Verified in-session against HEAD:

- `equipmentBV/normalization.ts:20` — catalog → stripped → alias → name-mapping →
  abbreviation → no-spaces → hyphenated → regex-pattern fallthrough. Most
  complete.
- `MTFParser.mapping.ts:75` — `lower → \s+→'-' → strip () → '/'→'-'`. `'Ultra AC/5'`
  → `'ultra-ac-5'`.
- `equipmentResolution.ts:132` — `lower/trim → [ \-_]+→'-' → strip clan- → regex
  maps ultra-ac-N→uac-N, rotary-ac-N→rac-N`. `'ultra-ac-5'` → `'uac-5'`.
- `UnitHydration.ts:710` — `strip ^\d+- → lower → remove [^a-z0-9]`. `'ultra-ac-5'`
  → `'ultraac5'`.
- `hexMap.ts:96` live `pixelToHex` rounds `q`,`r` independently (`Math.round`);
  `renderHelpers.ts:49` `_roundHex` rounds through the cube constraint and is
  dead. `hexMap.ts:110` `hexDistance` = `(|dq|+|dq+dr|+|dr|)/2`;
  `hexMath.ts:111` `hexDistance` = `max(|dq|,|dr|,|ds|)` (matches the spec's
  stated formula); `aerospace/movement.ts:83` is a third copy.
- `types/equipment/weapons/index.ts:25` re-exports
  `@/utils/equipment/weapons/utilities` (runtime `getEquipmentLoader`).
- `useForceStore` at `stores/useForceStore.ts:33`; `useForcesStore` in
  `stores/campaign/useCampaignStore.ts` (campaign roster).

## Decisions

### D1 — Canonical normalizer is the catalog-driven `equipmentBV` one

The `equipmentBV/normalization.ts` implementation is the only one that resolves
against the actual catalog and the name-mappings file, so it is a superset of
what the three local copies attempt. It becomes the single source. The other
three call sites are refactored to delegate to it. **Rationale**: choosing any of
the lossy copies would regress the catalog/alias/regex coverage the BV path
relies on; choosing the most complete one is the only direction that cannot lose
resolution power. The `_unitTechBase` parameter in `equipmentResolution.ts:132`
is preserved at the adapter boundary if the canonical normalizer cannot consume
it — see Open Question 1.

### D2 — Delegate, don't rewrite, to bound blast radius

Each call site is rewritten to `import { normalizeEquipmentId } from <canonical>`
(or a 3-line adapter that pre/post-processes for that site's contract), not
re-implemented. Old exported symbols that external modules import become
re-export shims pointing at the canonical function. **Rationale**: a delegation
refactor is mechanically reviewable and keeps import paths stable; a rewrite
would re-introduce the same divergence risk this change exists to remove.

### D3 — Red-first key-agreement probe precedes deletion

Before deleting any local normalizer, add a test that feeds a fixed corpus of
ambiguous inputs (`'Ultra AC/5'`, `'Clan ER PPC'`, `'LB 10-X AC'`,
`'Rotary AC/5'`, ammo names) through all four current functions and asserts they
*disagree today* (proving the bug is observable), then flips to asserting they
*agree* (resolve to the same canonical key) after routing through the canonical
normalizer. **Rationale**: the divergence is silent precisely because nothing
compares the outputs; the agreement test is the guard that stops it re-growing.

### D4 — Live picker adopts cube rounding; dead picker deleted

The live `pixelToHex` (`hexMap.ts:96`) is changed to round through the cube
constraint (the algorithm currently dead in `renderHelpers.ts` `_roundHex`).
`_pixelToHex`/`_roundHex` are deleted. **Rationale**: independent `Math.round` of
`q` and `r` can land on a hex that violates `q + r + s = 0`, selecting the wrong
tile near boundaries; the cube-rounded algorithm is the correct one and already
exists — it was just never wired to the live picker.

### D5 — Single hex-math home; `hexMath.ts` owns axial distance

`hexMath.ts` already owns `axialToCube`/`hexDistance`/`cubeDistance` and is the
pure-math module. Its `hexDistance` (`max(|dq|,|dr|,|ds|)`) is the spec-stated
formula and becomes the single implementation; `hexMap.ts:110` and
`aerospace/movement.ts:83` become re-export shims. `hexToPixel`/`pixelToHex`
(layout math, needs `HEX_SIZE`) live in one layout home (`hexMap.ts`), and
`renderHelpers.ts` + `DeploymentZonePreview.tsx` re-export rather than copy.
**Rationale**: distance is pure coordinate math (no pixel size) and belongs with
the other axial operations; pixel conversion is layout math and belongs where
`HEX_SIZE` is defined. The two homes have a clean dependency direction (layout
depends on math, not vice versa).

### D6 — Force-store boundary is documented, not merged

`useForceStore` (deployment/force-builder concern) and `useForcesStore`
(campaign roster concern) are kept as separate stores with a documented
ownership boundary in each file's header and the spec, not merged. **Rationale**:
the review flags the *name collision and undocumented overlap*, not that the two
concerns must be one store; merging two live stores is a behavior-bearing change
out of scope for a consolidation pass. The minimal correct fix is to make the
split intentional and bounded.

### D7 — Types barrel drops the runtime re-export

`types/equipment/weapons/index.ts` removes the
`export * from '@/utils/equipment/weapons/utilities'` line; the few importers
that still reach the runtime utilities through the type root are updated to
import from `@/utils/equipment/weapons/utilities`. **Rationale**: a type barrel
that pulls a runtime `getEquipmentLoader` import is a cross-layer leak; the
relocation comment already admits this is backward-compat debt — this change
finishes the migration.

## Open Questions

1. Does the canonical `equipmentBV` normalizer need the `_unitTechBase` context
   that `equipmentResolution.ts:132` threads (for `clan-` disambiguation), or is
   the catalog lookup tech-base-agnostic? Resolve in task 1.1 by tracing both;
   if context is needed, the adapter supplies it rather than forking the
   canonical function.
2. Are any of the three local normalizers imported by tests or external modules
   under their current names? Task 1.2 inventories importers to decide which
   re-export shims are required vs. which can be hard-deleted.

## Risks

- **Behavior shift on import-path consumers** — routing MTF/hydration through the
  catalog normalizer changes the *output key* for inputs the lossy copies
  resolved differently. This is the intended fix, but it can ripple into
  downstream lookups keyed on the old (wrong) value. Mitigation: D3 agreement
  test + run the full unit suite and the BV validation harness; any lookup that
  breaks was relying on a divergent key and is itself a latent bug.
- **Catalog dependency at import time** — the canonical normalizer calls
  `loadEquipmentCatalog()`; the sim-runner hydration path may run in a context
  where the catalog is not yet loaded. Mitigation: verify catalog availability on
  the hydration path in task 1.1; if it is lazy, the adapter guards or
  pre-warms it.
- **Re-shim drift** — re-export shims can themselves rot into copies again.
  Mitigation: the spec requirements pin "single implementation"; the
  key-agreement and distance-equivalence tests fail if a shim diverges.
- **Picker rounding change is user-visible** — fixing `pixelToHex` to cube-round
  changes which hex a click near a boundary selects. This is a correctness fix,
  but add a regression test pinning a known boundary click to the cube-correct
  hex so the change is intentional and observable.

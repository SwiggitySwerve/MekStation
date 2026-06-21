# Tasks: Consolidate Equipment and Hex Duplication

## 1. Investigation and red-first evidence

- [x] 1.1 Trace the canonical `normalizeEquipmentId` in
  `src/utils/construction/equipmentBV/normalization.ts` end-to-end: confirm it is
  tech-base-agnostic or determine whether the `_unitTechBase` threaded by
  `src/services/units/unitLoaderService/equipmentResolution.ts:132` is required;
  confirm whether `loadEquipmentCatalog()` is available on the sim-runner
  hydration path (`src/simulation/runner/UnitHydration.ts:710`). Records the
  answers in the PR description (resolves design Open Question 1 + the
  catalog-availability risk).
- [x] 1.2 Inventory importers of each local normalizer
  (`MTFParser.mapping.ts:75`, `equipmentResolution.ts:132`,
  `UnitHydration.ts:710`) and of each duplicated hex function
  (`hexMap.ts:83/96/110`, `renderHelpers.ts:29`, `DeploymentZonePreview.tsx:95`,
  `aerospace/movement.ts:83`, `hexMath.ts:111`) to decide which re-export shims
  are required vs. hard-deletable (resolves Open Question 2).
- [x] 1.3 Write a red-first equipment-key agreement probe: feed a fixed corpus
  (`'Ultra AC/5'`, `'Clan ER PPC'`, `'LB 10-X AC'`, `'Rotary AC/5'`, a Streak SRM
  ammo name) through all four current `normalizeEquipmentId` implementations and
  assert they produce *divergent* keys today (proves H-1 is observable before the
  fix).
- [x] 1.4 Write a red-first picker probe: assert the live
  `pixelToHex` (`src/constants/hexMap.ts:96`) selects a hex that violates
  `q + r + s = 0` for a pixel near a tile boundary, while the dead `_roundHex`
  (`renderHelpers.ts:49`) cube-rounds the same input correctly.

## 2. Canonical equipment-ID normalizer

- [x] 2.1 Confirm the public signature of the canonical
  `equipmentBV/normalization.ts` `normalizeEquipmentId` covers every call site's
  needs (per task 1.1); add a thin adapter (e.g.
  `normalizeEquipmentIdForImport`) only if a site needs site-specific
  pre/post-processing (tech-base context, ammo-key shaping).
- [x] 2.2 Route `src/services/conversion/MTFParser.mapping.ts:75` through the
  canonical normalizer (delegate or adapter); replace the local body with a
  re-export shim or hard-delete per task 1.2.
- [x] 2.3 Route `src/services/units/unitLoaderService/equipmentResolution.ts:132`
  through the canonical normalizer, supplying tech-base context at the adapter
  boundary if required; remove the local regex-mapping body.
- [x] 2.4 Route `src/simulation/runner/UnitHydration.ts:710` through the canonical
  normalizer, guarding/pre-warming the catalog if hydration runs before catalog
  load; remove the local strip-all-non-alphanumeric body.
- [x] 2.5 Flip the task 1.3 probe to assert all routed call sites now resolve the
  corpus to the *same* canonical key.

## 3. Hex math + picker consolidation

- [x] 3.1 Delete `_pixelToHex` and `_roundHex` from
  `src/components/gameplay/HexMapDisplay/renderHelpers.ts`; change the live
  `pixelToHex` in `src/constants/hexMap.ts:96` to round through the cube
  constraint (the deleted `_roundHex` algorithm).
- [x] 3.2 Designate `src/utils/gameplay/hexMath.ts` `hexDistance`
  (`max(|dq|,|dr|,|ds|)`) as the single distance implementation; convert
  `src/constants/hexMap.ts:110` and `src/utils/gameplay/aerospace/movement.ts:83`
  to re-export shims (adapting the `(q1,r1,q2,r2)` vs `(a,b)` argument shapes at
  the shim boundary).
- [x] 3.3 Keep `hexToPixel`/`pixelToHex` (layout math) in one home
  (`src/constants/hexMap.ts`); convert
  `src/components/gameplay/HexMapDisplay/renderHelpers.ts:29` and
  `src/components/gameplay/DeploymentZonePreview.tsx:95` `hexToPixel` to imports
  of the single layout export.
- [x] 3.4 Flip the task 1.4 picker probe to assert the live `pixelToHex` now
  satisfies `q + r + s = 0` and selects the cube-correct hex on the boundary
  fixture; add a distance-equivalence test asserting the shimmed `hexDistance`
  forms return identical results across a coordinate corpus.

## 4. Types barrel + store ownership

- [x] 4.1 Remove the `export * from '@/utils/equipment/weapons/utilities'` runtime
  re-export from `src/types/equipment/weapons/index.ts:25`; update importers that
  reach the runtime utilities via the type root to import from
  `@/utils/equipment/weapons/utilities` directly. The barrel re-exports only
  types/interfaces/enums after this.
- [x] 4.2 Add an ownership header comment to `src/stores/useForceStore.ts`
  (deployment/force-builder concern) and `src/stores/campaign/useCampaignStore.ts`
  (`useForcesStore` = campaign roster concern) documenting the bounded split; no
  state or action changes.

## 5. Verification and documentation

- [x] 5.1 Full verification: `npx tsc --noEmit --skipLibCheck`, `oxlint`,
  `oxfmt --check`, the affected Jest suites (equipment resolution, MTF import,
  unit-loader, sim hydration, hex math, picker), the key-agreement +
  picker + distance-equivalence probes from groups 1/2/3 all green, and the BV
  validation harness shows no regression vs. the pre-change baseline.
- [x] 5.2 Run `npx openspec validate consolidate-equipment-and-hex-duplication
  --strict` and confirm it prints valid.
- [x] 5.3 Update `docs/audits/2026-06-12-full-codebase-review.md` H-ARCH cluster:
  mark H-1 and the dead-picker / types-barrel / store-collision / hex-dupe
  mediums-and-lows as remediated by this change (single canonical normalizer,
  single picker, single hex-math home, documented store boundary).

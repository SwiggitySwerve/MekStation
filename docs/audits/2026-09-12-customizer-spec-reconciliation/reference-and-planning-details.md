# Reference and planning changes

This companion records the remaining specification and reference edits. These descriptions were produced by the bounded Luna lanes and integrated with the current diff. Local verification results and limitations are consolidated in README.md; a source pointer establishes navigation, not runtime acceptance. The lane notes below preserve their intermediate validation observations. Their earlier unit-services validation failure and touched-test format warning have since been resolved; parent strict validation passes all 235 items, and the touched test passes formatting.

## Generated equipment data and compendium

# Scoped data and compendium specification reconciliation

Date: 2026-09-12
Scope: data-loading-architecture, equipment-services, compendium-browser.

## Changes made

- openspec/specs/data-loading-architecture/spec.md now defines the generated official equipment index as the file-discovery authority. It documents the actual version, generatedAt, files, and category-level totalItems shape, split category directories, and the rule that loaders must not assume obsolete aggregate files. The fallback section now says hardcoded definitions are runtime utility safety nets only and cannot satisfy official catalog validation or parity checks.
- openspec/specs/equipment-services/spec.md now requires weapon and non-weapon loading to read category file maps from public/data/equipment/official/index.json, enumerate the mapped split files, and convert each item. The old aggregate paths are identified as obsolete requirements. Its lookup fallback contract is explicitly separated from official validation, combat parity, and catalog completeness.
- openspec/specs/compendium-browser/spec.md now includes the shipped BattleMech chassis index in Compendium scope and documents the direct /compendium/chassis link. The hub scenario covers all four destinations and links the chassis identity source to openspec/specs/battlemech-chassis-index/spec.md. It also records that chassis identity does not imply a 3D asset or reuse-rights approval.

## Live evidence used

- public/data/equipment/official/index.json is version 2.0.0 with generatedAt, a nested files map for weapons, ammunition, electronics, and miscellaneous, and category counts in totalItems.
- A fresh read-only reconciliation found no missing mapped paths. The declared category metadata is not a raw row count: current file rows are weapons 469, ammunition 289, electronics 40, and miscellaneous 322; declared counts are 460, 289, 40, and 321, with one duplicate miscellaneous identifier (cargo). The spec therefore treats totalItems as generated metadata and leaves completeness and identifier uniqueness to validation.
- src/services/equipment/EquipmentOfficialLoader.ts:53-63,104-106,132-134,160-162 reads index.json, uses the mapped category paths, and falls back to the split-file defaults only when an index category is absent.
- src/services/equipment/EquipmentLoaderConfig.ts:1-44 lists the live split defaults, including weapons/energy-laser.json, weapons/energy-ppc.json, nested ammunition/electronics/miscellaneous files, and weapons/physical.json.
- src/services/equipment/EquipmentLookupService.ts:82-95,125-140 confirms JSON is the primary lookup source and hardcoded data is a runtime fallback.
- src/pages/compendium/index.tsx:45-55 exposes the shipped /compendium/chassis hub link; src/pages/compendium/chassis.tsx and src/components/compendium/chassis/\* implement the chassis surface.
- src/services/units/chassis/chassisIndex.ts:61-140 builds stable chassis identities and variants from the canonical BattleMech unit index.

## Validation

- openspec.cmd validate data-loading-architecture --strict passed.
- openspec.cmd validate equipment-services --strict passed.
- openspec.cmd validate compendium-browser --strict passed.
- npm.cmd run spec:purpose:validate:strict passed: 220 files scanned, 0 errors, 0 tracked source-of-truth debt.
- git diff --check for the three scoped specs passed.
- node node_modules/oxfmt/bin/oxfmt --check was attempted but this formatter rejects Markdown targets (Expected at least one target file); Markdown formatting was instead checked through the strict OpenSpec parser and git diff --check.

## Boundaries

- No runtime source, generated data, active change package, or Git state was modified.
- Legacy aggregate path names remain only in explanatory negative clauses so future readers can identify the removed contract; they are no longer presented as files the loader must open.

## Active planning corrections

# Active planning reconciliation result

Checked against repository head `be7f85b867aa3e8576e5e3d27e309276203bc24b` on 2026-09-12. This lane changed planning/specification text only. No runtime source, test, ledger, archive, branch, commit, or external system was changed.

## Reconciled active changes

### `add-saved-custom-unit-campaign-roster`

- `proposal.md` now records the original four-stock-only limitation as historical context. Its current contract consumes `enable-saved-custom-unit-combat`: a server-saved, supported biped BattleMech may be admitted through exact `customCombatRefs`; local-only, unsupported, malformed, deleted, stale, or absent custom references remain blocked with an explicit per-unit reason. The canonical-only fast-forward boundary remains unchanged.
- The affected capability line for `mission-contracts` now says that exact supported custom references are admitted through the authoritative custom catalog and unresolved/unsupported references are refused.
- The non-goal now limits future expansion beyond supported server-saved biped BattleMechs and preserves canonical-only fast-forward. It no longer claims that all custom combat adaptation is future work.
- The journey contract now covers supported custom admission and canonical admission from a mixed roster, plus an invalid/unavailable custom blocker with no side effect. The CAMP-01H assertion vocabulary distinguishes `unsupportedCustomLaunchBlockedWithoutSideEffect`, `supportedCustomSelectionLaunched`, and `supportedCustomConstructionSnapshot`.
- `design.md` D6 was renamed and rewritten as source-aware admission through canonical membership or exact custom-catalog membership. Browser snapshots may carry canonical refs plus optional custom refs; Node fast-forward remains canonical-only. Supported custom rows are launchable, while invalid/unavailable rows remain visible and recoverable.
- The roster task receipt now points historical campaign-journal consumption at `openspec/changes/archive/2026-08-21-adopt-campaign-event-journal-authority` and identifies `design-campaign-authority-and-sync` task 5.7 as the current campaign authority responsibility.

The six broad roster task boxes remain unchecked. Static implementation/report evidence does not replace the required exact-main CAMP receipts, three-witness journey, or archive gates.

### `design-vault-campaign-separation-and-maps`

- Decision D3 now records the `CreateCampaignPage.submit.ts` fuzzy `UNIT_TEMPLATES` name/tonnage match as resolved on 2026-09-12. The live code builds the projection with the selected instance id and appends that instance id to the root force; it does not infer membership from name or tonnage.
- D3 remains a regression contract for the first future vault implementation wave. The task is checked only for this resolved prerequisite and explicitly says that the remaining vault/campaign implementation tasks are still open.
- The migration plan now calls for regression coverage of the resolved identity seam rather than a second deletion task.

### `add-cross-stream-effect-receipts`

- Task 0.1 now cites the verified archived combat predecessor at `openspec/changes/archive/2026-08-29-adopt-combat-event-journal-authority` and the archived campaign predecessor at `openspec/changes/archive/2026-08-21-adopt-campaign-event-journal-authority`.
- The task retains `design-campaign-authority-and-sync` as the current successor dependency and requires a fresh exact-main successor receipt. An old receipt or an absent active predecessor path cannot unblock this proposed 51-task implementation.

### `harden-gm-two-player-campaign-sessions`

- The rollback receipt cites the archived combat delta path and retains its historical proof wording.
- The historical `#998 armor-seed` wording is corrected.
- A dated qualification records that older CAMP receipts describing a blanket custom-unit launch gate are historical. Current supported server-saved biped admission and immutable `GameCreated` construction are delegated to the custom combat catalog contract; Node fast-forward remains canonical-only and broader journal/correction gates remain open.

## Evidence

- Live D3 source: `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.submit.ts:152-188` uses `unit.id` for the roster projection and root-force membership; no `UNIT_TEMPLATES` match remains in that seam.
- Live custom admission seams include `src/pages/api/units/custom/combat-catalog.ts`, `src/types/contracts/CustomCombatSnapshot.ts`, and the `GameCreated` lifecycle/replay types.
- Both predecessor archive directories exist at the cited paths.
- `git diff --check` passed for the assigned planning files.
- Strict validation passed for all four owned changes:
  - `openspec validate add-saved-custom-unit-campaign-roster --strict --no-interactive`
  - `openspec validate design-vault-campaign-separation-and-maps --strict --no-interactive`
  - `openspec validate add-cross-stream-effect-receipts --strict --no-interactive`
  - `openspec validate harden-gm-two-player-campaign-sessions --strict --no-interactive`

No product tests were run by this read/write planning lane; parent integration owns the broader suite and final current-head proof.

## Source annotation and implementation-map cleanup

# Reference Cleanup Result

Date: 2026-09-12
Owner: Luna inventory/reference cleanup
Scope: five assigned canonical specifications plus eligible `@spec` annotations in `src/`, `e2e/`, and `scripts/`.

## Specification edits

- `openspec/specs/battle-armor-unit-system/spec.md`
  - Removed the volatile `Lines` column and all approximate line counts from the implementation table.
  - Kept the file and responsibility mapping intact, so the table remains a navigation aid without presenting stale LOC as contract evidence.

- `openspec/specs/vehicle-unit-system/spec.md`
  - Removed the volatile `Lines` column and all source line counts from the source table.
  - Clarified `VehicleDiagram.tsx` as a deprecated compatibility wrapper that delegates to `VehicleArmorDiagram` and preserves legacy imports.
  - Added `VehicleArmorDiagram.tsx` as the primary SVG vehicle armor diagram implementation.
  - Preserved the existing vehicle source file responsibilities and requirements.

- `openspec/specs/construction-rules-core/spec.md`
  - Replaced line ranges with symbol references for `getLocationShorthand`, `getLocationFullName`, `LOCATION_SHORTCUTS`, `SIDEBAR`, and `Z_INDEX`.

- `openspec/specs/toast-notifications/spec.md`
  - Replaced the moved hook implementation range with `useSyncNotifications` and the four current toast builder helpers.
  - Replaced the `useSyncToasts` line range with its exported hook symbol.
  - Replaced all hook interface line ranges with their named interfaces.
  - Corrected the stale `src/types/vault.ts` reference to `VaultSyncTypes.ts#ISyncConflict`, `VaultSyncTypes.ts#P2PConnectionState`, and `VaultCoreTypes.ts#ShareableContentType`.
  - Resolved the P2P event source to `src/lib/p2p/types.ts#SyncEvent`.

- `openspec/specs/utility-patterns/spec.md`
  - Replaced line ranges with named symbols for `debounce`, `useDebounce`, `useDebouncedCallback`, all entity guards, assertion functions, enum validators, and UUID utilities.

## Annotation cleanup

Canonicalized eligible source annotations that still pointed at active or archived change trees:

- `repair-equipment-catalog` annotations now point to `openspec/specs/equipment-browser/spec.md`.
- `establish-battlemech-chassis-index` now points to `openspec/specs/battlemech-chassis-index/spec.md`.
- Archived `add-per-type-customizer-tabs` spec/task annotations now point to `openspec/specs/multi-unit-tabs/spec.md`.

The cleanup covered the customizer, equipment catalog tests, chassis index, and per-unit tab components. No behavioral source code was changed; only annotation text changed. A repository search found no remaining eligible references to those active/archive paths under `src/`, `e2e/`, or `scripts/`.

## Evidence

- All five updated source tables and Source markers resolve to existing live modules; a path existence scan reported no missing `src/` target.
- A stale line-range scan over all five specs reported no remaining source line-range references.
- `oxfmt --check` on the 31 changed TypeScript files passed.
- Strict OpenSpec validation passed independently for:
  - `battle-armor-unit-system`
  - `vehicle-unit-system`
  - `construction-rules-core`
  - `toast-notifications`
  - `utility-patterns`

This work intentionally did not archive changes, edit the active change ledger, or alter runtime behavior; those actions remain with the parent integration owner.

## Further canonical references, group A

# Pointer cleanup A result (2026-09-12)

Scope: owned specification edits only in `bv-validation-tooling`, `campaign-personnel-architecture`, `firing-arc-calculation`, `piloting-skill-rolls`, and `overview-basic-info`, plus one authorized stale comment cleanup in `src/lib/campaign/processors/__tests__/autoAwardsProcessor.test.ts`. No runtime code, generated data, commits, or unrelated specs were changed.

## Changes applied

- `bv-validation-tooling`: production BV correction scenarios now cite `src/utils/construction/battleValueCalculations.ts` and qualify `bvAdapter.ts` for JSON adapter defects. The `check-new-pattern.ts` example is explicitly hypothetical and uncommitted. The missing report fixture is described as a report-shaped fixture pending proof; no fabricated path is asserted.
- `campaign-personnel-architecture`: positive bridge references now describe direct `(ICampaignRosterEntry, IPilot | null)` helper consumption and cite the live roster type plus financial/vocational processors. The completed hard-cutover wording now reflects the absent legacy bridge/IPerson state. The optional stale `IPerson` test comment was rewritten; `rg` now finds no `IPerson` or `rosterEntryToPerson` references under `src`.
- `firing-arc-calculation`: the stale directory citation now names `firingArcs.ts::determineArc` and `firingArc.ts::calculateFiringArc`; hit-location table ownership remains `hitLocation.ts::getHitLocationTable`.
- `piloting-skill-rolls`: corrected current line range for `applyTurnStarted` to lines 52-87, identifies the clear at line 80, and cites `eventDispatch.ts` line 201 for TurnStarted dispatch. The earlier inventory missing-path result was a Windows path-separator scan false negative; the file exists.
- `overview-basic-info`: added live source pointers for OverviewTab selection, identity setter/persistence helpers, and equipment availability filtering. The placeholder rule is clarified: general availability does not currently use the Overview rules-level selection; the separate hidePrototype item metadata check is retained as distinct behavior.

## Validation

- `npx openspec validate campaign-personnel-architecture --type spec --strict` — passed.
- `npx openspec validate bv-validation-tooling --type spec --strict` — passed.
- `npx openspec validate firing-arc-calculation --type spec --strict` — passed.
- `npx openspec validate piloting-skill-rolls --type spec --strict` — passed.
- `npx openspec validate overview-basic-info --type spec --strict` — passed.
- `git diff --check` over all owned files — passed.
- `npx openspec validate --all --strict` — 233 passed, 2 failed: `campaign-personnel-architecture` initially failed before the required keyword correction, then passed scoped validation; unrelated `unit-services` remains the other failure.
- Scoped `npx oxfmt --check` reports the pre-existing `autoAwardsProcessor.test.ts` formatting issue. The authorized change is comment-only and no formatter rewrite was applied to avoid unrelated churn.

## Further canonical references, group B

# Pointer fixes: inventory other_b

Scope: documentation-only cleanup of the ten `needs-proof` specs assigned to
`other_b`. Runtime code, tests, and intended planned requirements were not
changed. Source paths were checked against current files and exported/current
symbols where the mapping was unambiguous.

## Corrections

- `c3-network-targeting`: moved C3 range selection to `src/utils/gameplay/toHit/c3.ts:selectC3RangeBracket`; range constants to `src/utils/gameplay/toHit/constants.ts:RANGE_MODIFIERS`; ECM equipment destruction to `src/utils/gameplay/electronicWarfare/state.ts:destroyEquipment`; ECM C3 disruption to `src/utils/gameplay/electronicWarfare/status.ts:resolveC3ECMDisruption`; equipment compatibility to `EquipmentUnitTypeCompatibility`; BV field to `BVModifiers.c3Modifier`.
- `combat-analytics`: replaced stale `navigation.ts:47-162` with `navigationManager,createDrillDownHandler`; replaced oversized page ranges with `CampaignDashboard`, its current split section modules, and `AnalysisBugs` symbols.
- `force-management`: replaced facade ranges with `useForceStore`, `useForceStore.apiActions.ts`, `useForceStore.helpers.ts`, and `useForceStore.types.ts` symbols. Custom-unit display semantics were retained.
- `game-session-management`: replaced quick-game ranges with `addUnit`, `updateUnitSkills`, `restoreFromSession`, `persist/partialize`, `generateScenario`, `startBattle`, and `startSpectatorMode`; replaced engine ranges with `GameEngine`, `runToCompletion`, and `createInteractiveSession`; replaced generator directory pointer with current generator modules.
- `hull-down-position`: replaced the old to-hit barrel range with `src/utils/gameplay/toHit/environmentModifiers.ts:calculateHullDownModifier` and the old combat interface range with `src/types/gameplay/CombatContextTypes.ts:ITargetState`.
- `personnel-management`: replaced oversized store ranges with `usePilotStore`; replaced constant ranges with `DEFAULT_PILOT_SKILLS`, `MAX_WOUNDS`, `WOUND_SKILL_PENALTY`, improvement-cost constants/functions, templates, and rating helpers.
- `repair`: moved store citations to split action modules, calculation citations to `repairCalculations.ts` symbols, assessment citations to `repairAssessment.ts`, and interface code-block citations to current `repairTypes.ts` symbols.
- `unit-comparison`: added an explicit evidence boundary under Implementation Notes. No comparison page/route is currently shipped; requirements remain planned. Current catalog/unit APIs use `success`/`data` envelopes.
- `user-identity`: corrected the service test path to existing `src/services/vault/__tests__/IdentityService.test.ts`.
- `vault-sync`: moved hook citations to `useVaultExport`/`useVaultImport` symbols and moved type citations from the barrel to `VaultCoreTypes.ts` or `VaultImportExportTypes.ts` symbols, including `IExportablePilot`.

## Unresolved proof boundaries

- The pointer cleanup does not claim implementation completion or test coverage.
- `unit-comparison` remains unimplemented in the current route tree; the
  planned requirements are intentionally preserved.
- `combat-analytics` and the other source-backed requirements still require
  their normal runtime/test proof; citation validity alone is not acceptance.
- No source/runtime files were modified.

## Parent integration follow-up

The roster mission-contracts delta was reconciled after the first planning pass. Its journey-qc delta now requires supported custom admission plus a separate unavailable/invalid rejection while preserving the literal historical reduced-claim receipt rules. The enable-saved-custom-unit-combat proposal now carries a dated current-status note that distinguishes its merged biped implementation from its still-open broader acceptance gates. These changes resolve the remaining blanket custom-block statements in current scenarios; historical receipts remain historical.

The final customizer review also corrected actual armor display labels (Standard, Glow, HUD, Chromatic), migration-only megamek state, the concrete BattleMech preview versus generic dispatcher ownership, the Other exclusive three-category exception, and the stale auto-save persistence source range.

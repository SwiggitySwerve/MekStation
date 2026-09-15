# Final customizer specification review

Date: 2026-09-12

Scope: edited canonical customizer, equipment, record-sheet, combat, and persistence specifications compared with the live implementation at repository head `be7f85b867aa3e8576e5e3d27e309276203bc24b`. This is a read-only review; no product or canonical specification files were changed. Known parent-owned `unit-services` and campaign-combat-loop issues are excluded.

## Actionable findings

### 1. `customizer-tabs` still advertises a retired fifth armor variant

Severity: high; canonical contradiction.

`E:/Projects/MekStation/openspec/specs/customizer-tabs/spec.md:407` still says the settings store manages five options and includes `megamek`. The type block at `:589-603` repeats `megamek` and describes it as a selectable classic MegaMek style. The live settings UI renders `ALL_VARIANTS` from `E:/Projects/MekStation/src/components/customizer/armor/shared/VariantConstants.ts:46-53`, which contains only four entries; `E:/Projects/MekStation/src/stores/useCustomizerSettingsStore.ts:34-41` resolves the retained `megamek` value to `clean-tech`.

Correction: make the customizer-tabs requirement and type documentation match the four selectable variants. Keep `megamek` only as a migration-compatible persisted value, explicitly stating that it is resolved before rendering and is absent from the selector. This must agree with the already edited `armor-diagram-variants` specification.

### 2. Armor variant names in the canonical text do not match the labels users see

Severity: medium; user-visible contract drift.

`E:/Projects/MekStation/openspec/specs/armor-diagram-variants/spec.md:15-20` names the choices Clean Tech, Neon Operator, Tactical HUD, and Premium Material. The Settings UI at `E:/Projects/MekStation/src/components/customizer/armor/ArmorDiagramSettings.tsx:100-106` renders `DIAGRAM_VARIANT_INFO[variant].name`; that metadata comes from `E:/Projects/MekStation/src/components/customizer/armor/shared/VariantConstants.ts:24-32`, whose labels are Standard, Glow, HUD, and Chromatic. The IDs remain `clean-tech`, `neon-operator`, `tactical-hud`, and `premium-material`.

Correction: either change the implementation labels or document the actual display labels alongside the stable IDs. If this reconciliation is specification-only, state the four user-facing labels as Standard, Glow, HUD, and Chromatic and retain the IDs in the data model. Do not describe MegaMek as a visible label.

### 3. Record-sheet preview requirement names a concrete mech component as if it were the generic dispatcher

Severity: high; implementation contradiction.

`E:/Projects/MekStation/openspec/specs/record-sheet-export/spec.md:1311-1314` says the `RecordSheetPreview` component SHALL NOT hard-depend on the BattleMech store and SHALL be dispatched by unit type. The concrete `E:/Projects/MekStation/src/components/customizer/preview/RecordSheetPreview.tsx:35-72` directly calls `useUnitStore` and `useMechStructureFields`; it is intentionally the BattleMech implementation. The per-type registry at `E:/Projects/MekStation/src/components/customizer/shared/customizerTypeRegistry.tsx:370-390` selects that component for BattleMech and selects separate per-type components for other families.

Correction: place the no-mech-store guarantee on `RecordSheetPreviewForType`/the descriptor registry and non-mech preview components. State that the concrete BattleMech `RecordSheetPreview` is allowed to read the BattleMech store, while each non-mech component reads only its matching store. This avoids requiring an impossible change to the existing mech component and makes the scenario testable.

### 4. Equipment category selection has an unqualified Other exception

Severity: medium; test ambiguity.

`E:/Projects/MekStation/openspec/specs/equipment-browser/spec.md:69-89` says exclusive selection leaves only the selected category. The live `E:/Projects/MekStation/src/stores/useEquipmentStore.filters.ts:49-57,79-88` expands an exclusive `MISC_EQUIPMENT` selection to `CATALOG_OTHER_CATEGORIES` (`MISC_EQUIPMENT`, `MOVEMENT`, `STRUCTURAL`). The multi-select scenario at `:425-432` documents this expansion, but the generic exclusive scenario still permits a contradictory test expectation.

Correction: add an explicit exception to the generic exclusive scenario: ordinary categories select one category; Other selects its three catalog utility categories. Keep the separate legacy `useEquipmentFiltering` behavior documented at `:289-311`, where the equipment tray's `OTHER_CATEGORIES` also includes Physical and Artillery. The catalog and tray constants are intentionally different and should remain named separately.

## Evidence-pointer drift

These do not change runtime behavior, but they make verification harder:

- `E:/Projects/MekStation/openspec/specs/equipment-browser/spec.md:362` cites `src/stores/useEquipmentStore.ts:213-583`, while the current file ends at line 416. Replace the range with a symbol reference or current range.
- `E:/Projects/MekStation/openspec/specs/auto-save-persistence/spec.md:158` cites `src/hooks/useGameStatePersistence.ts:118-340`, while the current file ends at line 248. Replace the range with a symbol reference or current range.

## Reviewed areas with no additional actionable contradiction

- `customizer-responsive-layout`: current two-state mobile tray, persisted desktop/mobile preferences, 768px split, drawer, and 44px controls agree with the edited text. Evidence: `E:/Projects/MekStation/src/components/customizer/equipment/BottomSheetTray.tsx`, `E:/Projects/MekStation/src/components/customizer/equipment/ResponsiveLoadoutTray.tsx`, and `E:/Projects/MekStation/src/hooks/usePersistedState.ts`.
- `customizer-routing`: accepted eight route IDs versus seven visible BattleMech tabs is now clearly separated; `weapons` remains parser-compatible and renders the documented placeholder. Evidence: `E:/Projects/MekStation/src/hooks/useCustomizerRouter.ts:30-52` and `E:/Projects/MekStation/src/components/customizer/UnitEditorWithRoutingTabContent.tsx:50`.
- `equipment-browser` ammo matching, Add/Add-and-place lifecycle, current result synchronization, and the catalog Other constant agree with `E:/Projects/MekStation/src/stores/useEquipmentStore.filters.ts`, `E:/Projects/MekStation/src/utils/equipment/ammunitionCompatibility.ts`, and the catalog components.
- `record-sheet-export` paper dimensions, bounded 4x raster sizes, selected-paper geometry, shared viewer scope, Infantry standalone scope, staged latest-request commits, fit/manual zoom modes, print popup reservation, and cleanup/error clauses agree with the inspected service and preview implementations. No additional false behavior claim was found after the four findings above.
- `persistence-services` revised SQLite/browser boundary is consistent with `E:/Projects/MekStation/server.js:457-464` and the repository services. `auto-save-persistence` remains a separate localStorage/IndexedDB game/editor persistence contract.
- Edited combat analytics and quick-game source-reference changes contained no additional behavioral contradiction in the reviewed scope. Parent-owned campaign-combat-loop launch wording was excluded as requested.

## Resolution

The parent-authorized corrections were applied to the canonical
`customizer-tabs`, `armor-diagram-variants`, `record-sheet-export`,
`equipment-browser`, and `auto-save-persistence` specifications. The edits
remove contradictory fifth-variant claims, record the actual
Standard/Glow/HUD/Chromatic labels with stable IDs, scope the mech-store
exception to the concrete mech preview, document the Other three-category
exclusive behavior, and replace stale source ranges with symbol references.
No product code or runtime behavior was changed.

## Verification boundary

This review used static source/spec comparison only. It does not claim new tests were executed. Parent-reported focused printing and editor/chassis test passes remain separate acceptance evidence.

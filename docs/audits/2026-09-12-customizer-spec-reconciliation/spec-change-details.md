# Customizer specification reconciliation

This report records the canonical specification changes currently present as working-tree changes in the shared worktree against `be7f85b867aa3e8576e5e3d27e309276203bc24b`. It explains the old contract, the corrected contract, and the live source seams that motivated each correction. The report records specification intent and source correspondence only; it does not claim that the current worktree has passed the relevant tests or that any active change has been archived.

## Customizer navigation and layout

### `customizer-routing`

The old specification treated eight tab identifiers as eight visible tabs and described `weapons` as a normal navigation destination. The corrected contract separates parser compatibility from visible navigation. BattleMech navigation visibly exposes seven tabs—Overview, Structure, Armor, Equipment, Critical Slots, Fluff, and Preview—while the legacy `weapons` route remains accepted and renders a placeholder. It is retained so old links do not become invalid, but it is no longer advertised as a visible eighth tab. The cross-reference to `customizer-tabs` now describes visible type-specific tab sets rather than an eight-tab UI.

The live routing seam is `src/hooks/useCustomizerTabs.ts`, with tab definitions and route normalization in `src/components/customizer/shared/tabRegistry.tsx` and `src/components/customizer/shared/TabSpec.ts`. The important boundary is that a valid route ID may be broader than the current tab registry shown to a user. The specification deliberately preserves URL compatibility while removing the false promise that the legacy weapons editor is implemented as a visible tab.

### `customizer-tabs`

The old text listed seven tabs but used the display label “Criticals,” had no explicit BattleMech ordering, and implied one common tab set for all unit families. The corrected contract names “Critical Slots,” fixes the BattleMech order to Overview → Structure → Armor → Equipment → Critical Slots → Fluff → Preview, and delegates other families to their own conditional tab registries. The retired `megamek` armor value is migration-compatible persisted state only: it resolves to `clean-tech` before rendering and is absent from the selector. Refresh behavior is also corrected: non-default URL selections take precedence; parsed Structure shares default handling with omitted routes and can be replaced by the stored subtab, as recorded in the final clarification below.

This maps to `src/components/customizer/shared/tabRegistry.tsx`, `src/components/customizer/shared/TabSpec.ts`, and `src/hooks/useCustomizerTabs.ts`. The related navigation tests are `src/components/customizer/shared/__tests__/tabRegistry.canonical.test.ts`, `src/components/customizer/tabs/__tests__/CustomizerTabs.markers.test.tsx`, and `src/hooks/__tests__/useCustomizerTabs.navConfirm.test.ts`. The change keeps the existing unsaved-change confirmation and per-family visibility behavior; it only removes the inaccurate claim that every accepted route is a visible tab.

### `customizer-responsive-layout`

The old contract promised a draggable mobile bottom sheet with collapsed, half, and expanded states; automatic medium-width collapse; a fixed 240px large-screen sidebar; and swipe/long-press interaction. The corrected contract describes the shipped workbench: desktop sidebar or drawer, mobile status bar plus an expandable full-screen list, persisted expanded preference, and explicit open/close/assign/remove actions. There is no required half-height state, swipe gesture, or long-press operation. Resizing, opening, closing, and collapsing are required to preserve equipment assignments and keep the document within the viewport.

The source seams are `src/components/customizer/equipment/ResponsiveLoadoutTray.tsx`, `src/components/customizer/CustomizerWorkspaceControls.tsx`, `src/components/customizer/mobile/MobileLoadoutHeader.tsx`, `src/components/customizer/mobile/MobileLoadoutList.tsx`, and `src/components/customizer/equipment/GlobalLoadoutTray.tsx`. The corrected minimum hit target remains 44px, with accessible focus and names. The specification no longer commits to a particular gesture or automatic breakpoint state that the workbench does not use.

## Armor diagram variants

### `armor-diagram-variants`

The old contract required six selectable styles, including MegaMek and MegaMek Classic, and made MegaMek Classic the default with pip SVG assets and a visual parity promise. The corrected contract has four selectable stable IDs: `clean-tech`, `neon-operator`, `tactical-hud`, and `premium-material`. The current Settings UI labels those IDs Standard, Glow, HUD, and Chromatic. Legacy persisted `megamek` values migrate to `clean-tech` before rendering and are not selectable. Standard (`clean-tech`) is the default when no supported preference exists. Record-sheet paper/template selection is explicitly independent from armor-diagram style selection.

The live selector is `src/components/customizer/armor/ArmorDiagramSelector.tsx`; style configuration and rendering are in `src/components/customizer/armor/ArmorDiagramPreview.tsx` and the four supported variant components under `src/components/customizer/armor/variants/`. The repository still contains `MegaMekDiagram` source and MegaMekLab-style comments used by existing presentation/compatibility code, so the specification removes the false selectable-style and default claims without asserting that every historical MegaMek-named implementation file has disappeared. Existing persisted appearance migration is exercised by `src/stores/utils/__tests__/persistedStoreHydration.test.ts`.

## Equipment catalog and placement

### `equipment-browser`

The old catalog contract described a sortable table with fixed columns, a range column, a balanced-grid filter bar, and “Other” as a combined category that included Electronics. It also used broad normalized substring matching to decide whether ammunition matched a mounted weapon. The corrected contract describes the current dense catalog and its actual responsive behavior:

- Desktop uses one six-column grid for Name, Type, Tons, Slots, Heat, and Add, with a sticky header in the same scroll region as rows. Narrow layouts retain identity, technology, variable-property summary, detail toggle, and accessible Add controls, with a scrollable category strip and Sort menu.
- Electronics is independently selectable. For the catalog, Other is an explicit exception to ordinary exclusive selection: it expands to the three catalog utility categories `MISC_EQUIPMENT`, `MOVEMENT`, and `STRUCTURAL`; Show All clears category restrictions. The separate equipment-tray filtering contract may use a broader `OTHER_CATEGORIES` set, including Physical and Artillery, and these constants remain intentionally distinct. Prototype, one-shot, unavailable, and ammo-without-weapon visibility controls remain independently operable.
- Weapon range is an expandable detail, with short/medium/long values and minimum range when present. Non-weapons do not receive invented ranges or a misleading reserved column.
- Variable weapon weight and slots are shown as Variable and are calculated when the item is added. Add and Add and place use existing construction and Critical Slots authority.
- Declared `compatibleWeaponIds` take precedence for ammunition. Imported records without declarations use conservative exact identity or complete normalized weapon-name fallback. Partial names no longer admit ammunition for a different weapon.
- Add and place is transactional: illegal, stale, fixed, read-only, cancelled, or unsupported split-placement cases leave no partial equipment or history entry. A valid operation is one undoable operation and Redo restores it. Existing Add remains the unassigned-copy path.

The store and filter seams are `src/stores/useEquipmentStore.ts`, `src/stores/useEquipmentStore.filters.ts`, `src/hooks/useEquipmentBrowser.ts`, and `src/hooks/useEquipmentFiltering.ts`. UI seams are `src/components/customizer/equipment/EquipmentBrowser.tsx`, `src/components/customizer/equipment/EquipmentCatalogCard.tsx`, `src/components/customizer/equipment/CatalogPlacementDialog.tsx`, `src/components/customizer/equipment/EquipmentRow.tsx`, and `src/components/customizer/mobile/MobileEquipmentRow.tsx`. Placement authority remains in the existing critical-slot flow (`src/components/customizer/tabs/CriticalSlotsTab.logic.ts` and related placement helpers), so the specification does not create a second placement system.

## Record-sheet preview, export, and print

### `record-sheet-export`

The old contract separated preview, PDF, and print behavior, implied a high-memory canvas path, described a fixed 20x raster/ JPEG-oriented quality path, and treated the record-sheet customization seam as BattleMech-only. The corrected contract makes the filled SVG the shared source for preview, PDF, and print, with bounded 4x lossless rasterization for preview/PDF where raster output is required. PDF and print use the selected unit and paper snapshot captured by the action. Duplicate actions are disabled while busy and errors expose recovery.

The corrected paper and geometry rules are explicit: Letter uses 612×792 points with the 576×756 BattleMech content area and 18pt margins; the application SVG and raster constants for A4 are 595×842 with the 559×806 ISO content area and 18pt margins. jsPDF's native A4 page is approximately 595.28×841.89 points, so the specification distinguishes the rounded application constants used for SVG/image placement from the PDF library's native page dimensions. Nested artwork or logo viewBoxes cannot determine page dimensions. The renderer preserves a valid existing root viewBox, synthesizes one from intrinsic dimensions when absent, and cleans up the owned print window after `afterprint` or failure. The print popup is reserved before the first async wait so popup blocking cannot silently discard the action.

The generic type-dispatch contract covers BattleMech, vehicle, aerospace, Battle Armor, ProtoMech, and Infantry customizers. The concrete BattleMech `src/components/customizer/preview/RecordSheetPreview.tsx` may read its own store; `src/components/customizer/preview/RecordSheetPreviewForType.tsx` and `src/components/customizer/shared/customizerTypeRegistry.tsx` own dispatch. Every non-mech preview reads only its matching store. The initial inventory found Infantry using a fixed 75% direct-canvas preview. The authorized follow-up replaces that path with the existing shared frame, toolbar, scalable canvas, and staged renderer. See `followup-details.md` for characterization and final acceptance.

Live seams include `src/services/printing/RecordSheetService.ts`, `src/services/printing/svgRecordSheetRenderer/`, `src/components/customizer/preview/RecordSheetCanvasPreview.tsx`, `src/components/customizer/preview/RecordSheetPreview.tsx`, `src/components/customizer/preview/RecordSheetPreviewForType.tsx`, `src/components/customizer/shared/customizerTypeRegistry.tsx`, `src/components/customizer/preview/PreviewToolbar.tsx`, `src/components/customizer/preview/useRecordSheetPreviewZoom.ts`, and the per-family preview components such as `src/components/customizer/infantry/InfantryRecordSheetPreview.tsx`. Geometry and renderer coverage is under `src/services/printing/svgRecordSheetRenderer/__tests__/`, including `src/services/printing/svgRecordSheetRenderer/__tests__/svgGeometry.test.ts`, `src/services/printing/svgRecordSheetRenderer/__tests__/template.margins.test.ts`, `src/services/printing/svgRecordSheetRenderer/__tests__/renderTemplated.test.ts`, and critical/equipment presentation suites. The corrected contract removes obsolete memory and fixed-canvas promises while preserving the service's per-unit dispatch and legacy canvas callability where required.

## Persistence and unit-library authority

### `database-schema`

The old schema description said user-created units, equipment, and formulas lived in IndexedDB. The corrected contract distinguishes authorities and lifetimes. Official data remains static JSON; successful customizer library saves use the custom-unit REST API and server-side `UnitRepository`, backed by SQLite `custom_units` and `unit_versions`; browser drafts and remaining local services remain browser-local/IndexedDB. A browser draft is not a successful server library receipt.

The source authority is implemented through `src/services/units/CustomUnitApiService.ts`, `src/services/units/UnitRepository.ts`, `src/services/units/VersionRepository.ts`, and the custom-unit API handlers under `src/pages/api/units/custom/`. The browser draft boundary is represented by the customizer edit state and local editor persistence, rather than by importing SQLite into components. The corrected scenarios separate server library save from draft recovery and retained IndexedDB consumers.

### `persistence-services`

The old requirement said SQLite initializes on generic application startup and that it replaces IndexedDB globally. The corrected requirement scopes initialization to the server persistence layer before custom-unit and version repository operations. SQLite is authoritative for server-saved custom units and versions; IndexedDB/local browser storage continues for remaining local services and editor drafts. Browser components cannot import the SQLite implementation.

This is grounded in the server initialization and API/repository composition around `src/services/persistence/`, `src/services/units/UnitRepository.ts`, `src/services/units/VersionRepository.ts`, and the custom-unit route handlers. The narrower wording avoids claiming that every browser-local service has migrated or that a UI render itself owns server database initialization.

### `unit-services`

The old overview treated IndexedDB as the custom-unit authority. The corrected overview names both server-saved units through `CustomUnitApiService`/SQLite and the retained local `CustomUnitService`. A new “Service authority” section makes the distinction explicit: legacy class-specific `CustomUnitService` scenarios remain valid for the retained IndexedDB implementation, while the current toolbar and saved-history flow use `CustomUnitApiService`; draft recovery and per-unit Undo/Redo are governed by `customizer-edit-recovery`. Server version reversion is distinct from restoring a version into an unsaved draft.

The new server-backed requirement covers save, load, list, and version inspection through `/api/units/custom` and its unit/version routes, with successful responses establishing library identity and version receipts. Evidence seams are `src/services/units/CustomUnitApiService.ts`, `src/services/units/UnitRepository.ts`, `src/services/units/VersionRepository.ts`, `src/components/customizer/shared/UnitSaveStatus.tsx`, `src/components/customizer/tabs/restoreLibraryVersionToDraft.ts`, and the API/service tests under `src/__tests__/api/units/custom/` and `src/__tests__/service/units/`.

### `auto-save-persistence` evidence pointer

The old requirement cited a stale line range for `src/hooks/useGameStatePersistence.ts`. The corrected specification points to the stable symbol `useGameStatePersistence` and keeps the current localStorage autosave contract intact; this is an evidence-pointer cleanup, not a behavior or storage-authority change.

## Mission and combat admission

### `mission-contracts`

The old title and scenarios described a canonical-only catalog at every launch boundary. The corrected contract says “Combat catalog readiness is explicit”: the browser validates the canonical `/api/units` response and may extend a ready snapshot with exact server-approved custom references from `/api/units/custom/combat-catalog`. Node fast-forward continues to use `NodeCanonicalUnitService` without custom admission.

The shared admission policy now preserves campaign ID, roster-instance ID, source reference, and revision before lookup, routing, or mutation. Canonical references require exact canonical membership; custom references require exact `customCombatRefs` membership. Supported custom selections can launch through browser campaign paths. Missing, malformed, unsupported, unavailable, mismatched, stale, or source/reference-inconsistent selections fail before encounter, force, or session mutation. A mixed roster preserves each identity. Fast-forward remains canonical-only and is tested as its own boundary.

The source seams named by the current implementation are `src/lib/campaign/readiness/canonicalCatalogAdmission.ts`, `src/lib/campaign/readiness/useCombatCatalog.ts`, `src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts`, `src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts`, `src/lib/campaign/fastForward/fastForwardCombatRunner.ts`, and `src/pages/api/units/custom/combat-catalog.ts`. The corrected wording removes the blanket custom block while retaining explicit fail-closed cases and the headless canonical-only limitation.

### `campaign-combat-loop`

The old materialization contract required every selected roster unit to resolve through canonical `unitRef` membership and treated custom references as unresolvable. The corrected contract preserves each exact admitted `unitRef`, source, and pilot reference. Browser launches admit canonical units and supported server-saved biped custom units present in the ready custom combat catalog. Unknown, unavailable, mismatched, or unsupported references fail before force, encounter, or session mutation. The interactive session's armor and structure facts may come from the admitted canonical definition or immutable custom combat snapshot.

The fast-forward distinction is explicit: its in-process path remains canonical-only and rejects custom sources before materialization. Browser/in-process handler parity means the same rejection-before-mutation and roster/opponent sizing guarantees apply; it does not imply that fast-forward receives custom admission. Evidence seams are `src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts`, `src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts`, `src/lib/campaign/fastForward/fastForwardCombatRunner.ts`, and tests `src/lib/campaign/readiness/__tests__/canonicalCatalogAdmission.test.ts`, `src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts`, and `src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts`.

### `custom-unit-combat` (new capability)

The old campaign boundary was a blanket canonical-only block. The new capability defines the supported exception precisely: an exact persisted `custom-*` reference is admitted only when the server library contains a matching biped BattleMech accepted by the strict snapshot projection. The server resolves its own definition and never trusts a client construction, infers a stock replacement, or silently omits a missing unit. Canonical adaptation remains intact.

The capability records an immutable detached construction snapshot in `GameCreated`; recovery and rewind prefer that snapshot after library edits/deletion, while a corrupt or mismatched snapshot fails closed without consulting a replacement. Replay validates the nested construction with a deterministic parser identity and no library/network/clock/random lookup. Visibility rules disclose private construction only to entitled owners across live, reconnect, and replay projections. Campaign picker integration preserves server custom reference and separate roster-instance identity, and a source failure exposes honest retryable recovery rather than inventing combat eligibility.

Live seams are `src/services/units/serverCustomCombatDefinition.ts`, `src/services/units/customCombatDefinition.ts`, `src/types/contracts/CustomCombatSnapshot.ts`, `src/engine/adapters/CompendiumAdapter.ts`, campaign readiness/materialization modules, and the durable server recovery path. Focused evidence locations include `src/engine/adapters/__tests__/customCombatDefinition.test.ts`, `src/engine/__tests__/customCombatRecovery.recordedSnapshot.test.ts`, `src/lib/multiplayer/server/__tests__/customCombatRecovery.durableAuthority.test.ts`, `src/__tests__/integration/customCombatDefinition.integration.test.ts`, and `e2e/saved-custom-combat.spec.ts`. The capability retains local-only, unsupported, malformed, missing, and mismatched refusal cases and does not expand into model acquisition, 3D presentation, or authentication changes.

## Chassis and Compendium identity

### `battlemech-chassis-index` (new capability)

The new capability creates a read-only identity layer over the canonical BattleMech catalog. It groups exact chassis names into deterministic IDs, keeps every canonical variant exactly once, provides curated alternate-name search such as Timber Wolf → Mad Cat, and keeps successor designs such as Marauder, Marauder II, and Marauder IIC distinct. It exposes exact lookup, weight filtering, pagination, shareable selection, loading/error/empty states, and canonical variant links. It explicitly says that chassis identity does not imply a 3D model, preview, or reuse/rights approval.

The source seams are `src/services/units/chassis/chassisIndex.ts`, `src/services/units/chassis/chassisIndex.server.ts`, `src/services/units/chassis/chassisAliases.ts`, `src/types/unit/ChassisIndex.ts`, `src/pages/api/chassis.ts`, `src/pages/compendium/chassis.tsx`, `src/components/compendium/chassis/ChassisBrowser.tsx`, and `src/components/compendium/chassis/ChassisDetail.tsx`. The canonical Compendium spec now names the chassis index as a fourth navigation section and points to this capability. The identity layer is intentionally read-only and canonical-data-backed; the separate printable/model-library research remains a provenance and rights surface rather than an input to chassis identity.

## Draft recovery and editing history

### `customizer-edit-recovery` (new capability)

The new capability makes three previously conflated states visible and independent: browser draft/write status, last successful server library version, and in-session edit history. A successful server response supplies library identity/version; failed writes never create a success receipt. Reopening Save with the same designation performs fresh server validation and offers Overwrite only for the matching identity.

Saved history remains immutable. Restoring a historical version changes only the selected draft as one undoable operation, guards against stale requests, selected-unit changes, and intervening edits, and treats temporary equipment-ID regeneration as clean while actual editor-field changes remain modified. Per-unit Undo/Redo stores complete compound operations, has a maximum of 50 entries, clears the redo branch after a new edit, excludes save metadata/no-ops, resets on reload, and preserves derived metrics/validation. Narrow/keyboard interactions retain accessible native undo and dialog behavior.

The live seams are `src/stores/unit/unitEditSnapshot.ts`, `src/components/customizer/shared/UnitSaveStatus.tsx`, `src/components/customizer/tabs/restoreLibraryVersionToDraft.ts`, `src/hooks/useCustomizerTabs.ts`, and `src/components/customizer/dialogs/SaveUnitDialogPreview.tsx`; focused tests include `src/components/customizer/tabs/__tests__/restoreLibraryVersionToDraft.test.ts` plus related tab/dialog tests. The capability does not redefine server version deletion/reversion and does not treat browser draft persistence as a library save.

## Release and asset path corrections

### `release-build-system`

The old packaged-desktop scenario requested `/record-sheets/templates/mek_biped_default.svg`. The corrected requirement uses the actual paper-specific asset paths: `/record-sheets/templates_us/mek_biped_default.svg` for Letter and `/record-sheets/templates_iso/mek_biped_default.svg` for A4. This aligns the release contract with `src/services/printing/svgRecordSheetRenderer/renderTemplated.ts`, which selects `templates_us` versus `templates_iso` from `PaperSize`, and with the fetched/public record-sheet asset layout used by the packaged standalone server.

This is a path correction only. It does not claim an asset fetch, release build, or packaged runtime test in this report. Generated/fetched record-sheet assets remain governed by their existing generators and validation commands.

## Preserved limitations and cleanup boundaries

The reconciliation removes stale promises but keeps explicit limitations where the source does not support a stronger statement. Infantry remains fixed at 75% in its standalone preview pending shared zoom/staged-render parity. Fast-forward remains canonical-only even though browser campaign launch supports admitted server-saved biped custom units. Legacy `weapons` routing remains parser-compatible but is not a visible tab. Retained MegaMek-named source files do not make MegaMek a selectable armor style. SQLite is authoritative for server library saves, while browser drafts and remaining local services retain their own storage boundaries.

Chassis identity does not establish model availability, visual quality, reuse permission, or rights approval. Custom-unit combat does not add 3D models, new unit families, authentication, or construction rules. Record-sheet tests and asset paths describe required behavior, but this report does not claim that a suite, CI job, packaged listener, or external provenance check passed. Active OpenSpec packages remain active pending their own task/evidence gates; this document records the canonical contract changes only.

## Final responsive and route clarification

The live BattleMech editor uses DEFAULT_CUSTOMIZER_TABS in src/components/customizer/tabs/CustomizerTabs.tsx directly: Fluff precedes Preview. The per-type registry remains authoritative for other families; its array order does not override the BattleMech editor. Tabs retain visible text at every width; compact mode hides icons. UnitInfoBanner retains Walk, Run, and Jump labels on mobile. The corresponding canonical claims were corrected.

The initial inventory found that `CustomizerWithRouter.resolveEffectiveTabId` treated explicit Structure as an omitted default, allowing persisted Preview to win. The authorized follow-up adds `hasExplicitTab` at the existing parser boundary and uses it in composition. Explicit valid tabs now win; omitted or invalid segments retain the existing stored/default restoration. Canonical routing and tab persistence requirements include this distinction. The source-annotation-only receipt applies to the earlier reconciliation phase; this later phase changes routing behavior.

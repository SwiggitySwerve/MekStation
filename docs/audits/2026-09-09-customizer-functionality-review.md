# Customizer functionality review

Reviewed September 9, 2026 (America/Denver). Recommendations describe proposed work; the parallel repair report tracks implementation separately. Model and 3D work are excluded at the user's request.

The [follow-up repair report](2026-09-10-non-3d-followups.md) records implementation and verification completed after this read-only review.

## Assessment

The customizer has a useful construction workflow: catalog search, editable unit tabs, structure and armor configuration, equipment discovery, critical-slot placement, validation, and a record-sheet preview. The next investment should help users experiment, understand changes, and carry a saved design into play with confidence.

Prioritize reliable unit switching first, then visible save/history state and undo. Follow with equipment placement from the catalog and comparison against a known design. Combat integration must use immutable saved definitions through the authoritative engine and recovery paths before the interface promises that a custom design is ready for a campaign.

## Evidence and limits

The browser review used the production build `1789009903779` at `http://localhost:3611`, with Atlas AS7-D in a fresh disposable browser context. All seven construction sections loaded at 1138 x 912; equipment discovery was also inspected at 390 x 844. Catalog search, equipment detail expansion, and the unit-actions menu were inspected. There were no captured page errors or attempted server writes. The first empty-state image captured loading; the later library-search view establishes the loaded empty-state controls.

Browser evidence: [read-only review ledger](2026-09-16-evidence-distilled/grok-followups-20260909.md) (formerly `.sisyphus/grok-followups-20260909/customizer-review/readonly-review.json`), [desktop overview](2026-09-16-evidence-distilled/grok-followups-20260909.md) (formerly `.sisyphus/grok-followups-20260909/customizer-review/overview.png`), [equipment details](2026-09-16-evidence-distilled/grok-followups-20260909.md) (formerly `.sisyphus/grok-followups-20260909/customizer-review/equipment-details.png`), and [mobile equipment](2026-09-16-evidence-distilled/grok-followups-20260909.md) (formerly `.sisyphus/grok-followups-20260909/customizer-review/mobile-equipment.png`). These local evidence files are ignored and are not part of a committed report package.

This was a read-only functionality review, not proof of saving, restoring, printing, drag-and-drop, touch interaction, or campaign persistence. Source findings below identify existing capabilities and integration opportunities; they do not substitute for exercising those operations.

## Recommended next work

### 1. Show draft state, library state, and saved history together

**Priority: next.** Users should be able to distinguish a completed browser-draft write from a saved library version and from changes made since that version. The current save control embeds a compact draft-status dot. Its accessible text and tooltip explain the difference, but the visible presentation is easy to miss.

Use a small visible status such as "Draft saved - Library v3 - 4 changes" where those facts are actually known. Keep failure and pending states explicit. Add a history entry to the unit-actions menu using the existing version-history dialog and APIs. A source search found the dialog definition and export, but no application caller.

Acceptance: reload after a draft edit; save a library version; compare it with the draft; restore a selected historical version; verify the selected unit alone changes and the saved version remains immutable. Show storage failures without claiming a successful save.

Existing seams: [BrowserDraftStatus](../../src/components/customizer/shared/BrowserDraftStatus.tsx), [MultiUnitTabs](../../src/components/customizer/tabs/MultiUnitTabs.tsx), [VersionHistoryDialog](../../src/components/customizer/dialogs/VersionHistoryDialog.tsx), [versions API](../../src/pages/api/units/custom/[id]/versions/index.ts), and [restore API](../../src/pages/api/units/custom/[id]/revert/[version].ts).

### 2. Add per-unit undo and redo

**Priority: next.** No customizer undo/redo controls or transaction history were found in the inspected customizer and unit-store paths. Armor allocation, engine changes, equipment removal, and reset operations are natural moments to need recovery.

Record user operations as transactions: an armor auto-allocation should undo once, rather than once per body location. Include keyboard commands and a short description of the next undo. Decide explicitly whether undo survives reload and how restoring a saved version affects the local history.

Acceptance: undo/redo equipment placement, armor allocation, and a structural change; verify derived weight, slots, heat, and validation; switch units and prove histories remain independent. Use serialization round trips to detect partial restoration.

### 3. Offer "Add and place" from equipment discovery

**Priority: after recovery controls.** Equipment currently enters the unassigned list, with a hint to choose a location in Critical Slots. That works for batch building, but creates a repeated navigation step for one-item edits.

Keep the existing Add action and offer a location picker that previews legal locations, free slots, weight change, and relevant rule failures. Use the same placement authority as Critical Slots. Do not silently move existing equipment or hide invalid fits.

Acceptance: add and place a legal weapon; reject an illegal location with a reason; handle split equipment, fixed Omni equipment, and insufficient slots; undo the combined operation once. Existing seam: [EquipmentTab](../../src/components/customizer/tabs/EquipmentTab.tsx).

### 4. Compare a variant against its baseline

**Priority: after recovery controls.** Save-as-new already exists. Extend it with an explicit relationship to the official unit or saved version from which the draft began. Show changes in equipment, locations, armor, movement, weight, heat, BV, and cost. A user should see what changed and what it costs before saving a variant.

Acceptance: compare against an immutable baseline even after that library unit receives a newer version; identify moved equipment separately from added equipment; expose assumptions behind derived values. Reuse [SaveUnitDialog](../../src/components/customizer/dialogs/SaveUnitDialog.tsx) and [UnitActionsMenu](../../src/components/customizer/tabs/UnitActionsMenu.tsx).

### 5. Make "Use in campaign" a verified handoff

**Priority: complete the active integration before promising this action.** A saved design should carry its exact version into roster selection, encounter creation, combat, replay, and reconnect. The remaining saved custom-combat work is under active repair, so this review does not certify that path.

The handoff should identify the saved version, readiness issues, and whether the user is adding a new unit or refitting an existing campaign unit. Campaign refit controls already exist; extend their intended workflow only after tracing equipment and structural changes through the relevant authority.

Acceptance: save a modified design, add it to a campaign, create an encounter, verify actual weapons/armor/movement, restart the host, reconnect, and replay. Editing the library afterward must not rewrite the historical combat snapshot. A browser screenshot or adapter unit test alone is insufficient.

### 6. Explain combat tradeoffs beside construction legality

**Priority: following the reliable save-to-play path.** The inspected Atlas showed a green Valid state and heat 31 / 20 in red. Those can both be correct: construction legality and firing sustainability answer different questions.

Label the former "Construction valid" and explain heat generation, dissipation, and net heat. Add a compact analysis panel for damage by range, selectable firing groups, ammunition endurance, movement assumptions, and BV contributions. Derive values from the established rules and disclose assumptions rather than inventing an overall score.

Acceptance: compare a known canonical design against rule-backed fixtures; change firing groups without changing the saved design; verify movement and range modifiers and missing-data states.

### 7. Extend validation with targeted, previewable repairs

**Priority: later.** Validation already shows suggestions and supports navigation to the affected section. Preserve that foundation. Add individual repair actions only where the rule has an unambiguous correction, with a preview and undo. Avoid a blanket action that silently chooses a different design.

Acceptance: each repair describes exactly what it will change, recalculates the actual validation result, and can be undone. Existing seam: [ValidationSummary](../../src/components/customizer/shared/ValidationSummary.tsx).

### 8. Close library-save gaps by unit type

**Priority: according to the next supported play workflow.** Current library-save support explicitly includes BattleMechs, OmniMechs, and IndustrialMechs. Other unit types retain browser drafts and receive a disabled-save explanation. Treat that as a clear capability boundary.

Add persistence type by type, including save, load, export, import, version history, and downstream combat eligibility. Do not enable a button until the format and recovery path are proven. Existing boundary: [MultiUnitTabsUnitState](../../src/components/customizer/tabs/MultiUnitTabsUnitState.ts).

## Smaller refinements

- In armor editing, distinguish unallocated points from the total armor budget. The inspected view used "Available" for values with different meanings. Explicit labels such as "Unallocated" and "Armor budget" would reduce ambiguity.
- On mobile, the top metrics and bottom Weight/Slots/Heat/BV summary repeat information. Consider using one compact summary and giving the remaining space to loadout count, unassigned equipment, and the next action.
- Armor auto-allocation and critical-slot auto-fill already exist. Future improvements should be named allocation presets, locked locations, and a preview of the resulting distribution, rather than duplicate automatic-allocation commands.
- Import/export and print/PDF controls already exist. Improve their discoverability and round-trip proof before adding another parallel export workflow.

## Suggested delivery order

1. Accept the current navigation, simulation, and browser-regression repairs with fresh verification.
2. Make draft/library status visible, wire existing saved history, and add per-unit undo/redo.
3. Add optional equipment placement from discovery and immutable baseline comparison.
4. Prove the saved-design campaign/combat/recovery journey and expose its handoff.
5. Expand combat analysis, type-specific persistence, and targeted construction aids.

This sequence is a recommendation, not an implementation claim or a request to expand the active repair scope.

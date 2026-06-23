## Context

Wave 4 delivered the reusable GM intervention ledger, authority/redaction, combat implementer, unit-reload implementer, and tactical confirmation surface. The remaining Wave 5 gap is that the tactical GM command registry still exposes only `gm.advance-phase`, `gm.set-damage`, and `gm.grant-resource`, while the combat implementer already supports reposition/facing, damage/critical, heat/ammo, turn order, lifecycle, attack resolution, and objective-state corrections.

## Goals / Non-Goals

**Goals:**

- Expose tactical GM command identifiers for the major combat intervention families.
- Keep command descriptors simple and safe until detailed correction dialogs exist.
- Allow future dialogs to pass full correction payloads into the adapter.
- Ensure incomplete combat corrections block with useful conflict reasons instead of returning ready no-op previews.
- Route active-unit reload through the existing unit-reload domain boundary.

**Non-Goals:**

- Implement form-heavy GM editors for each correction family.
- Implement campaign economy/base/resource correction runtime.
- Change normal player command validation, tactical projection, or combat resolution.
- Rework the existing ledger, authority, redaction, or unit reload implementer contracts.

## Decisions

1. **Use command identifiers as intent selectors, not full data-entry models.**
   - The tactical dock can expose `gm.set-position-facing`, `gm.set-heat-ammo`, `gm.correct-attack`, `gm.set-lifecycle`, `gm.set-initiative`, `gm.set-objective`, and `gm.reload-unit` now.
   - Detailed values can be supplied by an optional correction/reload payload override when a focused GM editor is added.
   - Alternative rejected: building full forms in this wave. That would mix UI authoring with command plumbing and make the checkpoint harder to validate.

2. **Make the adapter block incomplete combat previews.**
   - Quick command defaults provide clear manual-takeover guidance, but a ready combat preview requires a meaningful correction payload.
   - The combat projection builder becomes the guardrail for no-op correction families so every call path receives the same conflict behavior.
   - Alternative rejected: letting empty corrections produce ready previews. That makes the UI look functional while approving no state change.

3. **Route unit reload as a domain boundary.**
   - `gm.reload-unit` maps to the existing `unit-reload` implementer when source payload data is provided.
   - Without source data the preview is blocked/deferred by the existing implementer with a useful reason.
   - Alternative rejected: forcing unit reload into the combat correction union. Reload already has a separate reconciliation domain because it handles source unit snapshots and manual takeover conflicts.

## Risks / Trade-offs

- [Risk] The GM dock gains more buttons before final data-entry dialogs exist. → Mitigation: availability and preview blocking explain missing selection/data instead of silently committing.
- [Risk] New no-op guards may expose previously hidden empty payloads. → Mitigation: focused tests assert the block reasons and update adapter defaults to use payload overrides for ready previews.
- [Risk] Unit reload requires richer source payloads than the tactical context has. → Mitigation: route the command to the existing reload domain and require source data from a future editor/service layer.

## Migration Plan

1. Add command IDs and command descriptors.
2. Extend the tactical preview adapter with optional combat correction and unit reload payload overrides.
3. Add no-op blocking to combat projected-effect builders.
4. Add focused tests for command exposure, adapter routing, blocked incomplete payloads, and existing UI confirmation behavior.
5. Validate the change with focused Jest, `openspec validate`, typecheck, and journey/logging QC commands.

## Open Questions

- Which detailed GM editor should be built first after this wave: damage/heat editor, attack-result editor, or unit reload conflict-resolution editor?

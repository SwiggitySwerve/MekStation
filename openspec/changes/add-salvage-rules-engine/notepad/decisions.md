# Decisions — add-salvage-rules-engine

## [2026-04-24] Tasks 8.4 + 8.5 + 11.1–11.4 — DEFERRED to Wave 4

**Choice**: Mark salvage-to-inventory conversion (8.4), damaged-unit
roster creation (8.5), and the four Wave 4 UI handoff items (11.1–11.4)
as `**DEFERRED**` in `tasks.md` rather than implementing them in this
change.

**Rationale**:

1. **No `acquisitionProcessor` salvage rail exists.** The existing
   `acquisitionProcessor` (`src/lib/campaign/processors/acquisitionProcessor.ts`)
   only services `IAcquisitionRequest` records on `IShoppingList` —
   `processPendingAcquisitions` and `processInTransitAcquisitions` walk
   pending / in-transit purchase orders and roll for delivery. There is
   no salvage-to-inventory conversion path on the campaign, no `source:
   'salvage'` tag recognised by the inventory side, and no
   `addUnitToRoster` / `createRosterUnit` helper. Implementing 8.4 here
   would require inventing the rail AND the inventory schema extension,
   which is the scope of the Wave 4 / `add-repair-queue-integration`
   change. Out of scope for the rules-engine change.

2. **No roster mutation surface for damaged-unit ingestion.** Same
   shape: nothing in `src/lib/campaign/` mutates the campaign's force /
   roster to inject a freshly-acquired damaged mech with a seeded
   `IUnitCombatState`. The Phase 3 force-management change owns this
   surface; baking it into the salvage engine here would couple two
   changes and leak Wave 4 work into the Wave 3 archive.

3. **The Wave 3 engine already preserves everything Wave 4 needs.** The
   persisted `ISalvageAllocation` carries every field the Wave 4 UI
   layer will consume:
   - `damageLevel` + `recoveryPercentage` per candidate → Wave 4 can
     reconstruct `IUnitCombatState` without replaying the battle.
   - `splitMethod: 'auction' | 'contract' | 'hostile_withdrawal' |
     'standalone'` → drives Wave 4 routing logic (auction draft UI vs.
     direct award screen).
   - `mercenaryAward.candidates` + `employerAward.candidates` are fully
     classified, value-weighted, and deterministic — the auction draft
     order is already stable.
   - `campaign.salvageReports` is keyed by `matchId` so the Wave 4
     after-action UI can render directly without further engine
     changes.

4. **Tasks 11.1–11.4 are explicitly tagged "Wave 4" in `tasks.md`.**
   The §11 "Wave 3 → Wave 4 Handoff" section is a forward-pointer, not
   a Wave 3 deliverable. They were never implementation targets for
   this change; deferral simply makes that explicit at archive time.

5. **The salvage processor's module docstring already documents this.**
   `src/lib/campaign/processors/salvageProcessor.ts` line 14 states
   "Phase 3 Wave 3 — `add-salvage-rules-engine`. Wave 4 will surface
   inventory conversion + auction UI; this processor only owns the
   compute-and-persist half." The deferral is consistent with the
   existing implementation intent — no code-vs-spec drift.

**Spec impact**: Zero. The `salvage-rules` spec deltas describe engine
behaviour (aggregation, splitting, repair-cost estimation, hostile
territory modifier, idempotent processor), not inventory / roster
mutation. `openspec validate add-salvage-rules-engine --strict` passes.

**Cross-reference**: identical pattern to
`openspec/changes/wire-heat-generation-and-effects/notepad/decisions.md`
entry for §11.3 (CASE/CASE II) and §15.2 / §15.3 (autonomous fuzzer +
multi-turn E2E) — work that belongs to a parallel or downstream change
is deferred with rationale rather than half-implemented in the current
archive.

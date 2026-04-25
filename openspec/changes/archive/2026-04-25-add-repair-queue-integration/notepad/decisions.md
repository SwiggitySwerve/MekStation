# add-repair-queue-integration — Decisions Notepad

Cross-task wisdom captured during the wave application. Each entry records
a decision, its rationale, and the file:line anchor for follow-up waves.

---

## 2026-04-25 apply (Tier 4 close-out)

### DEFERRED items rolled forward to Wave 4 / Wave 5

- **1.2 / 2.3 / 3.4 / 4.4 / 5.4 / 6.4 — RepairPriority enum + sorting**
  DEFERRED to Wave 5. Priority is a UI-tier concern owned by
  `add-post-battle-review-ui`. Builder ships kind-keyed tickets only
  (`armor` → `structure` → `component` → `ammo` natural order). Priority
  can be derived from `kind` + `location` + `componentType` by the
  consumer without reshaping the queue payload. Spec blockquote:
  `specs/damage-system/spec.md` "Repair Priority From Damage Severity".

- **3.2 / 4.2 / 5.2 / 6.2 / 11.2 — `cbillCost` per ticket**
  DEFERRED to Wave 5 pricing pass. Cost tables (per armor type, per tech
  base, per component family) ship together with the review-ui's
  repair-cost summary so the formula stays consistent across all four
  ticket kinds. Field is omitted from the type today; Wave 5 adds it
  additively without breaking consumers.

- **7.2 — Salvage prioritization vs general inventory**
  DEFERRED to Wave 5. No unified `IInventoryPool` exists on `ICampaign`
  yet. `matchPartsAgainstSalvage` consumes the salvage pool only
  (`src/lib/campaign/repair/repairQueueBuilder.ts:282-318`). "Salvage
  first" ordering becomes meaningful only once the general inventory
  pool lands. Spec blockquote: `specs/acquisition-supply-chain/spec.md`
  "Inventory Matching Prioritizes Salvage".

- **9.1 / 9.3 — Existing repair ticket repository + maintenance ticking**
  DEFERRED. No typed `IRepairTicket` repository exists today; queue
  lives directly on `campaign.repairQueue`. No `maintenanceProcessor`
  is registered (see `src/lib/campaign/processors/processorRegistration.ts:44-62`).
  Wave 4 introduces both. This branch is the source-of-truth for the
  typed model.

- **10.6 — Cross-processor integration test**
  DEFERRED to Wave 5 round-trip. Requires a real `ICampaign` fixture
  drained through `postBattleProcessor` → `salvageProcessor` →
  `repairQueueBuilderProcessor`. The repair half is fully covered by
  `repairQueueBuilderProcessor.test.ts:84-127` (creation + idempotency)
  and `repairQueueBuilder.test.ts` (262 passing assertions across nine
  scenarios).

- **11.3 — `writeOffRecommended` flag**
  DEFERRED to Wave 5. UI hint surfaced by the review-ui change. Builder
  already returns zero tickets for write-offs (11.1) which is the only
  behavior the queue itself needs.

- **Spec naming alignment (post_battle / sourceBattleId / partName /
  workType)**
  DEFERRED naming alignment to Wave 5 — semantics match exactly:
  - `source: "combat"` ≡ spec's `"post_battle"`
  - `matchId` ≡ spec's `sourceBattleId`
  - `partId` ≡ spec's `partName`
  - `kind` ≡ spec's `workType`
  Wave 5's `add-post-battle-review-ui` renames once the review-ui
  surface is locked. Today's union: `src/types/campaign/RepairTicket.ts`.

### Implemented this pass

- **11.1 — Destroyed units produce no tickets** — Implemented via
  `state.combatReady === false` short-circuit in
  `src/lib/campaign/repair/repairQueueBuilder.ts:143-146`. Test:
  `repairQueueBuilder.test.ts:274-313`. The Wave 2 `postBattleProcessor`
  flips `combatReady` to false when CT structure reaches zero or the
  destroyed flag is set, so this satisfies the SHALL block in
  `damage-system/spec.md` "Destroyed Units Produce No Tickets" without
  needing the `IUnitMaxState` to be omitted (which the prior fallback
  relied on).

### Ordering invariant verified

`processorRegistration.ts:25-43` documents the canonical day-pipeline
order. Verified phases:

- `postBattleProcessor` → 350 (`MISSIONS - 50`)
- `salvageProcessor` → 375 (`MISSIONS - 25`)
- `repairQueueBuilderProcessor` → 390 (`MISSIONS - 10`) ✅
- `contractProcessor` → 400 (`MISSIONS`)
- `maintenanceProcessor` → 500 (`UNITS`) — Wave 4, not yet registered

Spec block `repair-maintenance/spec.md` "Runs Between Salvage And
Maintenance" is satisfied today: salvage (375) → repair builder (390)
→ maintenance slot (500). Test pin: `repairQueueBuilderProcessor.test.ts:69-75`.

### Test surface

- `npx jest --testPathPattern='repair|queue|salvage' --no-coverage` →
  **262 passed across 9 suites** as of 2026-04-25.
- Builder coverage: `src/lib/campaign/repair/__tests__/repairQueueBuilder.test.ts`
- Processor coverage: `src/lib/campaign/processors/__tests__/repairQueueBuilderProcessor.test.ts`

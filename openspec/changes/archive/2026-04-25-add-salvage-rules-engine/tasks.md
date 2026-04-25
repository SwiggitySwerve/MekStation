# Tasks: Add Salvage Rules Engine

## 1. Type Definitions

- [x] 1.1 Create `src/types/campaign/Salvage.ts`
- [x] 1.2 Define `ISalvagePool` with `battleId`, `candidates: ISalvageCandidate[]`,
      `totalEstimatedValue`, `hostileTerritory`
- [x] 1.3 Define `ISalvageCandidate` with `source` (`"unit" | "part"`),
      `unitId`, `partId`, `originalValue`, `recoveredValue`,
      `recoveryPercentage`, `location` (for part), `damageLevel`
- [x] 1.4 Define `ISalvageAllocation` with `pool`, `employerAward`,
      `mercenaryAward`, `splitMethod` (`"contract" | "auction" |
"hostile_withdrawal"`)
- [x] 1.5 Define `ISalvageAward` with `candidates: ISalvageCandidate[]`,
      `totalValue`, `estimatedRepairCost`
- [x] 1.6 Define `DamageLevel` enum: `INTACT`, `LIGHT`, `MODERATE`,
      `HEAVY`, `DESTROYED`

## 2. Candidate Aggregation

- [x] 2.1 `aggregateSalvageCandidates(outcome): ISalvageCandidate[]`
- [x] 2.2 For each enemy-side `IUnitCasualty` with `finalStatus !== INTACT`:
      create a unit candidate with `recoveryPercentage` from damage table
- [x] 2.3 For each destroyed-component entry on enemy units: create a part
      candidate (weapons, ammo bins, and heat sinks are salvageable; engine,
      gyro, internal structure damage is NOT — these are destroyed outright)
- [x] 2.4 `computeRecoveryPercentage(damageLevel)`: INTACT→1.0,
      LIGHT→0.75, MODERATE→0.5, HEAVY→0.25, DESTROYED→0 (unit is gone but
      parts may remain)
- [x] 2.5 `classifyDamageLevel(casualty)`:
      INTACT if no armor lost, LIGHT if <30% structure lost, MODERATE if
      30–60%, HEAVY if 60–99%, DESTROYED if 100% or CT destroyed

## 3. Contract-Driven Split

- [x] 3.1 `splitByContract(pool, salvageRights): ISalvageAllocation`
- [x] 3.2 `salvageRights` is 0–100 (mercenary percentage); employer gets the
      remainder
- [x] 3.3 Greedy value-weighted split: sort candidates by `recoveredValue`
      desc, distribute alternately starting with the higher-allocation side
      while respecting total-value targets within 10%
- [x] 3.4 Deterministic — same pool + same rights SHALL produce deep-equal
      allocation
- [x] 3.5 Fire `SalvageAllocated` event (`salvage_allocated` from processor)

## 4. Auction / Exchange Split

- [x] 4.1 `splitByAuction(pool, seed): ISalvageAllocation`
- [x] 4.2 Used when contract specifies `exchangeSalvage: true` (50/50 by
      value with drafting); legacy `salvageRights = 'Exchange'` also routes here
- [x] 4.3 Draft order — sort candidates by recovered value (employer-priority
      in AtB), employer picks first, alternate
- [x] 4.4 Seeded RNG for tie-breaks (same pool + same seed = same result)

## 5. Hostile Territory Modifier

- [x] 5.1 `applyHostileTerritoryModifier(allocation, outcome)`
- [x] 5.2 If player withdrew (`endReason: WITHDRAWAL`) from hostile
      territory, mercenary salvage is halved (remaining half stays on the
      battlefield — awarded to employer)
- [x] 5.3 Flag allocation with `splitMethod: "hostile_withdrawal"`

## 6. Repair Cost Estimation

- [x] 6.1 `estimateRepairCost(meta, damageLevel)`: unit tons × damage
      level × C-Bill per ton per damage-level table (per Campaign Ops)
- [x] 6.2 Part repair cost = (original price × (1 - recoveryPercentage))
- [x] 6.3 Aggregate per award to produce `estimatedRepairCost`

## 7. Salvage Engine Entry Point

- [x] 7.1 Create `src/lib/campaign/salvage/salvageEngine.ts`
- [x] 7.2 Export `computeSalvage(outcome, contract, options): ISalvageAllocation`
- [x] 7.3 If `outcome.contractId` is null (standalone skirmish), return
      empty allocation with `splitMethod: 'standalone'`
- [x] 7.4 Dispatch to contract, auction, or hostile-withdrawal branch based
      on contract clauses and outcome

## 8. Salvage Processor (Day Pipeline)

- [x] 8.1 Create `src/lib/campaign/processors/salvageProcessor.ts`
- [x] 8.2 Runs AFTER `postBattleProcessor` (registered between post-battle
      and contractProcessor at phase `MISSIONS - 25`)
- [x] 8.3 For each pending outcome on the campaign, look up the contract
      and compute the `ISalvageAllocation`; persist by matchId
- [ ] 8.4 For each mercenary-award candidate: create a campaign inventory
      entry via existing `acquisitionProcessor` rails (as if acquired) but
      with `source: "salvage"` tag — **DEFERRED**: the existing
      `acquisitionProcessor` only services the shopping-list / delivery
      pipeline (`processPendingAcquisitions` over `IAcquisitionRequest`).
      No salvage-to-inventory rail exists yet, and no `source: 'salvage'`
      tag is recognised by the campaign inventory side. Wiring this here
      would require inventing both the rail and the inventory schema
      extension, which is the Wave 4 / `add-repair-queue-integration`
      scope. The Wave 3 engine already produces the canonical
      `ISalvageAllocation` + `ISalvageReport` records the Wave 4 surface
      will consume. See `openspec/changes/add-salvage-rules-engine/notepad/decisions.md`.
- [ ] 8.5 For damaged-unit candidates: create the unit in the roster with
      its `IUnitCombatState` set to the damage snapshot from the outcome —
      **DEFERRED**: roster mutation surface for damaged-unit ingestion
      does not exist on the campaign yet (no `addUnitToRoster` /
      `createRosterUnit` helpers, no salvage→roster path in any
      processor). The damage snapshot is preserved on each candidate's
      `damageLevel` + `recoveryPercentage` so Wave 4 can rebuild the
      `IUnitCombatState` from the persisted `ISalvageAllocation` without
      replaying the battle. See
      `openspec/changes/add-salvage-rules-engine/notepad/decisions.md`.
- [x] 8.6 Fire `salvage_allocated` event with award summary

## 9. Tests

- [x] 9.1 Unit: Contract-split 60% mercenary on a 4-unit pool → 60% of
      total value allocated within 10% tolerance
- [x] 9.2 Unit: Auction split on a 6-unit pool, seeded → stable result
- [x] 9.3 Unit: Hostile withdrawal halves mercenary award
- [x] 9.4 Unit: Damage level classification across all five states
- [x] 9.5 Unit: Destroyed-but-crit-component list yields salvageable parts
      even when unit is DESTROYED
- [x] 9.6 Unit: Engine/gyro/IS components are NOT salvageable
- [x] 9.7 Integration: Full outcome → applySalvage → processor →
      allocation persisted (inventory population deferred to Wave 4)

## 10. Validation & Error Handling

- [x] 10.1 Malformed `salvagePercent` (e.g., > 100) → clamp and warn
- [x] 10.2 Empty pool (all enemy units INTACT) → return empty allocation,
      no error
- [x] 10.3 Missing contract on a contractId-bearing outcome → warn, fall
      back to 0% mercenary (employer keeps all)

## 11. Wave 3 → Wave 4 Handoff

All four sub-tasks here are explicitly UI / roster surfaces planned for
Phase 3 Wave 4. They are out of scope for the salvage **rules engine**
delivered by this change. Carrying them forward as DEFERRED preserves
the handoff contract without leaking Wave 4 work into a Wave 3 archive.

- [ ] 11.1 Wave 4: surface `ISalvageReport` on the after-action UI —
      **DEFERRED**: after-action review UI is owned by
      `add-post-battle-review-ui` (Wave 4). The salvage processor already
      persists `ISalvageReport` per matchId in
      `campaign.salvageReports` so the Wave 4 component can render
      directly without further engine changes.
- [ ] 11.2 Wave 4: convert mercenary-award candidates into roster /
      inventory entries via `acquisitionProcessor` rails (8.4) —
      **DEFERRED**: see 8.4 above. Same rationale — the rails and
      inventory schema extension are Wave 4 work.
- [ ] 11.3 Wave 4: damaged-unit roster creation with `IUnitCombatState`
      seeded from the outcome (8.5) — **DEFERRED**: see 8.5 above. The
      Wave 3 allocation already preserves damage classification and
      recovery percentage, so Wave 4 can hydrate `IUnitCombatState`
      without any additional engine changes.
- [ ] 11.4 Wave 4: auction draft UI for `splitMethod: 'auction'` —
      **DEFERRED**: the engine already classifies allocations with
      `splitMethod: 'auction'` and runs the seeded draft deterministically
      (§4.1–4.4 + tests 9.2). The Wave 4 UI is a presentation concern over
      the persisted allocation; no engine work remains.

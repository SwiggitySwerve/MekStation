# Tasks: Add Salvage Rules Engine

## 1. Type Definitions

- [ ] 1.1 Create `src/types/campaign/Salvage.ts`
- [ ] 1.2 Define `ISalvagePool` with `battleId`, `candidates: ISalvageCandidate[]`,
      `totalEstimatedValue`, `hostileTerritory`
- [ ] 1.3 Define `ISalvageCandidate` with `source` (`"unit" | "part"`),
      `unitId`, `partId`, `originalValue`, `recoveredValue`,
      `recoveryPercentage`, `location` (for part), `damageLevel`
- [ ] 1.4 Define `ISalvageAllocation` with `pool`, `employerAward`,
      `mercenaryAward`, `splitMethod` (`"contract" | "auction" |
"hostile_withdrawal"`)
- [ ] 1.5 Define `ISalvageAward` with `candidates: ISalvageCandidate[]`,
      `totalValue`, `estimatedRepairCost`
- [ ] 1.6 Define `DamageLevel` enum: `INTACT`, `LIGHT`, `MODERATE`,
      `HEAVY`, `DESTROYED`

## 2. Candidate Aggregation

- [ ] 2.1 `aggregateSalvageCandidates(outcome): ISalvageCandidate[]`
- [ ] 2.2 For each enemy-side `IUnitCasualty` with `finalStatus !== INTACT`:
      create a unit candidate with `recoveryPercentage` from damage table
- [ ] 2.3 For each destroyed-component entry on enemy units: create a part
      candidate (weapons, ammo bins, and heat sinks are salvageable; engine,
      gyro, internal structure damage is NOT — these are destroyed outright)
- [ ] 2.4 `computeRecoveryPercentage(damageLevel)`: INTACT→1.0,
      LIGHT→0.75, MODERATE→0.5, HEAVY→0.25, DESTROYED→0 (unit is gone but
      parts may remain)
- [ ] 2.5 `classifyDamageLevel(casualty)`:
      INTACT if no armor lost, LIGHT if <30% structure lost, MODERATE if
      30–60%, HEAVY if 60–99%, DESTROYED if 100% or CT destroyed

## 3. Contract-Driven Split

- [ ] 3.1 `splitByContract(pool, salvageRights): ISalvageAllocation`
- [ ] 3.2 `salvageRights` is 0–100 (mercenary percentage); employer gets the
      remainder
- [ ] 3.3 Greedy value-weighted split: sort candidates by `recoveredValue`
      desc, distribute alternately starting with the higher-allocation side
      while respecting total-value targets within 10%
- [ ] 3.4 Deterministic — same pool + same rights SHALL produce deep-equal
      allocation
- [ ] 3.5 Fire `SalvageAllocated` event

## 4. Auction / Exchange Split

- [ ] 4.1 `splitByAuction(pool, seed): ISalvageAllocation`
- [ ] 4.2 Used when contract specifies `exchangeSalvage: true` (50/50 by
      value with drafting)
- [ ] 4.3 Draft order — sort candidates by BV (unit) or market value
      (parts), employer picks first (employer-priority in AtB), alternate
- [ ] 4.4 Seeded RNG for tie-breaks (same pool + same seed = same result)

## 5. Hostile Territory Modifier

- [ ] 5.1 `applyHostileTerritoryModifier(allocation, outcome)`
- [ ] 5.2 If player withdrew (`endReason: WITHDRAWAL`) from hostile
      territory, mercenary salvage is halved (remaining half stays on the
      battlefield — awarded to employer or lost)
- [ ] 5.3 Flag allocation with `splitMethod: "hostile_withdrawal"`

## 6. Repair Cost Estimation

- [ ] 6.1 `estimateRepairCost(candidate, techRating)`: unit tons × damage
      level × C-Bill per ton per damage-level table (per Campaign Ops)
- [ ] 6.2 Part repair cost = (original price × (1 - recoveryPercentage))
- [ ] 6.3 Aggregate per award to produce `estimatedRepairCost`

## 7. Salvage Engine Entry Point

- [ ] 7.1 Create `src/lib/campaign/salvage/salvageEngine.ts`
- [ ] 7.2 Export `computeSalvage(outcome, contract, terrain): ISalvageAllocation`
- [ ] 7.3 If `outcome.contractId` is null (standalone skirmish), return
      empty allocation
- [ ] 7.4 Dispatch to contract, auction, or hostile-withdrawal branch based
      on contract clauses and outcome

## 8. Salvage Processor (Day Pipeline)

- [ ] 8.1 Create `src/lib/campaign/processors/salvageProcessor.ts`
- [ ] 8.2 Runs AFTER `postBattleProcessor` (needs the outcome-derived data)
- [ ] 8.3 For each processed outcome in the day's `processedBattleIds`,
      look up the persisted `ISalvageAllocation`
- [ ] 8.4 For each mercenary-award candidate: create a campaign inventory
      entry via existing `acquisitionProcessor` rails (as if acquired) but
      with `source: "salvage"` tag
- [ ] 8.5 For damaged-unit candidates: create the unit in the roster with
      its `IUnitCombatState` set to the damage snapshot from the outcome
- [ ] 8.6 Fire `SalvageCollected` event with award summary

## 9. Tests

- [ ] 9.1 Unit: Contract-split 60% mercenary on a 4-unit pool → 60% of
      total value allocated
- [ ] 9.2 Unit: Auction split on a 6-unit pool, seeded → stable result
- [ ] 9.3 Unit: Hostile withdrawal halves mercenary award
- [ ] 9.4 Unit: Damage level classification across all five states
- [ ] 9.5 Unit: Destroyed-but-crit-component list yields salvageable parts
      even when unit is DESTROYED
- [ ] 9.6 Unit: Engine/gyro/IS components are NOT salvageable
- [ ] 9.7 Integration: Full outcome → computeSalvage → salvageProcessor →
      inventory populated with expected items

## 10. Validation & Error Handling

- [ ] 10.1 Malformed `salvageRights` (e.g., > 100) → clamp and warn
- [ ] 10.2 Empty pool (all enemy units INTACT) → return empty allocation,
      no error
- [ ] 10.3 Missing contract on a contractId-bearing outcome → warn, fall
      back to 0% mercenary (employer keeps all)

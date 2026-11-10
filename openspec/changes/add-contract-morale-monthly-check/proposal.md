## Why

`contract.moraleLevel` has never been written, so every contract sat at STALEMATE. MekHQ rolls an enemy-morale check on the 1st of each month for every active contract (`CampaignNewDayManager.java:1264-1271`, e7adc2c). M1 ported the rules as pure functions (`scenario/contractMorale.ts`); this wires them. The readers of the level were brought to the pin first (`fix-contract-morale-readers`): a ROUTED contract generates no scenarios, and the level has no effect on the scenario-type roll.

## What Changes

A new day processor, `contract-morale` (phase `MISSIONS + 10`, after post-battle and the expiry pass, before scenario generation), runs on the 1st of the month when `useAtBScenarios` is on. That option is MekStation's analogue of the pin's `isUseStratCon()` gate on `processNewDayATB` (`CampaignNewDayManager.java:475-477`); the level's only consumer, scenario generation, is gated the same way. For each ACTIVE contract (the set scenario generation uses; contracts without an `atbContractType` included, as the pin iterates every active contract) it rolls 2d6 from the campaign's seeded stream (one stream per contract, never `Math.random`), applies M1's `performMoraleCheck`, and writes `moraleLevel` only if it changed, emitting `contract_morale_changed` on change only.

Performance counts the contract's own applied outcomes (`appliedOn`, PR4c) in the previous calendar month. Reliability is 0.

Reaching ROUTED sets only the level: no early end, payout, rout end date, re-spike, enemy swap or prisoners.

## Impact

Affected capability: mission-contracts, combat-resolution (the stale "Contract Morale Tracking" requirement is removed). No persisted field, wire shape or schema changes: `moraleLevel` already exists and is serialized. No committed fixture or pack changes (none keeps an ACTIVE contract across the 1st with AtB scenarios on).

Limits, stated: reliability is 0 (no faction-trait catalog or per-contract enemy skill); only plain victories and defeats can be counted (no decisive, Pyrrhic, refused-engagement or fleet-in-being results); and in this codebase every battle end reason except a withdrawal settles the contract, so the performance modifier is rarely non-zero for a contract that is still ACTIVE at the check.

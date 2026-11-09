## Why

`updateMorale` in `scenario/morale.ts` moved a contract's morale level up on a player victory and down on a defeat, one step, with no roll. The level it moves is the contract's `moraleLevel` (the enemy's morale), where the pinned MekHQ rule is the opposite and is not deterministic: a monthly 2d6 check with a reliability modifier and a recent-performance modifier. Nothing called `updateMorale`, so the wrong rule never ran, but it was the only morale update in the code and the next step (the monthly check) needs the real rule to build on.

## What Changes

A pure module, `scenario/contractMorale.ts`, ports MekHQ `e7adc2c` `MHQMorale`: the rally/waver table, the 6/7/8 thresholds, `getReliability`, `getPerformanceModifier` (with `LocalDate.minusMonths` clamping), `getPerformanceOutcome` and `performMoraleCheck`. It takes the roll, the date, the scenarios, the reliability inputs and the modifiers as arguments, and reads no clock, store or random source. The old `updateMorale` and its tests are removed.

Not in this change: the monthly check on the 1st of the month, the seeded roll, any write to `contract.moraleLevel`, and the ROUTED follow-up (early end, payout, rout end date, prisoners). Those are separate, later changes. No persisted field, event or schema changes; nothing in the day pipeline calls the new module.

## Impact

Affected capability: mission-contracts. Behaviour change: none at runtime (the removed function had no callers).

Limits carried forward: MekStation has no faction-trait catalog (the module takes the traits as an argument) and its `ScenarioStatus` has no decisive, Pyrrhic, refused-engagement or fleet-in-being values, so only plain victories and defeats can be set from it today. Both belong to the wiring change.

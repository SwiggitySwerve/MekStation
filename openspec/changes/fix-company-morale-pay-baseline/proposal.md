## Why

Company morale (`MoraleState`, Mutinous to Elite) drifts to Elite on quiet, solvent days. `scoreSignals` gave paid costs `+1` every day, and the daily-costs processor emits an `info` costs event whenever costs are positive, so an ordinary company that only paid its way gained a step per day and reached Elite in two days. Measured with the real processor before this change: `high -> elite -> elite -> ...` on solvent paid days. The audit recorded this as the K-M4 drift.

This is an application design correction, ruled by Root: the company morale model is MekStation's own (MekHQ has no company-level morale of this kind), so there is no Java behaviour to match. The earlier wording "victories and met pay raise morale" is not read as having meant zero.

## What Changes

Paid costs are the baseline and score 0; a missed payment scores -1; a day with no costs event stays neutral (already 0 since the signal-feed fix). Victories, defeats and desertions are unchanged, as are the one-step-per-day limit and the once-per-outcome counting. The transition reason no longer cites paid costs. The company-morale requirement is restated in full below, which also records the already-merged once-per-outcome counting.

## Impact

Affected capability: campaign-refit-and-prestige. No persisted field, event payload or schema changes. Existing saves load unchanged; a save already at Elite stays Elite until a defeat, missed payment or desertion lowers it, and morale now rises only on victories, so a lowered state recovers only through a victory (it no longer recovers by paying the daily costs).

Follow-up outside this change: campaigns using role-based salaries (`useRoleBasedSalaries: true`, the presets) are charged by `financialProcessor`, which emits a `transaction` event rather than `daily_costs`, so a missed payment is invisible to company morale for them. The default options use the flat-rate path and are covered. Not changed here.

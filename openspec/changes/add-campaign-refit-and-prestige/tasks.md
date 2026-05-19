# Tasks: Add Campaign Refit and Prestige

## 1. Refit Types and Classification

- [ ] 1.1 Add `IRefitOrder`, the `RefitClass` enum, and an optional `refitOrders` campaign field defaulting to an empty list
- [ ] 1.2 Implement `classifyRefit(currentConfig, targetConfig)` — diff the configurations and return the least-disruptive covering refit class
- [ ] 1.3 Tests: equipment swap, variant upgrade, and chassis conversion each classify correctly; an identical target classifies as the cheapest class or none

## 2. Refit Cost and Hours Estimation

- [ ] 2.1 Implement `estimateRefit(order)` — cost and tech-hours from the configuration diff and a per-`RefitClass` multiplier, mirroring the repair hour-table approach
- [ ] 2.2 Tests: an equipment swap estimates lower cost/hours than a chassis conversion; the estimate is deterministic for a given diff

## 3. Refit Construction Validation Gate

- [ ] 3.1 Gate the `proposed → in-progress` transition on the target configuration passing existing `construction-rules-core` validation
- [ ] 3.2 An invalid target keeps the order `proposed` and surfaces the validation errors
- [ ] 3.3 Tests: a valid target advances to `in-progress`; an invalid target stays `proposed` with errors

## 4. Refit Day Processor

- [ ] 4.1 Implement `refitProcessor` in the `UNITS` phase block — advance each `in-progress` refit by the day's available tech-hours
- [ ] 4.2 On `hoursCompleted >= estimatedHours`, complete the refit — replace the unit's campaign configuration with `targetConfiguration` and emit a day event
- [ ] 4.3 Register `refitProcessor` in `processorRegistration.ts`
- [ ] 4.4 Tests: an in-progress refit advances per day, completes when the hour budget is met, swaps the configuration; a campaign with no refits is a no-op

## 5. Refit Launch from the Mech Bay

- [ ] 5.1 Add a per-unit "Refit" affordance to the mech bay (CP2a) opening a refit launch flow
- [ ] 5.2 Build the launch flow — choose a target configuration, show the classified refit class with estimated cost and hours, commit
- [ ] 5.3 Committing creates a `proposed` `IRefitOrder` and, on construction-validation pass, moves it to `in-progress`
- [ ] 5.4 Tests: the launch flow classifies and estimates correctly; commit creates the order and gates on validation

## 6. Unit Prestige

- [ ] 6.1 Add `IUnitPrestige` and an optional `unitPrestige` campaign field defaulting to an empty list
- [ ] 6.2 Implement `adjustPrestige(unit, signal)` — bounded score raised by victories/notable performance, lowered by heavy damage/crew loss
- [ ] 6.3 Run a prestige-update step when a battle outcome is applied (post-battle)
- [ ] 6.4 Tests: a victory raises prestige, heavy damage lowers it, the score stays within bounds, updates are deterministic

## 7. Company Morale State Machine

- [ ] 7.1 Add the `MoraleState` enum and an optional `moraleState` campaign field defaulting to `MoraleState.Steady`
- [ ] 7.2 Implement `evaluateMoraleTransition(campaign, signals)` — at most one step transition per day from the enumerated signal set
- [ ] 7.3 Implement `moraleProcessor` in the `EVENTS` phase block — gather signals, apply the transition, emit a day event on change
- [ ] 7.4 Register `moraleProcessor` in `processorRegistration.ts`
- [ ] 7.5 Tests: morale moves at most one step per day; victories raise it, defeats/missed pay/desertions lower it; no signal yields no transition

## 8. Prestige & Morale UI Surface

- [ ] 8.1 Build the Prestige & Morale page — current `MoraleState`, recent transitions, and per-unit prestige scores
- [ ] 8.2 Add a campaign-navigation entry for the surface
- [ ] 8.3 Implement loading, empty, and error states matching `campaign-ui` conventions
- [ ] 8.4 Storybook story with populated, empty, and error variants
- [ ] 8.5 Render tests: morale state, transition history, prestige scores; the page exposes no mutation controls

## 9. Verification

- [ ] 9.1 Integration test: launch a refit from the mech bay, advance days until it completes, the unit configuration is swapped
- [ ] 9.2 Integration test: a sequence of victories and defeats moves the company morale state and updates per-unit prestige
- [ ] 9.3 `openspec validate add-campaign-refit-and-prestige --strict` clean
- [ ] 9.4 Build, lint, typecheck, and storybook-build pass

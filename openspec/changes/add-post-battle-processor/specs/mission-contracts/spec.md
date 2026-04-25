# mission-contracts Specification Delta

## ADDED Requirements

### Requirement: Contract Mission Progression From Combat Outcome

The `PostBattleProcessor` SHALL update the referenced contract's mission progression (winner, end reason, scenario objective results) whenever an `ICombatOutcome` carries a `contractId`.

> **Wave 2 scope note — `lastMissionResult` / `scenariosPlayed` /
> `missionsSuccessful` / `missionsFailed` counters DEFERRED to Wave 3
> (`add-salvage-rules-engine` / final-payment processor).** `IContract`
> does not yet carry these fields; see `notepad/decisions.md`
> [2026-04-25 apply] Task 7.2 and the [2026-04-25 verifier-fix] entry.
> Wave 2 satisfies this requirement by flipping the contract's
> `status` field (`MissionStatus.SUCCESS` / `FAILED` / `PARTIAL`) via
> `applyContractDelta` in `postBattleProcessor.ts` — which is the
> backbone the Wave 3 counter scenarios will layer on top of.

#### Scenario: Player win counts as mission success

- **GIVEN** an outcome with `winner = GameSide.Player`, `endReason = DESTRUCTION`,
  and all scenario objectives met
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `status` SHALL be set to `MissionStatus.SUCCESS`
- **AND** `lastMissionResult` / `scenariosPlayed` / `missionsSuccessful`
  counter assertions are **DEFERRED to Wave 3** (pending `IContract`
  enrichment)

#### Scenario: Player loss counts as mission failure

- **GIVEN** an outcome with `winner = GameSide.Opponent` or player conceded
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `status` SHALL be set to `MissionStatus.FAILED`
- **AND** `lastMissionResult` / `scenariosPlayed` / `missionsFailed`
  counter assertions are **DEFERRED to Wave 3** (pending `IContract`
  enrichment)

#### Scenario: Turn-limit draw with partial objectives

- **GIVEN** an outcome with `endReason = TURN_LIMIT`, `winner = "draw"`,
  and some scenario objectives met
- **WHEN** `applyPostBattle(outcome, campaign)` is called
- **THEN** the contract's `status` SHALL be set to `MissionStatus.PARTIAL`
- **AND** `lastMissionResult` / `scenariosPlayed` counter assertions
  are **DEFERRED to Wave 3** (pending `IContract` enrichment)

#### Scenario: Contract morale updates per AtB table

- **DEFERRED to Wave 3 (`add-salvage-rules-engine` / final-payment
  processor).** AtB morale tables are not yet wired into
  `postBattleProcessor`; see tasks.md Task 7.4 (`Update contract.status
  (morale tables deferred to Wave 3)`) and `notepad/decisions.md`
  [2026-04-25 verifier-fix] entry.
- **GIVEN** a contract with current morale `NORMAL` and a FAILURE result
- **WHEN** `applyPostBattle` is called
- **THEN** the contract's morale SHALL be reduced toward `BROKEN` or
  `WAVERING` per the AtB morale-update table for losses
- **AND** the processor SHALL call the existing morale-update helper, not
  re-implement the transition logic

### Requirement: Fulfilled Contract Flagging

The `PostBattleProcessor` SHALL flag a contract for final-payment processing by the existing `contractProcessor` once all scenarios required by the contract have been played.

> **DEFERRED to Wave 3 (`add-salvage-rules-engine`).** This entire
> requirement is blocked on upstream `IContract` enrichment
> (`scenariosPlayed` / `fulfilled` fields) that Wave 3 will introduce —
> see tasks.md Task 7.6 and `notepad/decisions.md` [2026-04-25 apply]
> Task 7.6 / [2026-04-25 verifier-fix] entries. The verifier SHALL skip
> this requirement block on Wave 2 re-runs.

#### Scenario: Final scenario fulfills contract

- **DEFERRED to Wave 3** (blocked on `IContract.scenariosPlayed` /
  `fulfilled` model enrichment). See notepad.
- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 4`
- **WHEN** `applyPostBattle(outcome, campaign)` runs and increments
  `scenariosPlayed` to 5
- **THEN** the contract SHALL be marked `fulfilled = true`
- **AND** the next `contractProcessor` run SHALL process final payment,
  salvage rights, and closure

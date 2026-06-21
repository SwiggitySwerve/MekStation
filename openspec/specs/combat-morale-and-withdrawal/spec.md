# combat-morale-and-withdrawal Specification

## Purpose

Defines Combat Morale And Withdrawal requirements for In-Battle Morale State, Morale Shift Rules, Player Withdrawal Declaration, and Forced Withdrawal Rule, preserving the source-of-truth scope introduced by archived change add-combat-morale-and-withdrawal.
## Requirements
### Requirement: In-Battle Morale State

The game session SHALL carry an in-battle morale state, `battleMorale: Record<GameSide, MoraleLevel>`, where `MoraleLevel` is the seven-level ordinal scale `ROUTED`, `BROKEN`, `SHAKEN`, `STEADY`, `CONFIDENT`, `INSPIRED`, `OVERWHELMING`. Every side SHALL start at `STEADY`. This state SHALL be independent of campaign-layer morale (`Contract Morale Tracking`) and SHALL NOT read or write campaign morale storage.

#### Scenario: Battle morale starts steady

- **GIVEN** a newly created game session with two sides
- **WHEN** the session is initialized
- **THEN** `battleMorale` SHALL record `STEADY` for both sides

#### Scenario: Battle morale is independent of campaign morale

- **GIVEN** a battle in which one side's `battleMorale` has shifted to `SHAKEN`
- **WHEN** the campaign morale store is inspected
- **THEN** campaign morale SHALL be unchanged by the battle

### Requirement: Morale Shift Rules

The system SHALL shift a side's `battleMorale` in response to combat events via a deterministic, pure function of the event log: an enemy unit destroyed SHALL shift the observing side upward; an own unit destroyed SHALL shift the side downward; an own vital-component critical SHALL shift the side downward; loss of the side's heaviest unit SHALL shift it further downward. Morale SHALL clamp at `ROUTED` and `OVERWHELMING`. Each shift SHALL emit a `MoraleShifted` event recording `side`, `from`, `to`, `cause`, and `turn`.

#### Scenario: Losing a unit lowers morale

- **GIVEN** a side at `STEADY` morale
- **WHEN** one of that side's units is destroyed
- **THEN** the side's `battleMorale` SHALL shift downward by one level
- **AND** a `MoraleShifted` event SHALL be appended recording the change

#### Scenario: Destroying an enemy raises morale

- **GIVEN** a side at `STEADY` morale
- **WHEN** an enemy unit is destroyed
- **THEN** the side's `battleMorale` SHALL shift upward by one level

#### Scenario: Morale clamps at the extremes

- **GIVEN** a side already at `ROUTED` morale
- **WHEN** another of that side's units is destroyed
- **THEN** the side's `battleMorale` SHALL remain `ROUTED`

#### Scenario: Morale replays from the event log

- **GIVEN** a completed battle whose event log contains `MoraleShifted` events
- **WHEN** the session is rebuilt by replaying the event log
- **THEN** each side's final `battleMorale` SHALL match the value from the original battle

### Requirement: Player Withdrawal Declaration

A human player SHALL be able to declare withdrawal for a unit they own. Declaring withdrawal SHALL emit a `WithdrawalDeclared` event with the chosen target edge and `declaredBy: 'player'`, and SHALL set the unit's `isWithdrawing` flag. A withdrawing unit SHALL be routed toward its target edge and SHALL exit the map via the existing `UnitRetreated` event when it reaches an edge hex. The `isWithdrawing` flag SHALL be sticky for the rest of the match.

#### Scenario: Player withdraws a unit off the chosen edge

- **GIVEN** a player unit two hexes from the north edge with enough movement to reach it
- **WHEN** the player declares withdrawal toward the north edge
- **THEN** a `WithdrawalDeclared` event SHALL be emitted with `edge: 'north'` and `declaredBy: 'player'`
- **AND** when the unit reaches the north edge a `UnitRetreated` event SHALL be emitted
- **AND** the unit SHALL be excluded from its side's count in the victory check

#### Scenario: Withdrawal declaration is sticky

- **GIVEN** a player unit that has declared withdrawal
- **WHEN** a later phase is processed
- **THEN** the unit SHALL remain `isWithdrawing`
- **AND** the player SHALL NOT be able to cancel the withdrawal

#### Scenario: Immobilized withdrawing unit stays in place

- **GIVEN** a withdrawing player unit with zero movement available
- **WHEN** the movement phase resolves
- **THEN** the unit SHALL remain in place without error
- **AND** no `UnitRetreated` event SHALL be emitted

### Requirement: Forced Withdrawal Rule

The scenario config SHALL carry a `forcedWithdrawal` boolean, defaulting to `false`. When enabled, an end-of-phase check SHALL withdraw any unit — player or bot — whose side `battleMorale` is `BROKEN` or worse, or that is crippled (a vital-component critical, or more than 50% internal-structure loss). A forced withdrawal SHALL emit a `ForcedWithdrawalTriggered` event recording the `reason`, and SHALL flag the unit `isWithdrawing`. When `forcedWithdrawal` is `false`, no unit SHALL be withdrawn automatically.

#### Scenario: Broken morale forces withdrawal

- **GIVEN** a scenario with `forcedWithdrawal` enabled and a side whose `battleMorale` has fallen to `BROKEN`
- **WHEN** the end-of-phase check runs
- **THEN** each non-withdrawing unit of that side SHALL be flagged `isWithdrawing`
- **AND** a `ForcedWithdrawalTriggered` event with `reason: 'morale-broken'` SHALL be emitted for each

#### Scenario: Crippled unit is forced to withdraw

- **GIVEN** a scenario with `forcedWithdrawal` enabled and a unit that has taken a through-armor critical to its engine
- **WHEN** the end-of-phase check runs
- **THEN** that unit SHALL be flagged `isWithdrawing`
- **AND** a `ForcedWithdrawalTriggered` event with `reason: 'crippled'` SHALL be emitted

#### Scenario: Rule disabled leaves units fighting

- **GIVEN** a scenario with `forcedWithdrawal` disabled and a side at `ROUTED` morale
- **WHEN** the end-of-phase check runs
- **THEN** no unit SHALL be flagged `isWithdrawing`
- **AND** no `ForcedWithdrawalTriggered` event SHALL be emitted

#### Scenario: A unit is never withdrawn twice

- **GIVEN** a bot unit already `isRetreating` from a damage trigger in a `forcedWithdrawal` scenario
- **WHEN** the forced-withdrawal check also finds it eligible
- **THEN** the unit SHALL NOT be re-triggered
- **AND** no duplicate `ForcedWithdrawalTriggered` event SHALL be emitted

### Requirement: Withdrawal Map-Edge Exit

A withdrawing unit — whether flagged by player declaration or forced withdrawal — SHALL move toward its target edge and SHALL exit the map by emitting `UnitRetreated` when it reaches an edge hex, reusing the existing edge-resolution and edge-detection machinery. A withdrawn unit SHALL be excluded from its side's victory-check count and SHALL be distinguished from a combat loss in the post-battle summary.

#### Scenario: Withdrawn unit excluded from the victory check

- **GIVEN** a side of two units, one of which has emitted `UnitRetreated`
- **WHEN** the victory check runs
- **THEN** only the remaining unit SHALL count toward that side's total
- **AND** if that remaining unit is also destroyed the opposing side SHALL be declared the winner

#### Scenario: Post-battle summary distinguishes withdrawal from destruction

- **GIVEN** a completed battle with one unit destroyed in combat and one unit withdrawn
- **WHEN** the post-battle summary is generated
- **THEN** the destroyed unit SHALL be listed as a combat loss
- **AND** the withdrawn unit SHALL be listed as withdrawn

### Requirement: Failed Withdrawal Handling

When a withdrawing unit is destroyed before it reaches an edge hex, it SHALL be counted as a combat loss, not a withdrawal. The discriminator SHALL be event order: if `UnitDestroyed` is emitted for the unit before any `UnitRetreated`, the unit is a combat loss.

#### Scenario: Withdrawing unit destroyed en route is a combat loss

- **GIVEN** a withdrawing unit that has not yet reached its target edge
- **WHEN** the unit is destroyed by enemy fire
- **THEN** a `UnitDestroyed` event SHALL be emitted and no `UnitRetreated` event SHALL follow for that unit
- **AND** the post-battle summary SHALL list the unit as a combat loss

### Requirement: Campaign Morale Sliding Window

Campaign-layer prestige morale SHALL be computed from a bounded sliding window of
recently-applied battle outcomes — one campaign-month relative to the campaign's
current date — rather than the lifetime `recentlyAppliedOutcomes` array, so the
morale score cannot ratchet upward indefinitely. The stored
`recentlyAppliedOutcomes` field SHALL be pruned so it cannot grow unbounded over
a long campaign. This requirement governs campaign prestige morale only and is
distinct from the in-battle `battleMorale` state defined by the "In-Battle Morale
State" requirement; it SHALL NOT read or write `battleMorale`.

#### Scenario: Old victories drop out of the morale window

- **GIVEN** a campaign whose `recentlyAppliedOutcomes` contains victories dated more than
  one campaign-month before the current date
- **WHEN** the daily morale signal is gathered
- **THEN** only outcomes within one campaign-month of the current date SHALL be counted
  toward recent victories and defeats
- **AND** outcomes older than the window SHALL NOT contribute to the morale score.

#### Scenario: Morale does not ratchet monotonically to Elite

- **GIVEN** a campaign accumulating one victory per day across several months
- **WHEN** the morale score is computed each day
- **THEN** the recent-victory count SHALL stay bounded by the window
- **AND** the morale score SHALL NOT increase every day for the whole campaign.

#### Scenario: The stored outcome array stays bounded

- **GIVEN** a long-running campaign that has applied many battle outcomes
- **WHEN** outcomes older than the sliding window are present
- **THEN** the stored `recentlyAppliedOutcomes` field SHALL be pruned of entries older
  than the window
- **AND** it SHALL NOT grow without bound across the campaign's lifetime.

#### Scenario: Campaign morale window is independent of in-battle morale

- **GIVEN** a battle in progress whose `battleMorale` has shifted
- **WHEN** the campaign-layer morale signal is gathered
- **THEN** the campaign morale computation SHALL read only `recentlyAppliedOutcomes`
  within the window
- **AND** it SHALL NOT read or mutate the session's `battleMorale` state.


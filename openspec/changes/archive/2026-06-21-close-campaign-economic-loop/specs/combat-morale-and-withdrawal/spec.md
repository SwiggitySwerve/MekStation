# combat-morale-and-withdrawal Delta — close-campaign-economic-loop

## ADDED Requirements

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

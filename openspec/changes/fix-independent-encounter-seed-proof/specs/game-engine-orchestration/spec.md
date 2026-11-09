## MODIFIED Requirements

### Requirement: Single-Player Launch Seed Threading

Every single-player launch surface — the pre-battle launch and skirmish flows and the quick-game start actions — SHALL accept an optional explicit seed sourced from a `?seed=N` query parameter on its page route, mirroring the multiplayer WebSocket seed convention. The parameter SHALL be parsed with `Number.parseInt` and guarded by `Number.isFinite`; when absent or invalid, the surface SHALL fall back to `Date.now()` (the pre-change behavior) without throwing. The parsed seed SHALL be passed into the GameEngine configuration so the resulting battle is reproducible.

**Priority**: High

#### Scenario: Explicit seed produces a reproducible launch

- **GIVEN** a single-player launch page loaded with `?seed=424242` and fresh battle inputs
- **WHEN** the battle is launched (auto-resolve, interactive, skirmish, or a quick-game start action)
- **THEN** the GameEngine SHALL be constructed with seed 424242
- **AND** an independent launch with the same seed and identical unit selections, pilot stats, forces, map and deployment, rules and turn limit SHALL produce an identical battle outcome

#### Scenario: Independent pre-battle auto-resolve preserves completed history

- **GIVEN** two fresh encounters prepared before either launch with identical unit selections, pilot stats, forces, map and deployment, rules, turn limit and seed 424242
- **WHEN** each encounter is auto-resolved through an independent pre-battle page load with `?seed=424242`
- **THEN** the encounter IDs and session IDs SHALL be distinct
- **AND** their persisted seeds and gameplay inputs SHALL match, permitting only identity and presentation metadata to differ
- **AND** their winners, turn counts and event counts SHALL match without pinning a fixed seed-to-outcome golden
- **AND** the first Completed encounter's session link and saved history SHALL remain unchanged after the second run

#### Scenario: Absent seed preserves current behavior

- **GIVEN** a single-player launch page loaded without a `?seed` parameter
- **WHEN** the battle is launched
- **THEN** the GameEngine seed SHALL fall back to `Date.now()`
- **AND** the launch SHALL behave exactly as before this change

#### Scenario: Invalid seed falls back silently

- **GIVEN** a single-player launch page loaded with `?seed=abc`
- **WHEN** the query parameter is parsed
- **THEN** the parse SHALL fail the `Number.isFinite` guard
- **AND** the surface SHALL fall back to `Date.now()` without throwing or seeding the engine with `NaN`

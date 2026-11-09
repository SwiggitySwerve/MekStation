## ADDED Requirements

### Requirement: Explicit Restart and Visible Launch Refusal
Only explicit pre-battle force or skirmish launch intent SHALL replace a Launched encounter's linked session. Completion and replay persistence SHALL reject an abandoned session after that replacement. Every pre-battle launch refusal SHALL display a visible error and restore the launch control to its enabled state. Manual same-seed restarts of a still-Launched encounter SHALL retain their same-encounter proof. Completed auto-resolve reproducibility runs SHALL use two fresh encounters prepared from identical battle inputs before either run; the second run SHALL preserve the first Completed encounter's session link and saved history. Matching-session retries SHALL remain idempotent, and Completed SHALL remain terminal.

#### Scenario: Explicit restart abandons the prior session
- **GIVEN** an encounter launched with game A
- **WHEN** pre-battle explicitly launches game B
- **THEN** the persisted link SHALL atomically become B
- **AND** completion or replay submission for A SHALL be refused
- **AND** matching terminal completion for B SHALL succeed

#### Scenario: Implicit reassignment is refused
- **GIVEN** a Launched encounter linked to A
- **WHEN** a caller links B without explicit pre-battle restart intent
- **THEN** the operation SHALL fail without changing A

#### Scenario: Completed encounters remain terminal
- **GIVEN** a Completed encounter
- **WHEN** a caller supplies explicit restart intent
- **THEN** launch SHALL be refused and the stored link SHALL remain unchanged

#### Scenario: Launch refusal is visible and retryable
- **GIVEN** the pre-battle page and an enabled launch button
- **WHEN** the session-link request is refused
- **THEN** an inline alert SHALL display the refusal
- **AND** the button SHALL become enabled again without navigation

#### Scenario: Completed auto-resolve comparisons preserve the first history
- **GIVEN** two fresh encounters prepared before either launch with identical unit selections, pilot stats, forces, map and deployment, rules, turn limit and seed
- **WHEN** each encounter is auto-resolved through an independent pre-battle page load
- **THEN** their encounter IDs and session IDs SHALL be distinct
- **AND** their persisted seeds and battle inputs SHALL match, allowing only identity and presentation metadata to differ
- **AND** their winners, turn counts and event counts SHALL match without a fixed seed-to-outcome golden
- **AND** the first encounter SHALL remain Completed with its original session link and saved history unchanged after the second run

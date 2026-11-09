## ADDED Requirements

### Requirement: Guarded Encounter Lifecycle Writes
The encounter repository SHALL enforce one transition table: Draft to Ready or Launched; Ready to Draft or Launched; Launched to Completed; Completed has no outgoing transitions. The existing force-deletion exception SHALL allow Launched to Draft only when both force slots have been cleared, and SHALL clear session linkage. Missing rows and invalid transitions SHALL fail without mutations. Repeated linking/completion for the same session SHALL be idempotent. A pre-battle launch SHALL be allowed to explicitly restart a Launched encounter by atomically replacing its session linkage; default link operations SHALL continue refusing reassignment. Completed SHALL remain terminal.

#### Scenario: Terminal state cannot reopen
- **GIVEN** a Completed encounter linked to game A
- **WHEN** a caller tries to launch game B or edit its configuration
- **THEN** the operation SHALL fail and preserve the stored row

#### Scenario: Cascade removes both force slots
- **GIVEN** a Launched encounter whose last force is deleted
- **WHEN** the cascade recalculates its lifecycle
- **THEN** it SHALL become Draft and gameSessionId SHALL be cleared

### Requirement: Local Encounter Session Linkage
Local skirmish, interactive, spectator and auto launches SHALL link the actual session as Launched before exposing it to gameplay navigation. A failed link SHALL prevent publication/navigation. Clones SHALL receive fresh status and no game linkage; template application SHALL not reopen terminal encounters.

#### Scenario: Skirmish records its session
- **GIVEN** an editable encounter and valid picked units
- **WHEN** the skirmish launches
- **THEN** the persisted encounter SHALL be Launched and linked to the actual session

### Requirement: Matching Terminal Encounter Completion
The server SHALL complete only the linked game whose event log starts with GameCreated carrying the encounter ID, contains events for that game, and ends with GameEnded. Replay first-persist and dedup retries SHALL invoke the same completion operation. Local auto-resolve SHALL complete without waiting for a gameplay-page mount. Unlinked simulations SHALL not write encounter state.

#### Scenario: Replay retry completes the linked encounter
- **GIVEN** the replay is already persisted and its encounter remains Launched with the matching game ID
- **WHEN** the terminal replay is submitted again
- **THEN** the encounter SHALL become Completed without another replay write

#### Scenario: Unfinished or mismatched history
- **GIVEN** a Launched encounter linked to game A
- **WHEN** submitted history has no terminal event or identifies another game or encounter
- **THEN** the operation SHALL fail without replay persistence or encounter mutation

### Requirement: Read-only Legacy Encounter Audit
Existing encounters SHALL remain unchanged on reads, including inconsistent status/linkage combinations. Cleanup guidance SHALL use read-only queries and SHALL require review before any future remediation. This change SHALL introduce no migration or automatic repair.

#### Scenario: Legacy inconsistent row is read
- **GIVEN** a Draft encounter retaining an old gameSessionId
- **WHEN** it is read
- **THEN** its status and linkage SHALL remain unchanged

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

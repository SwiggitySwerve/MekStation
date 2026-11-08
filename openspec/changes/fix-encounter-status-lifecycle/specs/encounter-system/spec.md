## ADDED Requirements

### Requirement: Guarded Encounter Lifecycle Writes
The encounter repository SHALL enforce one transition table: Draft to Ready or Launched; Ready to Draft or Launched; Launched to Completed; Completed has no outgoing transitions. The existing force-deletion exception SHALL allow Launched to Draft only when both force slots have been cleared, and SHALL clear session linkage. Missing rows and invalid transitions SHALL fail without mutations. Repeated linking/completion for the same session SHALL be idempotent.

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

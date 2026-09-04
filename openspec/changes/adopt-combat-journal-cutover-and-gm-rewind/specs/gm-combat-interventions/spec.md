## ADDED Requirements

<!--
Moved VERBATIM from `harden-gm-two-player-campaign-sessions` on 2026-09-04 (owner ruling on the
2026-09-03 inventory-and-sync council). The three requirements below were whole requirements in
the umbrella's delta; the two under MODIFIED were split, with the umbrella keeping the clauses the
shipped code discharges. The MODIFIED entries carry the FULL final text so that archiving this
change replaces the reduced headers the umbrella's archive installs.
-->

### Requirement: Combat Intervention Has Distinct Preview and Commit Phases
Combat intervention preview SHALL be non-mutating and GM-private. Finalization SHALL submit a server-authored command against the current combat branch and revision and SHALL append an immutable correction fact through the authoritative transaction.

#### Scenario: Preview changes nothing
- **WHEN** the GM previews damage, position, phase, initiative, objective, or outcome correction
- **THEN** combat state, player projections, journal, and outbox SHALL remain unchanged

#### Scenario: Finalized correction commits
- **WHEN** the GM confirms a mechanically valid preview against the current branch
- **THEN** the authority SHALL commit the correction, actor, reason reference, deterministic replacement data, and authorized player projections

#### Scenario: Stale preview rejects
- **WHEN** the combat branch or affected revision changed after preview
- **THEN** finalization SHALL return a typed stale-preview conflict and SHALL append nothing

### Requirement: Superseded Combat Commands Are Rejected
Commands SHALL name their expected combat branch and revision.

#### Scenario: Old branch command arrives
- **WHEN** a client sends a command for a superseded branch
- **THEN** the authority SHALL return `STALE_BRANCH` with the active branch and resync action and SHALL append nothing

### Requirement: Combat Rewind Preserves Viewer-Specific Hidden State
Rebuild SHALL restore fog-of-war, sealed choices, private GM records, owned-unit visibility, and public facts as of the selected checkpoint for each viewer.

#### Scenario: Rewind changes fog visibility
- **WHEN** later movement had revealed a unit that was hidden at the checkpoint
- **THEN** Player 1 and Player 2 SHALL receive the correct rebuilt visibility for their own viewer context

#### Scenario: Offline player rejoins after rewind
- **WHEN** a player reconnects after branch activation
- **THEN** the baseline and tail SHALL hydrate the active branch without exposing superseded hidden facts

## MODIFIED Requirements

### Requirement: Combat Rewind Is GM-Only and Append-Only
Only the authenticated non-playing GM SHALL commit combat rewind. A player MAY submit a non-mutating rewind request. Rewind SHALL create a replacement branch from a trusted checkpoint without deleting prior events.

#### Scenario: Player requests rewind
- **WHEN** a player asks to return to a prior combat point
- **THEN** the request SHALL enter GM review and SHALL not change the effective branch

#### Scenario: Player commits rewind
- **WHEN** a player attempts a rewind-commit command
- **THEN** the authority SHALL reject it before append

#### Scenario: GM commits rewind
- **WHEN** the GM confirms a rewind impact preview before the campaign-outcome receipt boundary
- **THEN** the authority SHALL create a building replacement branch and SHALL preserve prior combat history

### Requirement: Combat Rebuild Gates Commands and Activation
While a replacement combat branch is rebuilding, client commands SHALL reject with retryable `PROJECTION_REBUILDING`. The branch SHALL activate only after deterministic replay and all required viewer projections verify.

#### Scenario: Command during rebuild rejects
- **WHEN** any participant submits a combat command while the candidate branch is rebuilding
- **THEN** the authority SHALL return `PROJECTION_REBUILDING` with current branch and revision and SHALL not queue or append the command

#### Scenario: Valid rebuild activates
- **WHEN** replay, state validation, fog, hidden-state, and viewer-projection checks pass
- **THEN** one branch-activation fact SHALL make the replacement branch effective and trigger participant resynchronization

#### Scenario: Invalid rebuild remains blocked
- **WHEN** any rebuild check fails
- **THEN** the candidate branch SHALL remain blocked and the previous effective branch SHALL remain authoritative

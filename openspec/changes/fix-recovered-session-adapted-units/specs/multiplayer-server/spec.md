# Spec Delta: Multiplayer Server

## ADDED Requirements

### Requirement: Recovered Session Has Populated Adapted Units

`InteractiveSession.fromSession()` SHALL re-derive `adaptedUnits` from canonical campaign state on session recovery, so a session resumed after server restart has the same per-unit adapted state as a freshly-bootstrapped session. Previously the recovery path left `adaptedUnits` empty, breaking full move/attack play after recovery (playtest gap #2).

**Priority**: High

#### Scenario: Recovered session adapted-units match bootstrap parity

**GIVEN** a session bootstrap-initialized with 4 units (each with deterministic adapted state)
**AND** the same session persisted, then reconstructed via `fromSession`
**WHEN** `recovered.adaptedUnits` is inspected
**THEN** the array SHALL contain 4 entries (one per unit)
**AND** each entry SHALL deeply match the bootstrap-time entry for that unit

#### Scenario: Move + attack succeeds on a recovered session

**GIVEN** a session persisted mid-combat (turn 3, some moves committed)
**AND** the session reconstructed via `fromSession`
**WHEN** the recovered session executes a move action followed by an attack action
**THEN** neither action SHALL throw
**AND** the moves/attacks SHALL behave identically to a non-recovered session at the same turn (deterministic given the same seed)

#### Scenario: Bootstrap path is unaffected

**GIVEN** a session that is bootstrap-initialized (not recovered)
**WHEN** the session runs through combat normally
**THEN** the new `adaptedUnits` derivation path inside `fromSession` SHALL NOT affect the bootstrap behavior (the same derivation function is called from both code paths, but the bootstrap path's call is unchanged)

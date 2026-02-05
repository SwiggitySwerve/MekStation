# Snapshot/Replay Integration Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure, Simulation Runner
**Affects**: Debugging, Replay UI

---

## Overview

### Purpose

Persists failed scenarios to disk in JSON format and integrates with existing replay UI for visual debugging of detected violations.

### Scope

**In Scope:**

- Snapshot file format (seed, config, events, violation, finalState)
- SnapshotManager class (save/load)
- Integration with useReplayPlayer hook
- Gitignore configuration for snapshot files
- Snapshot cleanup utilities

**Out of Scope:**

- New replay UI components
- Database storage
- Cloud synchronization
- Snapshot versioning

---

## Requirements

### Requirement: Snapshot File Format

The system SHALL save failed scenarios in structured JSON format.

**Priority**: Critical

#### Scenario: Save failed scenario

**GIVEN** simulation with critical violation
**WHEN** calling saveFailedScenario()
**THEN** JSON file SHALL be created in **snapshots**/failed/
**AND** filename SHALL be {seed}\_{timestamp}.json
**AND** file SHALL contain seed, config, events, violation, finalState

#### Scenario: Load snapshot for replay

**GIVEN** saved snapshot file
**WHEN** calling loadSnapshot(path)
**THEN** result SHALL be valid IGameSession
**AND** events SHALL be loadable by useReplayPlayer
**AND** deriveState(events) SHALL match saved finalState

---

## Data Model Requirements

```typescript
interface ISnapshot {
  readonly seed: number;
  readonly config: ISimulationConfig;
  readonly events: IBaseEvent[];
  readonly violation: IViolation;
  readonly finalState: IGameState;
  readonly timestamp: string;
}

interface ISnapshotManager {
  readonly saveFailedScenario: (
    result: ISimulationResult,
    violation: IViolation,
  ) => string; // returns filepath

  readonly loadSnapshot: (path: string) => IGameSession;

  readonly cleanupOldSnapshots: (maxAge: number) => number; // returns count deleted
}
```

---

## Examples

### Example: Save and Load Snapshot

```typescript
// Save
const manager = new SnapshotManager();
const filepath = manager.saveFailedScenario(result, violation);
// filepath = "src/simulation/__snapshots__/failed/12345_2026-02-01T23-00-00.json"

// Load
const session = manager.loadSnapshot(filepath);
// Use with replay UI
const { state, currentIndex } = useReplayPlayer({ events: session.events });
```

---

## References

- Existing Replay UI: src/hooks/audit/useReplayPlayer.ts
- Core Infrastructure Specification

---

## Changelog

### Version 1.0 (2026-02-01)

- Initial specification

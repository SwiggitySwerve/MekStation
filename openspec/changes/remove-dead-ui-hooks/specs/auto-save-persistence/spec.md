## REMOVED Requirements

### Requirement: Game State Persistence Hook

**Reason**: Dead module, owner ruling 2026-11-07 D1 (`useGameStatePersistence` had no production caller and is deleted).

**Migration**: None. Match recovery is covered by `Local Interactive Match Recovery Round-Trip` and the server-side persistence requirements.

### Requirement: Save Metadata

**Reason**: Dead module, owner ruling 2026-11-07 D1 (the metadata envelope was written only by the deleted `useGameStatePersistence`).

**Migration**: None.

# Remove dead UI hooks and the mobile placement adapter

## Why

An audit found six hook and component modules with no production importer.
The owner approved deleting them on 2026-11-07 (ruling D1). They carry
untested-in-production state machines that would mislead anyone wiring them in
later (for example `useScreenReaderAnnouncer` drops same-tick announcements).

## What Changes

- Delete `useAsync`, `useOfflineStatus` (with `useIsOnline` and
  `getOnlineStatus`), `useGameStatePersistence` (with its helpers),
  `useScreenReaderAnnouncer`, `EquipmentAssignmentAdapter` (with
  `usePlacementMode`), and their tests.
- Delete the unmounted `gameplay/TacticalAccessibility/` directory
  (`TacticalLiveRegion`, `focusOrder`, barrel). `TacticalLiveRegion` type-imports
  the announcer and nothing mounts the directory.
- REMOVED requirements: `Game State Persistence Hook` and `Save Metadata`
  (auto-save-persistence), `Offline Status Detection` (pwa-offline-system).

## Impact

Affected capabilities: `auto-save-persistence`, `pwa-offline-system`.
No runtime behaviour changes: none of the deleted modules had a production
caller, and no persisted format or localStorage key is written by any
remaining code. `useOfflineIndicator`, `usePersistedState` and the other
auto-save hooks are untouched. The living specs keep some narrative
mentions (overview, examples, references) that a canonical sync should tidy.

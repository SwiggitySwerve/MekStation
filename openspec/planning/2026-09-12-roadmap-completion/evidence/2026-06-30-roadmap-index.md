# Active OpenSpec Roadmap

**Status date:** 2026-06-30
**Scope:** Current OpenSpec queue after the QC/release-readiness implementation waves.

## Current Queue

There are no active OpenSpec changes.

`openspec.cmd list --json` returns:

```json
{"changes":[]}
```

## Current Validation Baseline

| Gate | Result |
| --- | --- |
| `openspec.cmd validate --all --strict` | 211 specs passed, 0 failed |
| `npm.cmd run spec:purpose:validate:strict` | 211 files scanned, 0 errors |
| `npm.cmd run terminology:validate:strict` | 222 live OpenSpec files scanned, 0 violations |
| `npm.cmd run qc:openspec-ci:validate` | workflow contracts 8/8, aggregator needs 17/17, errors 0 |

## What Evolved During Implementation

The older active-roadmap lanes have been superseded by archived changes and current source-of-truth specs. The important evolved surfaces now live directly in canonical specs and QC registry coverage:

- App shell route, deep-link, refresh, replay-library, and UI-flow-shell proof.
- Campaign economy, long-campaign stability, post-combat base/economy recovery, and time-cascade behavior.
- GM authority, private/public redaction, cascade preview, combat interventions, and unit reload reconciliation.
- Encounter-to-combat continuity, tactical projection parity, tactical map rule explanations, top-down legibility, and isometric elevation.
- Combat catalog/rules parity, known-gap honesty, non-BattleMech scope matrices, customizer/export data gates, multiplayer recovery, replay recovery, and maintenance code health.

## Next Change Protocol

Use this sequence for any new feature or behavior that evolves from the current implementation:

1. Create a new focused OpenSpec change.
2. Keep delta specs scoped to the capability that changed.
3. Implement and verify against the change artifacts.
4. Sync accepted deltas into `openspec/specs`.
5. Merge implementation through PR.
6. Archive the change after it lands on `main`.
7. Re-run:

```powershell
openspec.cmd validate --all --strict
npm.cmd run spec:purpose:validate:strict
npm.cmd run terminology:validate:strict
npm.cmd run qc:openspec-ci:validate
npm.cmd run qc:app-completion:release -- --json
```

## Notes

Archived change directories remain durable history. They should not be treated as active backlog unless a new OpenSpec change explicitly reopens that behavior.

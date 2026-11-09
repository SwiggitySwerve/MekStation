## Why

K11 merges each persisted effect with its intervention's session row. Repair completion emits two distinct effects, so both become the same row, losing unit-readiness presentation and colliding React keys.

## What Changes

Replace only the first persisted row for an intervention with its session row. Keep additional effects and legacy rows without an intervention id. Preserve one copy of session-only rows and renumber sequences.

## Capabilities

### Modified Capabilities
- `gm-campaign-intervention-boundaries`: preserve distinct effects when merging saved and session ledger rows.

## Impact

Campaign ledger presentation only. No schema, persistence, authority, repair-domain or replay changes. The control plane uses the helper for public and private rows; the guest projection continues rendering persisted effects directly. No engine, AI, multiplayer dispatcher, P2P or simulation runner callers.

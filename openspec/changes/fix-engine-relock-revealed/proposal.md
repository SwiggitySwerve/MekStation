## Why

A completed weapon phase reveals locked attacks, but the subsequent advance locks Revealed units again. These duplicate events regress intermediate lock state and increment the activation index until the phase reset hides them.

## What Changes

- Add Revealed to the existing complete-state exclusions in InteractiveSession straggler locking.
- Verify legal completion and mid-loop reveal through memory and real SQLite hosts, preserving the existing signature, digest, and stored event semantics.
- Document that non-acting straggler locks remain a separate OPEN.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine-orchestration`: complete lock states are skipped during phase advancement.

## Impact

Only future event emission changes. Recovery and replay fold stored events; no reducer, schema, replay-fidelity version, fingerprint, recording, or pin changes. Non-acting units retain their existing straggler locking behaviour.

## Why

Local interactive combat currently persists its launch events but can leave later authoritative phase and command events only in memory. A cold reload can therefore recover the same match id at an earlier phase, contradicting the existing local recovery contract and silently discarding playable progress.

## What Changes

- Persist every newly appended event when an authoritative `InteractiveSession` mutation commits a replacement session, including phase progression and combat commands.
- Preserve event order, sequence numbers, match identity, and the existing non-crashing storage-divergence behavior.
- Prove the write path through real IndexedDB-backed regression coverage and a cold-reload browser journey that compares the recovered state with the pre-reload state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auto-save-persistence`: Strengthen the local interactive match recovery round-trip so every authoritative event appended after launch is durably mirrored before reload recovery is considered successful.

## Non-goals

- Changing combat command authorization, initiative rules, damage resolution, or multiplayer protocol behavior.
- Replacing IndexedDB, adding snapshot authority, or introducing a new persistence dependency.
- General engine refactoring or unrelated maintenance cleanup.

## Impact

- Affected runtime boundary: `InteractiveSession` session replacement and match-log persistence collaborators.
- Affected verification: focused engine match-log tests and the active-session cold-reload browser scenario.
- No public API, data-schema, dependency, campaign, or multiplayer protocol change is intended.

## Why
New replay logs need an immutable producer-rules discriminator before later semantic changes can preserve earlier behavior. Hosted multiplayer reaches the strict lifecycle parser, so old tabs must receive an explicit reload failure before receiving new seeds.

## What Changes
- Own writer 2, absent-to-1 reading, validation, and immutable release/rule facts in ReplayFidelityVersion.ts.
- Stamp the shared lifecycle factory and standalone runner with the same constant.
- Revise the strict GameCreated schemaId for an optional validated field.
- Advertise reader capability and refuse incompatible authorized joins with the existing PROTOCOL_VIOLATION error and a reload-required reason; surface terminal Reload UI and local reader failures.
- Prove every moved log lock by exact stamp removal and preserve the historical encounter recording.

## Non-goals
No projector, state, dice, combat rule, certification, recovery semantics, schema upcast, or historical log rewrite. C-1c 2b is a later release 3 rule.

## Impact
Affected capability: game-state-management. Both producers, hosted join transport, mirror UI, cold recovery error adapter and Replay Library error adapter participate. Parser identity changes deliberately invalidate prior pipeline fingerprints; no generated construction Zod applies.

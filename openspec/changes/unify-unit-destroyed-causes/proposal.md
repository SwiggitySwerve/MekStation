## Why

UnitDestroyed producers, damage results, and the replay validator repeat the same seven causes. Independent copies can drift and reject otherwise valid history.

## What Changes

Own the seven serialized values in one pure gameplay types module. Derive the TypeScript union and replay enum from its tuple. Preserve vehicle-specific causes and their existing mapping to UnitDestroyed.

## Impact

Affected capability: damage-system. No payload, replay version, emitted event, or persisted-format change. Any changed replay, digest, or golden requires Root's decision before proceeding.

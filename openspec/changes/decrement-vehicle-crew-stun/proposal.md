## Why

Vehicle crew stun never expires. MegaMek 48fcb2f64 decrements a positive stun counter once in Tank.newRound (Tank.java:1112-1121), called during Initiative preparation through TWGameManager.resetEntityRound.

## What Changes

Add one pure vehicle countdown step and call it from the event reducer's guarded new-round boundary and the standalone runner's reset. Preserve the persisted name crewStunnedPhases while documenting that it counts rounds. Leave repeated-stun increments unchanged.

## Impact

Affected capability: game-state-management. No event fields, payload schemas, or persisted field names change. Replayed stun-bearing histories now expire stun at the pinned boundary. Any changed committed replay, digest, or golden is a STOP for Root; do not regenerate it.

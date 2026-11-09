## Decision

The existing `vehicleCrewStun.ts` domain module owns both the increment and countdown rules. Export `stunCrew(vehicle: IVehicleCombatState): IVehicleCombatState` as an immutable update. All four crew/commander stun producers call it; commander wound counts and destruction decisions retain their existing owners and results.

MegaMek 48fcb2f64 `megamek/src/megamek/common/units/Tank.java:1065-1071`:

```java
public void stunCrew() {
    if (m_nStunnedTurns == 0) {
        m_nStunnedTurns = 2;
    } else {
        m_nStunnedTurns++;
    }
}
```

## Integration

Weapon hits flow through `gameSessionAttackResolution.hit.ts`, `gameSessionVehicleAttackResolution.ts`, and `gameSessionVehicleCriticalResolution.ts`. Direct critical effects call `applyVehicleCritEffect`; critical events update live and replay state through `gameState/vehicleCombatStateUpdates.ts`.

Interactive phases and both GameEngine phase loops call `resolveAllAttacks`. AI submits declarations to those paths. Multiplayer legacy dispatch calls `dispatchToEngine`; journal authority decides on a hydrated scratch interactive session and commits its events and digest. P2P translation produces host-owned declarations/phase commands. The standalone runner dispatches native vehicle hits to the same vehicle resolver and folds returned events. The exported battle-armor leg-attack critical helper also calls the direct resolver, although it currently has no production caller.

## Compatibility

Keep `crewStunnedPhases` as the persisted field name; C14 established that it counts rounds. Keep informational `VehicleCrewStunned` payloads unchanged. This changes derived repeated-stun state, so validate replay, digest, and golden suites before and after and stop on any committed expectation drift. No migration, schema version, new randomness, or UI changes are required.

## Delivery

One PR contains two implementation commits: a behavior-preserving consolidation with regression proof, followed by failing parity tests and the corrected rule. Restore unconditional plus-two as a deliberate mutant and prove the new tests reject it.

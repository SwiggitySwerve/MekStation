# Attack relationship rules

`attackLinks.ts` owns release of the relationships represented in
`IUnitGameState`: grapple partner/status, squad `swarmingUnitId` with the
top-level `isSwarming` flag, and displacement target/attacker references.
The host has no reciprocal swarm list in this state model; cleanup scans squad
references to the exiting host. `IBASquadCombatState.swarmedByUnitIds` is a
different resolver context, not a persisted field to add here.

## Pinned MegaMek behavior

All citations use MegaMek commit `48fcb2f64`.

- [TWGameManager.destroyEntity, lines 24054–24103](https://github.com/MegaMek/megamek/blob/48fcb2f64/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L24054)
  clears both swarm directions and releases both grapple participants. A normal
  surviving swarmer takes no damage from host destruction; airborne VTOL/WiGE
  exceptions use a separate handler. C9 introduces no new damage or rolls.
- [TWGameManager.ejectEntity, lines 30273–30285](https://github.com/MegaMek/megamek/blob/48fcb2f64/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L30273)
  calls `destroyEntity` for the abandoned unit, inheriting link cleanup, then
  removes a manual ejection with `REMOVE_EJECTED`.
- [TWGameManager flee handling, lines 6411–6445](https://github.com/MegaMek/megamek/blob/48fcb2f64/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L6411)
  clears the host/swarmer relationship, removes its swarmer as captured and
  removes the fleeing entity with `REMOVE_IN_RETREAT`. It has no explicit
  grapple-release block. Capturing the swarmer is outside this cleanup change.
- [Mek.isEligibleForMovement, lines 6250–6259](https://github.com/MegaMek/megamek/blob/48fcb2f64/megamek/src/megamek/common/units/Mek.java#L6250)
  forbids movement in a normal grapple. A chain-whip attacker may move to break
  its grapple; this exception must be preserved in a later movement fix.

## Exit boundary

Cleanup belongs to accepted retreat/ejection transitions in `unitExitState.ts`
and destruction state commits in the reducers and standalone runner. It does
not wait for an end-of-turn sweep or a later `UnitDestroyed` event. Lethal
`PilotHit` and aerospace `DamageApplied` already mark destruction themselves.
`getUnitOperability(...).onField` defines whether a unit has left the field.
Shutdown, unconsciousness and retreat/withdrawal declarations alone retain
relationships. Existing first-exit latches remain in control of exit acceptance.

Release changes only the exiting unit and relevant references on its partners.
It preserves unrelated links, coordinates, facing, combat data and RNG state.
Missing partners and one-sided references are tolerated. Repeating cleanup is
a no-op once no relevant state remains. Event envelopes and persisted schemas
stay unchanged; old event folds containing these links gain corrected state.

The shared break-grapple result preserves existing optional keys. The shared
squad-removal helper preserves the historical event-fold behavior of deleting
the target key. The battle-armor `setSwarmTarget` setter still supports assigning
`undefined`; that existing setter's object-key behavior is deliberately retained.

## Follow-ups and represented deviations

- **Grappled units must not be able to retreat.** MekStation currently permits
  normal grappled withdrawal: `applyWithdrawalEdgeExits` checks exit flags and
  position but not grapple state, and movement validation does not read grapple
  state. A session test pins an actual grapple followed by edge withdrawal.
  C9 releases the grapple on this reachable retreat to avoid a dangling link to
  an off-board unit. Preventing the retreat is a separate MegaMek parity fix.
- DFA/push/displacement declaration flags have initialization/pass-through
  writers but no in-play lifecycle writer. C9 clears represented relationships
  without implementing those declarations.
- `resolveSwarmAttach` has no production caller and `SwarmAttached` has no
  reducer. Attaching a swarm is a separate feature; cleanup tests seed the
  represented squad state directly.
- Brush-off release differs between the reducer and runner; this change does
  not broaden brush-off semantics.

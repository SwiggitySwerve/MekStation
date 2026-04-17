# Tasks: Add Fog of War Event Filtering

## 1. Visibility Model

- [ ] 1.1 Define `canPlayerSeeUnit(playerId, unitId, state): boolean`
      in `spatial-combat-system` as a shared helper
- [ ] 1.2 Implementation: true if any unit owned by `playerId` has LOS
      to `unitId` within its sensor range, OR the target is itself
      owned by `playerId`
- [ ] 1.3 Add convenience `visibleUnitsForPlayer(playerId, state):
    UnitId[]` that returns the set
- [ ] 1.4 Unit tests covering: adjacent LOS, LOS blocked by terrain,
      sensor range boundary, own units always visible

## 2. Event Visibility Classification

- [ ] 2.1 Add `visibility` tag on every event type; values `'public' |
    'actor-only' | 'observer-visible' | 'target-visible'`
- [ ] 2.2 Classify existing event types: - `GameCreated`, `PhaseChanged`, `TurnAdvanced`, `GameEnded`,
      `match_paused`, `match_resumed` → `'public'` - `MovementDeclared` → `'actor-only'` (pre-commit) - `MovementLocked`, `FacingChanged` → `'observer-visible'` - `AttackDeclared` → `'actor-only'` - `AttackResolved`, `DamageApplied` → split:
      `'target-visible'` (target always knows they got hit) plus
      `'observer-visible'` for the full detail - `HeatGenerated`, `HeatDissipated` → `'observer-visible'` - `PilotHit`, `UnitDestroyed` → `'observer-visible'` - `InitiativeRolled` → `'public'` (initiative result itself);
      the dice roll payload SHALL be visible to all

## 3. Server-Side Filter

- [ ] 3.1 Add `fogOfWar.ts` with `filterEventForPlayer(event,
    playerId, state): IGameEvent | null`
- [ ] 3.2 Returns `null` if the event must not be sent to this player
- [ ] 3.3 Returns a potentially redacted copy if partial visibility
      applies (e.g., target knows a hit was taken but not the shooter
      when the shooter is not in LOS)
- [ ] 3.4 The filter is a no-op (returns original) when
      `config.fogOfWar === false`

## 4. Broadcast Integration

- [ ] 4.1 `ServerMatchHost.broadcastEvent` in fog mode runs
      `filterEventForPlayer` per connected client
- [ ] 4.2 Non-public events are sent only to clients the filter
      approves
- [ ] 4.3 A player's own socket always receives events authored by
      their units (actor-visible events)

## 5. Redaction Rules

- [ ] 5.1 `AttackResolved` when shooter is not visible to target
      owner: redact `attackerId`, keep `targetId`, `damage`,
      `hitLocation`, `rolls` for target's own damage display
- [ ] 5.2 `MovementLocked` when the moving unit is not in the
      observer's LOS: skip the event entirely
- [ ] 5.3 `HeatGenerated` for an enemy unit outside LOS: skip entirely
- [ ] 5.4 `UnitDestroyed` for an enemy unit outside LOS: send a
      reduced form `{type: 'unit_destroyed', payload: {unitId}}`
      without damage/crit detail

## 6. Fog-Enable Configuration

- [ ] 6.1 `IMatchMeta.config.fogOfWar: boolean` defaults to `false`
- [ ] 6.2 Host sets fog on at match creation; cannot be toggled mid-
      match
- [ ] 6.3 Lobby UI surfaces a `"Double-blind (fog of war)"` checkbox

## 7. Client Rendering With Fog

- [ ] 7.1 Client UI detects fog mode from `IMatchMeta` and gracefully
      handles missing events (enemy unit disappears from map when it
      leaves LOS)
- [ ] 7.2 Enemy units render with `"?"` designations when hidden
- [ ] 7.3 Known-but-not-visible units show last-known position grayed
      out
- [ ] 7.4 Radar / sensor ring visual indicator for each owned unit

## 8. Replay Handling

- [ ] 8.1 On reconnect, the filter is applied to the replay stream so
      the replay matches what the client would have seen live
- [ ] 8.2 Post-match spectator / admin mode MAY view the un-filtered
      log (separate privileged endpoint, not in this change)

## 9. Sanity Tests

- [ ] 9.1 Unit tests: three units on a map with terrain between enemy
      pairs, verify `canPlayerSeeUnit` returns correct values
- [ ] 9.2 Integration test: Player A moves out of LOS; Player B stops
      receiving A's events until A re-enters LOS
- [ ] 9.3 Integration test: A attacks B from ambush (outside B's LOS)
      — B receives a redacted `AttackResolved` without `attackerId`;
      A receives full event
- [ ] 9.4 Integration test: fog disabled → filter is a no-op; both
      clients see identical event streams
- [ ] 9.5 Reconnect test: fog-on match, reconnect mid-game; replay is
      filtered

## 10. Performance

- [ ] 10.1 LOS checks are cached per-turn per-(observer, target)
      pair; invalidated on movement events
- [ ] 10.2 `canPlayerSeeUnit` target: sub-millisecond per check on
      8-player, 32-unit maps
- [ ] 10.3 A smoke benchmark in the test suite ensures performance
      does not regress past a 5ms-per-event broadcast budget

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `fog-of-war` ADDED delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in the `multiplayer-server` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 11.3 Every requirement in the `multiplayer-sync` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 11.4 Every requirement in the `spatial-combat-system` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 11.5 `openspec validate add-fog-of-war-event-filtering --strict`
      passes clean

# Enrich movement_declared with step chain + displacement breakdown

## Why

The user's brief asks for:

> What force attacked, what player attacked, what unit attacked, unit moved from what hex to what hex, how much was straight movement, how much movement was spent turning, any piloting checks you had to do for movement to check for slides, total actual displacement for evasion bonuses for the round, movement in a straight line for charges, etc.

Today `IMovementDeclaredPayload` carries `from`, `to`, `path`, `mpUsed`, `facing`, `movementType`, `heatGenerated`. That covers source/destination but not the *chain*: how many hexes were forward, how many MP went to facing changes, where mid-move PSRs fired, and whether the move qualifies as a charge (straight line ≥ 3 hexes through to a target).

Cross-referencing MegaMek's `MoveStepType` enum (`E:/Projects/megamek/megamek/src/megamek/common/enums/MoveStepType.java`), the canonical step taxonomy is `FORWARDS / BACKWARDS / TURN_LEFT / TURN_RIGHT / START_JUMP / LATERAL_LEFT / LATERAL_RIGHT / GET_UP / GO_PRONE / CHARGE / DFA / SHAKE_OFF_SWARMERS / HULL_DOWN / CLIMB_MODE_ON / CLIMB_MODE_OFF`. The runner already walks a `MoveStep[]` internally during movement resolution; this change exposes that walk to the event log so consumers can audit per-step MP cost, terrain transitions, and per-step PSR triggers.

## What

### Code changes

1. Add five fields to `IMovementDeclaredPayload`:
   - `hexesMoved?: number` — total hex transitions (path.length - 1)
   - `straightHexes?: number` — hexes entered without facing change (forward + backward + lateral)
   - `turningMpCost?: number` — MP spent on facing changes (`mpUsed - straightHexes` minus jump/special-step costs)
   - `netDisplacement?: number` — `hexDistance(from, to)` (already used for TMM; just denormalized into the event)
   - `steps?: readonly IMovementStep[]` — the step chain

2. Add a discriminated `IMovementStep` union covering the BattleMech ground-combat subset of MegaMek's `MoveStepType`:

```ts
export type IMovementStep =
  | IForwardStep        // FORWARDS / BACKWARDS — counts toward straightHexes
  | ITurnStep           // TURN_LEFT / TURN_RIGHT — costs 1 MP per facing
  | ILateralStep        // LATERAL_LEFT / LATERAL_RIGHT — sideslip (skid resolution)
  | IJumpStep           // START_JUMP segment
  | IStandUpStep        // GET_UP — costs 2 MP, triggers AttemptStand PSR
  | IGoProneStep        // GO_PRONE — voluntary prone (charge / DFA setup)
  | IChargeDeclaredStep // CHARGE — physical-attack handoff
  | IDfaDeclaredStep    // DFA — physical-attack handoff
  | IShakeOffSwarmStep; // SHAKE_OFF_SWARMERS
```

Each step carries: `index` (0-based ordinal), `at` or `from`/`to` hex, `mpCost`, and (where applicable) `terrainEntered` / `elevationDelta` / `fromFacing`/`toFacing`.

3. Mid-move PSR events fire as their own `psr_triggered` events (already do), but stamp `triggerSource = 'movement-step:<index>'` so consumers can audit which step caused the slide / fall / leg-damage check.

4. Add a TypeScript hex-coordinate utility `coordToBoardLabel(coord: IHexCoordinate): string` in `src/utils/gameplay/hexMath.ts` — axial `(q, r)` → MegaMek 4-digit `NNNN` notation, mirror of the Python helper from PR A. Existing `hexDistance` (line 111) and `axialToOffset` get the call wired through.

### Spec extensions

- `movement-system`: ADD `Requirement: Movement Phase Step Chain Emission` (the `steps` array contract — every committed move emits its chain in `IMovementStep` discriminated form); ADD `Requirement: Movement Decomposition Fields` (hexesMoved / straightHexes / turningMpCost / netDisplacement contracts).
- `piloting-skill-rolls`: ADD `Requirement: Movement-Step PSR Trigger Source Stamping` (PSRs fired during movement carry `triggerSource = 'movement-step:<index>'`).

## Impact

- **Affected types**: `IMovementDeclaredPayload`, new `IMovementStep` union and 9 step interfaces.
- **Affected code**: `src/types/gameplay/GameSessionInterfaces.ts:447`, `src/utils/gameplay/hexMath.ts` (new `coordToBoardLabel`), `src/simulation/runner/phases/movement.ts` (emits steps array), `src/utils/gameplay/movement/eventPath.ts` (path walker decomposes MP), PSR emit sites near movement resolution (stamp `triggerSource`).
- **Affected specs**: `movement-system`, `piloting-skill-rolls`.
- **Risk**: low. Every new field is OPTIONAL; legacy event streams replay unchanged. The step decomposition is pure derivation from data the runner already has (`path` + per-hex terrain + facing transitions).
- **Visible improvement**: the readable companion (rewritten in PR D) can render a move as:
  ```
  MOVE player-1 atlas: 0011→0509 mp=5(s4+t1) disp=4 [F→F→F→TR→F]
  ```

## Out of scope

- New event types for terrain damage applied mid-move (`magma_damage_applied`, `hazardous_liquid_damage_applied`, `building_rubble_damage_applied`) — handed off to the named follow-on `add-mid-move-terrain-damage-events`.
- Skid resolution (sideslip path computation, domino fall chain) — `add-skid-and-displacement-events`.
- `forceId` as a domain concept above `GameSide` — deferred.
- PSR reason discriminated enum — PR E.

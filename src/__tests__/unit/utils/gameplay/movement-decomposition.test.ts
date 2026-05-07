/**
 * Unit tests for `decomposeMovementSteps` per
 * `enrich-movement-declared-with-chain-and-displacement` (movement-system
 * delta — Movement Phase Step Chain Emission + Movement Decomposition Fields).
 *
 * The contract under test:
 *   - Walk / Run moves walk the path, emitting `'forward'` steps for
 *     each adjacent hex transition and `'turn'` steps when the unit's
 *     synthetic facing must change to align with the next hex.
 *   - Jump moves emit a single `'jump'` step regardless of distance.
 *   - Stand-up (when `startedProne === true`) prepends a `'standUp'`
 *     step with `mpCost: 2` and `psrTriggered: true`.
 *   - The four decomposition fields (`hexesMoved` / `straightHexes` /
 *     `turningMpCost` / `netDisplacement`) match the chain bookkeeping.
 *   - Ordinals (`step.index`) are 0-based and contiguous across the
 *     entire chain.
 *
 * Per the piloting-skill-rolls delta (Movement-Step PSR Trigger-Source
 * Stamping): the AttemptStand PSR factory accepts an optional step
 * index that overrides `triggerSource` to `'movement-step:<index>'`.
 * The last test in this suite asserts that contract.
 */

import {
  Facing,
  IChargeDeclaredStep,
  IForwardStep,
  IJumpStep,
  IMovementStep,
  IStandUpStep,
  ITurnStep,
  MovementType,
} from '@/types/gameplay';
import {
  IMovementDecomposition,
  assertMovementStepConservation,
  decomposeMovementSteps,
} from '@/utils/gameplay/movement/eventPath';
import {
  PSRTrigger,
  createStandingUpPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

const ORIGIN = { q: 0, r: 0 };

describe('decomposeMovementSteps', () => {
  describe('walk / run moves', () => {
    it('emits a single forward step for a 1-hex straight walk', () => {
      // North-facing unit walking 1 hex north. AXIAL_DIRECTION_DELTAS[Facing.North] = {q:0, r:-1}.
      const result = decomposeMovementSteps({
        from: ORIGIN,
        to: { q: 0, r: -1 },
        fromFacing: Facing.North,
        toFacing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 1,
      });

      expect(result.steps).toHaveLength(1);
      const step = result.steps[0] as IForwardStep;
      expect(step.kind).toBe('forward');
      expect(step.index).toBe(0);
      expect(step.direction).toBe('forward');
      expect(step.from).toEqual(ORIGIN);
      expect(step.to).toEqual({ q: 0, r: -1 });
      expect(step.mpCost).toBe(1);

      expect(result.hexesMoved).toBe(1);
      expect(result.straightHexes).toBe(1);
      expect(result.turningMpCost).toBe(0);
      expect(result.netDisplacement).toBe(1);

      assertMovementStepConservation(result, 1);
    });

    it('emits forward+turn+forward chain when the path bends mid-way', () => {
      // North-facing unit walks 2 hexes north, then turns NE (1 facing-step
      // right) and walks 1 hex NE.
      // Facing.North delta = {q:0, r:-1}; Facing.Northeast delta = {q:1, r:-1}.
      // Path: (0,0) -> (0,-1) -> (0,-2) -> (1,-3).
      // Step chain: F (idx 0), F (idx 1), TR (idx 2), F (idx 3).
      // mpUsed = 4 = 3 forwards + 1 turn.
      const path = [
        { q: 0, r: 0 },
        { q: 0, r: -1 },
        { q: 0, r: -2 },
        { q: 1, r: -3 },
      ];
      const result = decomposeMovementSteps({
        from: { q: 0, r: 0 },
        to: { q: 1, r: -3 },
        fromFacing: Facing.North,
        toFacing: Facing.Northeast,
        movementType: MovementType.Walk,
        mpUsed: 4,
        path,
      });

      // 3 forwards + 1 turn = 4 total steps.
      expect(result.steps).toHaveLength(4);

      const step0 = result.steps[0] as IForwardStep;
      expect(step0.kind).toBe('forward');
      expect(step0.index).toBe(0);
      expect(step0.from).toEqual({ q: 0, r: 0 });
      expect(step0.to).toEqual({ q: 0, r: -1 });
      expect(step0.mpCost).toBe(1);

      const step1 = result.steps[1] as IForwardStep;
      expect(step1.kind).toBe('forward');
      expect(step1.index).toBe(1);
      expect(step1.from).toEqual({ q: 0, r: -1 });
      expect(step1.to).toEqual({ q: 0, r: -2 });

      const step2 = result.steps[2] as ITurnStep;
      expect(step2.kind).toBe('turn');
      expect(step2.index).toBe(2);
      expect(step2.fromFacing).toBe(Facing.North);
      expect(step2.toFacing).toBe(Facing.Northeast);
      expect(step2.mpCost).toBe(1);

      const step3 = result.steps[3] as IForwardStep;
      expect(step3.kind).toBe('forward');
      expect(step3.index).toBe(3);
      expect(step3.from).toEqual({ q: 0, r: -2 });
      expect(step3.to).toEqual({ q: 1, r: -3 });
      expect(step3.mpCost).toBe(1);

      // Decomposition fields match.
      expect(result.hexesMoved).toBe(3);
      expect(result.straightHexes).toBe(3);
      expect(result.turningMpCost).toBe(1);
      // hexDistance origin → (1,-3) axial = max(|1|, |-3|, |-2|) = 3.
      expect(result.netDisplacement).toBe(3);

      assertMovementStepConservation(result, 4);
    });

    it('produces 7 steps for a 5-MP F+F+TR+F+F+TR+F chain (spec Scenario 1)', () => {
      // Spec scenario: 5-MP walk = forward 2, turn right, forward 2, turn right, forward 1
      // Starting facing: North (0). After two right-turns we end at SE (Facing.Southeast = 2).
      // Path: north 2 hexes, then NE step (after turn), then NE step, then SE turn, then SE step.
      // For simplicity we use the same path the bot would produce — the
      // decomposer's contract is "given the path, produce 7 steps with
      // 5 forwards and 2 turns". We assert the structural shape rather
      // than the exact axial coordinates.
      const path = [
        { q: 0, r: 0 }, // start
        { q: 0, r: -1 }, // forward N (idx 0)
        { q: 0, r: -2 }, // forward N (idx 1)
        // turn N → NE (idx 2)
        { q: 1, r: -2 }, // forward NE (idx 3)
        { q: 2, r: -3 }, // forward NE - wait, Facing.NE delta is {q:1, r:-1}
      ];
      // Recalibrate: NE delta is {q:1, r:-1}. From (1,-2) NE step → (2,-3).
      // Then turn NE → SE (delta {q:1, r:0}), then SE step (3,-3).
      const fullPath = [
        { q: 0, r: 0 },
        { q: 0, r: -1 },
        { q: 0, r: -2 },
        { q: 1, r: -3 },
        { q: 2, r: -4 },
        { q: 3, r: -4 },
      ];
      const result = decomposeMovementSteps({
        from: { q: 0, r: 0 },
        to: { q: 3, r: -4 },
        fromFacing: Facing.North,
        toFacing: Facing.Southeast, // NE then SE = two right-turns from N
        movementType: MovementType.Walk,
        mpUsed: 7, // 5 forwards + 2 turns
        path: fullPath,
      });

      // 5 forwards + 2 turns = 7 steps.
      expect(result.steps).toHaveLength(7);
      const forwards = result.steps.filter((s) => s.kind === 'forward');
      const turns = result.steps.filter((s) => s.kind === 'turn');
      expect(forwards.length).toBe(5);
      expect(turns.length).toBe(2);

      // 0-based, contiguous ordinals.
      result.steps.forEach((s: IMovementStep, i: number) => {
        expect(s.index).toBe(i);
      });

      // Sum of mpCost = mpUsed.
      const totalMp = result.steps.reduce(
        (acc: number, s: IMovementStep) => acc + ('mpCost' in s ? s.mpCost : 0),
        0,
      );
      expect(totalMp).toBe(7);

      expect(result.straightHexes).toBe(5);
      expect(result.turningMpCost).toBe(2);
      assertMovementStepConservation(result, 7);
    });
  });

  describe('jump moves', () => {
    it('emits exactly 1 jump step for a 4-MP jump (spec Scenario 2)', () => {
      const result = decomposeMovementSteps({
        from: { q: 0, r: 0 },
        to: { q: 4, r: 0 },
        fromFacing: Facing.North,
        toFacing: Facing.North,
        movementType: MovementType.Jump,
        mpUsed: 4,
      });

      expect(result.steps).toHaveLength(1);
      const step = result.steps[0] as IJumpStep;
      expect(step.kind).toBe('jump');
      expect(step.index).toBe(0);
      expect(step.from).toEqual({ q: 0, r: 0 });
      expect(step.to).toEqual({ q: 4, r: 0 });
      expect(step.mpCost).toBe(4);

      // Per spec: hexesMoved = hexDistance(from, to) for jump moves.
      expect(result.hexesMoved).toBe(4);
      expect(result.straightHexes).toBe(0);
      expect(result.turningMpCost).toBe(0);
      expect(result.netDisplacement).toBe(4);

      assertMovementStepConservation(result, 4);
    });
  });

  describe('stationary / no-op moves', () => {
    it('emits zero steps when from === to and movement is stationary', () => {
      const result = decomposeMovementSteps({
        from: { q: 0, r: 0 },
        to: { q: 0, r: 0 },
        fromFacing: Facing.North,
        toFacing: Facing.North,
        movementType: MovementType.Stationary,
        mpUsed: 0,
      });

      expect(result.steps).toHaveLength(0);
      expect(result.hexesMoved).toBe(0);
      expect(result.straightHexes).toBe(0);
      expect(result.turningMpCost).toBe(0);
      expect(result.netDisplacement).toBe(0);
    });
  });

  describe('stand-up (prone unit) prefix', () => {
    it('prepends a standUp step with mpCost 2 and psrTriggered=true (spec Scenario 4)', () => {
      // Prone unit attempts to stand at origin, then walks 1 hex north.
      // Total mpUsed = 2 (stand) + 1 (forward) = 3.
      const result: IMovementDecomposition = decomposeMovementSteps({
        from: { q: 0, r: 0 },
        to: { q: 0, r: -1 },
        fromFacing: Facing.North,
        toFacing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 3,
        path: [
          { q: 0, r: 0 },
          { q: 0, r: -1 },
        ],
        startedProne: true,
      });

      // 1 standUp + 1 forward = 2 steps.
      expect(result.steps).toHaveLength(2);

      const stand = result.steps[0] as IStandUpStep;
      expect(stand.kind).toBe('standUp');
      expect(stand.index).toBe(0);
      expect(stand.mpCost).toBe(2);
      expect(stand.psrTriggered).toBe(true);
      expect(stand.at).toEqual({ q: 0, r: 0 });

      const forward = result.steps[1] as IForwardStep;
      expect(forward.kind).toBe('forward');
      expect(forward.index).toBe(1);
      expect(forward.mpCost).toBe(1);

      // Stand-up MP rolls into turningMpCost (residual non-straight,
      // non-jump MP). Conservation:
      //   straightHexes(1) + turningMpCost(2) + jumpMp(0) = 3 = mpUsed ✓
      expect(result.straightHexes).toBe(1);
      expect(result.turningMpCost).toBe(2);
      assertMovementStepConservation(result, 3);
    });
  });
});

describe('IMovementStep type-guard discrimination (spec Scenario 3 wiring)', () => {
  it('narrows on `kind` to access kind-specific fields', () => {
    // Build a synthetic chargeDeclared step to assert the type-guard
    // contract. The runner does not yet emit chargeDeclared, but the
    // `IMovementStep` discriminated union must support it on read.
    const charge: IChargeDeclaredStep = {
      kind: 'chargeDeclared',
      index: 4,
      at: { q: 5, r: 0 },
      targetId: 'opponent-1',
      straightLineHexes: 3,
    };

    const steps: readonly IMovementStep[] = [charge];
    const last = steps[steps.length - 1];
    if (last.kind === 'chargeDeclared') {
      // Inside this guard, last is narrowed to IChargeDeclaredStep.
      expect(last.targetId).toBe('opponent-1');
      expect(last.straightLineHexes).toBe(3);
    } else {
      throw new Error('expected chargeDeclared step');
    }
  });
});

describe('Movement-Step PSR Trigger-Source Stamping (piloting-skill-rolls delta)', () => {
  it('uses `movement-step:<index>` when stepIndex is provided to the AttemptStand factory (spec Scenario 2)', () => {
    // Per the spec scenario: a prone unit's movement chain begins with
    // a 'standUp' step at index 0; the AttemptStand PSR fires and
    // SHALL carry triggerSource: 'movement-step:0'.
    const psr = createStandingUpPSR('player-1', 0);
    expect(psr.triggerSource).toBe('movement-step:0');
    expect(psr.entityId).toBe('player-1');
    expect(psr.reason).toBe('Standing up');
  });

  it('falls back to the legacy PSRTrigger.StandingUp when stepIndex is omitted (spec Scenario 3)', () => {
    // Per the spec scenario: PSRs that fire OUTSIDE movement-step
    // resolution (or before the runner threads step context through)
    // SHALL retain their existing free-string triggerSource value.
    const psr = createStandingUpPSR('player-1');
    expect(psr.triggerSource).toBe(PSRTrigger.StandingUp);
  });

  it('handles non-zero stepIndex correctly (spec Scenario 1: skid PSR at step 2)', () => {
    // Spec scenario reference: a unit running across an ice hex at
    // step index 2 of its movement chain. When the runner triggers a
    // Skid PSR with stepIndex=2, the resulting triggerSource SHALL be
    // 'movement-step:2'. The AttemptStand factory uses identical
    // semantics — we exercise it here as a representative.
    const psr = createStandingUpPSR('opponent-2', 2);
    expect(psr.triggerSource).toBe('movement-step:2');
  });
});

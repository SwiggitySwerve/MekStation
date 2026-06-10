/**
 * Audit 2026-06-09 findings B-5 and B-6 (W1.2): pins the to-hit inputs
 * `declareAttack` feeds into `calculateToHit`.
 *
 * B-5: `targetPartialCover` was passed positionally into the
 * `applyLocalCalledShotAbilityReduction` slot of
 * `buildWeaponAttackAttackerToHitState`, so called shots WITHOUT partial
 * cover silently lost the local Marksman/Sharpshooter reduction. Partial
 * cover must only ever surface as the target-state Partial Cover modifier.
 *
 * B-6: minimum range must follow MegaMek Compute.java#L1714-L1716 —
 * `(minRange > 0) && (distance <= minRange) && isGroundToGround` with
 * penalty `(minRange - distance) + 1` — and the engine commit path must use
 * the SAME volley semantics as the tactical-map projection (strictest
 * in-effect minimum across the declared weapons, ground-to-ground gated),
 * not just the primary weapon's minimum.
 */
import {
  GameEventType,
  GameSide,
  RangeBracket,
  type IAttackDeclaredPayload,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IWeaponAttack,
} from '@/types/gameplay';

import { createAerospaceCombatState } from '../aerospace/state';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';

function buildConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  } as IGameConfig;
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 'target',
      name: 'Hunchback',
      side: GameSide.Opponent,
      unitRef: 'hbk-4g',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildMediumLaserAttack(
  overrides: Partial<IWeaponAttack> = {},
): IWeaponAttack {
  return {
    weaponId: 'medium-laser-1',
    weaponName: 'Medium Laser',
    damage: 5,
    heat: 3,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    ...overrides,
  } as unknown as IWeaponAttack;
}

function buildLrmAttack(overrides: Partial<IWeaponAttack> = {}): IWeaponAttack {
  return {
    weaponId: 'lrm-15-1',
    weaponName: 'LRM-15',
    damage: 9,
    heat: 5,
    minRange: 6,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    ...overrides,
  } as unknown as IWeaponAttack;
}

function setupWeaponAttackSession(): IGameSession {
  let session = createGameSession(buildConfig(), buildUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  return advancePhase(session);
}

// Returns the AttackDeclared payload appended after `initialEventCount`.
function declaredPayloadSince(
  result: IGameSession,
  initialEventCount: number,
): IAttackDeclaredPayload {
  const declared = result.events
    .slice(initialEventCount)
    .find((event) => event.type === GameEventType.AttackDeclared);
  expect(declared).toBeDefined();
  return declared!.payload as IAttackDeclaredPayload;
}

describe('declareAttack called-shot reduction vs partial cover (audit B-5)', () => {
  function setupMarksmanCalledShotSession(): IGameSession {
    const session = setupWeaponAttackSession();
    return {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            abilities: ['marksman'],
          },
        },
      },
    };
  }

  it('applies the local Marksman called-shot reduction when the target has NO partial cover', () => {
    const session = setupMarksmanCalledShotSession();
    const initialEventCount = session.events.length;

    const result = declareAttack(
      session,
      'attacker',
      'target',
      [buildMediumLaserAttack({ calledShot: true })],
      3,
      RangeBracket.Short,
    );

    const payload = declaredPayloadSince(result, initialEventCount);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Called Shot',
          value: 2,
          description: 'Called shot (Marksman): +2',
        }),
      ]),
    );
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Partial Cover' }),
      ]),
    );
  });

  it('keeps the called-shot reduction identical when the target HAS partial cover, surfacing cover only as the Partial Cover modifier', () => {
    const session = setupMarksmanCalledShotSession();
    const initialEventCount = session.events.length;

    const result = declareAttack(
      session,
      'attacker',
      'target',
      [buildMediumLaserAttack({ calledShot: true })],
      3,
      RangeBracket.Short,
      undefined,
      undefined,
      true,
    );

    const payload = declaredPayloadSince(result, initialEventCount);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Called Shot',
          value: 2,
          description: 'Called shot (Marksman): +2',
        }),
        expect.objectContaining({
          name: 'Partial Cover',
          value: 1,
        }),
      ]),
    );
  });
});

describe('declareAttack minimum-range inputs (audit B-6)', () => {
  it('applies +1 at exactly minimum range per MegaMek Compute.java#L1714-L1716', () => {
    const session = setupWeaponAttackSession();
    const initialEventCount = session.events.length;

    const result = declareAttack(
      session,
      'attacker',
      'target',
      [buildLrmAttack()],
      6,
      RangeBracket.Short,
    );

    const payload = declaredPayloadSince(result, initialEventCount);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
          value: 1,
          source: 'range',
        }),
      ]),
    );
  });

  it('uses the strictest in-effect minimum across the declared volley, matching the projection', () => {
    const session = setupWeaponAttackSession();
    const initialEventCount = session.events.length;

    // Primary weapon has no minimum; the LRM in the same volley is inside
    // its minimum 6 at distance 4. The projection charges the volley the
    // strictest in-effect minimum (+3); the commit path must agree instead
    // of reading only the primary weapon's minimum.
    const result = declareAttack(
      session,
      'attacker',
      'target',
      [buildMediumLaserAttack(), buildLrmAttack()],
      4,
      RangeBracket.Short,
    );

    const payload = declaredPayloadSince(result, initialEventCount);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
          value: 3,
          source: 'range',
        }),
      ]),
    );
  });

  it('exempts airborne aerospace targets from minimum range, matching MegaMek isGroundToGround and the projection', () => {
    const session = setupWeaponAttackSession();
    const airborneTargetSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          target: {
            ...session.currentState.units.target,
            combatState: {
              kind: 'aero',
              state: createAerospaceCombatState({
                maxSI: 10,
                armorByArc: { nose: 10, leftWing: 8, rightWing: 8, aft: 6 },
                heatSinks: 10,
                fuelPoints: 20,
                safeThrust: 6,
                maxThrust: 9,
                altitude: 3,
              }),
            },
          },
        },
      },
    };
    const initialEventCount = airborneTargetSession.events.length;

    const result = declareAttack(
      airborneTargetSession,
      'attacker',
      'target',
      [buildLrmAttack()],
      3,
      RangeBracket.Short,
    );

    const payload = declaredPayloadSince(result, initialEventCount);
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Minimum Range' }),
      ]),
    );
  });
});

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDamageState,
  type IPendingPSR,
} from '@/types/gameplay';

import { createGameSession, startGame } from '../gameSession';
import { resolvePendingPSRs } from '../gameSessionPSR';
import {
  createDamagePSR,
  createLegDamagePSR,
  createRubblePSR,
  createStandingUpPSR,
  resolvePSR,
} from '../pilotingSkillRolls';
import { hasQuirk } from '../quirkModifiers';

// MegaMek 48fcb2f64 OptionsConstants.java:62; Entity.java:9989-9995;
// TWGameManager.java:17878-17888. These are unit design quirks, not pilot SPAs.
const damage: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function resolve(
  unitQuirks: readonly string[],
  psr: IPendingPSR,
  pilotingSkill = 5,
) {
  return resolvePSR({
    pilotingSkill,
    psr,
    componentDamage: damage,
    pilotWounds: 0,
    diceRoller: () => 3,
    unitQuirks,
  });
}

describe('native unit piloting quirk ids', () => {
  it.each([
    ['easy_pilot', 'easy_to_pilot', createRubblePSR('unit'), 5, 4],
    ['easy_pilot', 'easy_to_pilot', createDamagePSR('unit'), 5, 4],
    ['easy_pilot', 'easy_to_pilot', createRubblePSR('unit'), 4, 3],
    ['easy_pilot', 'easy_to_pilot', createRubblePSR('unit'), 3, 3],
    ['easy_pilot', 'easy_to_pilot', createDamagePSR('unit'), 3, 3],
    ['easy_pilot', 'easy_to_pilot', createLegDamagePSR('unit'), 5, 5],
    ['easy_pilot', 'easy_to_pilot', createStandingUpPSR('unit'), 5, 5],
  ] as const)(
    '%s/%s resolves %j with piloting %s to TN %s',
    (native, legacy, psr, skill, targetNumber) => {
      const nativeResult = resolve([native], psr, skill);
      expect(nativeResult.targetNumber).toBe(targetNumber);
      expect(nativeResult).toEqual(resolve([legacy], psr, skill));
      expect(resolve([native, legacy, native], psr, skill)).toEqual(
        nativeResult,
      );
    },
  );

  it.each([['easy_pilot', 'easy_to_pilot']])(
    'recognizes %s and %s symmetrically',
    (native, legacy) => {
      expect(hasQuirk([native], legacy)).toBe(true);
      expect(hasQuirk([legacy], native)).toBe(true);
    },
  );

  it('cancels opposing quirks only when Easy Pilot is eligible', () => {
    expect(
      resolve(['easy_pilot', 'hard_to_pilot'], createDamagePSR('unit'))
        .targetNumber,
    ).toBe(5);
    expect(
      resolve(['easy_pilot', 'hard_to_pilot'], createDamagePSR('unit'), 3)
        .targetNumber,
    ).toBe(4);
  });

  it('preserves unknown ids without matching near spellings', () => {
    expect(hasQuirk(['unknown_quirk'], 'unknown_quirk')).toBe(true);
    expect(hasQuirk(['easy_pilot_extra'], 'easy_to_pilot')).toBe(false);
    expect(hasQuirk(['hard_pilot_extra'], 'hard_to_pilot')).toBe(false);
    expect(
      resolve(['easy_pilot_extra', 'hard_pilot_extra'], createDamagePSR('unit'))
        .targetNumber,
    ).toBe(5);
  });

  it('does not introduce a native Hard Pilot penalty with active VDNI', () => {
    // Entity.java:8939-8946: active DNI suppresses Hard Pilot.
    const result = resolvePSR({
      pilotingSkill: 5,
      psr: createDamagePSR('unit'),
      componentDamage: damage,
      pilotWounds: 0,
      diceRoller: () => 3,
      unitQuirks: ['hard_pilot'],
      pilotAbilities: ['vdni'],
      unitType: 'BattleMech',
      neuralInterfaceActive: true,
    });
    expect(result.targetNumber).toBe(4);
  });

  it.each([['easy_pilot', 4, -1]] as const)(
    '%s reaches the interactive PSR event',
    (quirk, targetNumber, modifiers) => {
      const session = startGame(
        createGameSession(
          {
            mapRadius: 4,
            turnLimit: 0,
            victoryConditions: ['elimination'],
            optionalRules: [],
          },
          [
            {
              id: 'unit',
              name: 'Native quirk test',
              side: GameSide.Player,
              unitRef: 'ref',
              pilotRef: 'pilot',
              gunnery: 4,
              piloting: 5,
              unitQuirks: [quirk],
            },
          ],
        ),
        GameSide.Player,
      );
      const next = resolvePendingPSRs(
        {
          ...session,
          currentState: {
            ...session.currentState,
            phase: GamePhase.PhysicalAttack,
            units: {
              ...session.currentState.units,
              unit: {
                ...session.currentState.units.unit,
                pendingPSRs: [createDamagePSR('unit')],
              },
            },
          },
        },
        () => ({
          dice: [3, 3],
          total: 6,
          isSnakeEyes: false,
          isBoxcars: false,
        }),
      );
      expect(
        next.events.find((event) => event.type === GameEventType.PSRResolved)
          ?.payload,
      ).toMatchObject({ targetNumber, modifiers, roll: 6, passed: true });
      expect(next.currentState.units.unit.pendingPSRs).toEqual([]);
    },
  );
});

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDamageState,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay';

import type { IPSRResolutionOptions } from '../pilotingSkillRolls/modifierResolution';

import {
  createGameSession,
  hydrateGameSessionFromEvents,
} from '../gameSessionCore';
import { resolvePendingPSRs } from '../gameSessionPSRResolution';
import {
  createDamagePSR,
  createRubblePSR,
  createStandingUpPSR,
  resolvePSR,
} from '../pilotingSkillRolls';
import { hasQuirk } from '../quirkModifiers';

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// OptionsConstants.java:123; Entity.java:8939-8946,13365-13379;
// NeuralInterfaceMode.java:102-119,151-158. Explicit design quirk only;
// DNI-induced Hard Pilot (Entity.java:15675-15693) is a separate rule.
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

const spellings = [
  ['hard_pilot'],
  ['hard_to_pilot'],
  ['hard_pilot', 'hard_to_pilot', 'hard_pilot'],
] as const;

interface IActivityCase {
  readonly name: string;
  readonly options: IPSRResolutionOptions;
  readonly hardPenalty: number;
}

const cases: readonly IActivityCase[] = [
  ...[undefined, null, '', 'unknown', 'Off', 'full tracking'].map((mode) => ({
    name: `inactive mode ${String(mode)}`,
    options: {
      neuralInterfaceMode: mode,
      hasDNICockpitMod: true,
      pilotAbilities: ['vdni'],
    },
    hardPenalty: 1,
  })),
  ...['vdni', 'bvdni', 'proto_dni'].flatMap((implant) => [
    {
      name: `${implant}: abilities-only without hardware`,
      options: {
        neuralInterfaceMode: 'Pilot Abilities Only',
        pilotAbilities: [implant],
      },
      hardPenalty: 0,
    },
    ...[undefined, false, true].map((hardware) => ({
      name: `${implant}: full tracking hardware ${String(hardware)}`,
      options: {
        neuralInterfaceMode: 'Full Tracking',
        hasDNICockpitMod: hardware,
        pilotAbilities: [implant],
      },
      hardPenalty: hardware === true ? 0 : 1,
    })),
  ]),
  ...[[], ['ei_implant'], ['tcp'], ['babattlemechniu']].map((abilities) => ({
    name: `non-DNI abilities ${abilities.join(',')}`,
    options: {
      neuralInterfaceMode: 'Full Tracking',
      hasDNICockpitMod: true,
      pilotAbilities: abilities,
    },
    hardPenalty: 1,
  })),
  {
    name: 'native trimmed mode with independent represented false',
    options: {
      neuralInterfaceMode: ' Full Tracking ',
      hasDNICockpitMod: true,
      pilotAbilities: ['bvdni'],
      neuralInterfaceActive: false,
    },
    hardPenalty: 0,
  },
];

function resolve(
  unitQuirks: readonly string[],
  options: IPSRResolutionOptions = {},
  psr = createDamagePSR('unit'),
) {
  return resolvePSR({
    pilotingSkill: 5,
    psr,
    componentDamage: damage,
    pilotWounds: 0,
    diceRoller: () => 3,
    unitType: 'BattleMech',
    ...options,
    unitQuirks,
  });
}

describe('explicit native Hard Pilot game effect', () => {
  it.each(cases)('$name', ({ options, hardPenalty }) => {
    for (const neuralInterfaceActive of [undefined, false, true]) {
      const context = { ...options, neuralInterfaceActive };
      const baseline = resolve([], context);
      for (const ids of spellings) {
        const result = resolve(ids, context);
        expect(result.targetNumber - baseline.targetNumber).toBe(hardPenalty);
        expect(result.modifiers.filter((m) => m.source === 'quirk')).toEqual(
          hardPenalty === 0
            ? []
            : [{ name: 'Piloting quirks', value: 1, source: 'quirk' }],
        );
        expect(result.modifiers.filter((m) => m.source !== 'quirk')).toEqual(
          baseline.modifiers,
        );
      }
    }
  });

  it.each([createDamagePSR, createRubblePSR, createStandingUpPSR])(
    'applies the native exception across supported PSR reasons: %p',
    (make) => {
      expect(resolve(['hard_pilot'], {}, make('unit')).targetNumber).toBe(6);
      expect(
        resolve(
          ['hard_pilot'],
          {
            neuralInterfaceMode: 'Pilot Abilities Only',
            pilotAbilities: ['bvdni'],
          },
          make('unit'),
        ).targetNumber,
      ).toBe(5);
    },
  );

  it('recognizes native/saved membership symmetrically without near matches', () => {
    expect(hasQuirk(['hard_pilot'], 'hard_to_pilot')).toBe(true);
    expect(hasQuirk(['hard_to_pilot'], 'hard_pilot')).toBe(true);
    expect(resolve(['hard_pilot_extra']).targetNumber).toBe(5);
    expect(hasQuirk(['unknown_quirk'], 'unknown_quirk')).toBe(true);
  });

  it.each(cases)(
    'uses actual GameCreated/replay context: $name',
    ({ options, hardPenalty }) => {
      const config: IGameConfig = {
        mapRadius: 4,
        turnLimit: 0,
        victoryConditions: [],
        optionalRules: [],
        neuralInterfaceMode: options.neuralInterfaceMode,
      };
      const unit: IGameUnit = {
        id: 'unit',
        name: 'Hard Pilot',
        side: GameSide.Player,
        unitRef: 'ref',
        pilotRef: 'pilot',
        gunnery: 4,
        piloting: 5,
        unitQuirks: ['hard_pilot'],
        abilities: options.pilotAbilities,
        hasDNICockpitMod: options.hasDNICockpitMod,
        neuralInterfaceActive: false,
      };
      const session = createGameSession(config, [unit]);
      const replay = hydrateGameSessionFromEvents(session.id, session.events);
      expect(replay.currentState.units.unit.neuralInterfaceMode).toBe(
        options.neuralInterfaceMode,
      );
      expect(replay.currentState.units.unit.hasDNICockpitMod).toBe(
        options.hasDNICockpitMod,
      );
      let rolls = 0;
      const next = resolvePendingPSRs(
        {
          ...replay,
          currentState: {
            ...replay.currentState,
            phase: GamePhase.PhysicalAttack,
            units: {
              ...replay.currentState.units,
              unit: {
                ...replay.currentState.units.unit,
                pendingPSRs: [createDamagePSR('unit')],
              },
            },
          },
        },
        () => ({
          dice: [rolls++ === 0 ? 2 : 3, 1],
          total: 2,
          isSnakeEyes: false,
          isBoxcars: false,
        }),
      );
      expect(
        next.events.find((event) => event.type === GameEventType.PSRResolved)
          ?.payload,
      ).toMatchObject({
        targetNumber: 5 + hardPenalty,
        modifiers: hardPenalty,
        roll: 5,
        passed: hardPenalty === 0,
      });
      expect(next.currentState.units.unit.prone).toBe(hardPenalty === 1);
      expect(next.currentState.units.unit.pendingPSRs).toEqual([]);
      expect(
        hydrateGameSessionFromEvents(next.id, next.events).currentState.units
          .unit.neuralInterfaceMode,
      ).toBe(options.neuralInterfaceMode);
    },
  );
});

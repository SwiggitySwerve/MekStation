import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { gameUnitsWithAdaptedCombatSeeds } from '@/engine/InteractiveSession.setup';
import { COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK } from '@/lib/events/replay/CombatLifecycleBaselineSchemaPack';
import {
  gameConfigSchema,
  gameUnitSchema,
} from '@/lib/events/replay/CombatLifecycleSharedSchemas';
import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameUnit,
} from '@/types/gameplay';

import {
  createGameSession,
  hydrateGameSessionFromEvents,
} from '../gameSessionCore';
import { resolvePendingPSRs } from '../gameSessionPSRResolution';
import { createDamagePSR } from '../pilotingSkillRolls';
import * as modifiers from '../pilotingSkillRolls/modifierResolution';

jest.mock('../pilotingSkillRolls/modifierResolution', () => {
  const actual = jest.requireActual<
    typeof import('../pilotingSkillRolls/modifierResolution')
  >('../pilotingSkillRolls/modifierResolution');
  return {
    ...actual,
    calculatePSRModifiers: jest.fn(actual.calculatePSRModifiers),
  };
});

const config: IGameConfig = {
  mapRadius: 7,
  turnLimit: 10,
  victoryConditions: [],
  optionalRules: [],
};
const unit: IGameUnit = {
  id: 'dni',
  name: 'DNI test',
  side: GameSide.Player,
  unitRef: 'test',
  pilotRef: 'pilot',
  gunnery: 4,
  piloting: 5,
};
const fullUnit = (id: string): IFullUnit => ({
  id: 'test',
  chassis: 'Test',
  variant: '',
  tonnage: 20,
  techBase: 'INNER_SPHERE',
  era: 'JIHAD',
  unitType: 'BattleMech',
  equipment: [{ id, location: 'HEAD' }],
});
afterEach(() => jest.clearAllMocks());

it.each([
  'Off',
  'Pilot Abilities Only',
  'Full Tracking',
  'unknown',
  '',
  ' Full Tracking ',
  null,
])(
  'retains raw game mode %p independently of the represented jack-in flag',
  (neuralInterfaceMode) => {
    const supplied = { ...config, neuralInterfaceMode };
    const bound = {
      ...unit,
      hasDNICockpitMod: true,
      neuralInterfaceActive: false,
    };
    expect(gameConfigSchema.parse(supplied)).toEqual(supplied);
    expect(gameUnitSchema.parse(bound)).toEqual(bound);
    const session = createGameSession(supplied, [bound]);
    const replay = hydrateGameSessionFromEvents(session.id, session.events);
    expect(replay.currentState.units.dni).toMatchObject({
      neuralInterfaceMode,
      hasDNICockpitMod: true,
      neuralInterfaceActive: false,
    });
    expect(replay.config).toEqual(supplied);
  },
);

it('does not invent native mode or hardware from an implant or the legacy flag', () => {
  const session = createGameSession(config, [
    { ...unit, abilities: ['vdni'], neuralInterfaceActive: true },
  ]);
  expect(session.currentState.units.dni).not.toHaveProperty(
    'neuralInterfaceMode',
  );
  expect(session.currentState.units.dni).not.toHaveProperty('hasDNICockpitMod');
  expect(session.currentState.units.dni.neuralInterfaceActive).toBe(true);
});

it('retains explicit false hardware and rejects invalid transport types', () => {
  const session = createGameSession(config, [
    { ...unit, hasDNICockpitMod: false },
  ]);
  expect(session.currentState.units.dni.hasDNICockpitMod).toBe(false);
  expect(
    gameConfigSchema.safeParse({ ...config, neuralInterfaceMode: true })
      .success,
  ).toBe(false);
  expect(
    gameUnitSchema.safeParse({ ...unit, hasDNICockpitMod: 'true' }).success,
  ).toBe(false);
});

// MegaMek 48fcb2f6 MiscType.java:4979-5017; EquipmentTypeLookup.java:172.
it.each([
  ['DNICockpitModification', true],
  ['Direct Neural Interface Cockpit Modification', true],
  ['BABattleMechNIU', false],
  ['babattlemechniu', false],
  ['ei-interface', false],
  ['vdni', false],
  ['unknown-DNICockpitModification', false],
])(
  'projects hardware only from verified native equipment: %s',
  (id, expected) => {
    const adapted = { ...adaptUnitFromData(fullUnit(id)), id: unit.id };
    const [bound] = gameUnitsWithAdaptedCombatSeeds([unit], [adapted], []);
    expect(bound.hasDNICockpitMod).toBe(expected);
    expect(
      createGameSession(config, [bound]).currentState.units.dni
        .hasDNICockpitMod,
    ).toBe(expected);
  },
);

it('retains direct native critical-slot identity without trusting the misleading NIU catalog label', () => {
  const source = {
    ...fullUnit('babattlemechniu'),
    equipment: [
      {
        id: 'babattlemechniu',
        name: 'Direct Neural Interface Cockpit Modification',
        location: 'HEAD',
      },
    ],
    criticalSlots: { HEAD: ['DNICockpitModification'] },
  };
  expect(adaptUnitFromData(source).hasDNICockpitMod).toBe(true);
  expect(
    adaptUnitFromData({ ...source, criticalSlots: {} }).hasDNICockpitMod,
  ).toBe(false);
});

it('keeps hardware unknown when the producer supplies no equipment inventory', () => {
  expect(
    adaptUnitFromData({ ...fullUnit('unused'), equipment: undefined }),
  ).not.toHaveProperty('hasDNICockpitMod');
});

it('forwards native inputs through PSR normalization without converting compatibility state', () => {
  const options = {
    neuralInterfaceMode: 'Full Tracking',
    hasDNICockpitMod: true,
    neuralInterfaceActive: false,
  };
  expect(
    modifiers.normalizeResolutionOptions(
      options,
      ['bvdni'],
      false,
      undefined,
      5,
    ),
  ).toMatchObject(options);
});

it('delivers recorded mode and hardware through the session batch and single-PSR boundary', () => {
  const session = createGameSession(
    { ...config, neuralInterfaceMode: 'Full Tracking' },
    [{ ...unit, hasDNICockpitMod: true, neuralInterfaceActive: false }],
  );
  const state = session.currentState.units.dni;
  const pending = {
    ...session,
    currentState: {
      ...session.currentState,
      units: { dni: { ...state, pendingPSRs: [createDamagePSR(unit.id)] } },
    },
  };
  const spy = jest.mocked(modifiers.calculatePSRModifiers);
  resolvePendingPSRs(pending, () => ({
    dice: [6, 6],
    total: 12,
    isSnakeEyes: false,
    isBoxcars: true,
  }));
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      neuralInterfaceMode: 'Full Tracking',
      hasDNICockpitMod: true,
      neuralInterfaceActive: false,
    }),
  );
});

it('invalidates the GameCreated parser fingerprint when its accepted shape changes', () => {
  const registration = COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK.find(
    (entry) => entry.eventType === GameEventType.GameCreated,
  );
  expect(registration?.schemas[0].schemaId).toContain('native-dni-transport-1');
});

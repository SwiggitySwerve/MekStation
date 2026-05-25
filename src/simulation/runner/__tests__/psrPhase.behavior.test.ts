import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IPilotHitPayload,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IPSRResolvedPayload,
  type IUnitGameState,
  PSRTrigger,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit';
import { buildCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import {
  createEnteringWaterPSR,
  createDamagePSR,
  createMASCFailurePSR,
  createRubblePSR,
  createSkiddingPSR,
  createSuperchargerFailurePSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';

import { SeededRandom } from '../../core/SeededRandom';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { runPSRPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

function fixedRandom(nextValue: number): SeededRandom {
  return { next: () => nextValue } as unknown as SeededRandom;
}

function sequenceRandom(values: readonly number[]): SeededRandom {
  let index = 0;
  return {
    next: () => values[Math.min(index++, values.length - 1)] ?? 0,
  } as unknown as SeededRandom;
}

function makeUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'psr-phase-behavior-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.PhysicalAttack,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

describe('runPSRPhase behavior', () => {
  it('emits PSRResolved with reasonCode and clears passed pending PSRs', () => {
    const unit = makeUnit({
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.99),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved);
    expect(resolved?.payload).toMatchObject({
      unitId: 'player-1',
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(next.units['player-1'].pendingPSRs).toEqual([]);
    expect(next.units['player-1'].prone).toBe(false);
    expect(events.some((event) => event.type === GameEventType.UnitFell)).toBe(
      false,
    );
  });

  it('uses the unit piloting skill when calculating pending PSR target numbers', () => {
    const unit = makeUnit({
      piloting: 3,
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.99),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved);
    expect(resolved?.payload).toMatchObject({
      unitId: 'player-1',
      targetNumber: 3,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
  });

  it('applies all-scope piloting quirks to runner PSR target numbers', () => {
    const unit = makeUnit({
      unitQuirks: [UNIT_QUIRK_IDS.STABLE],
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.99),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(QUIRK_COMBAT_SUPPORT.stable).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies terrain-only piloting quirks only to terrain PSRs', () => {
    const unit = makeUnit({
      unitQuirks: [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      pendingPSRs: [createRubblePSR('player-1'), createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.99),
    });

    const resolved = events
      .filter((e) => e.type === GameEventType.PSRResolved)
      .map((e) => e.payload as IPSRResolvedPayload);
    expect(resolved).toMatchObject([
      {
        unitId: 'player-1',
        targetNumber: 4,
        modifiers: -1,
        passed: true,
        reasonCode: PSRTrigger.EnteringRubble,
      },
      {
        unitId: 'player-1',
        targetNumber: 5,
        modifiers: 0,
        passed: true,
        reasonCode: PSRTrigger.PhaseDamage20Plus,
      },
    ]);
    expect(QUIRK_COMBAT_SUPPORT.easy_to_pilot).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-application'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('applies Maneuvering Ace to source-backed skidding PSR target numbers', () => {
    const unit = makeUnit({
      abilities: ['maneuvering-ace'],
      pendingPSRs: [createSkiddingPSR('player-1', undefined, 1)],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.5),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 5,
      modifiers: 0,
      passed: true,
      reasonCode: PSRTrigger.Skidding,
    });
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace']).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Maneuvering Ace'),
    });
  });

  it('applies Animal Mimicry to quad BattleMech PSR target numbers', () => {
    const unit = makeUnit({
      abilities: ['animal_mimic'],
      isQuad: true,
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.5),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(SPA_COMBAT_SUPPORT['animal-mimicry']).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Animal Mimicry'),
    });
  });

  it('applies Frogman to source-backed depth-2 entering-water PSRs', () => {
    const unit = makeUnit({
      abilities: ['tm_frogman'],
      unitType: UnitType.BATTLEMECH,
      pendingPSRs: [
        createEnteringWaterPSR('player-1', undefined, { waterDepth: 2 }),
      ],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.5),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      passed: true,
      reasonCode: PSRTrigger.EnteringWater,
    });
    expect(SPA_COMBAT_SUPPORT.tm_frogman).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('water-entry PSR'),
    });
  });

  it('applies Mountaineer to source-backed entering-rubble PSRs', () => {
    const unit = makeUnit({
      abilities: ['tm_mountaineer'],
      pendingPSRs: [createRubblePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.5),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 4,
      modifiers: -1,
      passed: true,
      reasonCode: PSRTrigger.EnteringRubble,
    });
    expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Mountaineer rubble-entry relief'),
    });
  });

  it('turns a failed pending PSR into a fall, pilot wound, and pilot-death destruction', () => {
    const unit = makeUnit({
      pilotWounds: 5,
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved);
    const fell = events.find((e) => e.type === GameEventType.UnitFell);
    const pilotHit = events.find((e) => e.type === GameEventType.PilotHit);
    const destroyed = events.find(
      (e) => e.type === GameEventType.UnitDestroyed,
    );

    expect(resolved?.payload).toMatchObject({
      unitId: 'player-1',
      passed: false,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(fell?.payload).toMatchObject({
      unitId: 'player-1',
      pilotDamage: 1,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(pilotHit?.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 6,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: false,
    });
    expect(destroyed?.payload).toMatchObject({
      unitId: 'player-1',
      cause: 'pilot_death',
    });
    expect(next.units['player-1']).toMatchObject({
      prone: true,
      pilotWounds: 6,
      pilotConscious: false,
      destroyed: true,
      pendingPSRs: [],
    });
  });

  it('applies source-backed MASC failure critical hits to one slot in each leg', () => {
    const unit = makeUnit({
      hasMASC: true,
      activeMASC: true,
      pendingPSRs: [createMASCFailurePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];
    const manifest = buildCriticalSlotManifest({
      left_leg: [
        {
          slotIndex: 0,
          componentType: 'actuator',
          componentName: ActuatorType.UPPER_LEG,
          actuatorType: ActuatorType.UPPER_LEG,
          destroyed: false,
        },
      ],
      right_leg: [
        {
          slotIndex: 0,
          componentType: 'jump_jet',
          componentName: 'Jump Jet',
          destroyed: false,
        },
      ],
    });
    const manifestsByUnit = new Map([['player-1', manifest]]);

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: sequenceRandom([0, 0, 0, 0, 0.99, 0.99]),
      manifestsByUnit,
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved);
    const criticals = events
      .filter((e) => e.type === GameEventType.CriticalHitResolved)
      .map((e) => e.payload);
    const actuatorPsr = events.find(
      (e) => e.type === GameEventType.PSRTriggered,
    );

    expect(resolved?.payload).toMatchObject({
      unitId: 'player-1',
      passed: false,
      reasonCode: PSRTrigger.MASCFailure,
    });
    expect(criticals).toMatchObject([
      {
        unitId: 'player-1',
        location: 'left_leg',
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_LEG,
      },
      {
        unitId: 'player-1',
        location: 'right_leg',
        componentType: 'jump_jet',
        componentName: 'Jump Jet',
      },
    ]);
    expect(actuatorPsr?.payload).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.UpperLegActuatorHit,
    });
    expect(next.units['player-1']).toMatchObject({
      prone: true,
      pilotConscious: true,
      hasMASC: true,
      componentDamage: {
        jumpJetsDestroyed: 1,
        actuators: {
          [ActuatorType.UPPER_LEG]: true,
        },
      },
    });
    expect(manifestsByUnit.get('player-1')?.left_leg?.[0]?.destroyed).toBe(
      true,
    );
    expect(manifestsByUnit.get('player-1')?.right_leg?.[0]?.destroyed).toBe(
      true,
    );
  });

  it('applies source-backed Supercharger failure engine-table damage', () => {
    const unit = makeUnit({
      hasSupercharger: true,
      activeSupercharger: true,
      pendingPSRs: [createSuperchargerFailurePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];
    const manifest = buildCriticalSlotManifest({
      center_torso: [
        {
          slotIndex: 0,
          componentType: 'equipment',
          componentName: 'Supercharger',
          destroyed: false,
        },
        {
          slotIndex: 1,
          componentType: 'engine',
          componentName: 'Engine',
          destroyed: false,
        },
        {
          slotIndex: 2,
          componentType: 'engine',
          componentName: 'Engine',
          destroyed: false,
        },
        {
          slotIndex: 3,
          componentType: 'engine',
          componentName: 'Engine',
          destroyed: false,
        },
      ],
    });
    const manifestsByUnit = new Map([['player-1', manifest]]);

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: sequenceRandom([0, 0, 0.99, 0.99, 0.99, 0.99]),
      manifestsByUnit,
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved);
    const criticals = events
      .filter((e) => e.type === GameEventType.CriticalHitResolved)
      .map((e) => e.payload);
    const destroyed = events.find(
      (e) => e.type === GameEventType.UnitDestroyed,
    );

    expect(resolved?.payload).toMatchObject({
      unitId: 'player-1',
      passed: false,
      reasonCode: PSRTrigger.SuperchargerFailure,
    });
    expect(criticals).toMatchObject([
      {
        unitId: 'player-1',
        location: 'center_torso',
        componentType: 'equipment',
        componentName: 'Supercharger',
      },
      {
        unitId: 'player-1',
        location: 'center_torso',
        componentType: 'engine',
      },
      {
        unitId: 'player-1',
        location: 'center_torso',
        componentType: 'engine',
      },
      {
        unitId: 'player-1',
        location: 'center_torso',
        componentType: 'engine',
      },
    ]);
    expect(destroyed?.payload).toMatchObject({
      unitId: 'player-1',
      cause: 'engine_destroyed',
    });
    expect(next.units['player-1']).toMatchObject({
      hasSupercharger: false,
      activeSupercharger: false,
      destroyed: true,
      destructionCause: 'engine_destroyed',
      componentDamage: {
        engineHits: 3,
      },
    });
    expect(next.units['player-1'].destroyedEquipment).toContain('Supercharger');
    expect(
      manifestsByUnit.get('player-1')?.center_torso?.map((slot) => ({
        slotIndex: slot.slotIndex,
        destroyed: slot.destroyed,
      })),
    ).toEqual([
      { slotIndex: 0, destroyed: true },
      { slotIndex: 1, destroyed: true },
      { slotIndex: 2, destroyed: true },
      { slotIndex: 3, destroyed: true },
    ]);
  });

  it('applies consciousness SPAs after PSR fall pilot damage', () => {
    const unit = makeUnit({
      abilities: ['iron-man'],
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0),
    });

    const pilotHit = events.find((e) => e.type === GameEventType.PilotHit);
    expect(pilotHit?.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(next.units['player-1']).toMatchObject({
      prone: true,
      pilotWounds: 1,
      pilotConscious: true,
      destroyed: false,
    });
  });
});

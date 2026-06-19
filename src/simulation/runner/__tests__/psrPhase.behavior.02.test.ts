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
  createKickedPSR,
  createDamagePSR,
  createMASCFailurePSR,
  createOutOfControlPSR,
  createRubblePSR,
  createSkiddingPSR,
  createSuperchargerFailurePSR,
  createSwampBogDownPSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';

import { SeededRandom } from '../../core/SeededRandom';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { applySuperchargerFailureCriticalDamage } from '../phases/movementEnhancementFailureDamage';
import { runPSRPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  fixedRandom,
  sequenceRandom,
  sequenceD6,
  makeUnit,
  makeState,
} from './psrPhase.behavior.test-helpers';

describe('runPSRPhase behavior', () => {
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
      level: 'integrated',
      evidence: expect.stringContaining('Maneuvering Ace'),
    });
  });

  it('applies Maneuvering Ace to represented out-of-control PSR target numbers', () => {
    const unit = makeUnit({
      abilities: ['maneuvering-ace'],
      pendingPSRs: [createOutOfControlPSR('player-1')],
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
      reasonCode: PSRTrigger.OutOfControl,
    });
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('out-of-control'),
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
      level: 'integrated',
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
      level: 'integrated',
      evidence: expect.stringContaining('Mountaineer rubble-entry relief'),
    });
  });

  it('applies Swamp Beast to source-backed swamp bog-down PSRs', () => {
    const unit = makeUnit({
      abilities: ['tm_swamp_beast'],
      unitType: UnitType.BATTLEMECH,
      pendingPSRs: [createSwampBogDownPSR('player-1')],
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
      reasonCode: PSRTrigger.SwampBogDown,
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Swamp Beast'),
    });
  });

  it('marks failed swamp bog-down PSRs stuck without fall or pilot damage', () => {
    const unit = makeUnit({
      pendingPSRs: [createSwampBogDownPSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0),
    });

    expect(next.units['player-1']).toMatchObject({
      isStuck: true,
      prone: false,
      pilotWounds: 0,
      pendingPSRs: [],
    });
    expect(events.map((event) => event.type)).toContain(
      GameEventType.UnitStuck,
    );
    expect(events.some((event) => event.type === GameEventType.UnitFell)).toBe(
      false,
    );
    expect(events.some((event) => event.type === GameEventType.PilotHit)).toBe(
      false,
    );
  });
});

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

  it('does not apply Stable to non-kick/push runner PSR target numbers', () => {
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
      targetNumber: 5,
      modifiers: 0,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(QUIRK_COMBAT_SUPPORT.stable).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Kick/Push PSRs'),
    });
  });

  it('applies source-backed Stable relief to runner kick PSR target numbers', () => {
    const unit = makeUnit({
      unitQuirks: [UNIT_QUIRK_IDS.STABLE],
      pendingPSRs: [createKickedPSR('player-1')],
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
      reasonCode: PSRTrigger.Kicked,
    });
  });

  it('applies Easy Pilot to source-backed terrain and phase-damage PSRs when piloting is worse than 3', () => {
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
        targetNumber: 4,
        modifiers: -1,
        passed: true,
        reasonCode: PSRTrigger.PhaseDamage20Plus,
      },
    ]);
    expect(QUIRK_COMBAT_SUPPORT.easy_to_pilot).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('piloting-skill-gated'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-application'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('does not apply Easy Pilot when base piloting is 3 or better', () => {
    const unit = makeUnit({
      piloting: 3,
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
        targetNumber: 3,
        modifiers: 0,
        passed: true,
        reasonCode: PSRTrigger.EnteringRubble,
      },
      {
        unitId: 'player-1',
        targetNumber: 3,
        modifiers: 0,
        passed: true,
        reasonCode: PSRTrigger.PhaseDamage20Plus,
      },
    ]);
  });

  it('suppresses Cramped Cockpit PSR penalties for Small Pilot in runner resolution', () => {
    const state = makeState(
      makeUnit({
        unitQuirks: [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
        pendingPSRs: [createDamagePSR('player-1')],
      }),
    );
    const smallPilotState = makeState(
      makeUnit({
        abilities: ['small_pilot'],
        unitQuirks: [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
        pendingPSRs: [createDamagePSR('player-1')],
      }),
    );
    const events: IGameEvent[] = [];
    const smallPilotEvents: IGameEvent[] = [];

    runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.99),
    });
    runPSRPhase({
      state: smallPilotState,
      events: smallPilotEvents,
      gameId: smallPilotState.gameId,
      random: fixedRandom(0.99),
    });

    const resolved = events.find((e) => e.type === GameEventType.PSRResolved)
      ?.payload as IPSRResolvedPayload | undefined;
    const smallPilotResolved = smallPilotEvents.find(
      (e) => e.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;

    expect(resolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 6,
      modifiers: 1,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(smallPilotResolved).toMatchObject({
      unitId: 'player-1',
      targetNumber: 5,
      modifiers: 0,
      passed: true,
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    });
    expect(QUIRK_COMBAT_SUPPORT.cramped_cockpit).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Small Pilot'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-application'],
    ).toMatchObject({ level: 'integrated' });
  });
});

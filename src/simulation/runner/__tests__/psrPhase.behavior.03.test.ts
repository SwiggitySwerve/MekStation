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
});

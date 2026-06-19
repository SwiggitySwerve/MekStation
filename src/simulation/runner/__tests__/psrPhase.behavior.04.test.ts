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

  it.each([
    { dice: [3, 4], roll: 7, engineHits: 0, destroyed: false },
    { dice: [4, 4], roll: 8, engineHits: 1, destroyed: false },
    { dice: [5, 5], roll: 10, engineHits: 2, destroyed: false },
    { dice: [6, 6], roll: 12, engineHits: 3, destroyed: true },
  ])(
    'applies Supercharger failure engine table roll $roll',
    ({ dice, engineHits, destroyed, roll }) => {
      const unit = makeUnit({
        hasSupercharger: true,
        activeSupercharger: true,
      });
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

      const result = applySuperchargerFailureCriticalDamage({
        unit,
        unitId: 'player-1',
        manifest,
        componentDamage: DEFAULT_COMPONENT_DAMAGE,
        d6Roller: sequenceD6(dice),
      });

      const criticals = result.criticalEvents.filter(
        (event) => event.type === 'critical_hit_resolved',
      );

      expect(result.engineCriticalRoll).toBe(roll);
      expect(result.engineHits).toBe(engineHits);
      expect(result.unit).toMatchObject({
        hasSupercharger: false,
        activeSupercharger: false,
        destroyed,
        componentDamage: {
          engineHits,
        },
      });
      expect(result.unit.destroyedEquipment).toContain('Supercharger');
      expect(criticals.map((event) => event.payload.componentType)).toEqual([
        'equipment',
        ...Array.from({ length: engineHits }, () => 'engine'),
      ]);
      expect(
        result.manifest.center_torso?.filter((slot) => slot.destroyed),
      ).toHaveLength(engineHits + 1);
    },
  );
});

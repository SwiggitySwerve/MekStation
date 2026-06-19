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
  it.each([
    {
      label: 'MASC',
      unit: { hasMASC: true, activeMASC: true },
      psr: createMASCFailurePSR('player-1'),
    },
    {
      label: 'Supercharger',
      unit: { hasSupercharger: true, activeSupercharger: true },
      psr: createSuperchargerFailurePSR('player-1'),
    },
  ])(
    'uses Edge to reroll and suppress a failed $label check',
    ({ psr, unit }) => {
      const state = makeState(
        makeUnit({
          ...unit,
          abilities: ['edge_when_masc_fails'],
          edgePointsRemaining: 1,
          pendingPSRs: [psr],
        }),
      );
      const events: IGameEvent[] = [];
      const manifestsByUnit = new Map([
        ['player-1', buildCriticalSlotManifest()],
      ]);

      const next = runPSRPhase({
        state,
        events,
        gameId: state.gameId,
        random: sequenceRandom([0, 0, 0.99, 0.99]),
        manifestsByUnit,
      });

      const resolved = events
        .filter((e) => e.type === GameEventType.PSRResolved)
        .map((e) => e.payload as IPSRResolvedPayload);

      expect(resolved).toMatchObject([
        {
          unitId: 'player-1',
          passed: false,
          edgeSuperseded: true,
          edgeTrigger: 'edge_when_masc_fails',
          edgePointsRemaining: 0,
        },
        {
          unitId: 'player-1',
          passed: true,
          edgeReroll: true,
          edgeTrigger: 'edge_when_masc_fails',
          edgePointsRemaining: 0,
        },
      ]);
      expect(next.units['player-1']).toMatchObject({
        edgePointsRemaining: 0,
        prone: false,
        pilotWounds: 0,
        destroyed: false,
        pendingPSRs: [],
      });
      expect(
        events.some((event) =>
          [
            GameEventType.UnitFell,
            GameEventType.CriticalHitResolved,
            GameEventType.UnitDestroyed,
          ].includes(event.type),
        ),
      ).toBe(false);
    },
  );

  it('applies consciousness SPAs after PSR fall pilot damage', () => {
    const unit = makeUnit({
      abilities: ['pain-resistance'],
      pendingPSRs: [createDamagePSR('player-1')],
    });
    const state = makeState(unit);
    const events: IGameEvent[] = [];

    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(0.2),
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

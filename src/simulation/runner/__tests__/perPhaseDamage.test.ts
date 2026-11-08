/**
 * C7 PR3 (D1): `damageThisPhase` is per phase in the runner, as in MegaMek.
 *
 * MegaMek 48fcb2f64 `TWGameManager.resetEntityPhase` zeroes it at the start of
 * every phase (TWGameManager.java:1572-1573) and the 20+ damage PSR reads it
 * per phase (:17850-17856). The reducer already zeroes it on every
 * `PhaseChanged`. The runner used to zero it only at turn start, so mine damage
 * taken in Movement pooled with weapon damage in the Weapon Attack phase.
 *
 * Also covers runner physical-attack damage, which never counted toward
 * `damageThisPhase` although the reducer's `PhysicalAttackResolved` does
 * (physicalAttackResolution.ts).
 */

import type { IGameEvent } from '@/types/gameplay';

import { StandStillAIPlayer } from '../../ai/StandStillAIPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { applyPhysicalDamage } from '../phases/physicalAttackDamageApplication';
import { runHeatPhase } from '../phases/postCombatHeat';
import { applyDamageThresholdPSR } from '../phases/weaponAttackHitResolution.helpers';
import { runAttackPhase } from '../phases/weaponAttackRunner';
import { createMinimalGrid } from '../SimulationRunnerSupport';
import {
  createRunnerHeatState,
  createRunnerUnit,
} from './heatEnvironmentParity.behavior.test-helpers';

const MINE_DAMAGE_IN_MOVEMENT = 12;
const WEAPON_HIT = 10;
const GAME_ID = 'c7-per-phase-damage';

function phaseInput(state: ReturnType<typeof createRunnerHeatState>) {
  return {
    state,
    botPlayer: new StandStillAIPlayer(),
    grid: createMinimalGrid(3),
    invariantRunner: new InvariantRunner(),
    violations: [],
    events: [] as IGameEvent[],
    gameId: GAME_ID,
    random: new SeededRandom(1),
  };
}

function seeded() {
  return createRunnerHeatState(
    createRunnerUnit({ damageThisPhase: MINE_DAMAGE_IN_MOVEMENT }),
  );
}

describe('runner damageThisPhase is per phase (D1)', () => {
  it('starts the Weapon Attack phase at zero', () => {
    const after = runAttackPhase(phaseInput(seeded()));
    expect(after.units['player-1'].damageThisPhase).toBe(0);
  });

  it('starts the Physical Attack phase at zero', () => {
    const after = runPhysicalAttackPhase(phaseInput(seeded()));
    expect(after.units['player-1'].damageThisPhase).toBe(0);
  });

  it('starts the Heat phase at zero', () => {
    const after = runHeatPhase({ state: seeded() });
    expect(after.units['player-1'].damageThisPhase).toBe(0);
  });

  it('does not pool Movement mine damage with a Weapon Attack hit toward the 20+ PSR', () => {
    // 12 (mine, Movement) + 10 (weapon hit) = 22 would cross 20 if pooled.
    const afterAttackPhaseStart = runAttackPhase(phaseInput(seeded()));
    const unit = afterAttackPhaseStart.units['player-1'];
    const afterHit = applyDamageThresholdPSR(
      {
        ...afterAttackPhaseStart,
        units: {
          ...afterAttackPhaseStart.units,
          'player-1': {
            ...unit,
            damageThisPhase: (unit.damageThisPhase ?? 0) + WEAPON_HIT,
          },
        },
      },
      'player-1',
    );
    expect(afterHit.units['player-1'].pendingPSRs ?? []).toEqual([]);
  });

  it('still queues the 20+ PSR when the damage lands in one phase', () => {
    const state = createRunnerHeatState(
      createRunnerUnit({
        damageThisPhase: MINE_DAMAGE_IN_MOVEMENT + WEAPON_HIT,
      }),
    );
    expect(
      applyDamageThresholdPSR(state, 'player-1').units[
        'player-1'
      ].pendingPSRs?.map((psr) => psr.triggerSource),
    ).toEqual(['20+_damage']);
  });
});

describe('runner physical-attack damage counts toward damageThisPhase', () => {
  const armoredUnit = () =>
    createRunnerUnit({
      armor: { center_torso: 30 },
      structure: { center_torso: 20 },
    });

  it('accumulates damage across physical hits on the same target', () => {
    const events: IGameEvent[] = [];
    let state = createRunnerHeatState(armoredUnit());
    for (const damage of [8, 5]) {
      state = applyPhysicalDamage({
        state,
        events,
        gameId: GAME_ID,
        unitId: 'player-1',
        hitLocation: 'center_torso',
        damage,
        d6Roller: () => 3,
      });
    }
    expect(state.units['player-1'].damageThisPhase).toBe(13);
  });

  it('adds to damage the unit already took this phase', () => {
    const state = applyPhysicalDamage({
      state: createRunnerHeatState({ ...armoredUnit(), damageThisPhase: 6 }),
      events: [],
      gameId: GAME_ID,
      unitId: 'player-1',
      hitLocation: 'center_torso',
      damage: 4,
      d6Roller: () => 3,
    });
    expect(state.units['player-1'].damageThisPhase).toBe(10);
  });
});

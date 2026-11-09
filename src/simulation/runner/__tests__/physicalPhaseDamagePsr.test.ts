/**
 * C-5: the 20+ damage PSR after the Physical Attack phase.
 *
 * MegaMek 48fcb2f64 calls `checkForPSRFromDamage` at the end of the Movement,
 * Firing and Physical phases (TWPhaseEndManager.java:156, 206, 239). It queues
 * the roll for any unit that `canFall` and took 20+ damage that phase, or 30+
 * for a dual cockpit with a dedicated pilot (TWGameManager.java:17843-17893).
 * The runner only queued it from weapon hits, so physical-attack damage that
 * crossed the threshold never produced the roll.
 */

import {
  Facing,
  GameSide,
  PSRTrigger,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { checkPhaseDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';

import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { applyDamageThresholdPSR } from '../phases/weaponAttackHitResolution.helpers';
import {
  DeclaresMappedPhysicalAttackAI,
  createPhysicalGrid,
  createState,
  createUnit,
  scriptedD6Random,
} from './physicalAttackRunner.behavior.test-helpers';

/** `attackers` kick `opponent-1`; one kick is under 20 damage, two are over. */
function kickState(
  attackers: readonly ('player-1' | 'player-2')[],
  target: Partial<IGameState['units'][string]> = {},
): IGameState {
  const base = createState();
  return {
    ...base,
    units: {
      ...base.units,
      'player-2': createUnit(
        'player-2',
        GameSide.Player,
        { q: 2, r: 0 },
        { facing: Facing.Northwest, piloting: 0 },
      ),
      'player-1': { ...base.units['player-1'], piloting: 0 },
      'opponent-1': { ...base.units['opponent-1'], ...target },
      ...Object.fromEntries(
        (['player-1', 'player-2'] as const)
          .filter((id) => !attackers.includes(id))
          .map((id) => [id, undefined]),
      ),
    },
  };
}

function kick(
  state: IGameState,
  attackers: readonly ('player-1' | 'player-2')[],
): IGameState {
  const units = Object.fromEntries(
    Object.entries(state.units).filter(([, unit]) => unit !== undefined),
  );
  const events: IGameEvent[] = [];
  return runPhysicalAttackPhase({
    state: { ...state, units },
    botPlayer: new DeclaresMappedPhysicalAttackAI(
      Object.fromEntries(
        attackers.map((id) => [
          id,
          { targetId: 'opponent-1', attackType: 'kick' as const },
        ]),
      ),
    ),
    invariantRunner: new InvariantRunner(),
    violations: [],
    events,
    gameId: state.gameId,
    grid: kickGrid(),
    random: scriptedD6Random(Array.from({ length: 48 }, () => 6)),
  });
}

function kickGrid() {
  const grid = createPhysicalGrid();
  const hexes = new Map(grid.hexes);
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: 'player-2',
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { ...grid, hexes };
}

function damagePsrs(state: IGameState, unitId: string) {
  return (state.units[unitId].pendingPSRs ?? []).filter(
    (psr) => psr.reasonCode === PSRTrigger.PhaseDamage20Plus,
  );
}

describe('C-5 runner physical-phase 20+ damage PSR', () => {
  it('queues one 20+ damage PSR when physical damage crosses the threshold', () => {
    const both = ['player-1', 'player-2'] as const;
    const result = kick(kickState(both), both);
    expect(result.units['opponent-1'].damageThisPhase).toBeGreaterThanOrEqual(
      20,
    );
    expect(damagePsrs(result, 'opponent-1')).toHaveLength(1);
  });

  it('queues nothing below the threshold', () => {
    const one = ['player-1'] as const;
    const result = kick(kickState(one), one);
    const damage = result.units['opponent-1'].damageThisPhase ?? 0;
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(20);
    expect(damagePsrs(result, 'opponent-1')).toHaveLength(0);
  });

  it('does not duplicate a 20+ PSR the unit already carries', () => {
    const both = ['player-1', 'player-2'] as const;
    const existing = kick(kickState(both), both).units['opponent-1']
      .pendingPSRs;
    const result = kick(kickState(both, { pendingPSRs: existing }), both);
    expect(damagePsrs(result, 'opponent-1')).toHaveLength(1);
  });
});

describe('C-5 shared 20+ damage helper', () => {
  function stateWith(
    overrides: Partial<IGameState['units'][string]>,
  ): IGameState {
    const base = createState();
    return {
      ...base,
      units: {
        ...base.units,
        'opponent-1': createUnit(
          'opponent-1',
          GameSide.Opponent,
          { q: 1, r: 0 },
          { damageThisPhase: 20, ...overrides },
        ),
      },
    };
  }

  it('queues for a standing BattleMech', () => {
    const next = applyDamageThresholdPSR(stateWith({}), 'opponent-1');
    expect(damagePsrs(next, 'opponent-1')).toHaveLength(1);
  });

  it('queues for a unit with no unit type (BattleMech-like by default)', () => {
    const next = applyDamageThresholdPSR(
      stateWith({ unitType: undefined }),
      'opponent-1',
    );
    expect(damagePsrs(next, 'opponent-1')).toHaveLength(1);
  });

  it('queues nothing for a prone unit (Mek.canFall is false when prone)', () => {
    const state = stateWith({ prone: true });
    expect(applyDamageThresholdPSR(state, 'opponent-1')).toBe(state);
  });

  it('queues nothing for a unit that cannot fall (not a BattleMech)', () => {
    const state = stateWith({ unitType: 'Combat Vehicle' });
    expect(applyDamageThresholdPSR(state, 'opponent-1')).toBe(state);
  });

  it('uses 30 as the threshold for a dual cockpit with a dedicated pilot', () => {
    const unit = createUnit('u', GameSide.Player, { q: 0, r: 0 });
    const dual = { dualCockpitDedicatedPilot: true } as const;
    expect(
      checkPhaseDamagePSR({ ...unit, damageThisPhase: 29 }, dual),
    ).toBeNull();
    expect(
      checkPhaseDamagePSR({ ...unit, damageThisPhase: 30 }, dual),
    ).not.toBeNull();
    expect(
      checkPhaseDamagePSR({ ...unit, damageThisPhase: 20 }),
    ).not.toBeNull();
  });
});

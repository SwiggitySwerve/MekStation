import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IAmmoSlotState,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';
import { applyEvent } from '@/utils/gameplay/gameState/gameStateReducer';

import { applyHeatInducedAmmoExplosions } from '../phases/heatAmmoExplosions';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import { buildDamageState } from '../SimulationRunnerState';
import { createUnit, makeMinimalState } from './heatEvents.test-helpers';

const targetId = 'opponent-1';
const binId = 'exploding-bin';

function makeState(rounds: number, otherBins = true): IGameState {
  const bin: IAmmoSlotState = {
    binId,
    location: 'right_torso',
    weaponType: 'ac-20',
    remainingRounds: rounds,
    maxRounds: 100,
    isExplosive: true,
  };
  const ammoState: Record<string, IAmmoSlotState> = {
    [binId]: bin,
    ...(otherBins
      ? {
          'same-location-bin': {
            ...bin,
            binId: 'same-location-bin',
            remainingRounds: 1,
          },
          'other-location-bin': {
            ...bin,
            binId: 'other-location-bin',
            location: 'left_torso',
            remainingRounds: 1,
          },
        }
      : {}),
  };
  return makeMinimalState({
    [targetId]: createUnit(
      targetId,
      GameSide.Opponent,
      { q: 0, r: 0 },
      { ammoState },
    ),
  });
}

function ammoCritical(ammoBinId = binId): CriticalHitEvent {
  return {
    type: 'critical_hit_resolved',
    payload: {
      unitId: targetId,
      location: 'right_torso',
      slotIndex: 0,
      componentType: 'ammo',
      componentName: 'AC/20 Ammo',
      ammoBinId,
      effect: 'Ammo destroyed',
      destroyed: true,
    },
  };
}

function explodeCritical(
  state: IGameState,
  events: IGameEvent[],
  criticalEvents: readonly CriticalHitEvent[] = [ammoCritical()],
): IGameState {
  return applyCritAmmoExplosions({
    currentState: state,
    events,
    gameId: state.gameId,
    unitId: 'player-1',
    targetId,
    damageResult: {
      state: buildDamageState(state.units[targetId]),
      result: { locationDamages: [], criticalHits: [], unitDestroyed: false },
      criticalEvents,
    },
    d6Roller: () => 6,
    critUnitDestroyed: false,
    critDestructionCause: undefined,
  }).currentState;
}

function explodeHeat(
  state: IGameState,
  events: IGameEvent[],
  heat = 30,
): IGameState {
  return applyHeatInducedAmmoExplosions({
    currentState: state,
    unit: state.units[targetId],
    unitId: targetId,
    heat,
    events,
    gameId: state.gameId,
    d6Roller: () => 6,
  });
}

describe.each([
  {
    source: 'CritInduced',
    phase: GamePhase.WeaponAttack,
    actorId: 'player-1',
    run: explodeCritical,
  },
  {
    source: 'HeatInduced',
    phase: GamePhase.Heat,
    actorId: targetId,
    run: explodeHeat,
  },
])('runner $source ammunition replay', ({ source, phase, actorId, run }) => {
  it.each([2, 5, 100])(
    'empties exactly the exploded bin with %i remaining rounds',
    (rounds) => {
      const initial = makeState(rounds);
      const events: IGameEvent[] = [];
      const live = run(initial, events);
      const replayed = events.reduce(applyEvent, initial);

      expect(live.units[targetId].ammoState?.[binId].remainingRounds).toBe(0);
      expect(replayed.units[targetId].ammoState).toEqual(
        live.units[targetId].ammoState,
      );
      expect(replayed.units[targetId].ammoState?.['same-location-bin']).toEqual(
        initial.units[targetId].ammoState?.['same-location-bin'],
      );
      expect(
        replayed.units[targetId].ammoState?.['other-location-bin'],
      ).toEqual(initial.units[targetId].ammoState?.['other-location-bin']);
      expect(initial.units[targetId].ammoState?.[binId].remainingRounds).toBe(
        rounds,
      );

      const explosionIndex = events.findIndex(
        (event) => event.type === GameEventType.AmmoExplosion,
      );
      expect(explosionIndex).toBeGreaterThanOrEqual(0);
      const explosion = events[explosionIndex];
      expect(explosion.payload).toMatchObject({
        binId,
        roundsDestroyed: rounds,
        source,
      });
      expect(events[explosionIndex + 1]).toMatchObject({
        gameId: initial.gameId,
        sequence: explosion.sequence + 1,
        turn: initial.turn,
        phase,
        actorId,
        side: actorId === targetId ? GameSide.Opponent : GameSide.Player,
        type: GameEventType.AmmoConsumed,
        payload: {
          unitId: targetId,
          binId,
          weaponType: 'ac-20',
          roundsConsumed: rounds,
          roundsRemaining: 0,
        },
      });
      expect(
        events.filter((event) => event.type === GameEventType.AmmoConsumed),
      ).toHaveLength(1);
      expect(events.map((event) => event.sequence)).toEqual(
        events.map((_, index) => index),
      );
      expect(
        events.reduce(applyEvent, replayed).units[targetId].ammoState,
      ).toEqual(live.units[targetId].ammoState);
      if (rounds === 100) {
        expect(live.units[targetId].destroyed).toBe(true);
      }
    },
  );

  it('cannot explode an emptied bin again', () => {
    const initial = makeState(2, false);
    const events: IGameEvent[] = [];
    const first = run(initial, events);
    const count = events.length;
    const second = run(first, events);
    expect(events).toHaveLength(count);
    expect(second.units[targetId].ammoState).toEqual(
      first.units[targetId].ammoState,
    );
  });

  it('emits no explosion or consumption for an empty tracked bin', () => {
    const state = makeState(0, false);
    const events: IGameEvent[] = [];
    expect(run(state, events).units[targetId].ammoState).toEqual(
      state.units[targetId].ammoState,
    );
    expect(events).toEqual([]);
  });
});

it('does not consume ammunition for equipment-only explosions', () => {
  const initial = makeState(5);
  const events: IGameEvent[] = [];
  const live = explodeCritical(initial, events, [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: targetId,
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'PPC Capacitor',
        effect: 'Equipment explosion',
        explosionDamage: 5,
        destroyed: true,
      },
    },
  ]);
  expect(
    events.filter((event) => event.type === GameEventType.AmmoExplosion),
  ).toHaveLength(1);
  expect(
    events.some((event) => event.type === GameEventType.DamageApplied),
  ).toBe(true);
  expect(
    events.some((event) => event.type === GameEventType.AmmoConsumed),
  ).toBe(false);
  expect(live.units[targetId].ammoState).toEqual(
    initial.units[targetId].ammoState,
  );
  expect(events.reduce(applyEvent, initial).units[targetId].ammoState).toEqual(
    initial.units[targetId].ammoState,
  );
});

it('does not consume another loaded bin when the critical bin is untracked', () => {
  const initial = makeState(5);
  const events: IGameEvent[] = [];
  const live = explodeCritical(initial, events, [
    ammoCritical('untracked-bin'),
  ]);
  expect(events).toEqual([]);
  expect(live.units[targetId].ammoState).toEqual(
    initial.units[targetId].ammoState,
  );
});

it('does not consume ammunition when the heat explosion avoid roll passes', () => {
  const initial = makeState(5);
  const events: IGameEvent[] = [];
  const live = explodeHeat(initial, events, 19);
  expect(events).toEqual([]);
  expect(live.units[targetId].ammoState).toEqual(
    initial.units[targetId].ammoState,
  );
});

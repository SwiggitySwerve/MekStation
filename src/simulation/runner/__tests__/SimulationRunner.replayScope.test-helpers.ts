import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IGameState, IUnitGameState } from '@/types/gameplay';

import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { deriveState } from '@/utils/gameplay/gameState';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { SimulationRunner } from '../SimulationRunner';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAIWeaponsFromFullUnit,
  type IHydratedUnitData,
} from '../UnitHydration';

// D-8's reproducible corpus. Keep these inputs stable when fixing replay gaps.
export const RUNNER_REPLAY_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const RUNNER_REPLAY_CONFIG = {
  turnLimit: 10,
  unitCount: { player: 2, opponent: 2 },
  mapRadius: 4,
};

// Read the committed JSON directly: the Node canonical service would add
// environment reads to this test's cache dependency graph. The service returns
// this same parsed object without coercion; catalog contract tests validate it.
const fullUnit = atlas as unknown as IFullUnit;
const aiWeapons = hydrateAIWeaponsFromFullUnit(
  fullUnit,
  buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES),
);

function corpusHydration(): ReadonlyMap<string, IHydratedUnitData> {
  const hydration = new Map<string, IHydratedUnitData>();
  for (const side of [GameSide.Player, GameSide.Opponent]) {
    for (
      let index = 1;
      index <= RUNNER_REPLAY_CONFIG.unitCount[side];
      index++
    ) {
      const runnerUnitId = `${side}-${index}`;
      hydration.set(runnerUnitId, {
        runnerUnitId,
        side,
        position: { q: 0, r: 0 },
        fullUnit,
        aiWeapons,
        gunnery: 4,
        piloting: 5,
      });
    }
  }
  return hydration;
}

export function runReplayCorpusSample(seed: number) {
  let endPhaseState: IGameState | undefined;
  let lastObservedState: IGameState | undefined;
  const invariants = new InvariantRunner();
  invariants.register({
    name: 'capture-runner-replay-corpus-state',
    description:
      'Observe the End-phase state and the last state shown to the runner invariants without changing the run',
    severity: 'warning',
    check: (state) => {
      lastObservedState = state;
      if (state.phase === GamePhase.End) endPhaseState = state;
      return [];
    },
  });
  const result = new SimulationRunner(
    seed,
    invariants,
    undefined,
    undefined,
    undefined,
    corpusHydration(),
  ).run({ seed, ...RUNNER_REPLAY_CONFIG });

  // Every run, completed or not, must end with the runner's terminal event.
  const terminal = result.events[result.events.length - 1];
  if (terminal.type !== GameEventType.GameEnded) {
    throw new Error(`Replay corpus seed ${seed} did not end with game_ended`);
  }

  // A game that runs to its last turn finishes in the End phase. A game
  // decided earlier (a side destroyed during a turn) breaks out of the turn
  // loop before the End phase, so the End-phase capture is a previous turn's
  // state. The runner does not return its terminal state; the last state it
  // showed its invariants in the terminal turn is the nearest observable one
  // (the weapon-attack phase's closing check, before the PSR phase that
  // follows it).
  const endedBeforeEndPhase = endPhaseState?.turn !== result.turns;
  const runnerState = endedBeforeEndPhase ? lastObservedState : endPhaseState;
  if (!runnerState || runnerState.turn !== result.turns) {
    throw new Error(
      `Replay corpus seed ${seed} has no runner state for its final turn`,
    );
  }
  const gameId = result.events[0].gameId;
  const originalEvents = JSON.stringify(result.events);
  return {
    seed,
    gameId,
    result,
    originalEvents,
    runnerState,
    endedBeforeEndPhase,
    replayState: deriveState(gameId, result.events),
  };
}

export type RunnerReplaySample = ReturnType<typeof runReplayCorpusSample>;

export function replayMismatchCount(
  sample: RunnerReplaySample,
  field: keyof IUnitGameState,
): number {
  return Object.values(sample.runnerState.units).filter(
    (unit) =>
      JSON.stringify(unit[field]) !==
      JSON.stringify(sample.replayState.units[unit.id][field]),
  ).length;
}

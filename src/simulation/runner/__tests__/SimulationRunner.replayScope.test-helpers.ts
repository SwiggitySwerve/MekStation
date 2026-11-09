import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IGameState, IUnitGameState } from '@/types/gameplay';

import { GamePhase, GameSide } from '@/types/gameplay';
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
  let finalState: IGameState | undefined;
  const invariants = new InvariantRunner();
  invariants.register({
    name: 'capture-runner-replay-corpus-state',
    description: 'Observe the final End-phase state without changing the run',
    severity: 'warning',
    check: (state) => {
      if (state.phase === GamePhase.End) finalState = state;
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

  if (!finalState || finalState.turn !== result.turns) {
    throw new Error(
      `Replay corpus seed ${seed} did not finish in the End phase`,
    );
  }
  const gameId = result.events[0].gameId;
  const originalEvents = JSON.stringify(result.events);
  return {
    seed,
    gameId,
    result,
    originalEvents,
    runnerState: finalState,
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

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  GamePhase,
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { toAIUnitState } from '../SimulationRunnerSupport';
import { createD6Roller } from './utils';
import { createWeaponAttackManifestResolver } from './weaponAttackManifest';
import { runWeaponAttackForUnit } from './weaponAttackUnit';

export function runAttackPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  /**
   * The encounter hex grid. The weapon-attack phase reads the target hex's
   * terrain to derive partial cover. Optional: when absent (no board loaded)
   * no target is treated as in partial cover. The runner currently builds an
   * all-clear grid, so partial cover stays inert until varied terrain lands.
   */
  grid?: IHexGrid;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon
   * list, keyed by runner unit id. Threaded into `toAIUnitState` so the
   * AI sees real catalog loadouts (Atlas -> 4x ML + AC/20 + LRM-20 +
   * SRM-6) rather than the synthetic single-medium-laser fallback.
   *
   * Per Phase 2 (this change): the runner now drives the per-mount
   * fire loop directly off `aiUnit.weapons`, so the same map flows
   * end-to-end into damage resolution. Each weapon mount produces a
   * paired `AttackDeclared` / `AttackResolved` event (and damage chain
   * on hit) per turn.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  /**
   * Per `add-combat-fidelity-suite` Phase 3: per-unit critical-slot
   * manifest, keyed by runner unit id. The runner persists post-crit
   * manifests across phase calls so subsequent shots see destroyed
   * slots and the slot-selection roll never re-rolls a
   * already-destroyed slot. When omitted (legacy callers) the runner
   * builds a default manifest per target on first crit.
   *
   * Mutated in place; the caller's `Map` instance is updated with the
   * post-resolution manifest after every shot. Callers that need
   * read-only invariants should pass a copy.
   */
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    random,
    state,
    violations,
    weaponsByUnit,
    manifestsByUnit,
    environmentalConditions,
    optionalRules,
  } = options;
  let currentState = { ...state, phase: GamePhase.WeaponAttack };
  violations.push(...invariantRunner.runAll(currentState));

  const getOrSeedManifest = createWeaponAttackManifestResolver(manifestsByUnit);
  const d6Roller = createD6Roller(random);
  const allAIUnits = Object.values(currentState.units).map((unit) =>
    toAIUnitState(unit, weaponsByUnit?.get(unit.id)),
  );

  for (const unitId of Object.keys(currentState.units)) {
    currentState = runWeaponAttackForUnit({
      currentState,
      unitId,
      botPlayer,
      allAIUnits,
      events,
      gameId,
      d6Roller,
      grid,
      weaponsByUnit,
      manifestsByUnit,
      getOrSeedManifest,
      environmentalConditions,
      optionalRules,
    });
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

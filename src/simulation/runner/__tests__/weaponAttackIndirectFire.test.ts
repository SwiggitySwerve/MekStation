/**
 * Tests for Quick-Sim indirect-fire dispatch (PR-K7).
 *
 * The interactive path + bot AI path both pre-compute indirect-fire
 * resolution via `computeIndirectFireContext` and thread it through
 * `declareAttack` (PR-K4/K5). The Quick-Sim runner uses a PARALLEL
 * pipeline that hand-rolls `AttackDeclared` / `AttackResolved` from
 * `calculateToHit` directly — it does NOT go through `declareAttack`.
 *
 * PR-K7 wires the same dispatch into the Quick-Sim path so mass-scale
 * BV-balance Monte Carlo runs reflect indirect-fire to-hit math.
 *
 * Verifies:
 *   - LRM attacker with NO LOS + friendly spotter with LOS → AttackDeclared
 *     carries 'Indirect fire' modifier AND IndirectFireSpotterSelected event
 *     emitted with basis='los' + spotterId set
 *   - Direct LOS path: clear-grid LRM attacker → no indirect events (LOS
 *     present, direct fire works)
 *   - Backward-compat: no grid → no indirect events emitted
 */

import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT } from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  makeLRM15,
  SequenceRandom,
  ScriptedAttackAI,
  makeUnit,
  makeHex,
  makeBlockedGrid,
  makeClearGrid,
  buildScenario,
  runPhase,
} from './weaponAttackIndirectFire.test-helpers';

// =============================================================================
// Tests
// =============================================================================

it('POSITIVE: no LOS + spotter → Indirect fire modifier + IndirectFireSpotterSelected event', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  expect(declared).toBeDefined();
  const declaredPayload = declared!.payload as IAttackDeclaredPayload;
  const indirectMod = declaredPayload.modifiers.find(
    (m) => m.name === 'Indirect fire',
  );
  expect(indirectMod).toBeDefined();
  expect(indirectMod!.value).toBeGreaterThanOrEqual(1);

  const spotterEvent = events.find(
    (e) => e.type === GameEventType.IndirectFireSpotterSelected,
  );
  expect(spotterEvent).toBeDefined();
  const spotterPayload = spotterEvent!
    .payload as IIndirectFireSpotterSelectedPayload;
  expect(spotterPayload.attackerId).toBe('player-1');
  expect(spotterPayload.spotterId).toBe('player-2');
  expect(spotterPayload.weaponId).toBe('lrm-15-1');
  expect(spotterPayload.basis).toBe('los');
});

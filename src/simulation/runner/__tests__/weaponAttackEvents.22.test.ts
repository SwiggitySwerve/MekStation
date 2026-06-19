/**
 * Phase 2 of `add-combat-fidelity-suite` — per-event-type unit tests for
 * `runAttackPhase`'s lifecycle event chain.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Weapon Attack Lifecycle Events"
 *     - "Location Destruction and Damage Transfer Events"
 *
 * Each test constructs a synthetic minimal scenario (1v1 mech mirror or
 * skewed armor budget) and asserts the discriminated-union payload
 * shape of the events produced by `runAttackPhase`. Determinism is
 * driven by a fixed `SeededRandom` seed; tests never depend on
 * Math.random.
 *
 * This file is intentionally narrow: per-event-type SHAPE assertions.
 * Cross-cutting causal-ordering invariants ("AttackDeclared count ===
 * AttackResolved count over a 5-turn match") live in the integration
 * test at `src/simulation/__tests__/atlasMirrorEventChain.integration.test.ts`.
 */

import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IDesignatorMarkerAppliedPayload,
  IGameEvent,
  IGameState,
  ILocationDestroyedPayload,
  ITransferDamagePayload,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IBotBehavior, IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runHeatPhase } from '../phases/postCombat';
import { runAttackPhase } from '../phases/weaponAttack';
import { resolveAMSInterception } from '../phases/weaponAttackAMS';
import {
  isSemiGuidedAmmoSelectedForWeapon,
  resolveSandblasterAutocannonRateOfFireShotCount,
  resolveSpecialProjectileHit,
} from '../phases/weaponAttackFiringModes';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
  type ICatalogWeaponStats,
} from '../UnitHydration';
import {
  weaponLookup,
  createAC20,
  createTacOpsRapidFireAC20,
  createMediumLaser,
  createPlasmaCannon,
  createUltraAC5,
  createRotaryAC2,
  createLBX10,
  createMML3,
  createNarcBeacon,
  createINarcBeacon,
  createSelectableINarcBeacon,
  createTAGDesignator,
  createAMS,
  createLaserAMS,
  createLRM10,
  createMRM10,
  createStreakSRM6,
  createThunderbolt10,
  sequenceD6Roller,
  SequenceRandom,
  createAmmoBin,
  VETERAN_MODE_BEHAVIOR,
  ScriptedAttackAI,
  ScriptedMultiWeaponAttackAI,
  ScriptedSelectedAMSAttackAI,
  createUnit,
  buildScenario,
  runPhase,
  runPhaseWithResult,
} from './weaponAttackEvents.test-helpers';

it('TransferDamage MUST emit before the receiving DamageApplied event (causal ordering)', () => {
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createAC20()],
    targetArmorOverride: {
      head: 0,
      center_torso: 0,
      center_torso_rear: 0,
      left_torso: 0,
      left_torso_rear: 0,
      right_torso: 0,
      right_torso_rear: 0,
      left_arm: 0,
      right_arm: 0,
      left_leg: 0,
      right_leg: 0,
    },
    targetStructureOverride: {
      head: 1,
      center_torso: 1,
      left_torso: 1,
      right_torso: 1,
      left_arm: 1,
      right_arm: 1,
      left_leg: 1,
      right_leg: 1,
    },
  });
  const events = runPhase({ state, weaponsByUnit });

  // Walk the event log and verify: every TransferDamage event MUST
  // be preceded (within the same shot) by a DamageApplied for the
  // fromLocation, and followed by a DamageApplied for the
  // toLocation. This is the causal ordering contract.
  for (let i = 0; i < events.length; i++) {
    if (events[i].type !== GameEventType.TransferDamage) continue;
    const transfer = events[i].payload as ITransferDamagePayload;

    // Find the preceding DamageApplied for fromLocation.
    let foundPrior = false;
    for (let j = i - 1; j >= 0 && !foundPrior; j--) {
      if (events[j].type === GameEventType.AttackDeclared) break; // shot boundary
      if (events[j].type === GameEventType.DamageApplied) {
        const dmg = events[j].payload as IDamageAppliedPayload;
        if (
          dmg.location === transfer.fromLocation &&
          dmg.unitId === transfer.unitId
        ) {
          foundPrior = true;
        }
      }
    }
    expect(foundPrior).toBe(true);

    // Find the following DamageApplied for toLocation.
    let foundNext = false;
    for (let k = i + 1; k < events.length && !foundNext; k++) {
      if (events[k].type === GameEventType.AttackResolved) break; // next-shot boundary
      if (events[k].type === GameEventType.DamageApplied) {
        const dmg = events[k].payload as IDamageAppliedPayload;
        if (
          dmg.location === transfer.toLocation &&
          dmg.unitId === transfer.unitId
        ) {
          foundNext = true;
        }
      }
    }
    expect(foundNext).toBe(true);
  }
});

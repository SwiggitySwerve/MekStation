import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { consumeAmmo, isEnergyWeapon } from '@/utils/gameplay/ammoTracking';
import { resolveDamage } from '@/utils/gameplay/damage';
import { createDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';

import type { IWeapon } from '../../ai/types';

import { DAMAGE_PSR_THRESHOLD } from '../SimulationRunnerConstants';
import { createGameEvent } from './utils';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

/**
 * Canonical `UnitDestroyed` cause taxonomy. Extracted as a named alias
 * so the resolution phase and its helpers share one definition instead
 * of repeating the shared union at every call site (it appears in
 * both `emitCritEvents` and `applyCritAmmoExplosions` today).
 */
export type DestructionCause =
  | 'damage'
  | 'ammo_explosion'
  | 'pilot_death'
  | 'engine_destroyed'
  | 'impossible_displacement'
  | 'ct_destroyed'
  | 'head_destroyed';

/**
 * The shape returned by `resolveDamage`. Aliased via `ReturnType` so the
 * extracted helpers can accept a fully-typed damage result without
 * importing the resolver's internal `IResolveDamageResult` interface.
 */
type DamageResolution = ReturnType<typeof resolveDamage>;

/**
 * Partial Cover Leg-Hit Conversion (Total Warfare p. 53): when the target
 * is in partial cover, a hit that rolls a leg location is absorbed by the
 * cover and resolves as a miss — no damage applies. Emits an
 * `AttackResolved` event shaped exactly like a normal miss (`hit: false`,
 * no `location`) so the `AttackDeclared`/`AttackResolved` count invariant
 * holds. Extracted from `resolveWeaponHit` so the early-return miss path
 * stays a single self-describing call.
 */
export function emitCoveredLegMiss(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  projectileCount?: number;
  attackRoll: number;
  toHitNumber: number;
  firingArc: 'front' | 'left' | 'right' | 'rear';
}): void {
  const {
    events,
    gameId,
    turn,
    attackerId,
    targetId,
    weaponId,
    weapon,
    projectileCount,
    attackRoll,
    toHitNumber,
    firingArc,
  } = options;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackResolved,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId,
        targetId,
        weaponId,
        roll: attackRoll,
        toHitNumber,
        hit: false,
        heat: weapon.heat,
        ...(projectileCount !== undefined ? { projectileCount } : {}),
        attackerArc: firingArc,
      },
      attackerId,
    ),
  );
}

/**
 * Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution` delta —
 * Ammo Consumption and Explosion Events): when a non-energy weapon fires,
 * decrement its ammo bin and emit `AmmoConsumed`. Energy weapons (laser /
 * PPC / flamer) are skipped via `isEnergyWeapon`; source-backed plasma
 * AmmoWeapon families remain ammo-fed despite their energy flag. When the unit
 * has no `ammoState` populated (synthetic test fixtures, legacy session)
 * the consumption is silently skipped — pre-P4 behaviour preserved.
 *
 * Extracted from `resolveWeaponHit` so the ammo-consumption branch reads
 * as one cohesive step. Returns the (possibly updated) game state; the
 * `AmmoConsumed` event is appended to `events` in place.
 */
export function consumeWeaponAmmo(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  attackerId: string;
  weapon: IWeapon;
  ammoWeaponType?: string;
}): IGameState {
  const { ammoWeaponType, events, gameId, attackerId, weapon } = options;
  let { currentState } = options;

  const attackerForAmmo = currentState.units[attackerId];
  const ammoStateBefore = attackerForAmmo.ammoState;
  if (
    ammoStateBefore !== undefined &&
    Object.keys(ammoStateBefore).length > 0 &&
    !isEnergyWeapon(weapon.name)
  ) {
    const baseWeaponType = ammoWeaponType ?? weaponTypeFromMountId(weapon.id);
    const ammoResult = consumeAmmo(ammoStateBefore, attackerId, baseWeaponType);
    if (ammoResult) {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [attackerId]: {
            ...currentState.units[attackerId],
            ammoState: ammoResult.updatedAmmoState,
          },
        },
      };
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.AmmoConsumed,
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            unitId: attackerId,
            binId: ammoResult.event.binId,
            weaponType: ammoResult.event.weaponType,
            roundsConsumed: ammoResult.event.roundsConsumed,
            roundsRemaining: ammoResult.event.roundsRemaining,
          },
          attackerId,
        ),
      );
    }
  }

  return currentState;
}

/**
 * Per `combat-resolution` delta + `damage-system` delta: walk the ordered
 * `locationDamages` chain and emit `DamageApplied` → `LocationDestroyed`
 * (when zeroed) → `TransferDamage` (when residual flows). Mirrors the
 * `gameSessionAttackResolution.ts` emission pattern (the session-layer
 * twin of this runner phase) so replay consumers see the same event
 * sequence regardless of which engine produced the trace.
 *
 * Side-torso → arm cascade: `applyDamageToLocation` zeroes the
 * corresponding arm's armor/structure and pushes it onto
 * `destroyedLocations`. The pre/post-state diff (`newlyDestroyed`) is
 * computed by the caller and passed in so the cascade-arm
 * `LocationDestroyed` event carries the right `cascadedTo` linkage AND
 * its own follow-up event.
 *
 * Extracted from `resolveWeaponHit` — this loop was the single largest
 * block in the function. Events are appended to `events` in place.
 */
export function emitDamageChainEvents(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  damageResult: DamageResolution;
  newlyDestroyed: readonly string[];
}): void {
  const {
    events,
    gameId,
    turn,
    attackerId,
    targetId,
    damageResult,
    newlyDestroyed,
  } = options;

  const locationDamages = damageResult.result.locationDamages;
  for (let i = 0; i < locationDamages.length; i++) {
    const locDmg = locationDamages[i];
    const isTransferStep = i > 0;

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        turn,
        GamePhase.WeaponAttack,
        {
          unitId: targetId,
          location: locDmg.location,
          damage: locDmg.damage,
          armorRemaining: locDmg.armorRemaining,
          structureRemaining: locDmg.structureRemaining,
          locationDestroyed: locDmg.destroyed,
          sourceUnitId: attackerId,
        },
        attackerId,
      ),
    );

    if (locDmg.destroyed) {
      // Detect the side-torso → arm cascade off the post-damage state
      // diff. Only side torsos can cascade an arm.
      let cascadedArm: string | undefined;
      if (
        locDmg.location === 'left_torso' &&
        newlyDestroyed.includes('left_arm')
      ) {
        cascadedArm = 'left_arm';
      } else if (
        locDmg.location === 'right_torso' &&
        newlyDestroyed.includes('right_arm')
      ) {
        cascadedArm = 'right_arm';
      }

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.LocationDestroyed,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            location: locDmg.location,
            cascadedTo: cascadedArm,
            viaTransfer: isTransferStep,
          },
          attackerId,
        ),
      );

      // Cascade arm gets its own LocationDestroyed event so downstream
      // consumers (UI, replay, metrics) don't have to dedupe off the
      // parent. `viaTransfer` is `false` because this is a structural
      // cascade — the arm wasn't reached by residual damage flowing
      // through the transfer chain, it was carried off by its parent
      // torso.
      if (cascadedArm) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.LocationDestroyed,
            turn,
            GamePhase.WeaponAttack,
            {
              unitId: targetId,
              location: cascadedArm,
              viaTransfer: false,
            },
            attackerId,
          ),
        );
      }
    }

    if (locDmg.transferredDamage > 0 && locDmg.transferLocation) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.TransferDamage,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            fromLocation: locDmg.location,
            toLocation: locDmg.transferLocation,
            damage: locDmg.transferredDamage,
          },
          attackerId,
        ),
      );
    }
  }
}

/**
 * Per `combat-resolution` delta: emit a `PilotHit` event when raw head-hit
 * damage inflicted pilot wounds. Suppressed when `emitCritEvents` already
 * emitted a `pilot_hit` for this shot (cockpit-crit path) so the wound is
 * not double-counted. Extracted from `resolveWeaponHit` to keep the
 * de-dupe condition co-located with its emission.
 */
export function emitHeadHitPilotEvent(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  damageResult: DamageResolution;
}): void {
  const { events, gameId, turn, attackerId, targetId, damageResult } = options;

  const pilotDamageResult = damageResult.result.pilotDamage;
  if (pilotDamageResult && pilotDamageResult.woundsInflicted > 0) {
    const alreadyEmittedFromCrit =
      damageResult.criticalEvents?.some((e) => e.type === 'pilot_hit') ?? false;
    if (!alreadyEmittedFromCrit) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            wounds: pilotDamageResult.woundsInflicted,
            totalWounds: pilotDamageResult.totalWounds,
            source: 'head_hit' as const,
            consciousnessCheckRequired:
              pilotDamageResult.consciousnessCheckRequired,
            consciousnessCheckPassed: pilotDamageResult.conscious,
          },
          attackerId,
        ),
      );
    }
  }
}

/**
 * Emit `UnitDestroyed` once if the shot killed the target. The cause is
 * sourced in priority order: (1) crit-induced destruction (engine 3-hit,
 * cockpit hit) captured by `emitCritEvents`/`applyCritAmmoExplosions`;
 * (2) raw damage destruction (CT zeroed, head zeroed) falling through with
 * the resolver's `destructionCause`. Never emits a second `UnitDestroyed`
 * when the target was already destroyed before this shot (multi-mount fire
 * after the kill shot in the same volley). Extracted from `resolveWeaponHit`
 * so the kill-detection guard reads as one step.
 */
export function emitUnitDestroyedEvent(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  targetWasDestroyed: boolean;
  targetIsDestroyed: boolean;
  damageResult: DamageResolution;
  critUnitDestroyed: boolean;
  critDestructionCause: DestructionCause | undefined;
}): void {
  const {
    events,
    gameId,
    turn,
    attackerId,
    targetId,
    targetWasDestroyed,
    targetIsDestroyed,
    damageResult,
    critUnitDestroyed,
    critDestructionCause,
  } = options;

  if (targetIsDestroyed && !targetWasDestroyed) {
    const fallbackCause = damageResult.result.destructionCause ?? 'damage';
    const cause: DestructionCause =
      critUnitDestroyed && critDestructionCause
        ? critDestructionCause
        : fallbackCause;
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        turn,
        GamePhase.WeaponAttack,
        {
          unitId: targetId,
          cause,
          killerUnitId: attackerId,
        },
      ),
    );
  }
}

/**
 * Per the `piloting-skill-rolls` delta: when a surviving target has
 * accumulated `DAMAGE_PSR_THRESHOLD` (20+) damage this phase, queue a
 * `20+_damage` piloting skill roll. Idempotent — only one damage PSR is
 * queued per phase even across a multi-weapon volley. Extracted from
 * `resolveWeaponHit`; returns the (possibly updated) game state.
 */
export function applyDamageThresholdPSR(
  currentState: IGameState,
  targetId: string,
): IGameState {
  const targetPostDamage = currentState.units[targetId];
  if (
    !targetPostDamage.destroyed &&
    (targetPostDamage.damageThisPhase ?? 0) >= DAMAGE_PSR_THRESHOLD
  ) {
    const existingPSRs = targetPostDamage.pendingPSRs ?? [];
    const hasDamagePSR = existingPSRs.some(
      (pendingPSR) => pendingPSR.triggerSource === '20+_damage',
    );
    if (!hasDamagePSR) {
      return {
        ...currentState,
        units: {
          ...currentState.units,
          [targetId]: {
            ...targetPostDamage,
            pendingPSRs: [...existingPSRs, createDamagePSR(targetId)],
          },
        },
      };
    }
  }
  return currentState;
}

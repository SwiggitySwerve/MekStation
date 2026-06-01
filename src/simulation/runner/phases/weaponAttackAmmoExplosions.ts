import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';

import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import {
  applyAmmoExplosionRearArmorBlowout,
  resolveCaseAdjustedAmmoExplosionDamage,
} from '@/utils/gameplay/ammoTracking';
import {
  resolveInternalDamage,
  type IResolveDamageResult,
} from '@/utils/gameplay/damage';

import type { IWeapon } from '../../ai/types';

import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { applyAmmoExplosionPilotDamage } from './ammoExplosionPilotDamage';
import { createGameEvent } from './utils';
import {
  damagePerRoundForBin,
  findExplodingAmmoBin,
} from './weaponAttackHelpers';

type DestructionCause =
  | 'damage'
  | 'ammo_explosion'
  | 'pilot_death'
  | 'engine_destroyed'
  | 'impossible_displacement'
  | 'ct_destroyed'
  | 'head_destroyed'
  | undefined;

type ResolvedCriticalHitEvent = Extract<
  CriticalHitEvent,
  { readonly type: 'critical_hit_resolved' }
>;

export function applyCritAmmoExplosions(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  damageResult: IResolveDamageResult;
  d6Roller: () => number;
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  critUnitDestroyed: boolean;
  critDestructionCause: DestructionCause;
}): {
  currentState: IGameState;
  critUnitDestroyed: boolean;
  critDestructionCause: DestructionCause;
} {
  let { currentState, critUnitDestroyed, critDestructionCause } = options;
  const {
    damageResult,
    d6Roller,
    events,
    gameId,
    targetId,
    unitId,
    weaponsByUnit,
  } = options;

  if (damageResult.criticalEvents) {
    const attackerWeapons = weaponsByUnit?.get(targetId);
    for (const evt of damageResult.criticalEvents) {
      if (!isDestroyedAmmoCritical(evt)) {
        continue;
      }
      const targetNow = currentState.units[targetId];
      if (targetNow.destroyed) break;
      const ammoStateOnTarget = targetNow.ammoState ?? {};
      const bin = findExplodingAmmoBin(
        ammoStateOnTarget,
        evt.payload.location,
        evt.payload.ammoBinId,
      );
      if (!bin) {
        // Empty ammo bin (or no bin tracked at this location) —
        // per spec scenario "Empty ammo bin crit produces no
        // explosion": ComponentDestroyed already emitted; no
        // AmmoExplosion follows.
        continue;
      }
      const damagePerRound = damagePerRoundForBin(bin, attackerWeapons);
      const explosionDamage = bin.remainingRounds * damagePerRound;
      const targetForExplosion = currentState.units[targetId];
      const caseAdjustedDamage = resolveCaseAdjustedAmmoExplosionDamage(
        targetForExplosion,
        bin.location as CombatLocation,
        explosionDamage,
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.AmmoExplosion,
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            location: bin.location,
            binId: bin.binId,
            weaponType: bin.weaponType,
            roundsDestroyed: bin.remainingRounds,
            damage: explosionDamage,
            caseProtection: caseAdjustedDamage.caseProtection,
            source: 'CritInduced' as const,
          },
          unitId,
        ),
      );
      // Empty the bin (ammoState mutation) so a subsequent volley
      // mount in the same turn can't re-trigger the explosion.
      const emptiedAmmoState = {
        ...ammoStateOnTarget,
        [bin.binId]: { ...bin, remainingRounds: 0 },
      };
      // Apply the explosion damage through the canonical damage pipeline so
      // LocationDestroyed + TransferDamage emit per the unprotected cookoff
      // spec. CASE-protected locations feed a capped local damage amount
      // into the same pipeline so excess explosion damage cannot transfer.
      const targetForCascade = currentState.units[targetId];
      const cascadeState = buildDamageState({
        ...targetForCascade,
        ammoState: emptiedAmmoState,
      });
      const blowout = applyAmmoExplosionRearArmorBlowout(
        cascadeState,
        bin.location as CombatLocation,
        caseAdjustedDamage.caseProtection,
        caseAdjustedDamage.damageToApply,
      );
      const cascadeResult = resolveInternalDamage(
        blowout.state,
        bin.location as CombatLocation,
        caseAdjustedDamage.damageToApply,
        d6Roller,
        { applyHeadPilotDamage: false },
      );
      const cascadeLocationDamages = [
        ...blowout.locationDamages,
        ...cascadeResult.result.locationDamages,
      ];
      // Apply the cascade state back to the target unit and
      // emit the resulting damage chain inline.
      currentState = applyDamageResultToState(
        currentState,
        targetId,
        cascadeResult.state,
        {
          ...cascadeResult.result,
          locationDamages: cascadeLocationDamages,
          destructionCause: 'ammo_explosion',
        },
      );
      // Ensure the emptied ammoState persists on the unit too —
      // applyDamageResultToState doesn't touch ammoState.
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [targetId]: {
            ...currentState.units[targetId],
            ammoState: emptiedAmmoState,
          },
        },
      };

      const cascadeChain = cascadeLocationDamages;
      for (let j = 0; j < cascadeChain.length; j++) {
        const locDmg = cascadeChain[j];
        const isCascadeTransfer = j > 0;
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.DamageApplied,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              unitId: targetId,
              location: locDmg.location,
              damage: locDmg.damage,
              armorRemaining: locDmg.armorRemaining,
              structureRemaining: locDmg.structureRemaining,
              locationDestroyed: locDmg.destroyed,
              sourceUnitId: unitId,
            },
            unitId,
          ),
        );
        if (locDmg.destroyed) {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.LocationDestroyed,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                unitId: targetId,
                location: locDmg.location,
                viaTransfer: isCascadeTransfer,
              },
              unitId,
            ),
          );
        }
        if (locDmg.transferredDamage > 0 && locDmg.transferLocation) {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.TransferDamage,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                unitId: targetId,
                fromLocation: locDmg.location,
                toLocation: locDmg.transferLocation,
                damage: locDmg.transferredDamage,
              },
              unitId,
            ),
          );
        }
      }

      const pilotResult = applyAmmoExplosionPilotDamage({
        currentState,
        events,
        gameId,
        targetId,
        sourceUnitId: unitId,
        phase: GamePhase.WeaponAttack,
        totalExplosionDamage: explosionDamage,
        caseProtection: caseAdjustedDamage.caseProtection,
        d6Roller,
      });
      currentState = pilotResult.currentState;

      const finalTarget = currentState.units[targetId];
      if (finalTarget?.destroyed) {
        const explosionCause =
          finalTarget.destructionCause ?? ('ammo_explosion' as const);
        if (!critUnitDestroyed) {
          critUnitDestroyed = true;
          critDestructionCause = explosionCause;
        } else if (
          explosionCause === 'pilot_death' ||
          critDestructionCause !== 'pilot_death'
        ) {
          critDestructionCause = explosionCause;
        }
      }
    }
  }

  // Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution`
  // delta — Heat Lifecycle): emit `PilotHit` when the head hit
  // damaged the pilot. The crit-resolver's pilot_hit event
  // covers cockpit-crit cases; this branch handles the head-hit
  // 1-wound case from `resolveDamage`'s `applyPilotDamage` call.
  // Idempotency: skip if `emitCritEvents` already emitted a
  // `PilotHit` for this shot (cockpit crit + head hit on same
  // shot would double-count). We test by scanning events
  // emitted since the AttackResolved sequence boundary — when
  // the resolver's pilot_hit fires it's part of the crit stream
  // we just emitted.

  return { currentState, critUnitDestroyed, critDestructionCause };
}

function isDestroyedAmmoCritical(
  evt: CriticalHitEvent,
): evt is ResolvedCriticalHitEvent {
  return (
    evt.type === 'critical_hit_resolved' &&
    evt.payload.componentType === 'ammo' &&
    evt.payload.destroyed
  );
}

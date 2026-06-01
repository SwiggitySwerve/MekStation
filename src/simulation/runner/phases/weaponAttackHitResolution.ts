import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { resolveDamage } from '@/utils/gameplay/damage';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import {
  determineHitLocation,
  isHeadHit,
  isLegLocation,
} from '@/utils/gameplay/hitLocation';
import { applyPhysicalEquipmentCriticalEvents } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import type { IWeapon } from '../../ai/types';

import { HEAD_HIT_DAMAGE_CAP } from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { createGameEvent } from './utils';
import { applyCritAmmoExplosions } from './weaponAttackAmmoExplosions';
import {
  emitDesignatorMarkerApplied,
  iNarcPodTypeFromAmmoWeaponType,
  emitZeroDamageDesignatorHit,
  isINarcBeaconWeapon,
  isNarcBeaconWeapon,
  isTagDesignatorWeapon,
  markTargetINarcPod,
  markTargetNarcedBy,
  markTargetTagDesignated,
} from './weaponAttackDesignatorMarkers';
import { emitCritEvents, toFiringArc } from './weaponAttackHelpers';
import {
  DestructionCause,
  applyDamageThresholdPSR,
  consumeWeaponAmmo,
  emitCoveredLegMiss,
  emitDamageChainEvents,
  emitHeadHitPilotEvent,
  emitUnitDestroyedEvent,
} from './weaponAttackHitResolution.helpers';
import {
  applyPlasmaCannonTargetHeat,
  isPlasmaCannonWeapon,
} from './weaponAttackPlasmaCannon';
import {
  applyCriticalPSRTriggers,
  applyLegDamagePSR,
} from './weaponAttackPsrTriggers';

/**
 * Resolve a single confirmed weapon hit against a target unit: roll the
 * hit location, apply damage (with crit dispatch), emit the full event
 * chain (`AttackResolved` → `AmmoConsumed` → `DamageApplied` /
 * `LocationDestroyed` / `TransferDamage` → crit events → `AmmoExplosion`
 * → `PilotHit` → `UnitDestroyed`), and queue any 20+-damage piloting
 * skill roll. The cohesive sub-steps (ammo consumption, damage-chain
 * emission, pilot-hit, kill detection, PSR queueing) are delegated to
 * `weaponAttackHitResolution.helpers.ts`. Returns the updated game state.
 */
export function resolveWeaponHit(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  ammoWeaponType?: string;
  projectileCount?: number;
  attackRoll: number;
  toHitNumber: number;
  firingArc: 'front' | 'left' | 'right' | 'rear';
  /**
   * Whether the target is in partial cover. When true, a hit whose
   * hit-location roll lands on a leg is converted to a miss (Total Warfare
   * p. 53) — the cover absorbs the shot.
   */
  partialCover: boolean;
  /**
   * Whether the target is hull-down. Front-arc leg hit-location rolls are
   * redirected before the partial-cover leg-miss conversion.
   */
  hullDown?: boolean;
  d6Roller: () => number;
  optionalRules?: readonly string[];
  getOrSeedManifest: (id: string) => CriticalSlotManifest;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}): IGameState {
  let { currentState } = options;
  const {
    attackRoll,
    d6Roller,
    events,
    firingArc,
    gameId,
    getOrSeedManifest,
    manifestsByUnit,
    partialCover,
    hullDown,
    optionalRules,
    ammoWeaponType,
    projectileCount,
    targetId,
    toHitNumber,
    unitId,
    weapon,
    weaponId,
    weaponsByUnit,
  } = options;

  if (projectileCount === 0) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.AttackResolved,
        currentState.turn,
        GamePhase.WeaponAttack,
        {
          attackerId: unitId,
          targetId,
          weaponId,
          roll: attackRoll,
          toHitNumber,
          hit: false,
          damage: 0,
          heat: weapon.heat,
          projectileCount,
          attackerArc: firingArc,
        },
        unitId,
      ),
    );

    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  const hitLocationResult = determineHitLocation(
    toFiringArc(firingArc),
    d6Roller,
    { hullDown: hullDown ?? false },
  );
  const location = hitLocationResult.location;

  // Partial Cover Leg-Hit Conversion (Total Warfare p. 53): when the target
  // is in partial cover, a hit that rolls a leg location is absorbed by the
  // cover and resolves as a miss — no damage applies. The hit-location roll
  // is still consumed (above) so the dice stream stays deterministic.
  if (partialCover && isLegLocation(location)) {
    emitCoveredLegMiss({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId,
      weaponId,
      weapon,
      projectileCount,
      attackRoll,
      toHitNumber,
      firingArc,
    });
    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  if (isINarcBeaconWeapon(weapon)) {
    const attackerTeamId = currentState.units[unitId]?.side as
      | string
      | undefined;
    const podType = iNarcPodTypeFromAmmoWeaponType(ammoWeaponType);
    const wasAlreadyINarced =
      attackerTeamId !== undefined &&
      (currentState.units[targetId].iNarcPods ?? []).some(
        (pod) => pod.teamId === attackerTeamId && pod.podType === podType,
      );
    currentState = markTargetINarcPod({
      currentState,
      targetId,
      attackerTeamId,
      location,
      podType,
    });

    emitZeroDamageDesignatorHit({
      events,
      gameId,
      turn: currentState.turn,
      unitId,
      targetId,
      weaponId,
      attackRoll,
      toHitNumber,
      location,
      weapon,
      projectileCount,
      firingArc,
    });

    if (!wasAlreadyINarced && attackerTeamId !== undefined) {
      emitDesignatorMarkerApplied({
        events,
        gameId,
        turn: currentState.turn,
        unitId,
        targetId,
        weaponId,
        marker: 'inarc',
        podType,
        persistent: true,
        location,
        teamId: attackerTeamId,
      });
    }

    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  if (isNarcBeaconWeapon(weapon)) {
    const attackerTeamId = currentState.units[unitId]?.side as
      | string
      | undefined;
    const wasAlreadyNarced =
      attackerTeamId !== undefined &&
      (currentState.units[targetId].narcedBy ?? []).includes(attackerTeamId);
    currentState = markTargetNarcedBy({
      currentState,
      targetId,
      attackerTeamId,
    });

    emitZeroDamageDesignatorHit({
      events,
      gameId,
      turn: currentState.turn,
      unitId,
      targetId,
      weaponId,
      attackRoll,
      toHitNumber,
      location,
      weapon,
      projectileCount,
      firingArc,
    });

    if (!wasAlreadyNarced && attackerTeamId !== undefined) {
      emitDesignatorMarkerApplied({
        events,
        gameId,
        turn: currentState.turn,
        unitId,
        targetId,
        weaponId,
        marker: 'narc',
        persistent: true,
        location,
        teamId: attackerTeamId,
      });
    }

    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  if (isTagDesignatorWeapon(weapon)) {
    const wasAlreadyTagged =
      currentState.units[targetId].tagDesignated === true;
    currentState = markTargetTagDesignated(currentState, targetId);

    emitZeroDamageDesignatorHit({
      events,
      gameId,
      turn: currentState.turn,
      unitId,
      targetId,
      weaponId,
      attackRoll,
      toHitNumber,
      location,
      weapon,
      projectileCount,
      firingArc,
    });

    if (!wasAlreadyTagged) {
      emitDesignatorMarkerApplied({
        events,
        gameId,
        turn: currentState.turn,
        unitId,
        targetId,
        weaponId,
        marker: 'tag',
        persistent: false,
        location,
      });
    }

    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  if (isPlasmaCannonWeapon(weapon)) {
    currentState = applyPlasmaCannonTargetHeat({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      targetId,
      weaponId,
      weapon,
      projectileCount,
      attackRoll,
      toHitNumber,
      location,
      firingArc,
      d6Roller,
      optionalRules,
    });

    return consumeWeaponAmmo({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      weapon,
      ammoWeaponType,
    });
  }

  let damage = weapon.damage;
  if (isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP) {
    damage = HEAD_HIT_DAMAGE_CAP;
  }

  const targetBefore = currentState.units[targetId];
  const damageState = buildDamageState(targetBefore);

  // Per `add-combat-fidelity-suite` Phase 3: thread a
  // `criticalContext` into the damage state so `resolveDamage`
  // dispatches `resolveCriticalHits` per location where the
  // 2d6 trigger crosses 8+. The context bundles the resolver's
  // four required parameters (`unitId` / `manifest` /
  // `componentDamage` / `armorType`) so callers don't have to
  // thread four positional arguments. `armorType` is left
  // undefined for the runner today — the synthetic units don't
  // carry construction armor data; the resolver falls back to
  // the standard armor crit ladder.
  const targetManifest = getOrSeedManifest(targetId);
  const targetComponentDamage =
    targetBefore.componentDamage ?? buildDefaultComponentDamageState();
  const damageStateWithCtx = {
    ...damageState,
    criticalContext: {
      unitId: targetId,
      manifest: targetManifest,
      componentDamage: targetComponentDamage,
    },
  };
  const damageResult = resolveDamage(
    damageStateWithCtx,
    location,
    damage,
    d6Roller,
  );

  // Persist the post-resolution manifest in the side table so the
  // next shot at this target sees already-destroyed slots and the
  // selection roll never re-rolls a destroyed slot.
  if (manifestsByUnit && damageResult.manifest) {
    manifestsByUnit.set(targetId, damageResult.manifest);
  }

  currentState = applyDamageResultToState(
    currentState,
    targetId,
    damageResult.state,
    damageResult.result,
    damageResult.componentDamage,
  );
  const targetAfterCriticals = applyPhysicalEquipmentCriticalEvents(
    currentState.units[targetId],
    damageResult.criticalEvents,
  );
  if (targetAfterCriticals !== currentState.units[targetId]) {
    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [targetId]: targetAfterCriticals,
      },
    };
  }
  const targetAfter = currentState.units[targetId];

  const prevDamage = targetAfter.damageThisPhase ?? 0;
  currentState = {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...targetAfter,
        damageThisPhase: prevDamage + damage,
      },
    },
  };

  // Per `combat-resolution` delta: emit `AttackResolved` AFTER the
  // roll resolves. Hit-location is included only on hits per the
  // discriminated-union contract.
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackResolved,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        attackerId: unitId,
        targetId,
        weaponId,
        roll: attackRoll,
        toHitNumber,
        hit: true,
        location,
        damage,
        heat: weapon.heat,
        ...(projectileCount !== undefined ? { projectileCount } : {}),
        attackerArc: firingArc,
      },
      unitId,
    ),
  );

  // Decrement the firing weapon's ammo bin and emit `AmmoConsumed`
  // (non-energy weapons only). See `consumeWeaponAmmo`.
  currentState = consumeWeaponAmmo({
    currentState,
    events,
    gameId,
    attackerId: unitId,
    weapon,
    ammoWeaponType,
  });

  // Walk the ordered `locationDamages` chain and emit `DamageApplied` →
  // `LocationDestroyed` → `TransferDamage`. The side-torso → arm cascade
  // is detected off the pre/post-state `destroyedLocations` diff.
  const preDestroyedSet = new Set<string>(damageState.destroyedLocations);
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (loc) => !preDestroyedSet.has(loc),
  );
  emitDamageChainEvents({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    damageResult,
    newlyDestroyed,
  });

  // Per `add-combat-fidelity-suite` Phase 3: emit the crit chain
  // produced by `resolveCriticalHits` (via `resolveDamage`). Causal
  // ordering: AFTER the full damage chain (DamageApplied →
  // LocationDestroyed → TransferDamage) and BEFORE the `UnitDestroyed`
  // event emitted below.
  let critUnitDestroyed = false;
  let critDestructionCause: DestructionCause | undefined = undefined;
  if (damageResult.criticalEvents) {
    const emitted = emitCritEvents({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId,
      critEvents: damageResult.criticalEvents,
      targetAlreadyDestroyed: targetBefore.destroyed,
      targetPilotingSkill: targetBefore.piloting,
    });
    critUnitDestroyed = emitted.unitDestroyed;
    critDestructionCause = emitted.destructionCause;
  }

  // Per `add-combat-fidelity-suite` Phase 4 (`ammo-explosion-system`
  // delta): when the resolver flagged an ammo slot as destroyed, emit
  // `AmmoExplosion` and cascade the explosion damage through the
  // canonical transfer chain. May itself destroy the unit.
  const ammoExplosionResult = applyCritAmmoExplosions({
    currentState,
    events,
    gameId,
    unitId,
    targetId,
    damageResult,
    d6Roller,
    weaponsByUnit,
    critUnitDestroyed,
    critDestructionCause,
  });
  currentState = ammoExplosionResult.currentState;
  critUnitDestroyed = ammoExplosionResult.critUnitDestroyed;
  critDestructionCause = ammoExplosionResult.critDestructionCause;

  currentState = applyCriticalPSRTriggers(
    currentState,
    damageResult.criticalEvents,
  );
  currentState = applyLegDamagePSR({
    currentState,
    events,
    gameId,
    targetId,
    damageResult,
  });

  // Emit `PilotHit` for raw head-hit wounds (suppressed when a
  // cockpit-crit already emitted one).
  emitHeadHitPilotEvent({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    damageResult,
  });

  // Emit `UnitDestroyed` once if the shot killed the target, sourcing
  // the cause from crit destruction first, then raw damage.
  emitUnitDestroyedEvent({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    targetWasDestroyed: targetBefore.destroyed,
    targetIsDestroyed: currentState.units[targetId].destroyed,
    damageResult,
    critUnitDestroyed,
    critDestructionCause,
  });

  // Queue a 20+-damage piloting skill roll on the surviving target.
  currentState = applyDamageThresholdPSR(currentState, targetId);

  return currentState;
}

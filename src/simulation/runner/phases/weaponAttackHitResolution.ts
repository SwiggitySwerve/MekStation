import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { consumeAmmo, isEnergyWeapon } from '@/utils/gameplay/ammoTracking';
import { resolveDamage } from '@/utils/gameplay/damage';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { determineHitLocation, isHeadHit } from '@/utils/gameplay/hitLocation';
import { createDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';

import type { IWeapon } from '../../ai/types';

import {
  DAMAGE_PSR_THRESHOLD,
  HEAD_HIT_DAMAGE_CAP,
} from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { createGameEvent } from './utils';
import { applyCritAmmoExplosions } from './weaponAttackAmmoExplosions';
import {
  emitCritEvents,
  toFiringArc,
  weaponTypeFromMountId,
} from './weaponAttackHelpers';

export function resolveWeaponHit(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  attackRoll: number;
  toHitNumber: number;
  firingArc: 'front' | 'left' | 'right' | 'rear';
  d6Roller: () => number;
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
    targetId,
    toHitNumber,
    unitId,
    weapon,
    weaponId,
    weaponsByUnit,
  } = options;

  const hitLocationResult = determineHitLocation(
    toFiringArc(firingArc),
    d6Roller,
  );
  const location = hitLocationResult.location;

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

  const attackerAfter = currentState.units[unitId];
  currentState = {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...attackerAfter,
        weaponsFiredThisTurn: [
          ...(attackerAfter.weaponsFiredThisTurn ?? []),
          weapon.id,
        ],
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
        attackerArc: firingArc,
      },
      unitId,
    ),
  );

  // Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution`
  // delta — Ammo Consumption and Explosion Events): when a
  // non-energy weapon fires, decrement its ammo bin and emit
  // `AmmoConsumed`. Energy weapons (laser / PPC / flamer / plasma)
  // skip this branch via `isEnergyWeapon`. When the unit has no
  // `ammoState` populated (synthetic test fixtures, legacy
  // session) the consumption is silently skipped — pre-P4
  // behaviour preserved.
  const attackerForAmmo = currentState.units[unitId];
  const ammoStateBefore = attackerForAmmo.ammoState;
  if (
    ammoStateBefore !== undefined &&
    Object.keys(ammoStateBefore).length > 0 &&
    !isEnergyWeapon(weapon.name)
  ) {
    const baseWeaponType = weaponTypeFromMountId(weapon.id);
    const ammoResult = consumeAmmo(ammoStateBefore, unitId, baseWeaponType);
    if (ammoResult) {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
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
            unitId,
            binId: ammoResult.event.binId,
            weaponType: ammoResult.event.weaponType,
            roundsConsumed: ammoResult.event.roundsConsumed,
            roundsRemaining: ammoResult.event.roundsRemaining,
          },
          unitId,
        ),
      );
    }
  }

  // Per `combat-resolution` delta + `damage-system` delta: walk the
  // ordered `locationDamages` chain and emit `DamageApplied` →
  // `LocationDestroyed` (when zeroed) → `TransferDamage` (when
  // residual flows). Mirrors the existing
  // `gameSessionAttackResolution.ts` emission pattern (the
  // session-layer twin of this runner phase) so replay consumers
  // see the same event sequence regardless of which engine
  // produced the trace.
  //
  // Side-torso → arm cascade: `applyDamageToLocation` zeroes the
  // corresponding arm's armor/structure and pushes it onto
  // `destroyedLocations`. We diff the pre/post-state sets so the
  // cascade-arm `LocationDestroyed` event carries the right
  // `cascadedTo` linkage AND its own follow-up event.
  const preDestroyedSet = new Set<string>(damageState.destroyedLocations);
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (loc) => !preDestroyedSet.has(loc),
  );

  const locationDamages = damageResult.result.locationDamages;
  for (let i = 0; i < locationDamages.length; i++) {
    const locDmg = locationDamages[i];
    const isTransferStep = i > 0;

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
      // Detect the side-torso → arm cascade off the post-damage
      // state diff. Only side torsos can cascade an arm.
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
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            location: locDmg.location,
            cascadedTo: cascadedArm,
            viaTransfer: isTransferStep,
          },
          unitId,
        ),
      );

      // Cascade arm gets its own LocationDestroyed event so
      // downstream consumers (UI, replay, metrics) don't have to
      // dedupe off the parent. `viaTransfer` is `false` because
      // this is a structural cascade — the arm wasn't reached by
      // residual damage flowing through the transfer chain, it
      // was carried off by its parent torso.
      if (cascadedArm) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.LocationDestroyed,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              unitId: targetId,
              location: cascadedArm,
              viaTransfer: false,
            },
            unitId,
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

  // Per `add-combat-fidelity-suite` Phase 3: emit the crit chain
  // produced by `resolveCriticalHits` (via `resolveDamage`). Each
  // resolved slot fans out into:
  //   `CriticalHit { component, count: 1 }` (per slot)
  //   → `CriticalHitResolved { slotIndex, componentType, ... }`
  //   → `ComponentDestroyed { componentType, slotIndex }` (when
  //     the slot is fully destroyed — always today)
  //   → `PSRTriggered` (gyro hit cascades)
  //   → `PilotHit` (cockpit / head hit)
  // Causal ordering: AFTER the full damage chain
  // (DamageApplied → LocationDestroyed → TransferDamage) and
  // BEFORE the `UnitDestroyed` event the runner emits below.
  let critUnitDestroyed = false;
  let critDestructionCause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'shutdown'
    | 'ct_destroyed'
    | 'head_destroyed'
    | undefined = undefined;
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

  // Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution`
  // delta — Heat Lifecycle / `ammo-explosion-system` delta —
  // Critical Hit on Loaded Bin): when the resolver flagged an
  // ammo slot as destroyed, emit `AmmoExplosion` and apply the
  // explosion damage to the bin's location. CASE / CASE-II flags
  // are not yet wired into `IUnitGameState` (deferred follow-up
  // documented in `notepad/issues.md`); without CASE, the
  // explosion damage cascades through the canonical transfer
  // chain via a second `resolveDamage` call. Causal order:
  //   `ComponentDestroyed { component: 'ammo' }` (already emitted
  //   by emitCritEvents)
  //   → `AmmoExplosion`
  //   → `DamageApplied` to bin location (cascade)
  //   → `LocationDestroyed` (if survives)
  //   → `TransferDamage` (if no CASE)
  //   → `UnitDestroyed` (if cascade reaches CT).
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
          currentState.turn,
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
          unitId,
        ),
      );
    }
  }

  // Emit `UnitDestroyed` once if the shot killed the target. The
  // cause is sourced (in priority order):
  //   1. crit-induced destruction (engine 3-hit → engine_destroyed,
  //      cockpit hit → pilot_death) — captured by the helper above.
  //   2. raw damage destruction (CT zeroed, head zeroed by armor
  //      depletion) — falls through with cause 'damage' and the
  //      `damageResult.result.destructionCause` enum.
  // Never emit a second `UnitDestroyed` if the target was already
  // destroyed before this shot (multi-mount fire after the kill
  // shot in the same volley).
  if (currentState.units[targetId].destroyed && !targetBefore.destroyed) {
    const fallbackCause = damageResult.result.destructionCause ?? 'damage';
    const cause:
      | 'damage'
      | 'ammo_explosion'
      | 'pilot_death'
      | 'engine_destroyed'
      | 'shutdown'
      | 'ct_destroyed'
      | 'head_destroyed' =
      critUnitDestroyed && critDestructionCause
        ? critDestructionCause
        : fallbackCause;
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        currentState.turn,
        GamePhase.WeaponAttack,
        {
          unitId: targetId,
          cause,
          killerUnitId: unitId,
        },
      ),
    );
  }

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
      currentState = {
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

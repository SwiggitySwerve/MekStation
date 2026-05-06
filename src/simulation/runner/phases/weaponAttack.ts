import {
  GameEventType,
  GamePhase,
  IAttackerState,
  IGameEvent,
  IGameState,
  ITargetState,
  IToHitModifier,
  RangeBracket,
} from '@/types/gameplay';
import { resolveDamage } from '@/utils/gameplay/damage';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { determineHitLocation, isHeadHit } from '@/utils/gameplay/hitLocation';
import { createDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';
import { calculateToHit } from '@/utils/gameplay/toHit';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  DAMAGE_PSR_THRESHOLD,
  DEFAULT_GUNNERY,
  HEAD_HIT_DAMAGE_CAP,
} from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import {
  createMinimalWeapon,
  getRangeBracket,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createD6Roller, createGameEvent } from './utils';

/**
 * Map a `RangeBracket` enum value to the literal subset accepted by the
 * `IAttackDeclaredPayload.range` field. `OutOfRange` is filtered upstream
 * (emits `AttackInvalid` instead) so it never reaches this helper.
 */
function bracketToPayloadRange(
  bracket: RangeBracket,
): 'short' | 'medium' | 'long' | 'extreme' {
  switch (bracket) {
    case RangeBracket.Short:
      return 'short';
    case RangeBracket.Medium:
      return 'medium';
    case RangeBracket.Long:
      return 'long';
    case RangeBracket.Extreme:
      return 'extreme';
    default:
      // Defensive: callers MUST filter `OutOfRange` before reaching this
      // helper; any unknown bracket falls back to `'long'` which is the
      // most pessimistic to-hit so a stray invariant violation is
      // visible in test output without crashing the run.
      return 'long';
  }
}

/**
 * Per `add-combat-fidelity-suite` Phase 2 (`combat-resolution` delta):
 * project the to-hit modifier list emitted by `calculateToHit` into the
 * `IToHitModifier` event-payload shape. The detail type carries a
 * narrower `source` union and an optional `description`; the payload
 * type only needs `name`, `value`, `source: string`. TypeScript's
 * structural typing accepts the wider value at the narrower position
 * here, but creating a fresh array keeps payloads decoupled from
 * detail-type evolution and avoids leaking optional fields into events.
 */
function modifiersToPayload(
  modifiers: ReadonlyArray<{
    readonly name: string;
    readonly value: number;
    readonly source: string;
  }>,
): readonly IToHitModifier[] {
  return modifiers.map((m) => ({
    name: m.name,
    value: m.value,
    source: m.source,
  }));
}

export function runAttackPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon
   * list, keyed by runner unit id. Threaded into `toAIUnitState` so the
   * AI sees real catalog loadouts (Atlas → 4× ML + AC/20 + LRM-20 +
   * SRM-6) rather than the synthetic single-medium-laser fallback.
   *
   * Per Phase 2 (this change): the runner now drives the per-mount
   * fire loop directly off `aiUnit.weapons`, so the same map flows
   * end-to-end into damage resolution. Each weapon mount produces a
   * paired `AttackDeclared` / `AttackResolved` event (and damage chain
   * on hit) per turn.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    invariantRunner,
    random,
    state,
    violations,
    weaponsByUnit,
  } = options;
  let currentState = { ...state, phase: GamePhase.WeaponAttack };
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);
  // The all-units snapshot is consumed as enemy candidates; threading
  // weaponsByUnit here keeps the threat-scoring code seeing real
  // weapon BV / range bands when the AI evaluates targets.
  const allAIUnits = Object.values(currentState.units).map((u) =>
    toAIUnitState(u, weaponsByUnit?.get(u.id)),
  );

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed || unit.shutdown) {
      continue;
    }

    const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
    const enemyUnits = allAIUnits.filter(
      (aiEnemy) =>
        !aiEnemy.destroyed &&
        currentState.units[aiEnemy.unitId].side !== unit.side,
    );
    const attackEvent = botPlayer.playAttackPhase(aiUnit, enemyUnits);

    if (!attackEvent) {
      continue;
    }

    const targetId = attackEvent.payload.targetId;
    const target = currentState.units[targetId];
    if (!target || target.destroyed) {
      continue;
    }

    // Per Phase 2 design D4: drive the per-mount fire loop off the AI's
    // declared weapon-id list so each weapon produces its own
    // `AttackDeclared` / `AttackResolved` pair. With hydration, this
    // yields up to 7 paired events per Atlas turn (one per mount that
    // passed the AI's heat budget). Without hydration, the AI emits a
    // single synthetic weapon id and this loop runs once.
    const declaredWeaponIds = attackEvent.payload.weapons;
    if (declaredWeaponIds.length === 0) {
      continue;
    }

    // Map AI-declared weapon ids back to the hydrated `IWeapon` mounts
    // so per-weapon damage / range / heat use the catalog data. Falls
    // back to the synthetic minimal weapon when hydration didn't
    // populate this unit (legacy preset / non-swarm callers).
    const hydratedWeapons = weaponsByUnit?.get(unitId);
    const weaponLookup = new Map<string, IWeapon>();
    if (hydratedWeapons) {
      for (const w of hydratedWeapons) {
        weaponLookup.set(w.id, w);
      }
    }

    for (const weaponId of declaredWeaponIds) {
      // Re-read attacker / target state per weapon — a previous mount
      // in this same loop may have destroyed the target (or, for
      // future heat-explosion paths, the attacker).
      const attackerNow = currentState.units[unitId];
      const targetNow = currentState.units[targetId];
      if (attackerNow.destroyed || attackerNow.shutdown) {
        break;
      }
      if (!targetNow || targetNow.destroyed) {
        // Target died mid-volley; subsequent mounts can't fire at it.
        break;
      }

      const weapon: IWeapon =
        weaponLookup.get(weaponId) ?? createMinimalWeapon(weaponId);

      const distance = hexDistance(attackerNow.position, targetNow.position);
      const rangeBracket = getRangeBracket(
        distance,
        weapon.shortRange,
        weapon.mediumRange,
        weapon.longRange,
      );
      if (rangeBracket === RangeBracket.OutOfRange) {
        // Per `combat-resolution` delta: out-of-range attacks emit
        // `AttackInvalid` BEFORE any to-hit roll, and no
        // `AttackDeclared` / `AttackResolved` follows for that mount.
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'OutOfRange' as const,
            },
            unitId,
          ),
        );
        continue;
      }

      const attackerState: IAttackerState = {
        // Per `add-encounter-swarm-harness` Phase 1: use the unit's real
        // gunnery so pilot skills drive hit probability, not just target
        // selection. Falls back to DEFAULT_GUNNERY for synthetic units
        // constructed via createMinimalUnitState() which does not
        // populate pilot skills.
        gunnery: attackerNow.gunnery ?? DEFAULT_GUNNERY,
        movementType: attackerNow.movementThisTurn,
        heat: attackerNow.heat,
        damageModifiers: [],
      };
      const targetState: ITargetState = {
        movementType: targetNow.movementThisTurn,
        hexesMoved: targetNow.hexesMovedThisTurn,
        prone: targetNow.prone ?? false,
        immobile: targetNow.shutdown ?? false,
        partialCover: false,
      };

      const toHitCalc = calculateToHit(
        attackerState,
        targetState,
        rangeBracket,
        distance,
        weapon.minRange,
      );

      const firingArc = calculateFiringArc(
        attackerNow.position,
        targetNow.position,
        targetNow.facing,
      );

      // Per `combat-resolution` delta: emit `AttackDeclared` BEFORE
      // the to-hit roll. Carries the weapon id, range bracket, firing
      // arc, and the full modifier breakdown so replay / metrics
      // consumers can show the GATOR math without recomputing it.
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.AttackDeclared,
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            attackerId: unitId,
            targetId,
            weapons: [weaponId],
            toHitNumber: toHitCalc.finalToHit,
            modifiers: modifiersToPayload(toHitCalc.modifiers),
            range: bracketToPayloadRange(rangeBracket),
            firingArc,
          },
          unitId,
        ),
      );

      const die1 = d6Roller();
      const die2 = d6Roller();
      const attackRoll = die1 + die2;
      const hit = attackRoll >= toHitCalc.finalToHit;

      if (!hit) {
        // Per `combat-resolution` delta: emit `AttackResolved` even on
        // misses so `AttackDeclared.length === AttackResolved.length`
        // is an end-of-match invariant. Hit-location is omitted on
        // miss (the field is optional on `IAttackResolvedPayload`).
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
              toHitNumber: toHitCalc.finalToHit,
              hit: false,
              heat: weapon.heat,
              attackerArc: firingArc,
            },
            unitId,
          ),
        );
        continue;
      }

      const hitLocationResult = determineHitLocation(firingArc, d6Roller);
      const location = hitLocationResult.location;

      let damage = weapon.damage;
      if (isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP) {
        damage = HEAD_HIT_DAMAGE_CAP;
      }

      const targetBefore = currentState.units[targetId];
      const damageState = buildDamageState(targetBefore);
      const damageResult = resolveDamage(damageState, location, damage);

      currentState = applyDamageResultToState(
        currentState,
        targetId,
        damageResult.state,
        damageResult.result,
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
            toHitNumber: toHitCalc.finalToHit,
            hit: true,
            location,
            damage,
            heat: weapon.heat,
            attackerArc: firingArc,
          },
          unitId,
        ),
      );

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

      if (currentState.units[targetId].destroyed && !targetBefore.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitDestroyed,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              unitId: targetId,
              cause: 'damage' as const,
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
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

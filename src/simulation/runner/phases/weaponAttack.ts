import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';
import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution/types';

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
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
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

/**
 * Per `add-combat-fidelity-suite` Phase 3 (`combat-resolution` delta):
 * translate the resolver's `CriticalHitEvent[]` stream into runner-side
 * `IGameEvent`s and append them to the events log.
 *
 * Causal ordering (per design D4):
 *   `CriticalHit` (per resolved slot, count=1 per BattleTech rule)
 *   → `CriticalHitResolved` (per slot resolved)
 *   → `ComponentDestroyed` (per component fully destroyed)
 *   → `PSRTriggered` (gyro hit cascades into pilot skill roll)
 *   → `PilotHit` (cockpit hit + head hit)
 *   → `UnitDestroyed` (engine 3-hit / cockpit / head destroyed)
 *
 * The first emit is `CriticalHit` itself — it is NOT in the resolver's
 * event stream (the resolver only emits `critical_hit_resolved` /
 * `psr_triggered` / `pilot_hit` / `unit_destroyed`). The runner adds
 * the `CriticalHit` event from the slot info directly so consumers
 * (KeyMomentDetector, replay UI, EventLogDisplay) can switch on the
 * `component` field carried in the payload.
 *
 * Engine destruction (cause: 'damage' from the resolver) is translated
 * to `'engine_destroyed'` per the snake_case taxonomy fixed by P0.5.
 *
 * Returns the number of game events appended.
 */
function emitCritEvents(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  critEvents: readonly CriticalHitEvent[];
  targetAlreadyDestroyed: boolean;
}): {
  unitDestroyed: boolean;
  destructionCause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'shutdown'
    | 'ct_destroyed'
    | 'head_destroyed'
    | undefined;
} {
  const {
    events,
    gameId,
    turn,
    attackerId,
    targetId,
    critEvents,
    targetAlreadyDestroyed,
  } = options;

  let unitDestroyed = false;
  let destructionCause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'shutdown'
    | 'ct_destroyed'
    | 'head_destroyed'
    | undefined = undefined;

  for (const evt of critEvents) {
    if (evt.type === 'critical_hit_resolved') {
      const p = evt.payload;
      // `CriticalHit` first (per slot, count=1) so KeyMomentDetector
      // and legacy `processCriticalHit` consumers fire on the right
      // event type. `location` is sourced from the resolver payload
      // (`p.location`) — that's the location the crit actually
      // landed on, which may differ from the attack's original hit
      // location when transfer-chain damage triggered the crit (e.g.
      // hit LA → LA destroyed → 3 damage to LT → crit on LT engine).
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHit,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            location: p.location,
            sourceUnitId: attackerId,
            component: p.componentType,
            count: 1,
          },
          attackerId,
        ),
      );

      // Then `CriticalHitResolved` carrying the slot index + effect
      // text. Per spec scenario "Gyro destruction event chain": this
      // payload carries the `slot` index and `component` enum value.
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHitResolved,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            location: p.location,
            slotIndex: p.slotIndex,
            componentType: p.componentType,
            componentName: p.componentName,
            effect: p.effect,
            destroyed: p.destroyed,
          },
          attackerId,
        ),
      );

      // `ComponentDestroyed` when the slot is fully destroyed (always
      // true today — the resolver only emits `critical_hit_resolved`
      // when a slot was actually struck). Carries the `componentType`
      // enum + `slotIndex` for UI dedupe.
      if (p.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.ComponentDestroyed,
            turn,
            GamePhase.WeaponAttack,
            {
              unitId: p.unitId,
              location: p.location,
              componentType: p.componentType,
              slotIndex: p.slotIndex,
              componentName: p.componentName,
            },
            attackerId,
          ),
        );
      }
      continue;
    }

    if (evt.type === 'psr_triggered') {
      const p = evt.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRTriggered,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            reason: p.reason,
            additionalModifier: p.additionalModifier,
            triggerSource: p.triggerSource,
          },
          attackerId,
        ),
      );
      continue;
    }

    if (evt.type === 'pilot_hit') {
      const p = evt.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            wounds: p.wounds,
            totalWounds: p.totalWounds,
            source: p.source,
            consciousnessCheckRequired: p.consciousnessCheckRequired,
            consciousnessCheckPassed: p.consciousnessCheckPassed,
          },
          attackerId,
        ),
      );
      continue;
    }

    if (evt.type === 'unit_destroyed') {
      // The crit-resolution layer encodes engine 3-hit destruction as
      // `cause: 'damage'`. Per P0.5's reconciled taxonomy + the spec
      // scenario "Engine-3-hit destruction triggers UnitDestroyed", the
      // runner translates that to `'engine_destroyed'` so downstream
      // consumers see the spec-correct enum without re-deriving it
      // from componentDamage.engineHits.
      const rawCause = evt.payload.cause;
      const mappedCause:
        | 'damage'
        | 'ammo_explosion'
        | 'pilot_death'
        | 'engine_destroyed'
        | 'shutdown'
        | 'ct_destroyed'
        | 'head_destroyed' =
        rawCause === 'damage'
          ? 'engine_destroyed'
          : rawCause === 'pilot_death'
            ? 'pilot_death'
            : (rawCause as
                | 'ammo_explosion'
                | 'shutdown'
                | 'ct_destroyed'
                | 'head_destroyed');

      // Capture for the caller; the actual `UnitDestroyed` game event
      // is emitted exactly once per shot by the caller (after damage
      // chain) so we don't double-emit when raw armor destruction +
      // crit destruction both fire on the same shot.
      unitDestroyed = true;
      destructionCause = mappedCause;
      continue;
    }
  }

  // The caller suppresses double `UnitDestroyed` if the target was
  // already destroyed by armor depletion before crits resolved.
  if (targetAlreadyDestroyed) {
    unitDestroyed = false;
    destructionCause = undefined;
  }

  return { unitDestroyed, destructionCause };
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
  /**
   * Per `add-combat-fidelity-suite` Phase 3: per-unit critical-slot
   * manifest, keyed by runner unit id. The runner persists post-crit
   * manifests across phase calls so subsequent shots see destroyed
   * slots and the slot-selection roll never re-rolls a
   * already-destroyed slot. When omitted (legacy callers) the runner
   * builds a default manifest per target on first crit.
   *
   * Mutated in place — the caller's `Map` instance is updated with the
   * post-resolution manifest after every shot. Callers that need
   * read-only invariants should pass a copy.
   */
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
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
    manifestsByUnit,
  } = options;
  let currentState = { ...state, phase: GamePhase.WeaponAttack };
  violations.push(...invariantRunner.runAll(currentState));

  // Per `add-combat-fidelity-suite` Phase 3: lazy default-manifest
  // helper. The first time a target takes structure damage we either
  // pull its already-persisted manifest from the side table, OR build
  // a default biped manifest and seed it. Subsequent shots reuse the
  // updated manifest from prior crit resolutions in the same phase.
  const getOrSeedManifest = (id: string): CriticalSlotManifest => {
    if (manifestsByUnit) {
      const existing = manifestsByUnit.get(id);
      if (existing) return existing;
      const seeded = buildDefaultCriticalSlotManifest();
      manifestsByUnit.set(id, seeded);
      return seeded;
    }
    return buildDefaultCriticalSlotManifest();
  };

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
      const targetComponentDamage: IComponentDamageState =
        targetBefore.componentDamage ?? {
          engineHits: 0,
          gyroHits: 0,
          sensorHits: 0,
          lifeSupport: 0,
          cockpitHit: false,
          actuators: {},
          weaponsDestroyed: [],
          heatSinksDestroyed: 0,
          jumpJetsDestroyed: 0,
        };
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
        });
        critUnitDestroyed = emitted.unitDestroyed;
        critDestructionCause = emitted.destructionCause;
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
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import { prepareAttackContext } from '@/engine/attackContext';
import {
  GameEventType,
  GamePhase,
  IAttackerState,
  IGameEvent,
  IGameState,
  IHexGrid,
  ITargetState,
  IToHitModifierDetail,
  RangeBracket,
} from '@/types/gameplay';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { isGroundToGroundGameAttack } from '@/utils/gameplay/groundToGround';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
  HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
  isRepresentedVehicleAttacker,
} from '@/utils/gameplay/hullDownRestrictions';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import { getHexCoverInfo } from '@/utils/gameplay/terrainCover';
import {
  calculateInterveningTerrainModifier,
  calculateTargetTerrainModifierFromHex,
  calculateToHit,
} from '@/utils/gameplay/toHit';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { DEFAULT_GUNNERY } from '../SimulationRunnerConstants';
import {
  createMinimalWeapon,
  getRangeBracket,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createD6Roller, createGameEvent } from './utils';
import {
  bracketToPayloadRange,
  modifiersToPayload,
} from './weaponAttackHelpers';
import { resolveWeaponHit } from './weaponAttackHitResolution';

export function runAttackPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  /**
   * The encounter hex grid. The weapon-attack phase reads target/intervening
   * terrain to derive target terrain modifiers and true partial cover.
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
    grid,
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

      if (hullDownLegWeaponBlockedReason(attackerNow.hullDown, weapon)) {
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
              reason: 'InvalidTarget' as const,
              details: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
            },
            unitId,
          ),
        );
        continue;
      }
      if (
        hullDownVehicleFrontWeaponBlockedReason(
          attackerNow.hullDown,
          isRepresentedVehicleAttacker({
            combatStateKind: attackerNow.combatState?.kind,
          }),
          weapon,
        )
      ) {
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
              reason: 'InvalidTarget' as const,
              details: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
            },
            unitId,
          ),
        );
        continue;
      }

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

      const directLos = grid
        ? calculateLOS(attackerNow.position, targetNow.position, grid)
        : undefined;
      const interveningTerrainModifier =
        directLos?.hasLOS === true
          ? calculateInterveningTerrainModifier(
              directLos.interveningTerrainEffects,
            )
          : null;
      // MegaMek keeps target-hex woods/smoke to-hit modifiers separate from
      // true partial cover hit-location behavior.
      const targetHex = grid?.hexes.get(
        `${targetNow.position.q},${targetNow.position.r}`,
      );
      const targetPartialCover = getHexCoverInfo(targetHex).partialCover;
      const targetTerrainModifier =
        calculateTargetTerrainModifierFromHex(targetHex);
      const damageModifiers = [
        interveningTerrainModifier,
        targetTerrainModifier,
      ].filter(
        (modifier): modifier is IToHitModifierDetail =>
          modifier !== null && modifier !== undefined,
      );
      const attackerState: IAttackerState = {
        // Per `add-encounter-swarm-harness` Phase 1: use the unit's real
        // gunnery so pilot skills drive hit probability, not just target
        // selection. Falls back to DEFAULT_GUNNERY for synthetic units
        // constructed via createMinimalUnitState() which does not
        // populate pilot skills.
        gunnery: attackerNow.gunnery ?? DEFAULT_GUNNERY,
        movementType: attackerNow.movementThisTurn,
        heat: attackerNow.heat,
        damageModifiers,
      };

      const targetState: ITargetState = {
        movementType: targetNow.movementThisTurn,
        hexesMoved: targetNow.hexesMovedThisTurn,
        prone: targetNow.prone ?? false,
        immobile: targetNow.shutdown ?? false,
        partialCover: targetPartialCover,
        hullDown: targetNow.hullDown === true,
      };

      const toHitCalc = calculateToHit(
        attackerState,
        targetState,
        rangeBracket,
        distance,
        isGroundToGroundGameAttack(attackerNow, targetNow)
          ? weapon.minRange
          : 0,
      );

      // Wave 8 PR-K7/K11: Quick-Sim indirect-fire dispatch via the
      // shared prepareAttackContext seam (single-weapon array — the
      // surrounding loop iterates weapons externally). Quick-Sim
      // hand-rolls AttackDeclared/AttackResolved (doesn't go through
      // declareAttack), so we unwrap the union back to a bare
      // IIndirectFireResolution for the existing penalty + emission code.
      const pre = grid
        ? prepareAttackContext(unitId, [weaponId], targetId, currentState, grid)
        : null;
      const indirectFireResolution =
        pre && pre.kind === 'indirect' ? pre.resolution : null;
      const indirectFirePenalty =
        indirectFireResolution &&
        indirectFireResolution.permitted &&
        indirectFireResolution.isIndirect
          ? indirectFireResolution.toHitPenalty
          : 0;
      const adjustedToHit = toHitCalc.finalToHit + indirectFirePenalty;

      const firingArc = calculateFiringArc(
        attackerNow.position,
        targetNow.position,
        targetNow.facing,
      );

      // Per `combat-resolution` delta: emit `AttackDeclared` BEFORE
      // the to-hit roll. Carries the weapon id, range bracket, firing
      // arc, and the full modifier breakdown so replay / metrics
      // consumers can show the GATOR math without recomputing it.
      const baseModifiers = modifiersToPayload(toHitCalc.modifiers);
      const declaredModifiers =
        indirectFirePenalty > 0
          ? [
              ...baseModifiers,
              {
                name: 'Indirect fire',
                value: indirectFirePenalty,
                source: 'other' as const,
              },
            ]
          : baseModifiers;
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
            toHitNumber: adjustedToHit,
            modifiers: declaredModifiers,
            range: bracketToPayloadRange(rangeBracket),
            firingArc,
          },
          unitId,
        ),
      );

      // Wave 8 PR-K7: emit IndirectFireSpotterSelected (basis='los') or
      // IndirectFireNarcOverride immediately after AttackDeclared when
      // indirect fire is in effect — mirrors PR-K4's declareAttack
      // dispatch so the event log + downstream consumers see the same
      // sequence regardless of which pipeline ran.
      if (
        indirectFireResolution &&
        indirectFireResolution.permitted &&
        indirectFireResolution.isIndirect
      ) {
        const basis = indirectFireResolution.basis;
        if (basis === 'narc' || basis === 'inarc') {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.IndirectFireNarcOverride,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                attackerId: unitId,
                spotterId: null,
                weaponId,
                targetHex: targetNow.position,
                toHitPenalty: indirectFirePenalty,
                basis,
              },
              unitId,
            ),
          );
        } else if (indirectFireResolution.spotterId) {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.IndirectFireSpotterSelected,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                attackerId: unitId,
                spotterId: indirectFireResolution.spotterId,
                weaponId,
                targetHex: targetNow.position,
                toHitPenalty: indirectFirePenalty,
                basis: 'los' as const,
              },
              unitId,
            ),
          );
        }
      }

      const die1 = d6Roller();
      const die2 = d6Roller();
      const attackRoll = die1 + die2;
      const hit = attackRoll >= adjustedToHit;

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
              // Wave 8 PR-K7: `toHitNumber` matches AttackDeclared so the
              // event-log + invariant pairs line up under indirect-fire.
              toHitNumber: adjustedToHit,
              hit: false,
              heat: weapon.heat,
              attackerArc: firingArc,
            },
            unitId,
          ),
        );
        continue;
      }

      currentState = resolveWeaponHit({
        currentState,
        events,
        gameId,
        unitId,
        targetId,
        weaponId,
        weapon,
        attackRoll,
        // Wave 8 PR-K7: use the indirect-fire-adjusted to-hit so the
        // AttackResolved.toHitNumber on hits matches AttackDeclared.
        toHitNumber: adjustedToHit,
        firingArc,
        partialCover: targetPartialCover,
        d6Roller,
        getOrSeedManifest,
        manifestsByUnit,
        weaponsByUnit,
      });
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

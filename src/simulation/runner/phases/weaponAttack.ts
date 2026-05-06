import {
  GameEventType,
  GamePhase,
  IAttackerState,
  IGameEvent,
  IGameState,
  ITargetState,
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
   * Damage resolution still uses `createMinimalWeapon` because P2
   * (weapon attack events) owns the per-mount fire-loop wiring;
   * Phase 1 only proves multi-weapon AttackDeclared payloads emit.
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

    const weapon = createMinimalWeapon(`${unitId}-weapon-1`);
    const distance = hexDistance(unit.position, target.position);
    const rangeBracket = getRangeBracket(
      distance,
      weapon.shortRange,
      weapon.mediumRange,
      weapon.longRange,
    );
    if (rangeBracket === RangeBracket.OutOfRange) {
      continue;
    }

    const attackerState: IAttackerState = {
      // Per `add-encounter-swarm-harness` Phase 1: use the unit's real gunnery
      // so pilot skills drive hit probability, not just target selection.
      // Falls back to DEFAULT_GUNNERY for synthetic units constructed via
      // createMinimalUnitState() which does not populate pilot skills.
      gunnery: unit.gunnery ?? DEFAULT_GUNNERY,
      movementType: unit.movementThisTurn,
      heat: unit.heat,
      damageModifiers: [],
    };
    const targetState: ITargetState = {
      movementType: target.movementThisTurn,
      hexesMoved: target.hexesMovedThisTurn,
      prone: target.prone ?? false,
      immobile: target.shutdown ?? false,
      partialCover: false,
    };

    const toHitCalc = calculateToHit(
      attackerState,
      targetState,
      rangeBracket,
      distance,
      weapon.minRange,
    );
    const die1 = d6Roller();
    const die2 = d6Roller();
    const attackRoll = die1 + die2;
    const hit = attackRoll >= toHitCalc.finalToHit;

    if (!hit) {
      continue;
    }

    const firingArc = calculateFiringArc(
      unit.position,
      target.position,
      target.facing,
    );
    const hitLocationResult = determineHitLocation(firingArc, d6Roller);
    const location = hitLocationResult.location;

    let damage = weapon.damage;
    if (isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP) {
      damage = HEAD_HIT_DAMAGE_CAP;
    }

    const targetBefore = currentState.units[targetId];
    const damageState = buildDamageState(targetBefore);
    const result = resolveDamage(damageState, location, damage);

    currentState = applyDamageResultToState(
      currentState,
      targetId,
      result.state,
      result.result,
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

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        currentState.turn,
        GamePhase.WeaponAttack,
        {
          unitId: targetId,
          location,
          damage,
          armorRemaining: currentState.units[targetId].armor[location] ?? 0,
          structureRemaining:
            currentState.units[targetId].structure[location] ?? 0,
          locationDestroyed: (
            currentState.units[targetId].destroyedLocations as string[]
          ).includes(location),
          sourceUnitId: unitId,
        },
        unitId,
      ),
    );

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

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

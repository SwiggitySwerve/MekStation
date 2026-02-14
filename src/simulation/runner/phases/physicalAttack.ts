import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { resolveDamage } from '@/utils/gameplay/damage';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { isHeadHit } from '@/utils/gameplay/hitLocation';
import {
  chooseBestPhysicalAttack,
  IPhysicalAttackInput,
  resolvePhysicalAttack,
} from '@/utils/gameplay/physicalAttacks';
import { createKickedPSR } from '@/utils/gameplay/pilotingSkillRolls';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
  HEAD_HIT_DAMAGE_CAP,
} from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { createD6Roller, createGameEvent } from './utils';

export function runPhysicalAttackPhase(options: {
  state: IGameState;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
}): IGameState {
  const { events, gameId, invariantRunner, random, state, violations } =
    options;
  let currentState = { ...state, phase: GamePhase.PhysicalAttack };
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed || unit.shutdown || (unit.prone ?? false)) {
      continue;
    }

    const enemies = Object.values(currentState.units).filter(
      (otherUnit) =>
        !otherUnit.destroyed &&
        otherUnit.side !== unit.side &&
        hexDistance(unit.position, otherUnit.position) <= 1,
    );
    if (enemies.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const weaponsFired = unit.weaponsFiredThisTurn ?? [];

    const bestAttack = chooseBestPhysicalAttack(
      DEFAULT_TONNAGE,
      DEFAULT_PILOTING,
      componentDamage,
      {
        attackerProne: unit.prone ?? false,
        weaponsFiredFromLeftArm: weaponsFired,
        weaponsFiredFromRightArm: weaponsFired,
        heat: unit.heat,
      },
    );

    if (!bestAttack || (bestAttack !== 'punch' && bestAttack !== 'kick')) {
      continue;
    }

    const targetIdx = random.nextInt(enemies.length);
    const target = enemies[targetIdx];

    const attackInput: IPhysicalAttackInput = {
      attackerTonnage: DEFAULT_TONNAGE,
      pilotingSkill: DEFAULT_PILOTING,
      componentDamage,
      attackType: bestAttack,
      arm: 'right',
      attackerProne: unit.prone ?? false,
      weaponsFiredFromArm: bestAttack === 'punch' ? weaponsFired : undefined,
      heat: unit.heat,
    };

    const result = resolvePhysicalAttack(attackInput, d6Roller);

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.PhysicalAttackDeclared,
        currentState.turn,
        GamePhase.PhysicalAttack,
        {
          attackerId: unitId,
          targetId: target.id,
          attackType: bestAttack,
          toHitNumber: result.toHitNumber,
        },
        unitId,
      ),
    );

    if (result.hit && result.targetDamage > 0 && result.hitLocation) {
      const targetBefore = currentState.units[target.id];
      const damageState = buildDamageState(targetBefore);

      let damage = result.targetDamage;
      if (isHeadHit(result.hitLocation) && damage > HEAD_HIT_DAMAGE_CAP) {
        damage = HEAD_HIT_DAMAGE_CAP;
      }

      const dmgResult = resolveDamage(damageState, result.hitLocation, damage);
      currentState = applyDamageResultToState(
        currentState,
        target.id,
        dmgResult.state,
        dmgResult.result,
      );
      const targetAfter = currentState.units[target.id];

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.DamageApplied,
          currentState.turn,
          GamePhase.PhysicalAttack,
          {
            unitId: target.id,
            location: result.hitLocation,
            damage,
            armorRemaining: targetAfter.armor[result.hitLocation] ?? 0,
            structureRemaining: targetAfter.structure[result.hitLocation] ?? 0,
            locationDestroyed: (
              targetAfter.destroyedLocations as string[]
            ).includes(result.hitLocation),
            sourceUnitId: unitId,
          },
          unitId,
        ),
      );

      if (targetAfter.destroyed && !targetBefore.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitDestroyed,
            currentState.turn,
            GamePhase.PhysicalAttack,
            {
              unitId: target.id,
              cause: 'damage' as const,
              killerUnitId: unitId,
            },
          ),
        );
      }

      if (result.targetPSR && !targetAfter.destroyed) {
        const existingPSRs = currentState.units[target.id].pendingPSRs ?? [];
        currentState = {
          ...currentState,
          units: {
            ...currentState.units,
            [target.id]: {
              ...currentState.units[target.id],
              pendingPSRs: [...existingPSRs, createKickedPSR(target.id)],
            },
          },
        };
      }
    }

    if (!result.hit && result.attackerPSR) {
      const attackerUnit = currentState.units[unitId];
      const existingPSRs = attackerUnit.pendingPSRs ?? [];
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...attackerUnit,
            pendingPSRs: [
              ...existingPSRs,
              {
                entityId: unitId,
                reason: `${bestAttack} missed`,
                additionalModifier: result.attackerPSRModifier,
                triggerSource: `${bestAttack}_miss`,
              },
            ],
          },
        },
      };
    }

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.PhysicalAttackResolved,
        currentState.turn,
        GamePhase.PhysicalAttack,
        {
          attackerId: unitId,
          targetId: target.id,
          attackType: bestAttack,
          toHitNumber: result.toHitNumber,
          hit: result.hit,
          damage: result.targetDamage,
          roll: result.roll,
        },
        unitId,
      ),
    );
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}

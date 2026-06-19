import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameEvent,
  IGameSession,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { consumeAmmo, isEnergyWeapon } from './ammoTracking';
import { type D6Roller, type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import {
  createAmmoConsumedEvent,
  createAttackInvalidEvent,
  createAttackResolvedEvent,
  createIndirectFireSpotterLostEvent,
} from './gameEvents';
import { resolveWeaponHit } from './gameSessionAttackResolution.hit';
import {
  buildWeaponAttackDataMap,
  firingArcToString,
} from './gameSessionAttackResolutionHelpers';
import { invalidateSameHexAttack } from './gameSessionAttackResolutionValidation';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';

type WeaponAttackDataWithToHit = {
  readonly toHitNumber?: number;
};

export function resolveAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller = rollDice,
  criticalD6Roller?: D6Roller,
): IGameSession {
  const payload = attackEvent.payload as IAttackDeclaredPayload;
  const { attackerId, targetId, weapons, weaponAttacks, toHitNumber } = payload;

  const weaponDataMap = buildWeaponAttackDataMap(weaponAttacks);

  let currentSession = session;

  const invalidSameHexSession = invalidateSameHexAttack(
    currentSession,
    attackerId,
    targetId,
  );
  if (invalidSameHexSession) {
    return invalidSameHexSession;
  }

  for (const weaponId of weapons) {
    const weaponData = weaponDataMap.get(weaponId);
    if (!weaponData) {
      logger.warn(
        `[resolveAttack] weaponAttacks payload missing entry for weapon "${weaponId}" on attacker "${attackerId}" — skipping. This indicates a malformed AttackDeclared event.`,
      );
      continue;
    }
    const weaponName = weaponData.weaponName;

    let ammoBinIdForResolved: string | null = null;
    const attackerStateForAmmo = currentSession.currentState.units[attackerId];
    const ammoState = attackerStateForAmmo?.ammoState ?? {};
    if (!isEnergyWeapon(weaponName)) {
      const ammoResult = consumeAmmo(ammoState, attackerId, weaponName);
      if (!ammoResult) {
        const invalidSequence = currentSession.events.length;
        const { turn: invalidTurn } = currentSession.currentState;
        currentSession = appendEvent(
          currentSession,
          createAttackInvalidEvent(
            currentSession.id,
            invalidSequence,
            invalidTurn,
            attackerId,
            targetId,
            'OutOfAmmo',
            weaponId,
            `No matching non-empty ammo bin for "${weaponName}"`,
          ),
        );
        continue;
      }
      const ammoSequence = currentSession.events.length;
      const ammoTurn = currentSession.currentState.turn;
      currentSession = appendEvent(
        currentSession,
        createAmmoConsumedEvent(
          currentSession.id,
          ammoSequence,
          ammoTurn,
          GamePhase.WeaponAttack,
          attackerId,
          ammoResult.event.binId,
          ammoResult.event.weaponType,
          ammoResult.event.roundsConsumed,
          ammoResult.event.roundsRemaining,
        ),
      );
      ammoBinIdForResolved = ammoResult.event.binId;
    }

    const weaponToHitNumber =
      (weaponData as WeaponAttackDataWithToHit).toHitNumber ?? toHitNumber;
    const attackRoll = diceRoller();
    let hit = attackRoll.total >= weaponToHitNumber;

    // Wave 8 PR-K6: spotter-liveness mid-resolution re-check.
    // Walk session.events backward to find the IndirectFireSpotterSelected
    // event matching this attacker + weapon (most-recent first). If the
    // elected spotter has been destroyed between attack declaration and
    // resolution, force the attack to auto-miss + emit IndirectFireSpotterLost.
    // Ammo is already consumed above (lines 80-119); heat carries on
    // AttackResolved.heat regardless of hit — both preserved.
    for (let i = currentSession.events.length - 1; i >= 0; i--) {
      const evt = currentSession.events[i];
      if (evt.type !== GameEventType.IndirectFireSpotterSelected) continue;
      const ifPayload = evt.payload as {
        attackerId: string;
        weaponId: string;
        spotterId: string;
        targetHex: { q: number; r: number };
        basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag';
      };
      if (
        ifPayload.attackerId !== attackerId ||
        ifPayload.weaponId !== weaponId
      ) {
        continue;
      }
      const spotterUnit =
        currentSession.currentState.units[ifPayload.spotterId];
      if (spotterUnit?.destroyed) {
        const lostSequence = currentSession.events.length;
        const lostTurn = currentSession.currentState.turn;
        currentSession = appendEvent(
          currentSession,
          createIndirectFireSpotterLostEvent(
            currentSession.id,
            lostSequence,
            lostTurn,
            attackerId,
            ifPayload.spotterId,
            weaponId,
            ifPayload.targetHex,
            ifPayload.basis,
            'Spotter destroyed before resolution',
            ammoBinIdForResolved ?? undefined,
          ),
        );
        hit = false;
      }
      break; // most-recent spotter selection found — stop walking
    }

    const { turn } = currentSession.currentState;

    const attackerState = currentSession.currentState.units[attackerId];
    const targetState = currentSession.currentState.units[targetId];
    const firingArc = calculateFiringArc(
      attackerState.position,
      targetState.position,
      targetState.facing,
    );
    const arcString = firingArcToString(firingArc);

    if (hit) {
      currentSession = resolveWeaponHit({
        session: currentSession,
        payload,
        attackerId,
        targetId,
        weaponId,
        weaponName,
        weaponData,
        attackRollTotal: attackRoll.total,
        weaponToHitNumber,
        firingArc,
        arcString,
        ammoBinIdForResolved,
        targetState,
        turn,
        diceRoller,
        criticalD6Roller,
      });
    } else {
      // Miss — attacker still generates firing heat per canonical rules
      // (TechManual p.68: heat is charged at weapon-firing time, not on
      // hit). Pass weaponData.heat so the heat phase accumulates correctly,
      // arcString so UI consumers see where the attack was fired from, and
      // ammoBinIdForResolved so replay / UI can still trace which bin the
      // shot drew from even on a miss.
      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        currentSession.events.length,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        weaponToHitNumber,
        false,
        undefined,
        undefined,
        weaponData.heat,
        arcString,
        ammoBinIdForResolved,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);
    }
  }

  return currentSession;
}

export function resolveAllAttacks(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  let currentSession = session;
  for (const event of session.events) {
    if (event.type !== GameEventType.AttackDeclared) continue;
    if (event.turn !== session.currentState.turn) continue;
    currentSession = resolveAttack(currentSession, event, diceRoller);
  }
  return currentSession;
}

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  FiringArc,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
  RangeBracket,
} from '@/types/gameplay';
import { getECMProtectedFlag } from '@/utils/gameplay/electronicWarfare';
import { hasLowProfile } from '@/utils/gameplay/quirkModifiers';
import { getClusterHitterBonus, hasSPA } from '@/utils/gameplay/spaModifiers';

import type { IWeapon } from '../../ai/types';

import { createD6Roller, createGameEvent } from './utils';
import { applyAMSInterceptionResult } from './weaponAttackAMSResolution';
import {
  isAttackerStealthArmorActive,
  isFlightPathAffectedByINarcECM,
} from './weaponAttackC3';
import {
  appendWeaponAttackInvalidEvent,
  isInactiveWeaponPhaseUnit,
  isUnavailableWeaponAttackTarget,
} from './weaponAttackContext';
import { iNarcHomingTeams } from './weaponAttackDesignatorMarkers';
import {
  getSelectedFiringMode,
  hasAmmoForValidShot,
  markWeaponFiredForHeat,
  markWeaponJammed,
  resolveSpecialProjectileHit,
  shouldJamOnNaturalTwo,
} from './weaponAttackFiringModes';
import { bracketToPayloadRange } from './weaponAttackHelpers';
import { resolveWeaponHit } from './weaponAttackHitResolution';
import { appendWeaponAttackIndirectFireEvents } from './weaponAttackIndirectFireEvents';
import { validateLineOfSightForAttack } from './weaponAttackLineOfSight';
import { resolveWeaponAttackMiss } from './weaponAttackMiss';
import { buildWeaponAttackModifierPayload } from './weaponAttackModifierPayload';

export function runWeaponAttackShots(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly selectedShotWeapons: readonly IWeapon[];
  readonly baseWeapon: IWeapon;
  readonly selectedMode: ReturnType<typeof getSelectedFiringMode>;
  readonly d6Roller: ReturnType<typeof createD6Roller>;
  readonly indirectFireResolution: ReturnType<
    typeof validateLineOfSightForAttack
  >['indirectFireResolution'];
  readonly targetHex: IGameState['units'][string]['position'];
  readonly indirectFirePenalty: number;
  readonly ammoWeaponType: string;
  readonly declaredAttack: ReturnType<typeof buildWeaponAttackModifierPayload>;
  readonly declaredWeaponModes?: Record<string, string>;
  readonly declaredSelectedAMSWeaponIds?: Record<string, string>;
  readonly rangeBracket: RangeBracket;
  readonly firingArc: FiringArc;
  readonly targetPartialCover: boolean;
  readonly damageableCoverProvider: ReturnType<
    typeof validateLineOfSightForAttack
  >['losResult'] extends infer T
    ? T extends { damageableCoverProviders: readonly (infer P)[] }
      ? P | undefined
      : undefined
    : undefined;
  readonly grid: IHexGrid | undefined;
  readonly optionalRules: readonly string[] | undefined;
  readonly getOrSeedManifest: (id: string) => CriticalSlotManifest;
  readonly manifestsByUnit: Map<string, CriticalSlotManifest> | undefined;
  readonly weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]> | undefined;
  readonly selectedAMSWeaponId: string | undefined;
  readonly distance: number;
}): IGameState {
  const {
    ammoWeaponType,
    baseWeapon,
    d6Roller,
    declaredAttack,
    declaredSelectedAMSWeaponIds,
    declaredWeaponModes,
    distance,
    events,
    firingArc,
    gameId,
    getOrSeedManifest,
    grid,
    indirectFirePenalty,
    indirectFireResolution,
    manifestsByUnit,
    optionalRules,
    rangeBracket,
    selectedAMSWeaponId,
    selectedMode,
    selectedShotWeapons,
    targetHex,
    targetId,
    targetPartialCover,
    weaponId,
    weaponsByUnit,
  } = options;
  const unitId = options.attackerId;
  let currentState = options.currentState;

  for (const shotWeapon of selectedShotWeapons) {
    const attackerBeforeShot = currentState.units[unitId];
    const targetBeforeShot = currentState.units[targetId];
    if (isInactiveWeaponPhaseUnit(attackerBeforeShot)) {
      break;
    }
    if (isUnavailableWeaponAttackTarget(targetBeforeShot)) {
      break;
    }

    if (!hasAmmoForValidShot(attackerBeforeShot, baseWeapon, selectedMode)) {
      appendWeaponAttackInvalidEvent({
        events,
        gameId,
        turn: currentState.turn,
        attackerId: unitId,
        targetId,
        weaponId,
        reason: 'OutOfAmmo',
      });
      break;
    }

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
          ...(declaredWeaponModes ? { weaponModes: declaredWeaponModes } : {}),
          ...(declaredSelectedAMSWeaponIds
            ? { selectedAMSWeaponIds: declaredSelectedAMSWeaponIds }
            : {}),
          toHitNumber: declaredAttack.toHitNumber,
          modifiers: declaredAttack.modifiers,
          range: bracketToPayloadRange(rangeBracket),
          firingArc,
        },
        unitId,
      ),
    );

    appendWeaponAttackIndirectFireEvents({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      weaponId,
      targetHex,
      toHitPenalty: indirectFirePenalty,
      indirectFireResolution,
    });

    const attackRoll = d6Roller() + d6Roller();
    const jammedOnNaturalTwo =
      attackRoll === 2 && shouldJamOnNaturalTwo(baseWeapon, selectedMode);
    if (jammedOnNaturalTwo) {
      currentState = markWeaponJammed(currentState, unitId, baseWeapon.id);
    }
    const hit = !jammedOnNaturalTwo && attackRoll >= declaredAttack.toHitNumber;

    if (!hit) {
      currentState = resolveWeaponAttackMiss({
        currentState,
        events,
        gameId,
        attackerId: unitId,
        targetId,
        weaponId,
        weapon: baseWeapon,
        shotHeat: shotWeapon.heat,
        ammoWeaponType,
        attackRoll,
        toHitNumber: declaredAttack.toHitNumber,
        firingArc,
      });
      continue;
    }

    currentState = markWeaponFiredForHeat(currentState, unitId, baseWeapon.id);
    const targetEcmProtected = currentState.electronicWarfare
      ? getECMProtectedFlag(
          attackerBeforeShot.position,
          attackerBeforeShot.side as string,
          unitId,
          targetBeforeShot.position,
          targetBeforeShot.side as string,
          targetId,
          currentState.electronicWarfare,
        )
      : undefined;
    const attackerStealthActive = isAttackerStealthArmorActive(
      attackerBeforeShot,
      currentState,
    );
    const flightPathEcmAffected =
      targetEcmProtected === true ||
      isFlightPathAffectedByINarcECM(attackerBeforeShot);

    const resolvedShot = resolveSpecialProjectileHit({
      baseWeapon,
      shotWeapon,
      selectedMode,
      d6Roller,
      clusterContext: {
        attackerTeamId: attackerBeforeShot.side as string,
        hasArtemisIV: baseWeapon.hasArtemisIV,
        hasPrototypeArtemisIV: baseWeapon.hasPrototypeArtemisIV,
        hasArtemisV: baseWeapon.hasArtemisV,
        attackerStealthActive,
        flightPathEcmAffected,
        targetLowProfile: hasLowProfile(targetBeforeShot.unitQuirks ?? []),
        isIndirectFire:
          indirectFireResolution?.permitted === true &&
          indirectFireResolution.isIndirect,
        targetNarcedBy: targetBeforeShot.narcedBy,
        targetINarcedBy: iNarcHomingTeams(targetBeforeShot),
        targetEcmProtected,
        clusterHitterSPA:
          getClusterHitterBonus(attackerBeforeShot.abilities ?? []) > 0,
        sandblasterSPA: hasSPA(
          attackerBeforeShot.abilities ?? [],
          'sandblaster',
        ),
        designatedWeaponType: attackerBeforeShot.designatedWeaponType,
        attackRange: distance,
        incomingAttackArc: firingArc,
        targetWeapons: weaponsByUnit?.get(targetId),
        targetAmmoState: targetBeforeShot.ammoState,
        unavailableAMSWeaponIds: targetBeforeShot.weaponsFiredThisTurn,
        selectedAMSWeaponId,
        optionalRules,
      },
    });

    currentState = applyAMSInterceptionResult({
      currentState,
      events,
      gameId,
      attackerId: unitId,
      targetId,
      incomingWeaponId: weaponId,
      interception: resolvedShot.amsInterception,
    });

    currentState = resolveWeaponHit({
      currentState,
      events,
      gameId,
      unitId,
      targetId,
      weaponId,
      weapon: resolvedShot.weapon,
      ammoWeaponType,
      projectileCount: resolvedShot.projectileCount,
      attackRoll,
      toHitNumber: declaredAttack.toHitNumber,
      firingArc,
      partialCover: targetPartialCover,
      damageableCoverProvider: options.damageableCoverProvider,
      grid,
      hullDown: targetBeforeShot.hullDown ?? false,
      d6Roller,
      optionalRules,
      getOrSeedManifest,
      manifestsByUnit,
      weaponsByUnit,
    });
  }

  return currentState;
}

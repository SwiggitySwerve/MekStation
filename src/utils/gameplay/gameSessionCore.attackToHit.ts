import type { IToHitModifier, IWeaponAttack } from '@/types/gameplay';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import type {
  IAttackParticipants,
  IDeclareAttackContext,
  IDeclaredAttackToHit,
  IndirectFireResolutionInput,
} from './gameSessionCore.attack.types';

import { hydrateC3NetworkStateFromGameState } from './c3Network';
import { getECMProtectedFlag } from './electronicWarfare';
import { isGroundToGroundGameAttack } from './groundToGround';
import {
  strictestApplicableMinimumRange,
  type IWeaponRangeProfile,
} from './range';
import { isSemiGuidedLRM } from './specialWeaponMechanics';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
  calculateToHitWithC3,
} from './toHit';

type EcmAwareAttackTargetUnit = IAttackParticipants['targetUnit'] & {
  readonly ecmProtected?: boolean;
};

function weaponRangeProfileFromAttack(
  weapon: IWeaponAttack | undefined,
): IWeaponRangeProfile | undefined {
  if (!weapon) return undefined;

  return {
    short: weapon.shortRange,
    medium: weapon.mediumRange,
    long: weapon.longRange,
    ...(weapon.extremeRange !== undefined
      ? { extreme: weapon.extremeRange }
      : {}),
    ...(weapon.minRange !== undefined ? { minimum: weapon.minRange } : {}),
  };
}

function normalizeIndirectFireResolution(
  input: IndirectFireResolutionInput,
): IIndirectFireResolution | undefined {
  if (!input) return undefined;
  if (!('kind' in input)) return input;
  return input.kind === 'indirect' ? input.resolution : undefined;
}

function buildSemiGuidedTagContext(
  context: IDeclareAttackContext,
  participants: IAttackParticipants,
  primaryWeapon: IWeaponAttack | undefined,
  indirectFireResolution: IIndirectFireResolution | undefined,
) {
  if (!primaryWeapon) return undefined;
  const targetEcmProtected = context.session.currentState.electronicWarfare
    ? getECMProtectedFlag(
        participants.attackerUnit.position,
        participants.attackerUnit.side as string,
        context.attackerId,
        participants.targetUnit.position,
        participants.targetUnit.side as string,
        context.targetId,
        context.session.currentState.electronicWarfare,
      )
    : (participants.targetUnit as EcmAwareAttackTargetUnit).ecmProtected;

  return {
    isSemiGuided:
      isSemiGuidedLRM(primaryWeapon.ammoType ?? '') ||
      isSemiGuidedLRM(primaryWeapon.weaponId) ||
      isSemiGuidedLRM(primaryWeapon.weaponName),
    targetTagDesignated: participants.targetUnit.tagDesignated,
    targetEcmProtected,
    isIndirectFire:
      indirectFireResolution?.permitted === true &&
      indirectFireResolution.isIndirect,
    indirectFirePenalty: indirectFireResolution?.toHitPenalty ?? 0,
  };
}

function buildBaseToHit(
  context: IDeclareAttackContext,
  participants: IAttackParticipants,
  indirectFireResolution: IIndirectFireResolution | undefined,
) {
  const primaryWeapon = context.weapons[0];
  const attackerToHitState = buildWeaponAttackAttackerToHitState(
    participants.attackerUnit,
    participants.attacker.gunnery,
    primaryWeapon
      ? {
          id: primaryWeapon.weaponId,
          name: primaryWeapon.weaponName,
          category: primaryWeapon.category,
        }
      : undefined,
    context.targetId,
    undefined,
    {
      calledShot: context.weapons.some((weapon) => weapon.calledShot === true),
      teammateCalledShot: context.weapons.some(
        (weapon) => weapon.teammateCalledShot === true,
      ),
    },
  );
  const targetToHitState = buildWeaponAttackTargetToHitState(
    participants.targetUnit,
    context.targetPartialCover,
  );
  const volleyMinimumRange = strictestApplicableMinimumRange(
    context.weapons.map((weapon) => weapon.minRange),
    context.range,
    isGroundToGroundGameAttack(
      participants.attackerUnit,
      participants.targetUnit,
    ),
  );
  const c3State = hydrateC3NetworkStateFromGameState(
    context.session.currentState,
  );
  const c3WeaponRangeProfile = weaponRangeProfileFromAttack(primaryWeapon);
  const semiGuidedTagContext = buildSemiGuidedTagContext(
    context,
    participants,
    primaryWeapon,
    indirectFireResolution,
  );
  const isDirectFire =
    indirectFireResolution?.permitted !== true ||
    indirectFireResolution.isIndirect !== true;

  if (isDirectFire && c3State && c3WeaponRangeProfile && primaryWeapon) {
    return calculateToHitWithC3(
      attackerToHitState,
      targetToHitState,
      context.rangeBracket,
      context.range,
      {
        attackerEntityId: context.attackerId,
        targetPosition: participants.targetUnit.position,
        weaponRangeProfile: c3WeaponRangeProfile,
        c3State,
      },
      volleyMinimumRange,
      primaryWeapon.weaponId,
      semiGuidedTagContext,
    );
  }

  return calculateToHit(
    attackerToHitState,
    targetToHitState,
    context.rangeBracket,
    context.range,
    volleyMinimumRange,
    primaryWeapon?.weaponId,
    semiGuidedTagContext,
  );
}

function addTerrainModifiers(
  modifiers: IToHitModifier[],
  context: IDeclareAttackContext,
): number {
  let total = 0;

  for (const terrainEffect of context.interveningTerrainEffects) {
    if (terrainEffect.modifier === 0) continue;
    total += terrainEffect.modifier;
    modifiers.push({
      name: 'Intervening terrain',
      value: terrainEffect.modifier,
      source: 'terrain',
      description: `${terrainEffect.terrain} at (${terrainEffect.coord.q}, ${terrainEffect.coord.r})`,
    });
  }

  if (context.targetTerrainModifier) {
    total += context.targetTerrainModifier.value;
    modifiers.push({
      name: context.targetTerrainModifier.name,
      value: context.targetTerrainModifier.value,
      source: context.targetTerrainModifier.source,
      description: context.targetTerrainModifier.description,
    });
  }

  return total;
}

function addIndirectFireModifier(
  modifiers: IToHitModifier[],
  indirectFireResolution: IIndirectFireResolution | undefined,
): number {
  if (
    !indirectFireResolution?.permitted ||
    !indirectFireResolution.isIndirect ||
    indirectFireResolution.toHitPenalty <= 0
  ) {
    return 0;
  }

  modifiers.push({
    name: 'Indirect fire',
    value: indirectFireResolution.toHitPenalty,
    source: 'other',
  });
  return indirectFireResolution.toHitPenalty;
}

export function buildDeclaredAttackToHit(
  context: IDeclareAttackContext,
  participants: IAttackParticipants,
): IDeclaredAttackToHit {
  const indirectFireResolution = normalizeIndirectFireResolution(
    context.indirectFireResolutionInput,
  );
  const toHitCalc = buildBaseToHit(
    context,
    participants,
    indirectFireResolution,
  );
  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
    description: modifier.description,
  }));
  const finalToHit =
    toHitCalc.finalToHit +
    addTerrainModifiers(modifiers, context) +
    addIndirectFireModifier(modifiers, indirectFireResolution);

  return { finalToHit, indirectFireResolution, modifiers };
}

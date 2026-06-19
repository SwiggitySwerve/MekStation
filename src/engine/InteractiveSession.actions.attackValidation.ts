import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import {
  INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  groundToAirIndirectWeaponBlockedReason,
} from '@/utils/gameplay/aerospace/groundToAir';
import {
  determineArc,
  firingArcProjectionLabel,
} from '@/utils/gameplay/firingArcs';
import { createAttackInvalidEvent } from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
} from '@/utils/gameplay/hullDownRestrictions';
import { semiGuidedTagIndirectFireBlockedReason } from '@/utils/gameplay/indirectFire';
import {
  calculateLOS,
  formatLOSBlockedDetails,
  lineOfSightOptionsFromOptionalRules,
} from '@/utils/gameplay/lineOfSight';
import { getWeaponRangeBracket } from '@/utils/gameplay/range';
import {
  representedWaterAttackInvalidState,
  weaponPassesRepresentedWaterAttackRules,
} from '@/utils/gameplay/underwaterAttacks';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';

import type { IApplyAttackInput } from './InteractiveSession.actions.attackTypes';

import { weaponCoversTargetArc } from './InteractiveSession.actions.attackRange';

export function appendInteractiveAttackInvalid(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  reason: IAttackInvalidPayload['reason'],
  details: string,
  weaponId?: string,
): IGameSession {
  return appendEvent(
    session,
    createAttackInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      attackerId,
      targetId,
      reason,
      weaponId,
      details,
    ),
  );
}

type TargetStatusUnit = IGameSession['currentState']['units'][string] & {
  readonly tagDesignated?: boolean;
  readonly ecmProtected?: boolean;
};

function semiGuidedTagAttackBlockedDetails({
  targetUnit,
  weaponAttacks,
  losDetails,
}: {
  readonly targetUnit: IGameSession['currentState']['units'][string];
  readonly weaponAttacks: readonly IWeaponAttack[];
  readonly losDetails: string;
}): string {
  const targetStatus = targetUnit as TargetStatusUnit;
  const indirectBlockedReason = weaponAttacks
    .map((weapon) =>
      semiGuidedTagIndirectFireBlockedReason({
        weaponId: weapon.weaponId,
        equipment: { isSemiGuided: false },
        targetStatus: {
          tagDesignated: targetStatus.tagDesignated === true,
          ecmProtected: targetStatus.ecmProtected === true,
        },
      }),
    )
    .find((reason): reason is string => reason !== undefined);

  return indirectBlockedReason
    ? `${indirectBlockedReason}; ${losDetails}`
    : losDetails;
}

function attackVisibilityBlockedReason(
  input: IApplyAttackInput,
  attackerUnit: IGameSession['currentState']['units'][string],
  targetUnit: IGameSession['currentState']['units'][string],
): string | undefined {
  if (input.session.config.fogOfWar !== true) return undefined;
  if (targetUnit.side === attackerUnit.side) return undefined;
  if (!input.grid) {
    return 'Target visibility cannot be verified without the battle map grid';
  }

  const attackerPlayerId =
    input.session.sideOwners?.[attackerUnit.side] ?? attackerUnit.side;
  const visibilityState = {
    ...input.session.currentState,
    sideOwners: input.session.sideOwners ?? null,
    grid: input.grid,
  };

  if (canPlayerSeeUnit(attackerPlayerId, input.targetId, visibilityState)) {
    return undefined;
  }

  return `Target ${input.targetId} is not currently visible to ${attackerUnit.side}`;
}

export function initialAttackInvalidSession({
  input,
  weaponAttacks,
  attackerUnit,
  targetUnit,
}: {
  readonly input: IApplyAttackInput;
  readonly weaponAttacks: readonly IWeaponAttack[];
  readonly attackerUnit?: IGameSession['currentState']['units'][string];
  readonly targetUnit?: IGameSession['currentState']['units'][string];
}): IGameSession | undefined {
  if (!attackerUnit) return input.session;
  if (!targetUnit || targetUnit.destroyed) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      `Target ${input.targetId} is not a live unit`,
      input.weaponIds[0],
    );
  }
  if (weaponAttacks.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      'No valid weapons selected for this attack',
      input.weaponIds[0],
    );
  }

  const visibilityBlockedReason = attackVisibilityBlockedReason(
    input,
    attackerUnit,
    targetUnit,
  );
  if (!visibilityBlockedReason) return undefined;

  return appendInteractiveAttackInvalid(
    input.session,
    input.attackerId,
    input.targetId,
    'TargetNotVisible',
    visibilityBlockedReason,
    input.weaponIds[0],
  );
}

export function rangeAndArcInvalidSession({
  input,
  targetArc,
  waterAttackInvalidState,
  hullDownLegWeaponInvalidWeapon,
  hullDownVehicleFrontWeaponInvalidWeapon,
  groundToAirIndirectInvalidWeapon,
  attackerUnit,
  attackerIsRepresentedVehicle,
}: {
  readonly input: IApplyAttackInput;
  readonly targetArc: ReturnType<typeof determineArc>['arc'];
  readonly waterAttackInvalidState:
    | ReturnType<typeof representedWaterAttackInvalidState>
    | undefined;
  readonly hullDownLegWeaponInvalidWeapon: IWeaponAttack | undefined;
  readonly hullDownVehicleFrontWeaponInvalidWeapon: IWeaponAttack | undefined;
  readonly groundToAirIndirectInvalidWeapon: IWeaponAttack | undefined;
  readonly attackerUnit: IGameSession['currentState']['units'][string];
  readonly attackerIsRepresentedVehicle: boolean;
}): IGameSession {
  if (waterAttackInvalidState) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      waterAttackInvalidState.reason,
      waterAttackInvalidState.details,
      input.weaponIds[0],
    );
  }
  if (hullDownLegWeaponInvalidWeapon) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      hullDownLegWeaponBlockedReason(
        attackerUnit.hullDown,
        hullDownLegWeaponInvalidWeapon,
      )!,
      hullDownLegWeaponInvalidWeapon.weaponId,
    );
  }
  if (hullDownVehicleFrontWeaponInvalidWeapon) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit.hullDown,
        attackerIsRepresentedVehicle,
        hullDownVehicleFrontWeaponInvalidWeapon,
      )!,
      hullDownVehicleFrontWeaponInvalidWeapon.weaponId,
    );
  }
  if (groundToAirIndirectInvalidWeapon) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
      groundToAirIndirectInvalidWeapon.weaponId,
    );
  }
  return appendInteractiveAttackInvalid(
    input.session,
    input.attackerId,
    input.targetId,
    'OutOfArc',
    `No selected weapons can fire into the ${firingArcProjectionLabel(targetArc)} arc`,
    input.weaponIds[0],
  );
}

export function noLineOfSightInvalidSession({
  input,
  attackerUnit,
  targetUnit,
  resolvedTargetHex,
  usableWeaponAttacks,
  indirectFireResolution,
}: {
  readonly input: IApplyAttackInput;
  readonly attackerUnit: IGameSession['currentState']['units'][string];
  readonly targetUnit: IGameSession['currentState']['units'][string];
  readonly resolvedTargetHex: IHexCoordinate;
  readonly usableWeaponAttacks: readonly IWeaponAttack[];
  readonly indirectFireResolution?: IIndirectFireResolution;
}): {
  readonly directLos?: ReturnType<typeof calculateLOS>;
  readonly invalidSession?: IGameSession;
} {
  if (!input.grid) return {};

  const directLos = calculateLOS(
    attackerUnit.position,
    resolvedTargetHex,
    input.grid,
    undefined,
    undefined,
    lineOfSightOptionsFromOptionalRules(input.session.config.optionalRules),
  );
  const indirectAllowed =
    indirectFireResolution?.permitted === true &&
    indirectFireResolution.isIndirect;
  if (directLos.hasLOS || indirectAllowed) return { directLos };

  const losDetails = formatLOSBlockedDetails(directLos);
  return {
    directLos,
    invalidSession: appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'NoLineOfSight',
      semiGuidedTagAttackBlockedDetails({
        targetUnit,
        weaponAttacks: usableWeaponAttacks,
        losDetails,
      }),
      input.weaponIds[0],
    ),
  };
}

export function classifyInteractiveAttackWeapons({
  input,
  weaponAttacks,
  attackRange,
  targetArc,
  attackerUnit,
  targetUnit,
  attackerIsRepresentedVehicle,
  resolvedTargetHex,
}: {
  readonly input: IApplyAttackInput;
  readonly weaponAttacks: readonly IWeaponAttack[];
  readonly attackRange: number;
  readonly targetArc: ReturnType<typeof determineArc>['arc'];
  readonly attackerUnit: IGameSession['currentState']['units'][string];
  readonly targetUnit: IGameSession['currentState']['units'][string];
  readonly attackerIsRepresentedVehicle: boolean;
  readonly resolvedTargetHex: IHexCoordinate;
}): {
  readonly weaponsInRange: readonly IWeaponAttack[];
  readonly weaponsInArc: readonly IWeaponAttack[];
  readonly usableWeaponAttacks: readonly IWeaponAttack[];
  readonly waterAttackInvalidState:
    | ReturnType<typeof representedWaterAttackInvalidState>
    | undefined;
  readonly groundToAirIndirectInvalidWeapon: IWeaponAttack | undefined;
  readonly hullDownLegWeaponInvalidWeapon: IWeaponAttack | undefined;
  readonly hullDownVehicleFrontWeaponInvalidWeapon: IWeaponAttack | undefined;
} {
  const weaponsInRange = weaponAttacks.filter(
    (weapon) =>
      getWeaponRangeBracket(attackRange, {
        short: weapon.shortRange,
        medium: weapon.mediumRange,
        long: weapon.longRange,
        extreme: weapon.extremeRange,
        minimum: weapon.minRange,
      }) !== RangeBracket.OutOfRange,
  );
  const weaponsInArc = weaponAttacks.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const rangeAndArcWeaponAttacks = weaponsInRange.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const waterAttackInvalidState = input.grid
    ? representedWaterAttackInvalidState({
        grid: input.grid,
        attackerPosition: attackerUnit.position,
        targetPosition: resolvedTargetHex,
        weapons: rangeAndArcWeaponAttacks,
      })
    : undefined;
  const groundToAirIndirectInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) =>
      groundToAirIndirectWeaponBlockedReason(attackerUnit, targetUnit, weapon),
  );
  const hullDownLegWeaponInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) => hullDownLegWeaponBlockedReason(attackerUnit.hullDown, weapon),
  );
  const hullDownVehicleFrontWeaponInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) =>
      hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      ),
  );
  const usableWeaponAttacks = rangeAndArcWeaponAttacks.filter(
    (weapon) =>
      (input.grid
        ? weaponPassesRepresentedWaterAttackRules({
            grid: input.grid,
            attackerPosition: attackerUnit.position,
            targetPosition: resolvedTargetHex,
            weapon,
          })
        : true) &&
      !hullDownLegWeaponBlockedReason(attackerUnit.hullDown, weapon) &&
      !hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      ) &&
      !groundToAirIndirectWeaponBlockedReason(attackerUnit, targetUnit, weapon),
  );

  return {
    weaponsInRange,
    weaponsInArc,
    usableWeaponAttacks,
    waterAttackInvalidState,
    groundToAirIndirectInvalidWeapon,
    hullDownLegWeaponInvalidWeapon,
    hullDownVehicleFrontWeaponInvalidWeapon,
  };
}

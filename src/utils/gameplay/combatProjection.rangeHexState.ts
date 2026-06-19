import type {
  IAttackInvalidPayload,
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  groundToAirIndirectWeaponBlockedReason,
} from './aerospace/groundToAir';
import {
  formatMinimumRangeReason,
  minimumRangePenaltyForWeapon,
  targetIdsAtHex,
} from './combatProjection.targeting';
import { weaponImpactForStatus } from './combatProjection.weaponOptions';
import { coordToKey } from './hexMath';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
} from './hullDownRestrictions';
import {
  getTargetCoverInfo,
  tokenUsesMekHorizontalCover,
  tokenUsesMekWaterCover,
} from './terrainCover';
import { calculateHullDownModifier } from './toHit';
import {
  representedWaterAttackInvalidState,
  weaponPassesRepresentedWaterAttackRules,
} from './underwaterAttacks';

type TargetContact = ReturnType<typeof targetIdsAtHex>[number];

interface IAttackInvalidState {
  readonly reason: IAttackInvalidPayload['reason'];
  readonly details: string;
}

export function deriveProjectedTargetState({
  targetUnitId,
  targetContacts,
  tokens,
  combatState,
}: {
  readonly targetUnitId?: string | null;
  readonly targetContacts: readonly TargetContact[];
  readonly tokens: readonly IUnitToken[];
  readonly combatState?: IGameState | null;
}) {
  const targetUnitIds = targetContacts.map((contact) => contact.unitId);
  const selectedTargetContact = targetUnitId
    ? targetContacts.find((contact) => contact.unitId === targetUnitId)
    : undefined;
  const shouldProjectSelectedTarget = selectedTargetContact !== undefined;
  const projectedTargetContact =
    (shouldProjectSelectedTarget ? selectedTargetContact : undefined) ??
    targetContacts.find((contact) => contact.attackable);
  const visibleTargetUnitIds = visibleTargetIds(
    targetContacts,
    selectedTargetContact,
    shouldProjectSelectedTarget,
  );
  const obscuredTargetUnitIds = obscuredTargetIds(
    targetContacts,
    selectedTargetContact,
    shouldProjectSelectedTarget,
  );
  const projectedTargetUnitId = projectedTargetContact?.attackable
    ? projectedTargetContact.unitId
    : undefined;
  const visibleTargetToken = projectedTargetUnitId
    ? tokens.find((token) => token.unitId === projectedTargetUnitId)
    : undefined;

  return {
    targetUnitIds,
    selectedTargetContact,
    shouldProjectSelectedTarget,
    projectedTargetUnitId,
    visibleTargetUnitIds,
    obscuredTargetUnitIds,
    visibleTargetToken,
    projectedTargetUnit: projectedTargetUnitId
      ? combatState?.units[projectedTargetUnitId]
      : undefined,
  };
}

function visibleTargetIds(
  contacts: readonly TargetContact[],
  selectedContact: TargetContact | undefined,
  selectedOnly: boolean,
): readonly string[] {
  if (selectedOnly) {
    return selectedContact?.attackable ? [selectedContact.unitId] : [];
  }
  return contacts
    .filter((contact) => contact.attackable)
    .map((contact) => contact.unitId);
}

function obscuredTargetIds(
  contacts: readonly TargetContact[],
  selectedContact: TargetContact | undefined,
  selectedOnly: boolean,
): readonly string[] {
  if (selectedOnly) {
    return selectedContact && !selectedContact.attackable
      ? [selectedContact.unitId]
      : [];
  }
  return contacts
    .filter((contact) => !contact.attackable)
    .map((contact) => contact.unitId);
}

export function createWeaponRuleBlocker({
  attackerUnit,
  projectedTargetUnit,
  attackerIsRepresentedVehicle,
}: {
  readonly attackerUnit?: IGameState['units'][string];
  readonly projectedTargetUnit?: IGameState['units'][string];
  readonly attackerIsRepresentedVehicle: boolean;
}): (weapon: IWeaponStatus) => string | undefined {
  return (weapon) =>
    hullDownLegWeaponBlockedReason(attackerUnit?.hullDown, weapon) ??
    hullDownVehicleFrontWeaponBlockedReason(
      attackerUnit?.hullDown,
      attackerIsRepresentedVehicle,
      weapon,
    ) ??
    (attackerUnit && projectedTargetUnit
      ? groundToAirIndirectWeaponBlockedReason(
          attackerUnit,
          projectedTargetUnit,
          weapon,
        )
      : undefined);
}

export function deriveWeaponEnvironmentInvalidState({
  grid,
  attackerPosition,
  targetPosition,
  targetContacts,
  weapons,
  attackerUnit,
  projectedTargetUnit,
  attackerIsRepresentedVehicle,
}: {
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly targetContacts: readonly TargetContact[];
  readonly weapons: readonly IWeaponStatus[];
  readonly attackerUnit?: IGameState['units'][string];
  readonly projectedTargetUnit?: IGameState['units'][string];
  readonly attackerIsRepresentedVehicle: boolean;
}): IAttackInvalidState | undefined {
  return (
    waterAttackInvalidState({
      grid,
      attackerPosition,
      targetPosition,
      targetContacts,
      weapons,
    }) ??
    hullDownLegInvalidState(weapons, attackerUnit) ??
    hullDownVehicleFrontInvalidState(
      weapons,
      attackerUnit,
      attackerIsRepresentedVehicle,
    ) ??
    groundToAirIndirectInvalidState(weapons, attackerUnit, projectedTargetUnit)
  );
}

function waterAttackInvalidState({
  grid,
  attackerPosition,
  targetPosition,
  targetContacts,
  weapons,
}: {
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly targetContacts: readonly TargetContact[];
  readonly weapons: readonly IWeaponStatus[];
}): IAttackInvalidState | undefined {
  return targetContacts.length > 0
    ? representedWaterAttackInvalidState({
        grid,
        attackerPosition,
        targetPosition,
        weapons,
      })
    : undefined;
}

function hullDownLegInvalidState(
  weapons: readonly IWeaponStatus[],
  attackerUnit?: IGameState['units'][string],
): IAttackInvalidState | undefined {
  const blockedReason = weapons
    .map((weapon) =>
      hullDownLegWeaponBlockedReason(attackerUnit?.hullDown, weapon),
    )
    .find(Boolean);
  if (!blockedReason) return undefined;
  return {
    reason: 'InvalidTarget',
    details: blockedReason,
  };
}

function hullDownVehicleFrontInvalidState(
  weapons: readonly IWeaponStatus[],
  attackerUnit: IGameState['units'][string] | undefined,
  attackerIsRepresentedVehicle: boolean,
): IAttackInvalidState | undefined {
  const blockedReason = weapons
    .map((weapon) =>
      hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit?.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      ),
    )
    .find(Boolean);
  if (!blockedReason) return undefined;
  return {
    reason: 'InvalidTarget',
    details: blockedReason,
  };
}

function groundToAirIndirectInvalidState(
  weapons: readonly IWeaponStatus[],
  attackerUnit: IGameState['units'][string] | undefined,
  projectedTargetUnit: IGameState['units'][string] | undefined,
): IAttackInvalidState | undefined {
  if (!attackerUnit || !projectedTargetUnit) return undefined;
  const blocked = weapons.some((weapon) =>
    groundToAirIndirectWeaponBlockedReason(
      attackerUnit,
      projectedTargetUnit,
      weapon,
    ),
  );
  if (!blocked) return undefined;
  return {
    reason: 'InvalidTarget',
    details: INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  };
}

export function deriveAvailableWeaponState({
  grid,
  attackerPosition,
  targetPosition,
  weapons,
  weaponRuleBlockedReason,
}: {
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly weapons: readonly IWeaponStatus[];
  readonly weaponRuleBlockedReason: (
    weapon: IWeaponStatus,
  ) => string | undefined;
}) {
  const availableWeapons = weapons.filter(
    (weapon) =>
      weaponPassesRepresentedWaterAttackRules({
        grid,
        attackerPosition,
        targetPosition,
        weapon,
      }) && !weaponRuleBlockedReason(weapon),
  );
  const availableWeaponImpacts = availableWeapons.map(weaponImpactForStatus);

  return {
    availableWeapons,
    weaponIdsAvailable: availableWeapons.map((weapon) => weapon.id),
    availableWeaponImpacts,
    availableWeaponHeat: availableWeaponImpacts.reduce(
      (sum, impact) => sum + impact.heat,
      0,
    ),
    availableWeaponDamage: availableWeaponImpacts.reduce(
      (sum, impact) => sum + impact.damage,
      0,
    ),
  };
}

export function deriveTargetCoverState({
  grid,
  attackerPosition,
  targetPosition,
  visibleTargetToken,
  projectedTargetUnit,
}: {
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly visibleTargetToken?: IUnitToken;
  readonly projectedTargetUnit?: IGameState['units'][string];
}) {
  const targetCover = getTargetCoverInfo(
    grid,
    attackerPosition,
    targetPosition,
    {
      horizontalCoverEligible: visibleTargetToken
        ? tokenUsesMekHorizontalCover(visibleTargetToken)
        : true,
      targetHexWaterCoverEligible: visibleTargetToken
        ? tokenUsesMekWaterCover(visibleTargetToken)
        : true,
    },
  );
  const targetHullDown = projectedTargetUnit?.hullDown === true;
  const targetHullDownModifier = calculateHullDownModifier(
    targetHullDown,
    targetCover.partialCover,
  );

  return {
    targetCover,
    targetHullDown,
    targetHullDownModifier,
    targetHullDownReason: targetHullDown
      ? (targetHullDownModifier?.description ??
        'Target is hull-down, but MegaMek applies the hull-down modifier only when LOS/terrain cover is present')
      : undefined,
  };
}

export function deriveMinimumRangeState({
  weapons,
  distance,
  minimumRangeApplies,
}: {
  readonly weapons: readonly IWeaponStatus[];
  readonly distance: number;
  readonly minimumRangeApplies: boolean;
}) {
  const minimumRangePenalty = weapons.reduce(
    (strictestPenalty, weapon) =>
      Math.max(
        strictestPenalty,
        minimumRangePenaltyForWeapon(weapon, distance, minimumRangeApplies),
      ),
    0,
  );
  const minimumRangeWeaponIds = weapons
    .filter(
      (weapon) =>
        minimumRangePenaltyForWeapon(weapon, distance, minimumRangeApplies) ===
        minimumRangePenalty,
    )
    .map((weapon) => weapon.id);

  return {
    minimumRangePenalty,
    minimumRangeWeaponIds,
    minimumRangeReason: formatMinimumRangeReason(
      minimumRangePenalty,
      minimumRangeWeaponIds,
    ),
  };
}

export function targetTerrainHex(
  grid: IHexGrid,
  targetPosition: IHexCoordinate,
) {
  return grid.hexes.get(coordToKey(targetPosition));
}

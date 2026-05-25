import type { IHexCoordinate, IUnitToken } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { TokenUnitType } from '@/types/gameplay';

import type { IsometricTerrainOcclusionInfo } from './projection';

export function displayPositionForSceneToken(
  token: IUnitToken,
): IHexCoordinate {
  if (token.fogStatus === 'lastKnown' && token.lastKnownPosition) {
    return token.lastKnownPosition;
  }
  return token.position;
}

export function joinNonEmpty(
  values: readonly string[] | undefined,
): string | undefined {
  return values && values.length > 0 ? values.join('|') : undefined;
}

export function formatIsometricSceneHexLabel(
  hex: IHexCoordinate,
  projection: ITacticalMapHexProjection | undefined,
): string | undefined {
  if (!projection) return undefined;

  const blocked =
    projection.blockedReasons.length > 0
      ? `; blocked ${projection.blockedReasons.join(', ')}`
      : '';
  const explanation = projection.explanation
    ? `; ${projection.explanation}`
    : '';

  return `Isometric hex ${hex.q},${hex.r}; projection ${projection.status} ${projection.intent}; movement ${projection.movementStatus}; combat ${projection.combatStatus}${blocked}${explanation}`;
}

export function formatIsometricSceneTokenLabel({
  token,
  displayPosition,
  occlusionInfo,
  foregroundBoost,
  combatProjectionValidTarget,
}: {
  readonly token: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly occlusionInfo: IsometricTerrainOcclusionInfo | undefined;
  readonly foregroundBoost: boolean;
  readonly combatProjectionValidTarget: boolean | undefined;
}): string {
  const sourcePosition = token.position;
  const parts = [
    `Isometric token ${formatSceneTokenName(token)}`,
    `id ${token.unitId}`,
    `type ${token.unitType}`,
    `map position ${formatHexKey(displayPosition)}`,
    `source position ${formatHexKey(sourcePosition)}`,
    `facing ${token.facing}`,
    ...formatIsometricSceneTokenTypeParts(token),
    token.fogStatus ? `visibility ${token.fogStatus}` : '',
    combatProjectionValidTarget === undefined
      ? ''
      : `combat projection target ${combatProjectionValidTarget ? 'valid' : 'blocked'}`,
    foregroundBoost ? 'foreground readability boost' : '',
    occlusionInfo ? `terrain occlusion ${occlusionInfo.reason}` : '',
  ].filter(Boolean);

  return parts.join('; ');
}

function formatSceneTokenName(token: IUnitToken): string {
  return token.fogStatus === 'hidden' ? 'Hidden contact' : token.name;
}

function formatHexKey(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

function formatIsometricSceneTokenTypeParts(
  token: IUnitToken,
): readonly string[] {
  switch (token.unitType) {
    case TokenUnitType.Vehicle:
      return [
        token.vehicleMotionType ? `motion ${token.vehicleMotionType}` : '',
        token.altitude !== undefined ? `altitude ${token.altitude}` : '',
      ].filter(Boolean);
    case TokenUnitType.Aerospace:
      return [
        `altitude ${token.altitude}`,
        token.velocity !== undefined ? `velocity ${token.velocity}` : '',
      ].filter(Boolean);
    case TokenUnitType.BattleArmor:
      return [
        token.mountedOn ? `mounted on ${token.mountedOn}` : '',
        `troopers ${token.trooperCount}`,
      ].filter(Boolean);
    case TokenUnitType.Infantry:
      return [`troopers ${token.infantryCount}`];
    case TokenUnitType.ProtoMech:
      return [`protos ${token.protoCount}`];
    case TokenUnitType.Mech:
      return [];
  }
}

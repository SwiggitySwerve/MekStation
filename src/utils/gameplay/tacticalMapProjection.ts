import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import { coordToKey, hexEquals } from './hexMath';

export type TacticalMapHexProjectionIntent =
  | 'terrain'
  | 'selected'
  | 'path'
  | 'movement'
  | 'combat'
  | 'movement-combat';

export type TacticalMapHexProjectionStatus =
  | 'neutral'
  | 'legal'
  | 'blocked'
  | 'mixed';

export interface ITacticalMapHexProjection {
  readonly hex: IHexCoordinate;
  readonly key: string;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly pathIndex?: number;
  readonly inAttackRange: boolean;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly explanation: string;
}

export interface BuildTacticalMapHexProjectionLookupInput {
  readonly hexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly movementRangeLookup: ReadonlyMap<string, IMovementRangeHex>;
  readonly combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>;
  readonly selectedHex?: IHexCoordinate | null;
  readonly hoveredHex?: IHexCoordinate | null;
  readonly highlightPathIndexLookup?: ReadonlyMap<string, number>;
  readonly legacyAttackRangeLookup?: ReadonlySet<string>;
}

export function buildTacticalMapHexProjectionLookup({
  hexes,
  terrainLookup,
  movementRangeLookup,
  combatRangeLookup,
  selectedHex = null,
  hoveredHex = null,
  highlightPathIndexLookup = new Map(),
  legacyAttackRangeLookup = new Set(),
}: BuildTacticalMapHexProjectionLookupInput): ReadonlyMap<
  string,
  ITacticalMapHexProjection
> {
  const projections = new Map<string, ITacticalMapHexProjection>();

  for (const hex of hexes) {
    const key = coordToKey(hex);
    projections.set(
      key,
      buildTacticalMapHexProjection({
        hex,
        terrain: terrainLookup.get(key) ?? defaultHexTerrain(hex),
        movement: movementRangeLookup.get(key),
        combat: combatRangeLookup.get(key),
        isSelected: selectedHex ? hexEquals(hex, selectedHex) : false,
        isHovered: hoveredHex ? hexEquals(hex, hoveredHex) : false,
        pathIndex: highlightPathIndexLookup.get(key),
        inLegacyAttackRange: legacyAttackRangeLookup.has(key),
      }),
    );
  }

  return projections;
}

export function buildTacticalMapHexProjection({
  hex,
  terrain,
  movement,
  combat,
  isSelected,
  isHovered,
  pathIndex,
  inLegacyAttackRange,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly pathIndex?: number;
  readonly inLegacyAttackRange: boolean;
}): ITacticalMapHexProjection {
  const inAttackRange = inLegacyAttackRange || Boolean(combat?.inRange);
  const blockedReasons = collectBlockedReasons(movement, combat);
  const intent = deriveProjectionIntent({
    isSelected,
    pathIndex,
    movement,
    combat,
    inAttackRange,
  });
  const status = deriveProjectionStatus({
    movement,
    combat,
    inAttackRange,
  });

  return {
    hex,
    key: coordToKey(hex),
    terrain,
    movement,
    combat,
    isSelected,
    isHovered,
    pathIndex,
    inAttackRange,
    intent,
    status,
    blockedReasons,
    explanation: formatProjectionExplanation({
      hex,
      terrain,
      movement,
      combat,
      intent,
      status,
      blockedReasons,
    }),
  };
}

function defaultHexTerrain(hex: IHexCoordinate): IHexTerrain {
  return {
    coordinate: hex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  };
}

function deriveProjectionIntent({
  isSelected,
  pathIndex,
  movement,
  combat,
  inAttackRange,
}: {
  readonly isSelected: boolean;
  readonly pathIndex?: number;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
}): TacticalMapHexProjectionIntent {
  if (isSelected) return 'selected';
  if (pathIndex !== undefined) return 'path';
  if (movement && (combat?.hasTarget || inAttackRange)) {
    return 'movement-combat';
  }
  if (movement) return 'movement';
  if (combat?.hasTarget || inAttackRange) return 'combat';
  return 'terrain';
}

function deriveProjectionStatus({
  movement,
  combat,
  inAttackRange,
}: {
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
}): TacticalMapHexProjectionStatus {
  const legal =
    Boolean(movement?.reachable) ||
    Boolean(combat?.attackable) ||
    (inAttackRange && !combat?.hasTarget);
  const blocked =
    (movement ? !movement.reachable : false) ||
    (combat ? combat.hasTarget && !combat.attackable : false);

  if (legal && blocked) return 'mixed';
  if (blocked) return 'blocked';
  if (legal) return 'legal';
  return 'neutral';
}

function collectBlockedReasons(
  movement: IMovementRangeHex | undefined,
  combat: ICombatRangeHex | undefined,
): readonly string[] {
  const reasons = [
    movement?.movementInvalidDetails,
    movement?.blockedReason,
    movement?.movementInvalidReason,
    combat?.attackInvalidDetails,
    combat?.blockedReason,
    combat?.visibilityBlockedReason,
    combat?.lineOfSightBlockerReason,
    combat?.attackInvalidReason,
  ].filter((reason): reason is string => Boolean(reason));

  return Array.from(new Set(reasons));
}

function formatProjectionExplanation({
  hex,
  terrain,
  movement,
  combat,
  intent,
  status,
  blockedReasons,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly blockedReasons: readonly string[];
}): string {
  const terrainTypes =
    terrain.features.length === 0
      ? TerrainType.Clear
      : terrain.features.map((feature) => feature.type).join(',');
  const parts = [
    `Hex ${hex.q},${hex.r}`,
    `intent ${intent}`,
    `status ${status}`,
    `terrain ${terrainTypes}`,
    `elevation ${terrain.elevation}`,
  ];

  if (movement) {
    parts.push(
      `${formatMovementType(movement.movementType)} ${
        movement.reachable ? 'reachable' : 'blocked'
      } ${movement.mpCost} MP`,
    );
    const movementTypeName = String(movement.movementType).toLowerCase();
    if (movement.movementMode && movement.movementMode !== movementTypeName) {
      parts.push(`mode ${movement.movementMode}`);
    }
    if (movement.terrainCost !== undefined) {
      parts.push(`terrain cost ${formatSignedCost(movement.terrainCost)}`);
    }
    if (
      movement.elevationDelta !== undefined ||
      movement.elevationCost !== undefined
    ) {
      const elevationParts: string[] = [];
      if (movement.elevationDelta !== undefined) {
        elevationParts.push(
          `delta ${formatSignedCost(movement.elevationDelta)}`,
        );
      }
      if (movement.elevationCost !== undefined) {
        elevationParts.push(`cost ${formatSignedCost(movement.elevationCost)}`);
      }
      parts.push(`elevation ${elevationParts.join(' ')}`);
    }
    if (movement.heatGenerated !== undefined) {
      parts.push(`heat ${formatSignedCost(movement.heatGenerated)}`);
    }
    if (movement.path && movement.path.length > 1) {
      const stepCount = movement.path.length - 1;
      parts.push(`path ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`);
    }
    if (movement.standUpRequired) {
      const standUpMode = movement.standUpMode ?? 'normal';
      const standUpCost =
        movement.standUpCost === undefined
          ? ''
          : ` ${formatSignedCost(movement.standUpCost)} MP`;
      parts.push(`stand-up ${standUpMode}${standUpCost}`);
      if (movement.standUpPsrImpossibleReason) {
        parts.push(
          `stand-up impossible ${movement.standUpPsrImpossibleReason}`,
        );
      } else if (movement.standUpPsrRequired) {
        const psrReason = movement.standUpPsrReason
          ? `${movement.standUpPsrReason} `
          : '';
        const target =
          movement.standUpPsrTargetNumber === undefined
            ? 'unknown'
            : Number.isFinite(movement.standUpPsrTargetNumber)
              ? `${movement.standUpPsrTargetNumber}`
              : 'impossible';
        parts.push(`stand-up PSR ${psrReason}TN ${target}`);
      }
      if (
        movement.standUpPsrModifier !== undefined &&
        movement.standUpPsrModifier !== 0
      ) {
        parts.push(
          `stand-up PSR modifier ${formatSignedCost(
            movement.standUpPsrModifier,
          )}`,
        );
      }
      if (movement.standUpPsrModifierDetails?.length) {
        parts.push(
          `stand-up modifiers ${movement.standUpPsrModifierDetails.join('; ')}`,
        );
      }
    }
  }
  if (combat) {
    parts.push(
      `combat ${combat.rangeBracket} ${combat.distance} hexes LOS ${combat.losState}`,
    );
    parts.push(`arc ${combat.firingArc}`);
    if (combat.hasTarget && combat.targetUnitIds.length > 0) {
      parts.push(`targets ${combat.targetUnitIds.join(',')}`);
    }
    if (combat.targetVisibilityState !== 'none') {
      parts.push(`visibility ${combat.targetVisibilityState}`);
    }
    if (combat.weaponIdsAvailable.length > 0) {
      parts.push(`weapons ${combat.weaponIdsAvailable.join(',')}`);
    } else if (
      combat.weaponIdsInRange.length > 0 ||
      combat.weaponIdsInArc.length > 0
    ) {
      parts.push('weapons none available');
    }
    if (combat.targetCoverModifier > 0) {
      parts.push(
        combat.targetCoverReason ??
          `cover ${combat.targetCoverLevel} +${combat.targetCoverModifier}`,
      );
    }
    if (combat.minimumRangeReason) {
      parts.push(combat.minimumRangeReason);
    }
    if (combat.toHitNumber !== undefined) {
      parts.push(
        combat.toHitReason ?? `to-hit target number ${combat.toHitNumber}`,
      );
    }
    if (combat.indirectFireReason) {
      parts.push(combat.indirectFireReason);
    }
  }
  if (blockedReasons.length > 0) {
    parts.push(`blocked ${blockedReasons.join('; ')}`);
  }

  return parts.join('; ');
}

function formatMovementType(movementType: string): string {
  if (movementType.length === 0) return movementType;
  return `${movementType[0].toUpperCase()}${movementType.slice(1)}`;
}

function formatSignedCost(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

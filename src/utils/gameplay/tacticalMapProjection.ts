import type {
  ICombatRangeHex,
  ICombatLineOfSightBlocker,
  ICombatWeaponRangeOption,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IMovementRangeModeOption,
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

export type TacticalMapMovementProjectionStatus =
  | 'none'
  | 'legal'
  | 'blocked'
  | 'mixed';

export type TacticalMapCombatProjectionStatus =
  | 'none'
  | 'range-only'
  | 'attackable'
  | 'blocked'
  | 'mixed';

export type TacticalMapProjectionSourceKind =
  | 'official-battletech'
  | 'megamek'
  | 'mekhq'
  | 'mekstation';

export type TacticalMapProjectionSourceChannel =
  | 'terrain-elevation'
  | 'movement'
  | 'combat'
  | 'los-blocker'
  | 'legacy-attack-range';

export interface ITacticalMapProjectionSourceReference {
  readonly channel: TacticalMapProjectionSourceChannel;
  readonly kind: TacticalMapProjectionSourceKind;
  readonly label: string;
  readonly detail?: string;
}

export interface ITacticalMapCombatLosBlockerReference {
  readonly targetHex: IHexCoordinate;
  readonly targetUnitIds: readonly string[];
  readonly losState: ICombatRangeHex['losState'];
  readonly blocker: ICombatLineOfSightBlocker;
}

export interface ITacticalMapHexProjection {
  readonly hex: IHexCoordinate;
  readonly key: string;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly pathIndex?: number;
  readonly inAttackRange: boolean;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly movementStatus: TacticalMapMovementProjectionStatus;
  readonly combatStatus: TacticalMapCombatProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly sourceReferences: readonly ITacticalMapProjectionSourceReference[];
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
  const combatLosBlockerRefsByKey =
    buildCombatLosBlockerReferenceLookup(combatRangeLookup);

  for (const hex of hexes) {
    const key = coordToKey(hex);
    projections.set(
      key,
      buildTacticalMapHexProjection({
        hex,
        terrain: terrainLookup.get(key) ?? defaultHexTerrain(hex),
        movement: movementRangeLookup.get(key),
        combat: combatRangeLookup.get(key),
        combatLosBlockerFor: combatLosBlockerRefsByKey.get(key) ?? [],
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
  combatLosBlockerFor = [],
  isSelected,
  isHovered,
  pathIndex,
  inLegacyAttackRange,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor?: readonly ITacticalMapCombatLosBlockerReference[];
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly pathIndex?: number;
  readonly inLegacyAttackRange: boolean;
}): ITacticalMapHexProjection {
  const inAttackRange = inLegacyAttackRange || Boolean(combat?.inRange);
  const blockedReasons = collectBlockedReasons(movement, combat);
  const movementStatus = deriveMovementProjectionStatus(movement);
  const combatStatus = deriveCombatProjectionStatus({
    combat,
    inAttackRange,
  });
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
  });
  const sourceReferences = collectProjectionSourceReferences({
    terrain,
    movement,
    combat,
    combatLosBlockerFor,
    inLegacyAttackRange,
  });

  return {
    hex,
    key: coordToKey(hex),
    terrain,
    movement,
    combat,
    combatLosBlockerFor,
    isSelected,
    isHovered,
    pathIndex,
    inAttackRange,
    intent,
    status,
    movementStatus,
    combatStatus,
    blockedReasons,
    sourceReferences,
    explanation: formatProjectionExplanation({
      hex,
      terrain,
      movement,
      combat,
      combatLosBlockerFor,
      intent,
      status,
      movementStatus,
      combatStatus,
      blockedReasons,
      sourceReferences,
    }),
  };
}

export function formatTacticalProjectionSourceReferences(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .map(formatTacticalProjectionSourceReference)
    .join('|');
}

export function formatTacticalProjectionSourceLabels(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .map(
      (reference) =>
        `${formatSourceChannelLabel(reference.channel)}: ${reference.label}`,
    )
    .join('; ');
}

function formatTacticalProjectionSourceReference(
  reference: ITacticalMapProjectionSourceReference,
): string {
  const detail = reference.detail ? `:${reference.detail}` : '';
  return `${reference.channel}:${reference.kind}:${reference.label}${detail}`;
}

function formatSourceChannelLabel(
  channel: TacticalMapProjectionSourceChannel,
): string {
  switch (channel) {
    case 'terrain-elevation':
      return 'terrain/elevation';
    case 'movement':
      return 'movement';
    case 'combat':
      return 'combat';
    case 'los-blocker':
      return 'LOS blocker';
    case 'legacy-attack-range':
      return 'legacy attack range';
  }
}

function defaultHexTerrain(hex: IHexCoordinate): IHexTerrain {
  return {
    coordinate: hex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  };
}

function buildCombatLosBlockerReferenceLookup(
  combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>,
): ReadonlyMap<string, readonly ITacticalMapCombatLosBlockerReference[]> {
  const refsByKey = new Map<string, ITacticalMapCombatLosBlockerReference[]>();

  combatRangeLookup.forEach((combat) => {
    if (
      !combat.hasTarget ||
      !combat.lineOfSightBlocker ||
      combat.losState === 'clear'
    ) {
      return;
    }

    const key = coordToKey(combat.lineOfSightBlocker.hex);
    const refs = refsByKey.get(key) ?? [];
    refs.push({
      targetHex: combat.hex,
      targetUnitIds: combat.targetUnitIds,
      losState: combat.losState,
      blocker: combat.lineOfSightBlocker,
    });
    refsByKey.set(key, refs);
  });

  return refsByKey;
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
}: {
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
}): TacticalMapHexProjectionStatus {
  const movementLegal = movementHasReachableOption(movement);
  const movementBlocked = movementHasBlockedOption(movement);
  const legal =
    movementLegal ||
    Boolean(combat?.attackable) ||
    Boolean(combat?.inRange && !combat.hasTarget);
  const blocked =
    movementBlocked ||
    (combat ? combat.hasTarget && !combat.attackable : false);

  if (legal && blocked) return 'mixed';
  if (blocked) return 'blocked';
  if (legal) return 'legal';
  return 'neutral';
}

function movementOptionsForProjection(
  movement: IMovementRangeHex | undefined,
): readonly IMovementRangeModeOption[] {
  if (!movement) return [];
  if (movement.movementModeOptions?.length) return movement.movementModeOptions;
  return [
    {
      movementType: movement.movementType,
      movementMode: movement.movementMode,
      reachable: movement.reachable,
      mpCost: movement.mpCost,
      terrainCost: movement.terrainCost,
      elevationDelta: movement.elevationDelta,
      elevationCost: movement.elevationCost,
      heatGenerated: movement.heatGenerated,
      blockedReason: movement.blockedReason,
      movementInvalidReason: movement.movementInvalidReason,
      movementInvalidDetails: movement.movementInvalidDetails,
    },
  ];
}

function collectProjectionSourceReferences({
  terrain,
  movement,
  combat,
  combatLosBlockerFor,
  inLegacyAttackRange,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly inLegacyAttackRange: boolean;
}): readonly ITacticalMapProjectionSourceReference[] {
  const references: ITacticalMapProjectionSourceReference[] = [
    {
      channel: 'terrain-elevation',
      kind: 'mekstation',
      label: 'Rendered map terrain/elevation grid',
      detail: formatTerrainSourceDetail(terrain),
    },
  ];

  if (movement) {
    references.push({
      channel: 'movement',
      kind: 'megamek',
      label: 'MegaMek movement rules projection',
      detail: formatMovementSourceDetail(movement),
    });
  }

  if (combat) {
    references.push({
      channel: 'combat',
      kind: 'megamek',
      label: combat.hasTarget
        ? 'MegaMek combat target projection'
        : 'MegaMek weapon range projection',
      detail: formatCombatSourceDetail(combat),
    });
  }

  if (combatLosBlockerFor.length > 0) {
    references.push({
      channel: 'los-blocker',
      kind: 'megamek',
      label: 'MegaMek LOS blocker projection',
      detail: formatLosBlockerSourceDetail(combatLosBlockerFor),
    });
  }

  if (inLegacyAttackRange) {
    references.push({
      channel: 'legacy-attack-range',
      kind: 'mekstation',
      label: 'Legacy attackRange fallback',
      detail: 'caller-provided range envelope',
    });
  }

  return dedupeProjectionSourceReferences(references);
}

function dedupeProjectionSourceReferences(
  references: readonly ITacticalMapProjectionSourceReference[],
): readonly ITacticalMapProjectionSourceReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = formatTacticalProjectionSourceReference(reference);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatTerrainSourceDetail(terrain: IHexTerrain): string {
  const terrainTypes =
    terrain.features.length === 0
      ? TerrainType.Clear
      : terrain.features.map(formatTerrainFeatureSourceDetail).join(',');
  return `${terrainTypes} elevation ${terrain.elevation}`;
}

function formatTerrainFeatureSourceDetail(
  feature: IHexTerrain['features'][number],
): string {
  const parts: string[] = [feature.type];
  const levelDetail = formatTerrainFeatureLevelSourceDetail(feature);
  if (levelDetail) {
    parts.push(levelDetail);
  }
  if (feature.buildingId) {
    parts.push(`id ${feature.buildingId}`);
  }
  if (feature.constructionFactor !== undefined) {
    parts.push(`CF ${feature.constructionFactor}`);
  }
  return parts.join(' ');
}

function formatTerrainFeatureLevelSourceDetail(
  feature: IHexTerrain['features'][number],
): string | null {
  if (feature.type === TerrainType.Clear && feature.level === 0) {
    return null;
  }
  if (feature.type === TerrainType.Water) {
    return `depth ${feature.level}`;
  }
  if (feature.type === TerrainType.Fire || feature.type === TerrainType.Smoke) {
    return `intensity ${feature.level}`;
  }
  return `level ${feature.level}`;
}

function formatMovementSourceDetail(movement: IMovementRangeHex): string {
  const options = movementOptionsForProjection(movement);
  const modes = Array.from(
    new Set(
      options.map((option) =>
        option.movementMode && option.movementMode !== option.movementType
          ? `${option.movementType}/${option.movementMode}`
          : option.movementType,
      ),
    ),
  );
  return `${modes.join(',')} projection`;
}

function formatCombatSourceDetail(combat: ICombatRangeHex): string {
  const targetState = combat.hasTarget ? 'target' : 'range envelope';
  return `${targetState} ${combat.rangeBracket} ${combat.distance} hexes LOS ${combat.losState}`;
}

function formatLosBlockerSourceDetail(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): string {
  const blockerKinds = Array.from(new Set(refs.map((ref) => ref.blocker.kind)));
  const targetHexes = refs.map(
    (ref) => `${ref.targetHex.q},${ref.targetHex.r}`,
  );
  return `${blockerKinds.join(',')} for ${targetHexes.join(',')}`;
}

function movementHasReachableOption(
  movement: IMovementRangeHex | undefined,
): boolean {
  return movementOptionsForProjection(movement).some(
    (option) => option.reachable,
  );
}

function movementHasBlockedOption(
  movement: IMovementRangeHex | undefined,
): boolean {
  return movementOptionsForProjection(movement).some(
    (option) => !option.reachable,
  );
}

function deriveMovementProjectionStatus(
  movement: IMovementRangeHex | undefined,
): TacticalMapMovementProjectionStatus {
  if (!movement) return 'none';

  const hasReachableOption = movementHasReachableOption(movement);
  const hasBlockedOption = movementHasBlockedOption(movement);

  if (hasReachableOption && hasBlockedOption) return 'mixed';
  if (hasReachableOption) return 'legal';
  return 'blocked';
}

function deriveCombatProjectionStatus({
  combat,
  inAttackRange,
}: {
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
}): TacticalMapCombatProjectionStatus {
  if (!combat) return inAttackRange ? 'range-only' : 'none';

  if (combat.hasTarget) {
    if (combat.attackable) {
      return combatHasBlockedTargets(combat) ? 'mixed' : 'attackable';
    }
    return 'blocked';
  }

  if (combat.inRange || inAttackRange) return 'range-only';
  return 'none';
}

function combatHasBlockedTargets(combat: ICombatRangeHex): boolean {
  if (!combat.attackable) return false;
  if (combat.targetUnitIds.length > combat.validTargetUnitIds.length) {
    return true;
  }
  return combat.obscuredTargetUnitIds.length > 0;
}

function collectBlockedReasons(
  movement: IMovementRangeHex | undefined,
  combat: ICombatRangeHex | undefined,
): readonly string[] {
  const reasons = [
    movement?.movementInvalidDetails,
    movement?.blockedReason,
    movement?.movementInvalidReason,
    ...movementOptionBlockedReasons(movement),
    combat?.attackInvalidDetails,
    combat?.blockedReason,
    combat?.visibilityBlockedReason,
    combat?.lineOfSightBlockerReason,
    combat?.attackInvalidReason,
  ].filter((reason): reason is string => Boolean(reason));

  return Array.from(new Set(reasons));
}

function movementOptionBlockedReasons(
  movement: IMovementRangeHex | undefined,
): readonly string[] {
  return movementOptionsForProjection(movement)
    .filter((option) => !option.reachable)
    .flatMap((option) => [
      option.movementInvalidDetails,
      option.blockedReason,
      option.movementInvalidReason,
    ])
    .filter((reason): reason is string => Boolean(reason));
}

function formatProjectionExplanation({
  hex,
  terrain,
  movement,
  combat,
  combatLosBlockerFor,
  intent,
  status,
  movementStatus,
  combatStatus,
  blockedReasons,
  sourceReferences,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly movementStatus: TacticalMapMovementProjectionStatus;
  readonly combatStatus: TacticalMapCombatProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly sourceReferences: readonly ITacticalMapProjectionSourceReference[];
}): string {
  const terrainTypes =
    terrain.features.length === 0
      ? TerrainType.Clear
      : terrain.features.map(formatTerrainFeatureSourceDetail).join(',');
  const parts = [
    `Hex ${hex.q},${hex.r}`,
    `intent ${intent}`,
    `status ${status}`,
    `movement status ${movementStatus}`,
    `combat status ${combatStatus}`,
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
    if (movement.movementModeOptions?.length) {
      parts.push(
        `movement options ${movement.movementModeOptions
          .map(formatMovementOption)
          .join(', ')}`,
      );
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
      if (combat.hasTarget) {
        parts.push(
          `weapon heat ${formatSignedCost(combat.availableWeaponHeat)}`,
        );
        if (combat.availableWeaponDamage > 0) {
          parts.push(
            `damage ${formatDamageValue(combat.availableWeaponDamage)} listed`,
          );
          if (combat.expectedDamage !== undefined) {
            parts.push(
              `expected damage ${formatDamageValue(combat.expectedDamage)}`,
            );
          }
        }
        const ammoImpacts = combat.availableWeaponImpacts
          .filter((impact) => impact.ammoConsumed > 0)
          .map((impact) => {
            const remaining =
              impact.ammoRemaining === undefined
                ? ''
                : ` ${Math.max(0, impact.ammoRemaining - impact.ammoConsumed)} left`;
            return `${impact.weaponName} -${impact.ammoConsumed}${remaining}`;
          });
        if (ammoImpacts.length > 0) {
          parts.push(`ammo ${ammoImpacts.join(', ')}`);
        }
      }
    } else if (
      combat.weaponIdsInRange.length > 0 ||
      combat.weaponIdsInArc.length > 0
    ) {
      parts.push('weapons none available');
    }
    if (combat.weaponRangeOptions.length > 0) {
      parts.push(
        `weapon options ${combat.weaponRangeOptions
          .map(formatCombatWeaponOption)
          .join(', ')}`,
      );
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
    if (combat.c3BenefitApplied) {
      const spotter = combat.c3SpotterId ?? 'unknown';
      const spotterRange =
        combat.c3SpotterRange === null || combat.c3SpotterRange === undefined
          ? 'unknown'
          : `${combat.c3SpotterRange}`;
      parts.push(
        `C3 spotter ${spotter} range ${spotterRange} effective ${combat.rangeBracket}`,
      );
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
  if (combatLosBlockerFor.length > 0) {
    const targets = combatLosBlockerFor.map(
      (ref) => `${ref.targetHex.q},${ref.targetHex.r}`,
    );
    const reasons = Array.from(
      new Set(combatLosBlockerFor.map((ref) => ref.blocker.reason)),
    );
    parts.push(`LOS blocker for ${targets.join(',')}: ${reasons.join('; ')}`);
  }
  if (blockedReasons.length > 0) {
    parts.push(`blocked ${blockedReasons.join('; ')}`);
  }
  if (sourceReferences.length > 0) {
    parts.push(
      `sources ${formatTacticalProjectionSourceLabels(sourceReferences)}`,
    );
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

function formatMovementOption(option: IMovementRangeModeOption): string {
  const mode =
    option.movementMode && option.movementMode !== option.movementType
      ? ` via ${option.movementMode}`
      : '';
  const terrain =
    option.terrainCost === undefined
      ? ''
      : ` terrain ${formatSignedCost(option.terrainCost)}`;
  const elevation =
    option.elevationDelta === undefined && option.elevationCost === undefined
      ? ''
      : ` elevation ${formatMovementOptionElevation(option)}`;
  const heat =
    option.heatGenerated === undefined
      ? ''
      : ` heat ${formatSignedCost(option.heatGenerated)}`;
  const blockedDetail = movementOptionBlockedDetail(option);
  const blocked = blockedDetail ? `: ${blockedDetail}` : '';
  return `${option.movementType}${mode} ${
    option.reachable ? 'reachable' : 'blocked'
  } ${option.mpCost} MP${terrain}${elevation}${heat}${option.reachable ? '' : blocked}`;
}

function formatMovementOptionElevation(
  option: IMovementRangeModeOption,
): string {
  const parts: string[] = [];
  if (option.elevationDelta !== undefined) {
    parts.push(`delta ${formatSignedCost(option.elevationDelta)}`);
  }
  if (option.elevationCost !== undefined) {
    parts.push(`cost ${formatSignedCost(option.elevationCost)}`);
  }
  return parts.join(' ');
}

function movementOptionBlockedDetail(
  option: IMovementRangeModeOption,
): string | undefined {
  if (option.reachable) return undefined;
  return (
    option.movementInvalidDetails ??
    option.blockedReason ??
    option.movementInvalidReason
  );
}

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatCombatWeaponOption(option: ICombatWeaponRangeOption): string {
  const arc = option.inArc ? 'in arc' : 'out of arc';
  const environment = option.environmentLegal ? '' : ' environment blocked';
  const minimumRange =
    option.minimumRangePenalty === undefined
      ? ''
      : ` min +${option.minimumRangePenalty}`;
  const toHit =
    option.toHitNumber === undefined ? '' : ` to-hit ${option.toHitNumber}`;
  const blocked = option.available
    ? 'available'
    : `blocked${option.blockedReason ? `: ${option.blockedReason}` : ''}`;
  return `${option.weaponId} ${option.rangeBracket} range ${arc}${environment}${minimumRange}${toHit} ${blocked}`;
}

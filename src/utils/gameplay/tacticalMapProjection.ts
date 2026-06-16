import type {
  ICombatRangeHex,
  ICombatLineOfSightBlocker,
  ICombatWeaponRangeOption,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import { Facing, TerrainType } from '@/types/gameplay';

import { coordToKey, hexEquals } from './hexMath';
import { getFacingAbbreviation } from './unitPosition';

export type TacticalMapHexProjectionIntent =
  | 'terrain'
  | 'selected'
  | 'path'
  | 'movement'
  | 'combat'
  | 'movement-combat'
  | 'los-blocker';

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

export type TacticalMapMovementCostProjectionStatus =
  | 'none'
  | 'ordinary'
  | 'costly';

export type TacticalMapMovementHazardProjectionStatus =
  | 'none'
  | 'represented-minefield';

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
  readonly ruleReferences?: readonly string[];
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
  readonly movementCostStatus: TacticalMapMovementCostProjectionStatus;
  readonly movementCostReasons: readonly string[];
  readonly movementHazardStatus: TacticalMapMovementHazardProjectionStatus;
  readonly movementHazardReasons: readonly string[];
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

const TERRAIN_ELEVATION_RULE_REFERENCES = [
  'MekStation terrain/elevation grid state; movement and combat channels own legality',
] as const;

const MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
  'MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
  'MegaMek common/moves/MovePath.java:1214-1218 MP-used accounting',
] as const;

const STAND_UP_MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/GetUpStep.java:62 stand-up MP cost',
  'MegaMek server/totalWarfare/MovePathHandler.java:2027-2058 stand-up PSR resolution',
  'MegaMek QuadMek.java:452-453 intact quads do not roll to stand',
  'MegaMek Entity.java:7824-7828 all-four-legs stand-up automatic success',
] as const;

const REPRESENTED_MINEFIELD_MOVEMENT_RULE_REFERENCES = [
  'MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
  'MekStation src/simulation/runner/__tests__/movementPhase.behavior.test.ts: represented minefield damage and PSR behavior',
] as const;

const COMBAT_RULE_REFERENCES = [
  'MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
  'MegaMek RangeType.java:95-151 range bracket classification',
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
] as const;

const REPRESENTED_WATER_ENVIRONMENT_RULE_REFERENCES = [
  'MegaMek common/actions/compute/ComputeToHit.java:340-346 torpedoes/SRT/LRT count as underwater attacks',
  'MegaMek common/actions/compute/ComputeToHitIsImpossible.java:543-555 torpedo LOS must stay in water',
  'MegaMek common/actions/compute/ComputeTerrainMods.java:167-188 target water and partial-underwater handling',
  'MegaMek client/ui/clientGUI/boardview/spriteHandler/FiringArcSpriteHandler.java:570-575 water-only ranges display as underwater weapons',
] as const;

const LOS_BLOCKER_RULE_REFERENCES = [
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
  'MegaMek LosEffects.java:1322-1483 elevation/building blockers and cover',
] as const;

const LEGACY_ATTACK_RANGE_RULE_REFERENCES = [
  'MekStation caller-provided compatibility range; not a rules-backed attack option',
] as const;

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
  const useLegacyAttackRange = inLegacyAttackRange && !combat;
  const inAttackRange = useLegacyAttackRange || Boolean(combat?.inRange);
  const blockedReasons = collectBlockedReasons({
    movement,
    combat,
    combatLosBlockerFor,
  });
  const movementStatus = deriveMovementProjectionStatus(movement);
  const movementCostReasons = deriveMovementCostProjectionReasons(movement);
  const movementCostStatus = deriveMovementCostProjectionStatus({
    movement,
    movementCostReasons,
  });
  const movementHazardReasons = deriveMovementHazardProjectionReasons({
    terrain,
    movement,
  });
  const movementHazardStatus = deriveMovementHazardProjectionStatus(
    movementHazardReasons,
  );
  const combatStatus = deriveCombatProjectionStatus({
    combat,
    inAttackRange,
    combatLosBlockerFor,
  });
  const intent = deriveProjectionIntent({
    isSelected,
    pathIndex,
    movement,
    combat,
    inAttackRange,
    combatLosBlockerFor,
  });
  const status = deriveProjectionStatus({
    movement,
    combat,
    combatLosBlockerFor,
  });
  const sourceReferences = collectProjectionSourceReferences({
    terrain,
    movement,
    combat,
    combatLosBlockerFor,
    inLegacyAttackRange: useLegacyAttackRange,
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
    movementCostStatus,
    movementCostReasons,
    movementHazardStatus,
    movementHazardReasons,
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
      movementCostStatus,
      movementCostReasons,
      movementHazardStatus,
      movementHazardReasons,
      combatStatus,
      blockedReasons,
      sourceReferences,
      legacyAttackRangeOnly: useLegacyAttackRange,
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

export function formatTacticalProjectionRuleReferences(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .flatMap((reference) =>
      (reference.ruleReferences ?? []).map(
        (ruleReference) =>
          `${reference.channel}:${reference.kind}:${ruleReference}`,
      ),
    )
    .join('|');
}

export function formatTacticalProjectionRuleReferenceLabels(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .flatMap((reference) =>
      (reference.ruleReferences ?? []).map(
        (ruleReference) =>
          `${formatSourceChannelLabel(reference.channel)}: ${ruleReference}`,
      ),
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
  combatLosBlockerFor,
}: {
  readonly isSelected: boolean;
  readonly pathIndex?: number;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapHexProjectionIntent {
  if (isSelected) return 'selected';
  if (pathIndex !== undefined) return 'path';
  if (movement && (combat?.hasTarget || inAttackRange)) {
    return 'movement-combat';
  }
  if (movement) return 'movement';
  if (combat?.hasTarget) return 'combat';
  if (combatLosBlockerFor.length > 0) return 'los-blocker';
  if (inAttackRange) return 'combat';
  return 'terrain';
}

function deriveProjectionStatus({
  movement,
  combat,
  combatLosBlockerFor,
}: {
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapHexProjectionStatus {
  const movementLegal = movementHasReachableOption(movement);
  const movementBlocked = movementHasBlockedOption(movement);
  const losBlocked = losBlockerHasBlockedRef(combatLosBlockerFor);
  const losPartial =
    combatLosBlockerFor.length > 0 &&
    combatLosBlockerFor.some((ref) => ref.losState === 'partial');
  const legal =
    movementLegal ||
    Boolean(combat?.attackable) ||
    Boolean(
      combat?.inRange && !combat.hasTarget && combatLosBlockerFor.length === 0,
    );
  const blocked =
    movementBlocked ||
    (combat ? combat.hasTarget && !combat.attackable : false) ||
    losBlocked;

  if ((legal || losPartial) && blocked) return 'mixed';
  if (blocked) return 'blocked';
  if (losPartial) return 'mixed';
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
      conversionStepCount: movement.conversionStepCount,
      conversionMpCost: movement.conversionMpCost,
      altitudeControlStepCount: movement.altitudeControlStepCount,
      altitudeControlMpCost: movement.altitudeControlMpCost,
      altitudeControlRequired: movement.altitudeControlRequired,
      altitudeControlMode: movement.altitudeControlMode,
      altitudeControlAltitude: movement.altitudeControlAltitude,
      automaticLandingRequired: movement.automaticLandingRequired,
      automaticLandingReason: movement.automaticLandingReason,
      automaticLandingMode: movement.automaticLandingMode,
      automaticLandingDistance: movement.automaticLandingDistance,
      automaticLandingMinimumDistance: movement.automaticLandingMinimumDistance,
      hullDownExitRequired: movement.hullDownExitRequired,
      hullDownExitCost: movement.hullDownExitCost,
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
      ruleReferences: TERRAIN_ELEVATION_RULE_REFERENCES,
    },
  ];

  if (movement) {
    references.push({
      channel: 'movement',
      kind: 'megamek',
      label: 'MegaMek movement rules projection',
      detail: formatMovementSourceDetail(movement),
      ruleReferences: MOVEMENT_RULE_REFERENCES,
    });

    if (movementHasStandUpContext(movement)) {
      references.push({
        channel: 'movement',
        kind: 'megamek',
        label: 'MegaMek stand-up movement rules projection',
        detail: formatStandUpMovementSourceDetail(movement),
        ruleReferences: STAND_UP_MOVEMENT_RULE_REFERENCES,
      });
    }
  }

  if (isRepresentedMinefieldTerrain(terrain)) {
    references.push({
      channel: 'movement',
      kind: 'mekstation',
      label: 'Represented minefield movement hazard projection',
      detail: formatRepresentedMinefieldSourceDetail({ terrain, movement }),
      ruleReferences: REPRESENTED_MINEFIELD_MOVEMENT_RULE_REFERENCES,
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
      ruleReferences: COMBAT_RULE_REFERENCES,
    });

    if (combatHasEnvironmentRestrictions(combat)) {
      references.push({
        channel: 'combat',
        kind: 'megamek',
        label: 'MegaMek water weapon environment projection',
        detail: formatCombatEnvironmentSourceDetail(combat),
        ruleReferences: REPRESENTED_WATER_ENVIRONMENT_RULE_REFERENCES,
      });
    }
  }

  const losBlockerReferences = collectCombatLosBlockerReferences({
    combat,
    combatLosBlockerFor,
  });

  if (losBlockerReferences.length > 0) {
    references.push({
      channel: 'los-blocker',
      kind: 'megamek',
      label: 'MegaMek LOS blocker projection',
      detail: formatLosBlockerSourceDetail(losBlockerReferences),
      ruleReferences: LOS_BLOCKER_RULE_REFERENCES,
    });
  }

  if (inLegacyAttackRange) {
    references.push({
      channel: 'legacy-attack-range',
      kind: 'mekstation',
      label: 'Legacy attackRange fallback',
      detail: 'caller-provided range envelope',
      ruleReferences: LEGACY_ATTACK_RANGE_RULE_REFERENCES,
    });
  }

  return dedupeProjectionSourceReferences(references);
}

function collectCombatLosBlockerReferences({
  combat,
  combatLosBlockerFor,
}: {
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): readonly ITacticalMapCombatLosBlockerReference[] {
  const references = [...combatLosBlockerFor];

  if (
    combat?.hasTarget &&
    combat.lineOfSightBlocker &&
    combat.losState !== 'clear'
  ) {
    references.push({
      targetHex: combat.hex,
      targetUnitIds: combat.targetUnitIds,
      losState: combat.losState,
      blocker: combat.lineOfSightBlocker,
    });
  }

  return references;
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
  const cliffExits = Array.from(
    new Set(feature.cliffTopExits?.filter(isFacing) ?? []),
  ).sort((a, b) => a - b);
  if (cliffExits.length > 0) {
    parts.push(
      `cliff edges ${cliffExits.map(getFacingAbbreviation).join('/')}`,
    );
  }
  return parts.join(' ');
}

function isFacing(value: number): value is Facing {
  return (
    Number.isInteger(value) &&
    value >= Facing.North &&
    value <= Facing.Northwest
  );
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

function formatRepresentedMinefieldSourceDetail({
  terrain,
  movement,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
}): string {
  const mineLevels = terrain.features
    .filter(isRepresentedMinefieldFeature)
    .map((feature) => feature.level);
  const levelDetail =
    mineLevels.length > 0 ? ` levels ${mineLevels.join(',')}` : '';
  const movementDetail = movementHasReachableOption(movement)
    ? 'reachable entry can apply 10 damage to each leg and queue PSRs'
    : 'BattleMech entry can apply 10 damage to each leg and queue PSRs';
  return `represented mines${levelDetail}; ${movementDetail}`;
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
  return `${modes.join(',')} projection: ${options
    .map(formatMovementOption)
    .join(', ')}`;
}

function movementHasStandUpContext(movement: IMovementRangeHex): boolean {
  return Boolean(
    movement.standUpRequired ||
    movement.standUpPsrRequired ||
    movement.standUpPsrAutomaticSuccessReason ||
    movement.standUpPsrModifierDetails?.length,
  );
}

function formatStandUpMovementSourceDetail(
  movement: IMovementRangeHex,
): string {
  const mode = movement.standUpMode ?? 'normal';
  const cost =
    movement.standUpCost === undefined ? 'unknown' : `${movement.standUpCost}`;
  const psr = movement.standUpPsrRequired ? 'PSR projected' : 'no PSR';
  const impossible = movement.standUpPsrImpossibleReason ? ' impossible' : '';
  return `${mode} stand-up ${cost} MP ${psr}${impossible}`;
}

function formatCombatSourceDetail(combat: ICombatRangeHex): string {
  const targetState = combat.hasTarget ? 'target' : 'range envelope';
  return `${targetState} ${combat.rangeBracket} ${combat.distance} hexes LOS ${combat.losState}`;
}

function combatHasEnvironmentRestrictions(combat: ICombatRangeHex): boolean {
  return combat.weaponRangeOptions.some((option) => !option.environmentLegal);
}

function formatCombatEnvironmentSourceDetail(combat: ICombatRangeHex): string {
  const blockedOptions = combat.weaponRangeOptions
    .filter((option) => !option.environmentLegal)
    .map((option) => {
      const reason = option.blockedReason ?? 'environment blocked';
      return `${option.weaponId}: ${reason}`;
    });

  return `environment restrictions ${blockedOptions.join('; ')}`;
}

function formatLosBlockerSourceDetail(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): string {
  const blockerKinds = Array.from(new Set(refs.map((ref) => ref.blocker.kind)));
  const targetDetails = refs.map(
    (ref) => `${ref.targetHex.q},${ref.targetHex.r} ${ref.blocker.reason}`,
  );
  return `${blockerKinds.join(',')} for ${targetDetails.join('; ')}`;
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

function deriveMovementCostProjectionStatus({
  movement,
  movementCostReasons,
}: {
  readonly movement: IMovementRangeHex | undefined;
  readonly movementCostReasons: readonly string[];
}): TacticalMapMovementCostProjectionStatus {
  if (!movementHasReachableOption(movement)) return 'none';
  return movementCostReasons.length > 0 ? 'costly' : 'ordinary';
}

function deriveMovementCostProjectionReasons(
  movement: IMovementRangeHex | undefined,
): readonly string[] {
  const reasons = movementOptionsForProjection(movement)
    .filter((option) => option.reachable)
    .flatMap(formatReachableMovementCostReasons);
  return Array.from(new Set(reasons));
}

function deriveMovementHazardProjectionStatus(
  movementHazardReasons: readonly string[],
): TacticalMapMovementHazardProjectionStatus {
  return movementHazardReasons.length > 0 ? 'represented-minefield' : 'none';
}

function deriveMovementHazardProjectionReasons({
  terrain,
  movement,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
}): readonly string[] {
  if (!isRepresentedMinefieldTerrain(terrain)) return [];
  const entryContext = movementHasReachableOption(movement)
    ? 'reachable entry'
    : 'BattleMech entry';
  return [
    `${entryContext} through represented mines can apply 10 damage to each leg`,
    'mine leg structure damage can queue a leg-damage PSR',
    '20+ mine damage in the movement phase can queue a damage-threshold PSR',
  ];
}

function isRepresentedMinefieldTerrain(terrain: IHexTerrain): boolean {
  return terrain.features.some(isRepresentedMinefieldFeature);
}

function isRepresentedMinefieldFeature(
  feature: IHexTerrain['features'][number],
): boolean {
  return feature.type === TerrainType.Mines && feature.level > 0;
}

function formatReachableMovementCostReasons(
  option: IMovementRangeModeOption,
): readonly string[] {
  const reasons: string[] = [];
  if (hasPositiveCost(option.terrainCost)) {
    reasons.push(`terrain ${formatSignedCost(option.terrainCost)}`);
  }
  if (hasElevationCostConsequence(option)) {
    reasons.push(`elevation ${formatMovementOptionElevation(option)}`);
  }
  if (hasPositiveCost(option.heatGenerated)) {
    reasons.push(`heat ${formatSignedCost(option.heatGenerated)}`);
  }
  if (
    hasPositiveCost(option.conversionStepCount) ||
    hasPositiveCost(option.conversionMpCost)
  ) {
    reasons.push(
      `conversion ${option.conversionStepCount ?? 0} steps ${
        option.conversionMpCost ?? 0
      } MP`,
    );
  }
  if (
    option.altitudeControlRequired ||
    hasPositiveCost(option.altitudeControlStepCount) ||
    hasPositiveCost(option.altitudeControlMpCost)
  ) {
    reasons.push(
      `altitude control ${option.altitudeControlStepCount ?? 0} steps ${
        option.altitudeControlMpCost ?? 0
      } MP`,
    );
  }
  if (option.automaticLandingRequired) {
    const reason = option.automaticLandingReason
      ? ` ${option.automaticLandingReason}`
      : '';
    reasons.push(
      `automatic landing ${option.automaticLandingDistance ?? 0}/${
        option.automaticLandingMinimumDistance ?? 0
      } hexes${reason}`,
    );
  }
  if (option.hullDownExitRequired || hasPositiveCost(option.hullDownExitCost)) {
    reasons.push(`hull-down exit ${option.hullDownExitCost ?? 0} MP`);
  }
  return reasons;
}

function hasPositiveCost(value: number | undefined): value is number {
  return value !== undefined && value > 0;
}

function hasElevationCostConsequence(
  option: IMovementRangeModeOption,
): boolean {
  return (
    hasPositiveCost(option.elevationCost) ||
    (option.elevationDelta !== undefined && option.elevationDelta !== 0)
  );
}

function deriveCombatProjectionStatus({
  combat,
  inAttackRange,
  combatLosBlockerFor,
}: {
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapCombatProjectionStatus {
  if (!combat) {
    if (inAttackRange) return 'range-only';
    if (combatLosBlockerFor.length > 0) {
      return losBlockerHasBlockedRef(combatLosBlockerFor) ? 'blocked' : 'mixed';
    }
    return 'none';
  }

  if (combat.hasTarget) {
    if (combat.attackable) {
      return combatHasBlockedTargets(combat) ? 'mixed' : 'attackable';
    }
    return 'blocked';
  }

  if (combatLosBlockerFor.length > 0) {
    return losBlockerHasBlockedRef(combatLosBlockerFor) ? 'blocked' : 'mixed';
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

function losBlockerHasBlockedRef(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): boolean {
  return refs.some((ref) => ref.losState === 'blocked');
}

function collectBlockedReasons({
  movement,
  combat,
  combatLosBlockerFor,
}: {
  readonly movement: IMovementRangeHex | undefined;
  readonly combat: ICombatRangeHex | undefined;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): readonly string[] {
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
    ...combatLosBlockerFor.map((ref) => ref.blocker.reason),
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
  movementCostStatus,
  movementCostReasons,
  movementHazardStatus,
  movementHazardReasons,
  combatStatus,
  blockedReasons,
  sourceReferences,
  legacyAttackRangeOnly,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly movementStatus: TacticalMapMovementProjectionStatus;
  readonly movementCostStatus: TacticalMapMovementCostProjectionStatus;
  readonly movementCostReasons: readonly string[];
  readonly movementHazardStatus: TacticalMapMovementHazardProjectionStatus;
  readonly movementHazardReasons: readonly string[];
  readonly combatStatus: TacticalMapCombatProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly sourceReferences: readonly ITacticalMapProjectionSourceReference[];
  readonly legacyAttackRangeOnly: boolean;
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
    `movement cost status ${movementCostStatus}`,
    `movement hazard status ${movementHazardStatus}`,
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
    if (
      movement.conversionStepCount !== undefined ||
      movement.conversionMpCost !== undefined
    ) {
      parts.push(
        `conversion ${movement.conversionStepCount ?? 0} steps ${
          movement.conversionMpCost ?? 0
        } MP`,
      );
    }
    if (
      movement.altitudeControlStepCount !== undefined ||
      movement.altitudeControlMpCost !== undefined
    ) {
      parts.push(
        `altitude control ${movement.altitudeControlStepCount ?? 0} steps ${
          movement.altitudeControlMpCost ?? 0
        } MP`,
      );
    }
    if (movement.automaticLandingRequired) {
      parts.push(
        `automatic landing ${movement.automaticLandingDistance ?? 0}/${
          movement.automaticLandingMinimumDistance ?? 0
        } hexes`,
      );
      if (movement.automaticLandingReason) {
        parts.push(
          `automatic landing reason ${movement.automaticLandingReason}`,
        );
      }
    }
    if (movement.hullDownExitRequired) {
      parts.push(
        `hull-down exit ${formatSignedCost(movement.hullDownExitCost ?? 0)} MP`,
      );
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
      } else if (movement.standUpPsrAutomaticSuccessReason) {
        parts.push(
          `stand-up no PSR ${movement.standUpPsrAutomaticSuccessReason}`,
        );
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
    if (movementCostReasons.length > 0) {
      parts.push(
        `movement cost consequences ${movementCostReasons.join('; ')}`,
      );
    }
  }
  if (movementHazardReasons.length > 0) {
    parts.push(`movement hazards ${movementHazardReasons.join('; ')}`);
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
  if (legacyAttackRangeOnly) {
    parts.push('legacy attackRange fallback only; not weapon-backed');
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
  const conversion =
    option.conversionStepCount === undefined &&
    option.conversionMpCost === undefined
      ? ''
      : ` conversion ${option.conversionStepCount ?? 0} steps ${
          option.conversionMpCost ?? 0
        } MP`;
  const altitudeControl =
    option.altitudeControlStepCount === undefined &&
    option.altitudeControlMpCost === undefined
      ? ''
      : ` altitude control ${option.altitudeControlStepCount ?? 0} steps ${
          option.altitudeControlMpCost ?? 0
        } MP`;
  const automaticLanding = option.automaticLandingRequired
    ? ` automatic landing ${option.automaticLandingDistance ?? 0}/${
        option.automaticLandingMinimumDistance ?? 0
      } hexes`
    : '';
  const hullDownExit =
    option.hullDownExitRequired || hasPositiveCost(option.hullDownExitCost)
      ? ` hull-down exit ${option.hullDownExitCost ?? 0} MP`
      : '';
  const blockedDetail = movementOptionBlockedDetail(option);
  const blocked = blockedDetail ? `: ${blockedDetail}` : '';
  return `${option.movementType}${mode} ${
    option.reachable ? 'reachable' : 'blocked'
  } ${option.mpCost} MP${terrain}${elevation}${heat}${conversion}${altitudeControl}${automaticLanding}${hullDownExit}${option.reachable ? '' : blocked}`;
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
  const expectedDamage =
    option.expectedDamage === undefined
      ? ''
      : ` expected ${formatDamageValue(option.expectedDamage)} damage`;
  const blocked = option.available
    ? 'available'
    : `blocked${option.blockedReason ? `: ${option.blockedReason}` : ''}`;
  return `${option.weaponId} ${option.rangeBracket} range ${arc}${environment}${minimumRange}${toHit}${expectedDamage} ${blocked}`;
}

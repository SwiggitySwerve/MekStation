/**
 * Line of Sight Calculation Module
 * Implements BattleTech LOS rules with terrain blocking.
 *
 * @spec openspec/specs/terrain-system/spec.md
 */

import { IHexCoordinate, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import {
  TerrainType,
  TERRAIN_PROPERTIES,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import {
  cubeToAxial,
  hexAngle,
  hexDistance,
  hexLine,
  coordToKey,
  hexEquals,
} from './hexMath';
import { terrainFeaturesFromString } from './terrainEncoding';
import { parseWaterDepth } from './waterDepth';

// =============================================================================
// Result Interface
// =============================================================================

/**
 * Result of LOS calculation.
 */
export interface ILOSResult {
  /** Whether LOS exists */
  readonly hasLOS: boolean;
  /** Hex that blocks LOS (if blocked) */
  readonly blockedBy?: IHexCoordinate;
  /** Terrain type that blocks (if blocked) */
  readonly blockingTerrain?: TerrainType;
  /** Pure terrain elevation that blocks LOS without a blocking terrain feature */
  readonly blockingElevation?: number;
  /** All intervening hexes (excluding endpoints) */
  readonly interveningHexes: readonly IHexCoordinate[];
  /** Intervening terrain that affects LOS as a to-hit/visibility modifier */
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
  /** Minimum represented water depth across endpoints and traced LOS path */
  readonly minimumWaterDepth: number;
  /** Damageable terrain/object providers that supply represented partial cover */
  readonly damageableCoverProviders: readonly ILOSDamageableCoverProvider[];
}

export interface ILOSInterveningTerrainEffect {
  readonly coord: IHexCoordinate;
  readonly terrain: TerrainType;
  readonly modifier: number;
}

export type LOSDamageableCoverProviderKind =
  | 'building'
  | 'fuel-tank'
  | 'grounded-dropship';
export type LOSDamageableBuildingClass = 'hard' | 'soft';
export type LOSDamageableCoverSide = 'attacker' | 'target';

export interface ILOSDamageableCoverProvider {
  readonly coord: IHexCoordinate;
  readonly kind: LOSDamageableCoverProviderKind;
  readonly side: LOSDamageableCoverSide;
  readonly terrain?: TerrainType.Building;
  readonly height: number;
  readonly totalElevation: number;
  readonly unitId?: string;
  readonly unitType?: string;
  readonly buildingId?: string;
  readonly fuelTankId?: string;
  readonly constructionFactor?: number;
  readonly buildingClass?: LOSDamageableBuildingClass;
}

export interface ILOSUnitOccupantState {
  readonly id?: string;
  readonly unitType?: string;
  readonly destroyed?: boolean;
  readonly airborne?: boolean;
  readonly grounded?: boolean;
  readonly altitude?: number;
}

export interface ILOSCalculationOptions {
  /** Preserve current MekStation diagram-style terrain-effect checks by default. */
  readonly tacOpsLosDiagram?: boolean;
  /** Optional unit state keyed by hex occupantId for entity-aware LOS providers. */
  readonly occupants?:
    | ReadonlyMap<string, ILOSUnitOccupantState>
    | Readonly<Record<string, ILOSUnitOccupantState>>;
}

const TAC_OPS_LOS_DIAGRAM_OPTIONAL_RULES = new Set([
  'advanced_combat_tac_ops_los1',
  'advanced-combat-tac-ops-los1',
  'tac_ops_los1',
  'tac-ops-los1',
  'tacops_los1',
  'tacops-los1',
]);
const GROUNDED_DROPSHIP_COVER_HEIGHT = 10;

export function lineOfSightOptionsFromOptionalRules(
  optionalRules: readonly string[] | undefined,
): ILOSCalculationOptions {
  if (optionalRules === undefined) {
    return {};
  }

  return {
    tacOpsLosDiagram: optionalRules.some((rule) =>
      TAC_OPS_LOS_DIAGRAM_OPTIONAL_RULES.has(rule.toLowerCase()),
    ),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse terrain features from a hex's terrain string.
 * Handles both simple terrain type strings and JSON-encoded feature arrays.
 *
 * @param terrainString - The terrain string from IHex
 * @returns Array of terrain features
 */
export function parseTerrainFeatures(
  terrainString: string,
): readonly ITerrainFeature[] {
  return terrainFeaturesFromString(terrainString);
}

/**
 * Get the effective height of a terrain feature for LOS blocking.
 * Buildings use encoded height metadata, others use standard losBlockHeight.
 *
 * @param feature - The terrain feature
 * @param props - The terrain properties
 * @returns The height in levels
 */
function getTerrainHeight(
  feature: ITerrainFeature,
  props: (typeof TERRAIN_PROPERTIES)[TerrainType],
): number {
  if (
    feature.type === TerrainType.Building &&
    feature.fuelTankElevation !== undefined
  ) {
    return Math.max(0, Math.trunc(feature.fuelTankElevation));
  }

  // Buildings: use level to indicate height (each level = 1 elevation)
  if (feature.type === TerrainType.Building && feature.level > 0) {
    return feature.level;
  }

  // MegaMek treats intervening smoke as an elevation-2 LOS effect.
  if (feature.type === TerrainType.Smoke) {
    return 2;
  }

  if (
    feature.type === TerrainType.HeavyIndustrial ||
    feature.type === TerrainType.PlantedField
  ) {
    return Math.max(1, Math.trunc(feature.level));
  }

  // Standard terrain uses losBlockHeight from properties
  return props.losBlockHeight;
}

function damageableBuildingClass(
  feature: ITerrainFeature,
  height: number,
): LOSDamageableBuildingClass | undefined {
  if (feature.constructionFactor !== undefined) {
    return feature.constructionFactor > 90 ? 'hard' : 'soft';
  }
  return height > 0 ? 'soft' : undefined;
}

function damageableCoverProviderForFeature(options: {
  readonly coord: IHexCoordinate;
  readonly feature: ITerrainFeature;
  readonly height: number;
  readonly totalElevation: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
}): ILOSDamageableCoverProvider | undefined {
  const {
    coord,
    currentDistance,
    feature,
    height,
    shooterHeight,
    targetDistance,
    targetHeight,
    totalElevation,
  } = options;

  if (feature.type !== TerrainType.Building || height <= 0) {
    return undefined;
  }

  let side: LOSDamageableCoverSide | undefined;
  if (
    targetDistance === 1 &&
    totalElevation === targetHeight &&
    shooterHeight <= targetHeight
  ) {
    side = 'target';
  } else if (
    currentDistance === 1 &&
    totalElevation === shooterHeight &&
    shooterHeight >= targetHeight
  ) {
    side = 'attacker';
  }

  if (side === undefined) {
    return undefined;
  }

  return {
    coord,
    kind:
      feature.fuelTankElevation !== undefined ||
      feature.fuelTankId !== undefined
        ? 'fuel-tank'
        : 'building',
    side,
    terrain: TerrainType.Building,
    height,
    totalElevation,
    buildingId: feature.buildingId,
    fuelTankId: feature.fuelTankId,
    constructionFactor: feature.constructionFactor,
    buildingClass: damageableBuildingClass(feature, height),
  };
}

function occupantStateForHex(
  occupantId: string | null,
  occupants: ILOSCalculationOptions['occupants'],
): ILOSUnitOccupantState | undefined {
  if (!occupantId || occupants === undefined) {
    return undefined;
  }

  const mapLike = occupants as ReadonlyMap<string, ILOSUnitOccupantState>;
  if (typeof mapLike.get === 'function') {
    return mapLike.get(occupantId);
  }
  return (occupants as Readonly<Record<string, ILOSUnitOccupantState>>)[
    occupantId
  ];
}

function isDropShipUnit(unit: ILOSUnitOccupantState): boolean {
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '') === 'dropship';
}

function isGroundedUnit(unit: ILOSUnitOccupantState): boolean {
  if (unit.destroyed) return false;
  if (unit.grounded !== undefined) return unit.grounded;
  if (unit.airborne !== undefined) return !unit.airborne;
  if (unit.altitude !== undefined) return unit.altitude <= 0;
  return true;
}

function damageableCoverProviderForGroundedDropShip(options: {
  readonly coord: IHexCoordinate;
  readonly occupantId: string;
  readonly occupant: ILOSUnitOccupantState;
  readonly totalElevation: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
}): ILOSDamageableCoverProvider | undefined {
  const {
    coord,
    currentDistance,
    occupant,
    occupantId,
    shooterHeight,
    targetDistance,
    targetHeight,
    totalElevation,
  } = options;
  if (!isDropShipUnit(occupant) || !isGroundedUnit(occupant)) {
    return undefined;
  }

  let side: LOSDamageableCoverSide | undefined;
  if (
    targetDistance === 1 &&
    totalElevation === targetHeight &&
    shooterHeight <= targetHeight
  ) {
    side = 'target';
  } else if (
    currentDistance === 1 &&
    totalElevation === shooterHeight &&
    shooterHeight >= targetHeight
  ) {
    side = 'attacker';
  }

  if (side === undefined) {
    return undefined;
  }

  return {
    coord,
    kind: 'grounded-dropship',
    side,
    height: GROUNDED_DROPSHIP_COVER_HEIGHT,
    totalElevation,
    unitId: occupant.id ?? occupantId,
    unitType: occupant.unitType,
  };
}

function interveningLosDensity(feature: ITerrainFeature): number {
  switch (feature.type) {
    case TerrainType.LightWoods:
      return 1;
    case TerrainType.HeavyWoods:
      return 2;
    case TerrainType.HeavyIndustrial:
    case TerrainType.PlantedField:
      return 1;
    case TerrainType.Smoke:
      return feature.level >= 2 ? 2 : 1;
    default:
      return 0;
  }
}

type LOSDensityFamily = 'woods-smoke' | 'heavy-industrial' | 'planted-field';

function losDensityFamily(feature: ITerrainFeature): LOSDensityFamily {
  if (feature.type === TerrainType.HeavyIndustrial) {
    return 'heavy-industrial';
  }
  if (feature.type === TerrainType.PlantedField) {
    return 'planted-field';
  }
  return 'woods-smoke';
}

function terrainFeatureAffectsLOS(options: {
  readonly feature: ITerrainFeature;
  readonly hexElevation: number;
  readonly losHeight: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly tacOpsLosDiagram: boolean;
}): boolean {
  const {
    currentDistance,
    feature,
    hexElevation,
    losHeight,
    shooterHeight,
    tacOpsLosDiagram,
    targetDistance,
    targetHeight,
  } = options;
  const props = TERRAIN_PROPERTIES[feature.type];
  if (!props) return false;

  const terrainHeight = hexElevation + getTerrainHeight(feature, props);
  if (tacOpsLosDiagram) {
    return terrainHeight >= losHeight;
  }

  return terrainBlocksNonDiagramLOS({
    terrainHeight,
    currentDistance,
    shooterHeight,
    targetDistance,
    targetHeight,
  });
}

type EndpointWaterState = 'land' | 'in-water' | 'underwater';

interface IEndpointWaterContext {
  readonly terrainString: string | undefined;
  readonly baseElevation: number;
  readonly losElevation?: number;
}

interface IEndpointWaterStatus {
  readonly state: EndpointWaterState;
  readonly depth: number;
}

function terrainWaterDepth(terrainString: string): number {
  const taggedDepth = parseWaterDepth(terrainString);
  if (taggedDepth > 0 || terrainString.startsWith(TerrainType.Water)) {
    return taggedDepth;
  }

  const waterFeature = parseTerrainFeatures(terrainString).find(
    (feature) => feature.type === TerrainType.Water,
  );
  return Math.max(0, Math.trunc(waterFeature?.level ?? 0));
}

function endpointWaterStatus({
  baseElevation,
  losElevation,
  terrainString,
}: IEndpointWaterContext): IEndpointWaterStatus {
  const waterDepth = terrainWaterDepth(terrainString ?? TerrainType.Clear);

  if (waterDepth <= 0) {
    return { state: 'land', depth: 0 };
  }

  if (losElevation !== undefined) {
    if (losElevation < baseElevation) {
      return { state: 'underwater', depth: waterDepth };
    }
    if (losElevation === baseElevation) {
      return { state: 'in-water', depth: waterDepth };
    }
    return { state: 'land', depth: waterDepth };
  }

  return {
    state: waterDepth === 1 ? 'in-water' : 'underwater',
    depth: waterDepth,
  };
}

function landToUnderwaterBlocked(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
): boolean {
  return (
    (fromWater.state === 'land' && toWater.state === 'underwater') ||
    (fromWater.state === 'underwater' && toWater.state === 'land')
  );
}

function initialMinimumWaterDepth(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
): number {
  if (fromWater.state === 'land' || toWater.state === 'land') {
    return 0;
  }
  if (fromWater.state === 'in-water' || toWater.state === 'in-water') {
    return 1;
  }
  return Math.min(fromWater.depth, toWater.depth);
}

function pathMinimumWaterDepth(
  initialDepth: number,
  interveningHexes: readonly IHexCoordinate[],
  grid: IHexGrid,
): number {
  return interveningHexes.reduce((minimumDepth, hex) => {
    const hexData = grid.hexes.get(coordToKey(hex));
    const terrain = hexData?.terrain ?? TerrainType.Clear;
    return Math.min(minimumDepth, terrainWaterDepth(terrain));
  }, initialDepth);
}

function underwaterMinimumWaterBlocker(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
  interveningHexes: readonly IHexCoordinate[],
  grid: IHexGrid,
): IHexCoordinate | undefined {
  const underwaterCombat =
    fromWater.state === 'underwater' || toWater.state === 'underwater';

  if (
    !underwaterCombat ||
    fromWater.state === 'land' ||
    toWater.state === 'land'
  ) {
    return undefined;
  }

  return interveningHexes.find((hex) => {
    const hexData = grid.hexes.get(coordToKey(hex));
    const terrain = hexData?.terrain ?? TerrainType.Clear;
    return terrainWaterDepth(terrain) < 1;
  });
}

function buildingFeatureForTerrain(
  terrainString: string | undefined,
): ITerrainFeature | undefined {
  return parseTerrainFeatures(terrainString ?? TerrainType.Clear).find(
    (feature) => feature.type === TerrainType.Building,
  );
}

interface ISameBuildingContext {
  readonly buildingId: string;
  readonly endpointElevationDifference: number;
}

function sharedEndpointBuildingContext(options: {
  readonly fromHexTerrain: string | undefined;
  readonly fromBaseElevation: number;
  readonly fromLosElevation: number | undefined;
  readonly toHexTerrain: string | undefined;
  readonly toBaseElevation: number;
  readonly toLosElevation: number | undefined;
}): ISameBuildingContext | undefined {
  const {
    fromBaseElevation,
    fromHexTerrain,
    fromLosElevation,
    toBaseElevation,
    toHexTerrain,
    toLosElevation,
  } = options;
  const fromBuildingId = buildingFeatureForTerrain(fromHexTerrain)?.buildingId;
  const toBuildingId = buildingFeatureForTerrain(toHexTerrain)?.buildingId;
  const fromBuildingLevel = fromLosElevation ?? fromBaseElevation + 1;
  const toBuildingLevel = toLosElevation ?? toBaseElevation + 1;

  return fromBuildingId && fromBuildingId === toBuildingId
    ? {
        buildingId: fromBuildingId,
        endpointElevationDifference: Math.abs(
          fromBuildingLevel - toBuildingLevel,
        ),
      }
    : undefined;
}

function sameBuildingHexCount(
  feature: ITerrainFeature,
  sameBuildingContext: ISameBuildingContext | undefined,
): number {
  if (
    feature.type !== TerrainType.Building ||
    feature.buildingId === undefined ||
    feature.buildingId !== sameBuildingContext?.buildingId
  ) {
    return 0;
  }

  return 1;
}

/**
 * Calculate the LOS height at a specific point along the line.
 * Uses linear interpolation between shooter and target heights.
 *
 * @param fromHeight - Shooter elevation
 * @param toHeight - Target elevation
 * @param totalDistance - Total distance in hexes
 * @param currentDistance - Distance to current hex
 * @returns The interpolated height at this point
 */
function interpolateLOSHeight(
  fromHeight: number,
  toHeight: number,
  totalDistance: number,
  currentDistance: number,
): number {
  if (totalDistance === 0) return fromHeight;
  const t = currentDistance / totalDistance;
  return fromHeight + (toHeight - fromHeight) * t;
}

function terrainBlocksNonDiagramLOS(options: {
  readonly terrainHeight: number;
  readonly currentDistance: number;
  readonly shooterHeight: number;
  readonly targetDistance: number;
  readonly targetHeight: number;
}): boolean {
  const {
    currentDistance,
    shooterHeight,
    terrainHeight,
    targetDistance,
    targetHeight,
  } = options;
  const maxEndpointHeight = Math.max(shooterHeight, targetHeight);

  return (
    terrainHeight > maxEndpointHeight ||
    (currentDistance === 1 && terrainHeight > shooterHeight) ||
    (targetDistance === 1 && terrainHeight > targetHeight)
  );
}

function buildingBlocksNonDiagramLOS(options: {
  readonly buildingHeight: number;
  readonly currentDistance: number;
  readonly shooterHeight: number;
  readonly targetDistance: number;
  readonly targetHeight: number;
}): boolean {
  return terrainBlocksNonDiagramLOS({
    terrainHeight: options.buildingHeight,
    currentDistance: options.currentDistance,
    shooterHeight: options.shooterHeight,
    targetDistance: options.targetDistance,
    targetHeight: options.targetHeight,
  });
}

const LINE_PIXEL_NUDGE = 0.001;
const SQRT_3 = Math.sqrt(3);

function axialToLinePixel(coord: IHexCoordinate): { x: number; y: number } {
  return {
    x: coord.q * SQRT_3,
    y: 2 * coord.r + coord.q,
  };
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundCubeToAxial(cube: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}): IHexCoordinate {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  const axial = cubeToAxial({ x: rx, y: ry, z: rz });
  return {
    q: normalizeZero(axial.q),
    r: normalizeZero(axial.r),
  };
}

function hexLineWithPerpendicularNudge(
  from: IHexCoordinate,
  to: IHexCoordinate,
  side: -1 | 1,
): readonly IHexCoordinate[] {
  const distance = hexDistance(from, to);
  if (distance === 0) return [from];

  const fromPixel = axialToLinePixel(from);
  const toPixel = axialToLinePixel(to);
  const dx = toPixel.x - fromPixel.x;
  const dy = toPixel.y - fromPixel.y;
  const length = Math.hypot(dx, dy);
  const normalX = (-dy / length) * LINE_PIXEL_NUDGE * side;
  const normalY = (dx / length) * LINE_PIXEL_NUDGE * side;

  const line: IHexCoordinate[] = [];
  for (let i = 0; i <= distance; i++) {
    if (i === 0) {
      line.push(from);
      continue;
    }
    if (i === distance) {
      line.push(to);
      continue;
    }

    const t = i / distance;
    const x = fromPixel.x + (toPixel.x - fromPixel.x) * t + normalX;
    const y = fromPixel.y + (toPixel.y - fromPixel.y) * t + normalY;
    const q = x / SQRT_3;
    const r = (y - q) / 2;
    line.push(roundCubeToAxial({ x: q, y: -q - r, z: r }));
  }

  return line;
}

function isDividedLosBearing(
  from: IHexCoordinate,
  to: IHexCoordinate,
): boolean {
  return hexAngle(from, to) % 60 === 30;
}

function interveningHexesForLine(
  lineHexes: readonly IHexCoordinate[],
  from: IHexCoordinate,
  to: IHexCoordinate,
): readonly IHexCoordinate[] {
  return lineHexes.filter(
    (hex) => !hexEquals(hex, from) && !hexEquals(hex, to),
  );
}

function losSeverity(result: ILOSResult): number {
  if (!result.hasLOS) return Number.POSITIVE_INFINITY;
  return result.interveningTerrainEffects.reduce(
    (sum, effect) => sum + effect.modifier,
    0,
  );
}

function defenderFavorableDividedResult(
  left: ILOSResult,
  right: ILOSResult,
): ILOSResult {
  return losSeverity(left) >= losSeverity(right) ? left : right;
}

// =============================================================================
// Main LOS Calculation
// =============================================================================

function calculateLOSForInterveningHexes(options: {
  readonly interveningHexes: readonly IHexCoordinate[];
  readonly grid: IHexGrid;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly sameBuildingContext: ISameBuildingContext | undefined;
  readonly fromWater: IEndpointWaterStatus;
  readonly toWater: IEndpointWaterStatus;
  readonly initialMinimumWaterDepth: number;
  readonly tacOpsLosDiagram: boolean;
  readonly occupants: ILOSCalculationOptions['occupants'];
}): ILOSResult {
  const {
    fromWater,
    grid,
    initialMinimumWaterDepth: initialWaterDepth,
    interveningHexes,
    occupants,
    sameBuildingContext,
    shooterHeight,
    tacOpsLosDiagram,
    targetHeight,
    toWater,
  } = options;
  const totalDistance = interveningHexes.length + 1; // +1 for target
  const interveningTerrainEffects: ILOSInterveningTerrainEffect[] = [];
  const damageableCoverProviders: ILOSDamageableCoverProvider[] = [];
  let cumulativeWoodsSmokeLosDensity = 0;
  let cumulativeHeavyIndustrial = 0;
  let cumulativePlantedFields = 0;
  let sameBuildingHexes = sameBuildingContext?.endpointElevationDifference ?? 0;
  const minimumWaterDepth = pathMinimumWaterDepth(
    initialWaterDepth,
    interveningHexes,
    grid,
  );

  const underwaterClearBlocker = underwaterMinimumWaterBlocker(
    fromWater,
    toWater,
    interveningHexes,
    grid,
  );
  if (underwaterClearBlocker !== undefined) {
    return {
      hasLOS: false,
      blockedBy: underwaterClearBlocker,
      blockingTerrain: TerrainType.Water,
      interveningHexes,
      interveningTerrainEffects,
      minimumWaterDepth,
      damageableCoverProviders,
    };
  }

  // Check each intervening hex for blocking terrain
  for (let i = 0; i < interveningHexes.length; i++) {
    const hex = interveningHexes[i];
    const hexData = grid.hexes.get(coordToKey(hex));

    if (!hexData) {
      continue; // No data = clear terrain
    }

    const currentDistance = i + 1;
    const targetDistance = totalDistance - currentDistance;
    const losHeight = interpolateLOSHeight(
      shooterHeight,
      targetHeight,
      totalDistance,
      currentDistance,
    );

    // Get terrain features and check if any block LOS
    const features = parseTerrainFeatures(hexData.terrain);
    const cumulativeTerrainEffects: (ILOSInterveningTerrainEffect & {
      readonly losDensity: number;
      readonly losDensityFamily: LOSDensityFamily;
    })[] = [];
    const occupant = occupantStateForHex(hexData.occupantId, occupants);
    if (
      occupant !== undefined &&
      hexData.occupantId !== null &&
      isDropShipUnit(occupant) &&
      isGroundedUnit(occupant)
    ) {
      const groundedDropShipHeight =
        hexData.elevation + GROUNDED_DROPSHIP_COVER_HEIGHT;
      const damageableCoverProvider =
        damageableCoverProviderForGroundedDropShip({
          coord: hex,
          occupantId: hexData.occupantId,
          occupant,
          totalElevation: groundedDropShipHeight,
          currentDistance,
          targetDistance,
          shooterHeight,
          targetHeight,
        });
      if (damageableCoverProvider !== undefined) {
        damageableCoverProviders.push(damageableCoverProvider);
      }

      if (
        buildingBlocksNonDiagramLOS({
          buildingHeight: groundedDropShipHeight,
          currentDistance,
          shooterHeight,
          targetDistance,
          targetHeight,
        })
      ) {
        return {
          hasLOS: false,
          blockedBy: hex,
          interveningHexes,
          interveningTerrainEffects,
          minimumWaterDepth,
          damageableCoverProviders,
        };
      }
    }

    for (const feature of features) {
      const props = TERRAIN_PROPERTIES[feature.type];

      if (!props) {
        continue;
      }

      const sameBuildingHexesForFeature = sameBuildingHexCount(
        feature,
        sameBuildingContext,
      );
      sameBuildingHexes += sameBuildingHexesForFeature;
      if (sameBuildingHexes > 2) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: feature.type,
          interveningHexes,
          interveningTerrainEffects,
          minimumWaterDepth,
          damageableCoverProviders,
        };
      }
      if (sameBuildingHexesForFeature > 0) {
        continue;
      }

      const losDensity = interveningLosDensity(feature);
      if (losDensity > 0) {
        const targetDistance = totalDistance - currentDistance;
        if (
          terrainFeatureAffectsLOS({
            feature,
            hexElevation: hexData.elevation,
            losHeight,
            shooterHeight,
            targetHeight,
            currentDistance,
            targetDistance,
            tacOpsLosDiagram,
          })
        ) {
          cumulativeTerrainEffects.push({
            coord: hex,
            terrain: feature.type,
            modifier: losDensity,
            losDensity,
            losDensityFamily: losDensityFamily(feature),
          });
        }
        continue;
      }

      if (!props.blocksLOS) {
        continue;
      }

      const terrainHeight = getTerrainHeight(feature, props);
      const blockingHeight = hexData.elevation + terrainHeight;
      const damageableCoverProvider = damageableCoverProviderForFeature({
        coord: hex,
        feature,
        height: terrainHeight,
        totalElevation: blockingHeight,
        currentDistance,
        targetDistance,
        shooterHeight,
        targetHeight,
      });
      if (damageableCoverProvider !== undefined) {
        damageableCoverProviders.push(damageableCoverProvider);
      }

      if (
        feature.type === TerrainType.Building &&
        buildingBlocksNonDiagramLOS({
          buildingHeight: blockingHeight,
          currentDistance,
          shooterHeight,
          targetDistance,
          targetHeight,
        })
      ) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: feature.type,
          interveningHexes,
          interveningTerrainEffects,
          minimumWaterDepth,
          damageableCoverProviders,
        };
      }

      if (feature.type !== TerrainType.Building && blockingHeight > losHeight) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: feature.type,
          interveningHexes,
          interveningTerrainEffects,
          minimumWaterDepth,
          damageableCoverProviders,
        };
      }
    }

    for (const terrainEffect of cumulativeTerrainEffects) {
      let modifier = terrainEffect.modifier;
      switch (terrainEffect.losDensityFamily) {
        case 'heavy-industrial':
          cumulativeHeavyIndustrial += 1;
          break;
        case 'planted-field':
          cumulativePlantedFields += 1;
          modifier = cumulativePlantedFields % 2 === 0 ? 1 : 0;
          break;
        case 'woods-smoke':
          cumulativeWoodsSmokeLosDensity += terrainEffect.losDensity;
          break;
      }
      interveningTerrainEffects.push({
        coord: terrainEffect.coord,
        terrain: terrainEffect.terrain,
        modifier,
      });

      if (
        cumulativeWoodsSmokeLosDensity > 2 ||
        cumulativeHeavyIndustrial > 2 ||
        cumulativePlantedFields > 5
      ) {
        return {
          hasLOS: false,
          blockedBy: hex,
          blockingTerrain: terrainEffect.terrain,
          interveningHexes,
          interveningTerrainEffects,
          minimumWaterDepth,
          damageableCoverProviders,
        };
      }
    }

    const underwaterCombat =
      fromWater.state === 'underwater' || toWater.state === 'underwater';
    const waterCarriesUnderwaterSightline =
      underwaterCombat && terrainWaterDepth(hexData.terrain) >= 1;

    if (!waterCarriesUnderwaterSightline && hexData.elevation > losHeight) {
      return {
        hasLOS: false,
        blockedBy: hex,
        blockingElevation: hexData.elevation,
        interveningHexes,
        interveningTerrainEffects,
        minimumWaterDepth,
        damageableCoverProviders,
      };
    }
  }

  return {
    hasLOS: true,
    interveningHexes,
    interveningTerrainEffects,
    minimumWaterDepth,
    damageableCoverProviders,
  };
}

/**
 * Calculate line of sight between two hexes.
 *
 * Implements basic BattleTech LOS rules:
 * - Draws a line from source to target
 * - Checks intervening hexes for blocking terrain
 * - Considers elevation differences, including pure intervening elevation
 *   blockers without a blocking terrain feature
 *
 * @param from - Source hex coordinate
 * @param to - Target hex coordinate
 * @param grid - Hex grid with terrain data
 * @param fromElevation - Elevation of shooter (default: hex elevation + 1 for unit height)
 * @param toElevation - Elevation of target (default: hex elevation + 1 for unit height)
 * @returns LOS result with blocking information
 */
export function calculateLOS(
  from: IHexCoordinate,
  to: IHexCoordinate,
  grid: IHexGrid,
  fromElevation?: number,
  toElevation?: number,
  options: ILOSCalculationOptions = {},
): ILOSResult {
  // Get all hexes on the line (includes endpoints)
  const lineHexes = hexLine(from, to);
  const interveningHexes = interveningHexesForLine(lineHexes, from, to);

  // Get source and target hex data
  const fromHex = grid.hexes.get(coordToKey(from));
  const toHex = grid.hexes.get(coordToKey(to));
  const fromBaseElevation = fromHex?.elevation ?? 0;
  const toBaseElevation = toHex?.elevation ?? 0;
  const fromWater = endpointWaterStatus({
    terrainString: fromHex?.terrain,
    baseElevation: fromBaseElevation,
    losElevation: fromElevation,
  });
  const toWater = endpointWaterStatus({
    terrainString: toHex?.terrain,
    baseElevation: toBaseElevation,
    losElevation: toElevation,
  });
  const initialWaterDepth = initialMinimumWaterDepth(fromWater, toWater);

  if (!hexEquals(from, to) && landToUnderwaterBlocked(fromWater, toWater)) {
    const blockedBy = toWater.state === 'underwater' ? to : from;

    return {
      hasLOS: false,
      blockedBy,
      blockingTerrain: TerrainType.Water,
      interveningHexes,
      interveningTerrainEffects: [],
      minimumWaterDepth: initialWaterDepth,
      damageableCoverProviders: [],
    };
  }

  // If adjacent, always have LOS unless endpoint water state blocks above.
  if (interveningHexes.length === 0) {
    return {
      hasLOS: true,
      interveningHexes: [],
      interveningTerrainEffects: [],
      minimumWaterDepth: initialWaterDepth,
      damageableCoverProviders: [],
    };
  }

  // Calculate effective heights (hex elevation + unit height of 1)
  const shooterHeight = fromElevation ?? fromBaseElevation + 1;
  const targetHeight = toElevation ?? toBaseElevation + 1;
  const sameBuildingContext = sharedEndpointBuildingContext({
    fromHexTerrain: fromHex?.terrain,
    fromBaseElevation,
    fromLosElevation: fromElevation,
    toHexTerrain: toHex?.terrain,
    toBaseElevation,
    toLosElevation: toElevation,
  });

  const sharedOptions = {
    grid,
    shooterHeight,
    targetHeight,
    sameBuildingContext,
    fromWater,
    toWater,
    initialMinimumWaterDepth: initialWaterDepth,
    tacOpsLosDiagram: options.tacOpsLosDiagram ?? true,
    occupants: options.occupants,
  };

  if (isDividedLosBearing(from, to)) {
    const leftLine = hexLineWithPerpendicularNudge(from, to, 1);
    const rightLine = hexLineWithPerpendicularNudge(from, to, -1);
    return defenderFavorableDividedResult(
      calculateLOSForInterveningHexes({
        ...sharedOptions,
        interveningHexes: interveningHexesForLine(leftLine, from, to),
      }),
      calculateLOSForInterveningHexes({
        ...sharedOptions,
        interveningHexes: interveningHexesForLine(rightLine, from, to),
      }),
    );
  }

  return calculateLOSForInterveningHexes({
    ...sharedOptions,
    interveningHexes,
  });
}

function formatTerrainLabel(terrain: TerrainType): string {
  return terrain.replace(/_/g, ' ');
}

function formatTerrainList(terrains: readonly TerrainType[]): string {
  const labels = terrains.map(formatTerrainLabel);
  if (labels.length <= 1) return labels[0] ?? 'terrain';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function formatElevationLabel(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

function stackedBlockingTerrainLabel(result: ILOSResult): string | undefined {
  const blockedBy = result.blockedBy;
  if (!blockedBy || !result.blockingTerrain) return undefined;

  const stackedTerrains = result.interveningTerrainEffects
    .filter(
      (effect) =>
        hexEquals(effect.coord, blockedBy) &&
        (effect.terrain === TerrainType.LightWoods ||
          effect.terrain === TerrainType.HeavyWoods ||
          effect.terrain === TerrainType.Smoke),
    )
    .map((effect) => effect.terrain);

  const uniqueTerrains = Array.from(new Set(stackedTerrains));
  return uniqueTerrains.length > 1
    ? formatTerrainList(uniqueTerrains)
    : undefined;
}

export function formatLOSBlockedDetails(result: ILOSResult): string {
  const blockedBy = result.blockedBy;
  if (!blockedBy) return 'Line of sight blocked';

  const hexLabel = `(${blockedBy.q}, ${blockedBy.r})`;
  if (result.blockingTerrain) {
    return `Blocked by ${
      stackedBlockingTerrainLabel(result) ??
      formatTerrainLabel(result.blockingTerrain)
    } at ${hexLabel}`;
  }
  if (result.blockingElevation !== undefined) {
    return `Blocked by elevation ${formatElevationLabel(result.blockingElevation)} at ${hexLabel}`;
  }
  return `Line of sight blocked at ${hexLabel}`;
}

/**
 * Check if a specific hex blocks LOS.
 * Utility function for checking individual hexes.
 *
 * @param hex - The hex to check
 * @param grid - Hex grid with terrain data
 * @returns The blocking terrain type if it blocks, undefined otherwise
 */
export function getBlockingTerrain(
  hex: IHexCoordinate,
  grid: IHexGrid,
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));

  if (!hexData) {
    return undefined;
  }

  const features = parseTerrainFeatures(hexData.terrain);

  for (const feature of features) {
    const props = TERRAIN_PROPERTIES[feature.type];
    if (interveningLosDensity(feature) > 0) {
      continue;
    }
    if (props?.blocksLOS) {
      return feature.type;
    }
  }

  return undefined;
}

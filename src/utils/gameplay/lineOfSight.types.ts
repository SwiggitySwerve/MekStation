import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { TerrainType } from '@/types/gameplay/TerrainTypes';

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

export type LOSDensityFamily =
  | 'woods-smoke'
  | 'heavy-industrial'
  | 'planted-field';

export type EndpointWaterState = 'land' | 'in-water' | 'underwater';

export interface IEndpointWaterContext {
  readonly terrainString: string | undefined;
  readonly baseElevation: number;
  readonly losElevation?: number;
}

export interface IEndpointWaterStatus {
  readonly state: EndpointWaterState;
  readonly depth: number;
}

export interface ISameBuildingContext {
  readonly buildingId: string;
  readonly endpointElevationDifference: number;
}

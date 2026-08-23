import {
  IHexCoordinate,
  type IPhysicalDominoStepOutContextPayload,
  type IPhysicalDominoStepOutDecisionPayload,
  type IPhysicalDominoStepOutOptionPayload,
  IPhysicalDisplacement,
} from '@/types/gameplay';

export const DISPLACEMENT_OFFSETS = [0, 1, 5, 2, 4, 3] as const;
export const BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE = 2;
export const BATTLEMECH_PROHIBITED_DISPLACEMENT_TERRAINS = new Set([
  'impassable',
]);
export const BATTLEMECH_DISPLACEMENT_WOODS_TERRAINS = new Set([
  'woods',
  'light_woods',
  'heavy_woods',
  'ultra_woods',
]);
export const BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT = 2;

export interface IDisplacementTerrainFeature {
  readonly type: string;
  readonly level: number;
}

export interface IDfaDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
}

export interface IChargeDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IPushDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IBreakGrappleDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IDisplacementLegalityOptions {
  readonly excludeUnitId?: string;
  readonly source?: IHexCoordinate;
  readonly maxElevationChange?: number;
}

export interface IPreferredDisplacementOptions {
  readonly friendlyUnitIds?: readonly string[];
}

export interface IValidDisplacementSearchOptions {
  readonly sourceContainsGroundedDropShip?: boolean;
}

export type IDisplacementBlockerStepOutOption =
  IPhysicalDominoStepOutOptionPayload;
export type IDisplacementBlockerStepOutContext =
  IPhysicalDominoStepOutContextPayload;
export type IDisplacementBlockerStepOutDecision =
  IPhysicalDominoStepOutDecisionPayload;

export interface IDisplacementDominoResolutionOptions {
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
}

export interface IDisplacementSourceUnit {
  readonly id: string;
  readonly unitType?: string;
  readonly isAirborne?: boolean;
  readonly boardId?: string;
  readonly position: IHexCoordinate;
}

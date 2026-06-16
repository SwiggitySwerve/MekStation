/**
 * Event payloads for represented carryable ground objects.
 */

import type { IHexCoordinate } from './HexGridInterfaces';

export type GroundObjectCarryLocation = 'leftArm' | 'rightArm' | 'both';

export interface IRepresentedGroundObjectState {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly position?: IHexCoordinate;
  readonly carriedByUnitId?: string;
  readonly carryLocation?: GroundObjectCarryLocation;
  readonly destroyed?: boolean;
  readonly invulnerable?: boolean;
}

export interface IGroundObjectPickedUpPayload {
  readonly unitId: string;
  readonly objectId: string;
  readonly object: IRepresentedGroundObjectState;
  readonly from: IHexCoordinate;
  readonly carryLocation: GroundObjectCarryLocation;
  readonly capacityTonnage: number;
  readonly capacityMarginTonnage: number;
}

export interface IGroundObjectDroppedPayload {
  readonly unitId: string;
  readonly objectId: string;
  readonly to: IHexCoordinate;
  readonly reason: 'drop' | 'throw';
}

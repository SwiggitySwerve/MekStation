/**
 * Space Station Unit Handler - Types
 *
 * Type definitions for the SpaceStation handler triplet. Lives as a
 * leaf module so `.calculations.ts` and `.helpers.ts` can reference
 * these types without back-importing from the orchestrator (which
 * would create a circular dependency).
 *
 * Mirrors the WarShip handler's topology, where types live in
 * `@/types/unit/CapitalShipInterfaces` and the leaves never import
 * from the orchestrator.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import {
  AerospaceMotionType,
  IBaseUnit,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  ICapitalCrewConfiguration,
  ICapitalMountedEquipment,
  ICrewQuarters,
  ITransportBay,
} from '@/types/unit/CapitalShipInterfaces';

import type { AerospaceUnitCoreFields } from './unitHandlerShared';

/**
 * Space station type
 */
export enum SpaceStationType {
  ORBITAL = 'Orbital',
  DEEP_SPACE = 'Deep Space',
  RECHARGE_STATION = 'Recharge Station',
  SHIPYARD = 'Shipyard',
  HABITAT = 'Habitat',
  MILITARY = 'Military',
}

/**
 * Space Station unit interface used by the SpaceStation handler triplet.
 *
 * NOTE: this is the handler-local shape, distinct from the canonical
 * `ISpaceStation` in `@/types/unit/CapitalShipInterfaces` which extends
 * `IAerospaceUnit`. The two shapes have lived side-by-side; this file
 * only relocates the handler-local definition to break a circular
 * import — it does not unify the shapes.
 */
export interface ISpaceStation extends IBaseUnit, AerospaceUnitCoreFields {
  readonly unitType: UnitType.SPACE_STATION;
  readonly motionType: AerospaceMotionType.SPHEROID;
  readonly stationType: SpaceStationType;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
  };
  readonly totalArmorPoints: number;
  readonly dockingCollars: number;
  readonly gravDecks: number;
  readonly crewConfiguration: ICapitalCrewConfiguration;
  readonly transportBays: readonly ITransportBay[];
  readonly quarters: readonly ICrewQuarters[];
  readonly equipment: readonly ICapitalMountedEquipment[];
  readonly escapePods: number;
  readonly lifeBoats: number;
  readonly hasHPG: boolean;
  readonly hasKFDrive: boolean;
  readonly pressurizedModules: number;
}

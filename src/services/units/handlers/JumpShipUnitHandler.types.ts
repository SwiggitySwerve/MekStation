/**
 * JumpShip Unit Handler - Types
 *
 * Type definitions for the JumpShip handler triplet. Lives as a leaf
 * module so `.calculations.ts` and `.helpers.ts` can reference these
 * types without back-importing from the orchestrator (which would
 * create a circular dependency).
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
 * JumpShip unit interface used by the JumpShip handler triplet.
 *
 * NOTE: this is the handler-local shape, distinct from the canonical
 * `IJumpShip` in `@/types/unit/CapitalShipInterfaces` which extends
 * `IAerospaceUnit` and uses a different K-F drive shape. The two
 * shapes have lived side-by-side; this file only relocates the
 * handler-local definition to break a circular import — it does not
 * unify the shapes.
 */
export interface IJumpShip extends IBaseUnit, AerospaceUnitCoreFields {
  readonly unitType: UnitType.JUMPSHIP;
  readonly motionType: AerospaceMotionType;
  readonly engineType: number;
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
  readonly kfDrive: {
    readonly rating: number;
    readonly integrityPoints: number;
    readonly hasDriveCore: boolean;
    readonly hasLithiumFusion: boolean;
  };
  readonly dockingCollars: number;
  readonly crewConfiguration: ICapitalCrewConfiguration;
  readonly transportBays: readonly ITransportBay[];
  readonly quarters: readonly ICrewQuarters[];
  readonly equipment: readonly ICapitalMountedEquipment[];
  readonly escapePods: number;
  readonly lifeBoats: number;
  readonly gravDecks: number;
  readonly hpg?: boolean;
}

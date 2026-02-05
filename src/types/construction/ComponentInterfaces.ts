/**
 * Construction Component Interfaces
 *
 * Defines interfaces for mech construction components.
 * All interfaces extend from core entity types.
 *
 * @spec openspec/specs/construction-rules-core/spec.md
 */

import {
  IEntity,
  ITechBaseEntity,
  IPlaceableComponent,
  ITemporalEntity,
  IValuedComponent,
} from '../core';
import { ArmorTypeEnum } from './ArmorType';
import { CockpitType } from './CockpitType';
import { EngineType } from './EngineType';
import { GyroType } from './GyroType';
import { HeatSinkType } from './HeatSinkType';
import { InternalStructureType } from './InternalStructureType';

/**
 * Engine component interface
 */
export interface IEngine
  extends
    ITechBaseEntity,
    IPlaceableComponent,
    ITemporalEntity,
    IValuedComponent {
  readonly engineType: EngineType;
  readonly rating: number;
  readonly ctSlots: number;
  readonly sideTorsoSlots: number;
  readonly integralHeatSinks: number;
  readonly isFusion: boolean;
}

/**
 * Gyro component interface
 */
export interface IGyro
  extends
    ITechBaseEntity,
    IPlaceableComponent,
    ITemporalEntity,
    IValuedComponent {
  readonly gyroType: GyroType;
  readonly hitsToDestroy: number;
}

/**
 * Internal structure component interface
 */
export interface IInternalStructure extends ITechBaseEntity, ITemporalEntity {
  readonly structureType: InternalStructureType;
  readonly distributedSlots: number;
  readonly structurePointMultiplier: number;
  readonly points: Record<string, number>;
}

/**
 * Heat sink component interface
 */
export interface IHeatSink
  extends ITechBaseEntity, IPlaceableComponent, ITemporalEntity {
  readonly heatSinkType: HeatSinkType;
  readonly dissipation: number;
  readonly isIntegrated: boolean;
}

/**
 * Armor component interface
 */
export interface IArmor extends ITechBaseEntity, ITemporalEntity {
  readonly armorType: ArmorTypeEnum;
  readonly pointsPerTon: number;
  readonly distributedSlots: number;
  readonly allocation: IArmorAllocation;
}

/**
 * Armor allocation by location
 */
export interface IArmorAllocation {
  readonly head: number;
  readonly centerTorso: number;
  readonly centerTorsoRear: number;
  readonly leftTorso: number;
  readonly leftTorsoRear: number;
  readonly rightTorso: number;
  readonly rightTorsoRear: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
}

/**
 * Cockpit component interface
 */
export interface ICockpit
  extends ITechBaseEntity, IPlaceableComponent, ITemporalEntity {
  readonly cockpitType: CockpitType;
  readonly headSlots: number;
  readonly otherSlots: number;
}

/**
 * Movement enhancement interface (MASC, TSM, Supercharger)
 */
export interface IMovementEnhancement
  extends ITechBaseEntity, IPlaceableComponent, ITemporalEntity {
  readonly enhancementType: 'MASC' | 'TSM' | 'Supercharger' | 'PartialWing';
  readonly movementBonus: number;
  readonly isExclusive: boolean; // Can't combine with same type
}

/**
 * Jump jet component interface
 */
export interface IJumpJet
  extends ITechBaseEntity, IPlaceableComponent, ITemporalEntity {
  readonly jumpJetType: string;
  readonly jumpMP: number;
}

/**
 * Full mech configuration containing all structural components
 */
export interface IMechConfiguration extends IEntity {
  readonly tonnage: number;
  readonly engine: IEngine;
  readonly gyro: IGyro;
  readonly internalStructure: IInternalStructure;
  readonly armor: IArmor;
  readonly cockpit: ICockpit;
  readonly heatSinks: {
    readonly type: HeatSinkType;
    readonly total: number;
    readonly integrated: number;
    readonly external: number;
  };
  readonly movement: {
    readonly walkMP: number;
    readonly runMP: number;
    readonly jumpMP: number;
    readonly jumpJetType?: string;
  };
  readonly enhancements: IMovementEnhancement[];
}

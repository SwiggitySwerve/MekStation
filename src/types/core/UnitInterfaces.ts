/**
 * UnitInterfaces.ts - STUB FILE
 * Unit interface definitions
 * TODO: Replace with spec-driven implementation from 
 */

import { TechBase, RulesLevel, EntityId } from './index';

export interface IUnit {
  readonly id: EntityId;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage: number;
  readonly mass?: number; // Alias for tonnage in some formats
  readonly unitType: string;
}

export interface IBattleMech extends IUnit {
  readonly unitType: 'BattleMech';
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
}

export interface IVehicle extends IUnit {
  readonly unitType: 'Vehicle';
  readonly cruiseMP: number;
  readonly flankMP: number;
}

export interface MountedBattleArmor {
  id: string;
  name: string;
  type: string;
  location: string;
  troopers: number;
}

// LAMMode and QuadVeeMode enums are defined in MechConfigurationSystem.ts
// Re-export them here for backward compatibility if needed
export { LAMMode, QuadVeeMode } from '../construction/MechConfigurationSystem';


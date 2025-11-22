/**
 * BattleMech.ts
 * The Aggregate Root for a BattleMech.
 */

import { TechBase, RulesLevel } from './TechBase';
import { 
  IEngine, 
  IGyro, 
  ICockpit, 
  IStructure, 
  IArmor, 
  IHeatSinkSystem 
} from './SystemComponents';
import { IEquipment } from './Equipment';

export interface IBattleMech {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage: number;
  
  // Systems
  readonly engine: IEngine;
  readonly gyro: IGyro;
  readonly cockpit: ICockpit;
  readonly structure: IStructure;
  readonly armor: IArmor;
  readonly heatSinks: IHeatSinkSystem;
  
  // Inventory / Critical Slots
  readonly equipment: IInstalledEquipment[];
}

export interface IInstalledEquipment {
  readonly id: string; // Instance ID
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number; // Start slot
  readonly slotsUsed: number;
}


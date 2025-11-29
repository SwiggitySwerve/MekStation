/**
 * UnitStateManager - STUB FILE
 * Comprehensive stub with all methods required by UI
 * TODO: Replace with spec-driven implementation
 */

import { UnitConfiguration } from './UnitCriticalManagerTypes';
import { UnitCriticalManager } from './UnitCriticalManager';
import { EquipmentAllocation } from './CriticalSlot';
import { EngineType, GyroType } from '../../types/systemComponents';

export interface UnitState {
  id: string;
  name: string;
  isDirty: boolean;
  lastModified: Date;
}

export interface UnitSummary {
  id: string;
  name: string;
  tonnage: number;
  techBase: string;
  chassis?: string;
  model?: string;
  variant?: string;
}

export interface UnitSummaryResult {
  validation: Record<string, unknown>;
  summary: UnitSummary;
}

type Listener = () => void;

export class UnitStateManager {
  private currentState: UnitState | null = null;
  private config: UnitConfiguration | null = null;
  private listeners: Set<Listener> = new Set();
  private unit: UnitCriticalManager;

  constructor(initialConfig?: UnitConfiguration) {
    if (initialConfig) {
      this.config = initialConfig;
    }
    this.unit = new UnitCriticalManager();
  }

  // Unit access
  getCurrentUnit(): UnitCriticalManager {
    return this.unit;
  }

  getUnitSummary(): UnitSummaryResult {
    const config = this.config || this.unit.getConfiguration();
    return {
      validation: {},
      summary: {
        id: config?.id || 'new-unit',
        name: config?.name || 'New Mech',
        tonnage: config?.tonnage || 50,
        techBase: config?.techBase || 'Inner Sphere',
      }
    };
  }

  // Subscription methods
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: Listener): void {
    this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // State methods
  getState(): UnitState | null {
    return this.currentState;
  }

  setState(state: UnitState): void {
    this.currentState = state;
    this.notify();
  }

  // Config methods
  getConfig(): UnitConfiguration | null {
    return this.config;
  }

  setConfig(config: UnitConfiguration): void {
    this.config = config;
    this.notify();
  }

  handleConfigurationUpdate(config: UnitConfiguration): void {
    this.config = config;
    this.markDirty();
    this.notify();
  }

  // Dirty state methods
  markDirty(): void {
    if (this.currentState) {
      this.currentState.isDirty = true;
      this.currentState.lastModified = new Date();
    }
  }

  markClean(): void {
    if (this.currentState) {
      this.currentState.isDirty = false;
    }
  }

  clear(): void {
    this.currentState = null;
    this.config = null;
    this.notify();
  }

  // Engine/Gyro change handlers
  handleEngineChange(engineType: EngineType | string): void {
    if (this.config) {
      this.config = { ...this.config, engineType: String(engineType) };
      this.markDirty();
      this.notify();
    }
  }

  handleGyroChange(gyroType: GyroType | string): void {
    if (this.config) {
      this.config = { ...this.config, gyroType: String(gyroType) };
      this.markDirty();
      this.notify();
    }
  }

  // Equipment methods
  addTestEquipment(equipment: { name: string; requiredSlots: number }, location: string, startSlot?: number): boolean {
    console.log('UnitStateManager.addTestEquipment:', equipment.name, location, startSlot);
    return true;
  }

  addUnallocatedEquipment(equipment: EquipmentAllocation): void {
    console.log('UnitStateManager.addUnallocatedEquipment:', equipment.name);
  }

  removeEquipment(equipmentGroupId: string): boolean {
    console.log('UnitStateManager.removeEquipment:', equipmentGroupId);
    return true;
  }

  // Reset
  resetUnit(config?: UnitConfiguration): void {
    if (config) {
      this.config = config;
    }
    this.unit = new UnitCriticalManager();
    this.notify();
  }

  // Debug
  getDebugInfo(): Record<string, unknown> {
    return {
      config: this.config,
      state: this.currentState,
      unit: 'UnitCriticalManager stub'
    };
  }

  // Change handlers - stubs for UI
  changeTonnage(tonnage: number): void {
    if (this.config) {
      this.config = { ...this.config, tonnage };
      this.markDirty();
      this.notify();
    }
  }

  changeWalkMP(walkMP: number): void {
    if (this.config) {
      const runMP = Math.ceil(walkMP * 1.5);
      this.config = { ...this.config, walkMP, runMP };
      this.markDirty();
      this.notify();
    }
  }

  changeJumpMP(jumpMP: number): void {
    if (this.config) {
      this.config = { ...this.config, jumpMP };
      this.markDirty();
      this.notify();
    }
  }

  changeTechBase(techBase: string): void {
    if (this.config) {
      this.config = { ...this.config, techBase };
      this.markDirty();
      this.notify();
    }
  }

  changeEngine(engineType: string): void {
    if (this.config) {
      this.config = { ...this.config, engineType };
      this.markDirty();
      this.notify();
    }
  }

  changeGyro(gyroType: string): void {
    if (this.config) {
      this.config = { ...this.config, gyroType };
      this.markDirty();
      this.notify();
    }
  }

  changeStructure(structureType: string): void {
    if (this.config) {
      this.config = { ...this.config, structureType };
      this.markDirty();
      this.notify();
    }
  }

  changeArmor(armorType: string): void {
    if (this.config) {
      this.config = { ...this.config, armorType };
      this.markDirty();
      this.notify();
    }
  }

  changeHeatSinks(heatSinkType: string, count?: number): void {
    if (this.config) {
      this.config = { 
        ...this.config, 
        heatSinkType,
        ...(count !== undefined && { heatSinkCount: count, totalHeatSinks: count })
      };
      this.markDirty();
      this.notify();
    }
  }

  changeJumpJets(jumpJetType: string): void {
    if (this.config) {
      this.config = { ...this.config, jumpJetType };
      this.markDirty();
      this.notify();
    }
  }

  changeCockpit(cockpitType: string): void {
    if (this.config) {
      this.config = { ...this.config, cockpitType };
      this.markDirty();
      this.notify();
    }
  }
}

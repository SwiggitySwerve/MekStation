/**
 * UnitCriticalManager - STUB FILE
 * Comprehensive stub with all methods required by UI
 * TODO: Replace with spec-driven implementation
 */

import { CriticalSlotState, AllocationResult, CriticalManagerConfig, UnitConfiguration } from './UnitCriticalManagerTypes';
import { EquipmentAllocation, CriticalSlotInfo } from './CriticalSlot';
import { EngineType, GyroType } from '../../types/systemComponents';

interface CriticalSectionStub {
  getAllSlots(): CriticalSlotInfo[];
  getAllEquipment(): EquipmentAllocation[];
}

export class UnitCriticalManager {
  private state: Map<string, CriticalSlotState> = new Map();
  private config: CriticalManagerConfig;
  private unitConfig: UnitConfiguration;
  private unallocatedPool: EquipmentAllocation[] = [];

  constructor(config: Partial<CriticalManagerConfig> = {}) {
    this.config = {
      enforceRules: true,
      allowOverlap: false,
      ...config,
    };
    // Default configuration
    this.unitConfig = {
      tonnage: 50,
      techBase: 'Inner Sphere',
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      engineType: 'Standard',
      engineRating: 200,
      gyroType: 'Standard',
      cockpitType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      heatSinkType: 'Single',
      heatSinkCount: 10,
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      jumpJetType: 'Standard',
      rulesLevel: 'Standard',
    };
  }

  // Component type getters
  getEngineType(): EngineType {
    return this.unitConfig.engineType as EngineType;
  }

  getGyroType(): GyroType {
    return this.unitConfig.gyroType as GyroType;
  }

  getStructureType(): string {
    return this.unitConfig.structureType;
  }

  getArmorType(): string {
    return this.unitConfig.armorType;
  }

  // Allocation methods
  allocate(equipmentId: string, location: string, slots: number): AllocationResult {
    console.log('UnitCriticalManager.allocate:', equipmentId, location, slots);
    return { success: true, allocatedSlots: [] };
  }

  deallocate(equipmentId: string): AllocationResult {
    console.log('UnitCriticalManager.deallocate:', equipmentId);
    return { success: true };
  }

  allocateEquipmentFromPool(equipmentGroupId: string, location: string, slotIndex: number): boolean {
    console.log('UnitCriticalManager.allocateEquipmentFromPool:', equipmentGroupId, location, slotIndex);
    // Remove from unallocated pool
    const idx = this.unallocatedPool.findIndex(e => e.equipmentGroupId === equipmentGroupId);
    if (idx >= 0) {
      this.unallocatedPool.splice(idx, 1);
      return true;
    }
    return false;
  }

  // State access
  getState(location: string): CriticalSlotState | undefined {
    return this.state.get(location);
  }

  getAllSections(): CriticalSectionStub[] {
    return [];
  }

  getSection(_location: string): CriticalSectionStub | null {
    return null;
  }

  // Equipment checks
  canPlaceEquipmentInLocation(_equipmentData: { type: string }, _location: string): boolean {
    return true;
  }

  // Unallocated equipment
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return this.unallocatedPool;
  }

  addEquipment(equipment: EquipmentAllocation): boolean {
    this.unallocatedPool.push(equipment);
    return true;
  }

  removeEquipmentFromAllSections(equipmentGroupId: string): boolean {
    const idx = this.unallocatedPool.findIndex(e => e.equipmentGroupId === equipmentGroupId);
    if (idx >= 0) {
      this.unallocatedPool.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Weight/tonnage
  getRemainingTonnage(): number {
    return 10; // Stub value
  }

  getCriticalSlotBreakdown(): { totals: { overCapacity: number } } {
    return { totals: { overCapacity: 0 } };
  }

  // Configuration
  getConfiguration(): UnitConfiguration {
    return this.unitConfig;
  }

  setConfiguration(config: UnitConfiguration): void {
    this.unitConfig = config;
  }

  // Clear
  clear(): void {
    this.state.clear();
    this.unallocatedPool = [];
  }
}

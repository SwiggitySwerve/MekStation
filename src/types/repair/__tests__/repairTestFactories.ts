import {
  RepairJobStatus,
  RepairType,
  UnitLocation,
  type IDamageAssessment,
  type ILocationDamage,
  type IRepairItem,
  type IRepairJob,
} from '../RepairInterfaces';

export function createTestLocationDamage(
  overrides: Partial<ILocationDamage> = {},
): ILocationDamage {
  return {
    location: UnitLocation.CenterTorso,
    armorDamage: 10,
    armorMax: 40,
    structureDamage: 0,
    structureMax: 20,
    destroyedComponents: [],
    damagedComponents: [],
    ...overrides,
  };
}

export function createTestAssessment(
  overrides: Partial<IDamageAssessment> = {},
): IDamageAssessment {
  return {
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    locationDamage: [createTestLocationDamage()],
    totalArmorDamage: 10,
    totalArmorMax: 40,
    totalStructureDamage: 0,
    totalStructureMax: 20,
    allDestroyedComponents: [],
    allDamagedComponents: [],
    operationalPercent: 85,
    isDestroyed: false,
    ...overrides,
  };
}

export function createTestRepairItem(
  overrides: Partial<IRepairItem> = {},
): IRepairItem {
  return {
    id: 'item-1',
    type: RepairType.Armor,
    location: UnitLocation.CenterTorso,
    pointsToRestore: 10,
    cost: 1000,
    timeHours: 1,
    selected: true,
    ...overrides,
  };
}

export function createTestRepairJob(
  overrides: Partial<IRepairJob> = {},
): IRepairJob {
  return {
    id: 'job-1',
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    campaignId: 'campaign-1',
    status: RepairJobStatus.Pending,
    items: [createTestRepairItem()],
    totalCost: 1000,
    totalTimeHours: 1,
    timeRemainingHours: 1,
    priority: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

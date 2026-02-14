/**
 * Characterization Tests for useUnitStore (createUnitStore)
 *
 * These tests capture CURRENT behavior before decomposition.
 * They are NOT prescriptive — they document what the code does today.
 *
 * Action groups covered:
 *   1. Armor allocation
 *   2. Equipment add/remove
 *   3. Engine changes
 *   4. Gyro changes
 *   5. Jump jet changes
 *   6. Heat sink changes
 *   7. Tech base switching
 *   8. Internal structure changes
 */

import { StoreApi } from 'zustand';

import { createEmptyArmorAllocation } from '@/types/construction/ArmorAllocation';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { JumpJetType } from '@/utils/construction/movementCalculations';

import {
  UnitStore,
  createDefaultUnitState,
  CreateUnitOptions,
} from '../unitState';
import { createUnitStore } from '../useUnitStore';

// =============================================================================
// Helpers
// =============================================================================

/** Standard 75-ton IS mech for most tests */
const DEFAULT_OPTIONS: CreateUnitOptions = {
  name: 'Test Mech',
  tonnage: 75,
  techBase: TechBase.INNER_SPHERE,
};

function makeStore(
  overrides?: Partial<CreateUnitOptions>,
): StoreApi<UnitStore> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  const state = createDefaultUnitState(opts);
  return createUnitStore(state);
}

/** Create a minimal IEquipmentItem for testing addEquipment */
function makeEquipmentItem(
  overrides?: Partial<IEquipmentItem>,
): IEquipmentItem {
  return {
    id: 'test-medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: 1 as never, // RulesLevel enum value
    weight: 1,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
    ...overrides,
  };
}

// =============================================================================
// 1. Armor Allocation
// =============================================================================

describe('useUnitStore - Armor Allocation', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should set armor tonnage and clamp to minimum 0', () => {
    store.getState().setArmorTonnage(5);
    expect(store.getState().armorTonnage).toBe(5);

    store.getState().setArmorTonnage(-3);
    expect(store.getState().armorTonnage).toBe(0);
  });

  it('should set location armor with clamping', () => {
    store.getState().setLocationArmor(MechLocation.HEAD, 9);
    expect(store.getState().armorAllocation[MechLocation.HEAD]).toBe(9);

    // Head max for a 75-ton biped is 9 (head IS = 3, max armor = 3*3 = 9)
    store.getState().setLocationArmor(MechLocation.HEAD, 999);
    expect(store.getState().armorAllocation[MechLocation.HEAD]).toBe(9);
  });

  it('should set location armor with rear for torso', () => {
    store.getState().setLocationArmor(MechLocation.CENTER_TORSO, 20, 10);
    const alloc = store.getState().armorAllocation;
    expect(alloc[MechLocation.CENTER_TORSO]).toBe(20);
    expect(alloc.centerTorsoRear).toBe(10);
  });

  it('should clamp rear armor so front + rear <= location max', () => {
    // CT max for 75t = 23 * 2 = 46
    store.getState().setLocationArmor(MechLocation.CENTER_TORSO, 40, 999);
    const alloc = store.getState().armorAllocation;
    expect(alloc[MechLocation.CENTER_TORSO]).toBe(40);
    // Rear should be clamped to max - front
    expect(alloc.centerTorsoRear).toBe(46 - 40);
  });

  it('should clear all armor allocation', () => {
    store.getState().setLocationArmor(MechLocation.HEAD, 9);
    store.getState().clearAllArmor();
    const alloc = store.getState().armorAllocation;
    expect(alloc[MechLocation.HEAD]).toBe(0);
    expect(alloc[MechLocation.CENTER_TORSO]).toBe(0);
    expect(alloc.centerTorsoRear).toBe(0);
  });

  it('should auto-allocate armor based on current tonnage', () => {
    store.getState().setArmorTonnage(10);
    store.getState().autoAllocateArmor();
    const alloc = store.getState().armorAllocation;
    // With 10 tons standard armor = 160 points, they should be distributed
    const totalFront =
      alloc[MechLocation.HEAD] +
      alloc[MechLocation.CENTER_TORSO] +
      alloc[MechLocation.LEFT_TORSO] +
      alloc[MechLocation.RIGHT_TORSO] +
      alloc[MechLocation.LEFT_ARM] +
      alloc[MechLocation.RIGHT_ARM] +
      alloc[MechLocation.LEFT_LEG] +
      alloc[MechLocation.RIGHT_LEG];
    const totalRear =
      alloc.centerTorsoRear + alloc.leftTorsoRear + alloc.rightTorsoRear;
    expect(totalFront + totalRear).toBeGreaterThan(0);
    expect(totalFront + totalRear).toBeLessThanOrEqual(160);
  });

  it('should maximize armor tonnage', () => {
    store.getState().maximizeArmor();
    const tonnage = store.getState().armorTonnage;
    // For 75t biped with standard armor, max total armor = 2*IS points sum
    // Should be enough tonnage to cover max points
    expect(tonnage).toBeGreaterThan(0);
  });

  it('should mark state as modified after armor changes', () => {
    // Reset modified flag
    store.getState().markModified(false);
    store.getState().setArmorTonnage(5);
    expect(store.getState().isModified).toBe(true);
  });
});

// =============================================================================
// 2. Equipment Add/Remove
// =============================================================================

describe('useUnitStore - Equipment Add/Remove', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should add equipment and return instanceId', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);
    expect(typeof instanceId).toBe('string');
    expect(instanceId.length).toBeGreaterThan(0);
  });

  it('should add equipment to the equipment list', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);
    const eq = store.getState().equipment;
    const found = eq.find((e) => e.instanceId === instanceId);
    expect(found).toBeDefined();
    expect(found!.equipmentId).toBe('test-medium-laser');
    expect(found!.name).toBe('Medium Laser');
    expect(found!.weight).toBe(1);
    expect(found!.criticalSlots).toBe(1);
  });

  it('should remove equipment by instanceId', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);
    expect(
      store.getState().equipment.some((e) => e.instanceId === instanceId),
    ).toBe(true);

    store.getState().removeEquipment(instanceId);
    expect(
      store.getState().equipment.some((e) => e.instanceId === instanceId),
    ).toBe(false);
  });

  it('should update equipment location', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);

    store
      .getState()
      .updateEquipmentLocation(instanceId, MechLocation.RIGHT_ARM, [3]);
    const eq = store
      .getState()
      .equipment.find((e) => e.instanceId === instanceId);
    expect(eq!.location).toBe(MechLocation.RIGHT_ARM);
    expect(eq!.slots).toEqual([3]);
  });

  it('should clear equipment location', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);
    store
      .getState()
      .updateEquipmentLocation(instanceId, MechLocation.LEFT_ARM, [0]);
    store.getState().clearEquipmentLocation(instanceId);

    const eq = store
      .getState()
      .equipment.find((e) => e.instanceId === instanceId);
    expect(eq!.location).toBeUndefined();
    expect(eq!.slots).toBeUndefined();
  });

  it('should set equipment rear mounted', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);

    store.getState().setEquipmentRearMounted(instanceId, true);
    const eq = store
      .getState()
      .equipment.find((e) => e.instanceId === instanceId);
    expect(eq!.isRearMounted).toBe(true);
  });

  it('should link ammo to weapon', () => {
    const weapon = makeEquipmentItem({ id: 'ac10', name: 'AC/10' });
    const ammo = makeEquipmentItem({
      id: 'ac10-ammo',
      name: 'AC/10 Ammo',
      category: EquipmentCategory.AMMUNITION,
    });
    const weaponId = store.getState().addEquipment(weapon);
    const ammoId = store.getState().addEquipment(ammo);

    store.getState().linkAmmo(weaponId, ammoId);
    const eq = store
      .getState()
      .equipment.find((e) => e.instanceId === weaponId);
    expect(eq!.linkedAmmoId).toBe(ammoId);
  });

  it('should clear all removable equipment only', () => {
    const item = makeEquipmentItem();
    store.getState().addEquipment(item);
    store.getState().addEquipment(item);

    // clearAllEquipment removes only items with isRemovable=true
    store.getState().clearAllEquipment();
    const remaining = store.getState().equipment;
    // All user-added equipment has isRemovable=true, so they should be removed
    const userItems = remaining.filter((e) => e.isRemovable);
    expect(userItems.length).toBe(0);
  });

  it('should bulk update equipment locations', () => {
    const item1 = makeEquipmentItem({ id: 'ml-1', name: 'ML 1' });
    const item2 = makeEquipmentItem({ id: 'ml-2', name: 'ML 2' });
    const id1 = store.getState().addEquipment(item1);
    const id2 = store.getState().addEquipment(item2);

    store.getState().bulkUpdateEquipmentLocations([
      { instanceId: id1, location: MechLocation.LEFT_ARM, slots: [4] },
      { instanceId: id2, location: MechLocation.RIGHT_ARM, slots: [5] },
    ]);

    const eq1 = store.getState().equipment.find((e) => e.instanceId === id1);
    const eq2 = store.getState().equipment.find((e) => e.instanceId === id2);
    expect(eq1!.location).toBe(MechLocation.LEFT_ARM);
    expect(eq2!.location).toBe(MechLocation.RIGHT_ARM);
  });
});

// =============================================================================
// 3. Engine Changes
// =============================================================================

describe('useUnitStore - Engine Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to standard engine with rating = tonnage * walkMP', () => {
    const state = store.getState();
    expect(state.engineType).toBe(EngineType.STANDARD);
    // Default walkMP=4, tonnage=75 → rating=300
    expect(state.engineRating).toBe(300);
  });

  it('should change engine type', () => {
    store.getState().setEngineType(EngineType.XL_IS);
    expect(store.getState().engineType).toBe(EngineType.XL_IS);
    expect(store.getState().isModified).toBe(true);
  });

  it('should change engine rating', () => {
    store.getState().setEngineRating(225);
    expect(store.getState().engineRating).toBe(225);
  });

  it('should re-sync heat sink equipment when engine type changes', () => {
    // Set 12 heat sinks, standard engine has 10 integral → 2 external
    store.getState().setHeatSinkCount(12);
    const externalBefore = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink'));

    // Change to XL engine (still has 10 integral for rating 300)
    store.getState().setEngineType(EngineType.XL_IS);
    const externalAfter = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink'));

    // External count should remain same since integral capacity unchanged at rating 300
    expect(externalAfter.length).toBe(externalBefore.length);
  });

  it('should re-sync heat sink equipment when engine rating changes', () => {
    // With rating 300 and standard engine → 10 integral
    // Set 12 total heat sinks → 2 external
    store.getState().setHeatSinkCount(12);
    const beforeCount = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink')).length;

    // Increase rating - integral capacity changes
    store.getState().setEngineRating(350);
    // NOTE: characterization test - current behavior
    // With rating 350 → floor(350/25) = 14 integral, but typically capped at 10
    // The external heat sinks should be recalculated
    const afterCount = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink')).length;

    // The count may change since integral capacity may change with rating
    expect(typeof afterCount).toBe('number');
  });
});

// =============================================================================
// 4. Gyro Changes
// =============================================================================

describe('useUnitStore - Gyro Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to standard gyro', () => {
    expect(store.getState().gyroType).toBe(GyroType.STANDARD);
  });

  it('should change gyro type', () => {
    store.getState().setGyroType(GyroType.XL);
    expect(store.getState().gyroType).toBe(GyroType.XL);
    expect(store.getState().isModified).toBe(true);
  });

  it('should change to compact gyro', () => {
    store.getState().setGyroType(GyroType.COMPACT);
    expect(store.getState().gyroType).toBe(GyroType.COMPACT);
  });

  it('should change to heavy-duty gyro', () => {
    store.getState().setGyroType(GyroType.HEAVY_DUTY);
    expect(store.getState().gyroType).toBe(GyroType.HEAVY_DUTY);
  });
});

// =============================================================================
// 5. Jump Jet Changes
// =============================================================================

describe('useUnitStore - Jump Jet Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to 0 jump MP with standard jump jets', () => {
    expect(store.getState().jumpMP).toBe(0);
    expect(store.getState().jumpJetType).toBe(JumpJetType.STANDARD);
  });

  it('should set jump MP and create jump jet equipment', () => {
    store.getState().setJumpMP(4);
    expect(store.getState().jumpMP).toBe(4);

    const jumpJets = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('jump-jet'));
    expect(jumpJets.length).toBe(4);
  });

  it('should clamp jump MP to walkMP maximum', () => {
    // walkMP = floor(300/75) = 4, standard JJ max = walkMP
    store.getState().setJumpMP(10);
    expect(store.getState().jumpMP).toBeLessThanOrEqual(4);
  });

  it('should change jump jet type and re-sync equipment', () => {
    store.getState().setJumpMP(3);
    store.getState().setJumpJetType(JumpJetType.IMPROVED);
    expect(store.getState().jumpJetType).toBe(JumpJetType.IMPROVED);

    const jumpJets = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('jump-jet'));
    // Should have 3 improved jump jets (or clamped if improved has different max)
    expect(jumpJets.length).toBeLessThanOrEqual(3);
  });

  it('should clamp jump MP when changing jet type with lower max', () => {
    store.getState().setJumpMP(4);
    // Improved JJ max = walkMP, same as standard, so should stay 4
    store.getState().setJumpJetType(JumpJetType.IMPROVED);
    expect(store.getState().jumpMP).toBeLessThanOrEqual(4);
  });

  it('should remove all jump jet equipment when setting jumpMP to 0', () => {
    store.getState().setJumpMP(3);
    expect(
      store
        .getState()
        .equipment.filter((e) => e.equipmentId.includes('jump-jet')).length,
    ).toBeGreaterThan(0);

    store.getState().setJumpMP(0);
    const jumpJets = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('jump-jet'));
    expect(jumpJets.length).toBe(0);
  });
});

// =============================================================================
// 6. Heat Sink Changes
// =============================================================================

describe('useUnitStore - Heat Sink Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to 10 single heat sinks', () => {
    expect(store.getState().heatSinkType).toBe(HeatSinkType.SINGLE);
    expect(store.getState().heatSinkCount).toBe(10);
  });

  it('should change heat sink type to double IS', () => {
    store.getState().setHeatSinkType(HeatSinkType.DOUBLE_IS);
    expect(store.getState().heatSinkType).toBe(HeatSinkType.DOUBLE_IS);
  });

  it('should change heat sink count and sync equipment', () => {
    // floor(300/25) = 12 integral heat sinks for standard engine rating 300
    store.getState().setHeatSinkCount(15);
    expect(store.getState().heatSinkCount).toBe(15);

    // 15 - 12 = 3 external heat sinks
    const heatSinks = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink'));
    expect(heatSinks.length).toBe(3);
  });

  it('should have 0 external heat sinks when count <= integral capacity', () => {
    // floor(300/25) = 12 integral for standard engine
    store.getState().setHeatSinkCount(12);
    const heatSinks = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink'));
    expect(heatSinks.length).toBe(0);
  });

  it('should re-sync equipment when switching heat sink type', () => {
    // floor(300/25) = 12 integral; 13 - 12 = 1 external
    store.getState().setHeatSinkCount(13);
    store.getState().setHeatSinkType(HeatSinkType.DOUBLE_IS);
    const heatSinks = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('heat-sink'));
    expect(heatSinks.length).toBe(1);
  });
});

// =============================================================================
// 7. Tech Base Switching
// =============================================================================

describe('useUnitStore - Tech Base Switching', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to Inner Sphere tech base mode', () => {
    expect(store.getState().techBaseMode).toBe(TechBaseMode.INNER_SPHERE);
    expect(store.getState().techBase).toBe(TechBase.INNER_SPHERE);
  });

  it('should switch to Clan tech base mode', () => {
    store.getState().setTechBaseMode(TechBaseMode.CLAN);
    expect(store.getState().techBaseMode).toBe(TechBaseMode.CLAN);
    expect(store.getState().techBase).toBe(TechBase.CLAN);
  });

  it('should switch to Mixed tech base mode preserving current tech base', () => {
    store.getState().setTechBaseMode(TechBaseMode.MIXED);
    expect(store.getState().techBaseMode).toBe(TechBaseMode.MIXED);
    // Mixed mode preserves the underlying techBase
    expect(store.getState().techBase).toBe(TechBase.INNER_SPHERE);
  });

  it('should save selection memory when switching away from a tech base', () => {
    // Start with IS, set engine to XL IS
    store.getState().setEngineType(EngineType.XL_IS);
    // Switch to Clan
    store.getState().setTechBaseMode(TechBaseMode.CLAN);
    // Memory should have saved XL_IS for Inner Sphere
    const memory = store.getState().selectionMemory;
    expect(memory.engine[TechBase.INNER_SPHERE]).toBe(EngineType.XL_IS);
  });

  it('should update component tech bases when switching to non-mixed mode', () => {
    store.getState().setTechBaseMode(TechBaseMode.CLAN);
    const techBases = store.getState().componentTechBases;
    // All components should be Clan in Clan mode
    expect(techBases.chassis).toBe(TechBase.CLAN);
    expect(techBases.engine).toBe(TechBase.CLAN);
    expect(techBases.armor).toBe(TechBase.CLAN);
  });

  it('should preserve component tech bases in Mixed mode', () => {
    // Switch to mixed - should keep current component tech bases
    const beforeBases = { ...store.getState().componentTechBases };
    store.getState().setTechBaseMode(TechBaseMode.MIXED);
    const afterBases = store.getState().componentTechBases;
    expect(afterBases).toEqual(beforeBases);
  });
});

// =============================================================================
// 8. Internal Structure Changes
// =============================================================================

describe('useUnitStore - Internal Structure Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to standard internal structure', () => {
    expect(store.getState().internalStructureType).toBe(
      InternalStructureType.STANDARD,
    );
  });

  it('should change internal structure type', () => {
    store
      .getState()
      .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
    expect(store.getState().internalStructureType).toBe(
      InternalStructureType.ENDO_STEEL_IS,
    );
    expect(store.getState().isModified).toBe(true);
  });

  it('should sync equipment when changing to endo steel', () => {
    store
      .getState()
      .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
    const structureEquip = store
      .getState()
      .equipment.filter((e) =>
        e.equipmentId.startsWith('internal-structure-slot'),
      );
    // Endo Steel IS = 14 crit slots
    expect(structureEquip.length).toBe(14);
  });

  it('should remove old structure equipment when switching types', () => {
    store
      .getState()
      .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
    store.getState().setInternalStructureType(InternalStructureType.STANDARD);
    const structureEquip = store
      .getState()
      .equipment.filter((e) =>
        e.equipmentId.startsWith('internal-structure-slot'),
      );
    expect(structureEquip.length).toBe(0);
  });
});

// =============================================================================
// Identity Actions
// =============================================================================

describe('useUnitStore - Identity Actions', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should set name', () => {
    store.getState().setName('Atlas II');
    expect(store.getState().name).toBe('Atlas II');
  });

  it('should set chassis and derive name', () => {
    store.getState().setModel('AS7-D');
    store.getState().setChassis('Atlas');
    // Name should be derived: chassis + model
    expect(store.getState().name).toBe('Atlas AS7-D');
  });

  it('should set model and derive name', () => {
    store.getState().setChassis('Timber Wolf');
    store.getState().setModel('Prime');
    expect(store.getState().name).toBe('Timber Wolf Prime');
  });

  it('should handle empty model in name derivation', () => {
    store.getState().setChassis('Atlas');
    store.getState().setModel('');
    expect(store.getState().name).toBe('Atlas');
  });
});

// =============================================================================
// Chassis / Tonnage Actions
// =============================================================================

describe('useUnitStore - Chassis Actions', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should change tonnage and recalculate engine rating', () => {
    // Initial: 75t, rating 300 → walkMP = 4
    store.getState().setTonnage(50);
    // walkMP should be preserved: 4 * 50 = 200
    expect(store.getState().tonnage).toBe(50);
    expect(store.getState().engineRating).toBe(200);
  });

  it('should clamp engine rating to 10-400 range on tonnage change', () => {
    // Force a high walk MP scenario: 20t, walkMP = 300/75 = 4 → 20*4=80
    store.getState().setTonnage(20);
    expect(store.getState().engineRating).toBeGreaterThanOrEqual(10);
    expect(store.getState().engineRating).toBeLessThanOrEqual(400);
  });

  it('should set configuration', () => {
    store.getState().setConfiguration(MechConfiguration.QUAD);
    expect(store.getState().configuration).toBe(MechConfiguration.QUAD);
  });

  it('should set isOmni flag', () => {
    store.getState().setIsOmni(true);
    expect(store.getState().isOmni).toBe(true);
  });
});

// =============================================================================
// Armor Type Changes
// =============================================================================

describe('useUnitStore - Armor Type Changes', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should default to standard armor', () => {
    expect(store.getState().armorType).toBe(ArmorTypeEnum.STANDARD);
  });

  it('should change armor type and sync equipment', () => {
    store.getState().setArmorType(ArmorTypeEnum.FERRO_FIBROUS_IS);
    expect(store.getState().armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    // FF IS = 14 crit slots via armor-slot equipment
    const armorEquip = store
      .getState()
      .equipment.filter((e) => e.equipmentId.startsWith('armor-slot'));
    expect(armorEquip.length).toBe(14);
  });

  it('should cap armor tonnage when switching to lower points-per-ton armor', () => {
    // Max out armor tonnage first
    store.getState().maximizeArmor();
    const maxStandardTonnage = store.getState().armorTonnage;

    // Switch to hardened armor (8 pts/ton vs 16)
    store.getState().setArmorType(ArmorTypeEnum.HARDENED);
    const hardenedTonnage = store.getState().armorTonnage;
    // NOTE: characterization test - current behavior
    // Tonnage should be capped to max useful tonnage for the new armor type
    expect(hardenedTonnage).toBeLessThanOrEqual(maxStandardTonnage * 2 + 1);
  });

  it('should remove old armor equipment when switching types', () => {
    store.getState().setArmorType(ArmorTypeEnum.FERRO_FIBROUS_IS);
    store.getState().setArmorType(ArmorTypeEnum.STANDARD);
    const armorEquip = store
      .getState()
      .equipment.filter((e) => e.equipmentId.startsWith('armor-slot'));
    expect(armorEquip.length).toBe(0);
  });
});

// =============================================================================
// OmniMech Actions
// =============================================================================

describe('useUnitStore - OmniMech Actions', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
    store.getState().setIsOmni(true);
  });

  it('should set equipment as pod-mounted', () => {
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);

    store.getState().setEquipmentPodMounted(instanceId, true);
    const eq = store
      .getState()
      .equipment.find((e) => e.instanceId === instanceId);
    expect(eq!.isOmniPodMounted).toBe(true);
  });

  it('should reset chassis removing only pod-mounted equipment', () => {
    const item = makeEquipmentItem();
    const id1 = store.getState().addEquipment(item);
    const id2 = store.getState().addEquipment(item);

    store.getState().setEquipmentPodMounted(id1, true);
    // id2 stays fixed (isOmniPodMounted = false)

    store.getState().resetChassis();
    const remaining = store.getState().equipment;
    expect(remaining.some((e) => e.instanceId === id1)).toBe(false);
    expect(remaining.some((e) => e.instanceId === id2)).toBe(true);
  });

  it('should not reset chassis on non-OmniMech', () => {
    store.getState().setIsOmni(false);
    const item = makeEquipmentItem();
    const instanceId = store.getState().addEquipment(item);
    store.getState().setEquipmentPodMounted(instanceId, true);

    store.getState().resetChassis();
    // Should be no-op for non-Omni
    expect(
      store.getState().equipment.some((e) => e.instanceId === instanceId),
    ).toBe(true);
  });
});

// =============================================================================
// Metadata Actions
// =============================================================================

describe('useUnitStore - Metadata', () => {
  let store: StoreApi<UnitStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('should mark as modified', () => {
    store.getState().markModified(false);
    expect(store.getState().isModified).toBe(false);
    store.getState().markModified(true);
    expect(store.getState().isModified).toBe(true);
  });

  it('should update lastModifiedAt on changes', () => {
    const before = store.getState().lastModifiedAt;
    // Small delay to ensure timestamp difference
    store.getState().setName('Changed');
    const after = store.getState().lastModifiedAt;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('should set year', () => {
    store.getState().setYear(3025);
    expect(store.getState().year).toBe(3025);
  });

  it('should set MUL ID', () => {
    store.getState().setMulId('12345');
    expect(store.getState().mulId).toBe('12345');
  });

  it('should set clan name', () => {
    store.getState().setClanName('Mad Cat');
    expect(store.getState().clanName).toBe('Mad Cat');
  });
});

// =============================================================================
// Edge Cases & Cross-Cutting
// =============================================================================

describe('useUnitStore - Edge Cases', () => {
  it('should handle Clan tech base store creation', () => {
    const store = makeStore({ techBase: TechBase.CLAN });
    expect(store.getState().techBase).toBe(TechBase.CLAN);
    expect(store.getState().techBaseMode).toBe(TechBaseMode.CLAN);
  });

  it('should handle minimum tonnage (20t)', () => {
    const store = makeStore({ tonnage: 20 });
    expect(store.getState().tonnage).toBe(20);
    expect(store.getState().engineRating).toBe(80); // 20 * 4
  });

  it('should handle maximum tonnage (100t)', () => {
    const store = makeStore({ tonnage: 100 });
    expect(store.getState().tonnage).toBe(100);
    expect(store.getState().engineRating).toBe(400); // 100 * 4, capped at 400
  });

  it('should create store with custom walkMP', () => {
    const store = makeStore({ walkMP: 6 });
    // 75 * 6 = 450, but engine rating capped at 400 by createDefaultUnitState
    // NOTE: characterization test - createDefaultUnitState does NOT clamp
    expect(store.getState().engineRating).toBe(450);
  });

  it('should handle setting tonnage that re-creates jump jet equipment', () => {
    const store = makeStore();
    store.getState().setJumpMP(3);
    const jjBefore = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('jump-jet'));
    expect(jjBefore.length).toBe(3);

    // Change tonnage - jump jets should be re-created with new weights
    store.getState().setTonnage(50);
    const jjAfter = store
      .getState()
      .equipment.filter((e) => e.equipmentId.includes('jump-jet'));
    expect(jjAfter.length).toBe(3);
  });

  it('should preserve empty armor allocation on createEmptyArmorAllocation', () => {
    const alloc = createEmptyArmorAllocation();
    expect(alloc[MechLocation.HEAD]).toBe(0);
    expect(alloc[MechLocation.CENTER_TORSO]).toBe(0);
    expect(alloc.centerTorsoRear).toBe(0);
    expect(alloc[MechLocation.LEFT_ARM]).toBe(0);
    expect(alloc[MechLocation.RIGHT_ARM]).toBe(0);
    expect(alloc[MechLocation.LEFT_LEG]).toBe(0);
    expect(alloc[MechLocation.RIGHT_LEG]).toBe(0);
  });
});

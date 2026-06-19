import {
  ARMOR_COST_MODIFIERS,
  DEFAULT_REPAIR_BAY,
  REPAIR_COSTS,
  RepairJobStatus,
  RepairType,
  STRUCTURE_COST_MODIFIERS,
  UnitLocation,
} from '../RepairInterfaces';

describe('Repair enums', () => {
  it('defines repair item types', () => {
    expect(RepairType.Armor).toBe('armor');
    expect(RepairType.Structure).toBe('structure');
    expect(RepairType.ComponentRepair).toBe('component_repair');
    expect(RepairType.ComponentReplace).toBe('component_replace');
  });

  it('defines repair job statuses', () => {
    expect(RepairJobStatus.Pending).toBe('pending');
    expect(RepairJobStatus.InProgress).toBe('in_progress');
    expect(RepairJobStatus.Completed).toBe('completed');
    expect(RepairJobStatus.Cancelled).toBe('cancelled');
    expect(RepairJobStatus.Blocked).toBe('blocked');
  });

  it('defines mech locations', () => {
    expect(UnitLocation.Head).toBe('head');
    expect(UnitLocation.CenterTorso).toBe('center_torso');
    expect(UnitLocation.LeftTorso).toBe('left_torso');
    expect(UnitLocation.RightTorso).toBe('right_torso');
    expect(UnitLocation.LeftArm).toBe('left_arm');
    expect(UnitLocation.RightArm).toBe('right_arm');
    expect(UnitLocation.LeftLeg).toBe('left_leg');
    expect(UnitLocation.RightLeg).toBe('right_leg');
  });
});

describe('Repair constants', () => {
  it('uses positive repair cost values', () => {
    expect(REPAIR_COSTS.ARMOR_PER_POINT).toBeGreaterThan(0);
    expect(REPAIR_COSTS.STRUCTURE_PER_POINT).toBeGreaterThan(0);
    expect(REPAIR_COSTS.STRUCTURE_PER_POINT).toBeGreaterThan(
      REPAIR_COSTS.ARMOR_PER_POINT,
    );
    expect(REPAIR_COSTS.CRITICAL_DAMAGE_MULTIPLIER).toBeGreaterThan(1);
    expect(REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT).toBeGreaterThan(0);
    expect(REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT).toBeLessThanOrEqual(0.5);
  });

  it('uses standard armor and structure as baseline modifiers', () => {
    expect(ARMOR_COST_MODIFIERS['standard']).toBe(1.0);
    expect(STRUCTURE_COST_MODIFIERS['standard']).toBe(1.0);
  });

  it('charges more for advanced armor and structure', () => {
    expect(ARMOR_COST_MODIFIERS['ferro-fibrous']).toBeGreaterThan(1.0);
    expect(ARMOR_COST_MODIFIERS['stealth']).toBeGreaterThan(1.0);
    expect(STRUCTURE_COST_MODIFIERS['endo-steel']).toBeGreaterThan(1.0);
  });

  it('provides an empty default repair bay with capacity', () => {
    expect(DEFAULT_REPAIR_BAY.capacity).toBeGreaterThan(0);
    expect(DEFAULT_REPAIR_BAY.efficiency).toBe(1.0);
    expect(DEFAULT_REPAIR_BAY.activeJobs).toHaveLength(0);
    expect(DEFAULT_REPAIR_BAY.queuedJobs).toHaveLength(0);
  });
});

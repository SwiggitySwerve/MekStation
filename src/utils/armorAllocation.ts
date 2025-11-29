/**
 * Armor Allocation - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface ArmorAllocation {
  location: string;
  front: number;
  rear?: number;
}

export function createDefaultAllocation(tonnage: number): ArmorAllocation[] {
  return [
    { location: 'Head', front: 9 },
    { location: 'Center Torso', front: 20, rear: 10 },
    { location: 'Left Torso', front: 15, rear: 5 },
    { location: 'Right Torso', front: 15, rear: 5 },
    { location: 'Left Arm', front: 10 },
    { location: 'Right Arm', front: 10 },
    { location: 'Left Leg', front: 10 },
    { location: 'Right Leg', front: 10 },
  ];
}

export function calculateTotalArmor(allocations: ArmorAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.front + (a.rear ?? 0), 0);
}

export function autoAllocateArmor(totalPointsOrUnit: number | Record<string, unknown>, tonnage?: number): ArmorAllocation[] {
  // Handle both (totalPoints, tonnage) and (unit) signatures
  let actualTonnage: number;
  let totalPoints: number;
  
  if (typeof totalPointsOrUnit === 'object' && totalPointsOrUnit !== null) {
    // Called with unit object
    const unitObj = totalPointsOrUnit as { tonnage?: number; mass?: number };
    actualTonnage = unitObj.tonnage ?? unitObj.mass ?? 50;
    totalPoints = actualTonnage * 16; // Default to standard armor points
  } else if (typeof totalPointsOrUnit === 'number') {
    // Called with (totalPoints, tonnage)
    totalPoints = totalPointsOrUnit;
    actualTonnage = tonnage ?? 50;
  } else {
    // Fallback defaults
    totalPoints = 50 * 16;
    actualTonnage = 50;
  }
  
  // Stub: simplified auto-allocation
  const baseAllocation = createDefaultAllocation(actualTonnage);
  const baseTotal = calculateTotalArmor(baseAllocation);
  const ratio = baseTotal > 0 ? totalPoints / baseTotal : 1;
  return baseAllocation.map(a => ({
    ...a,
    front: Math.floor(a.front * ratio),
    rear: a.rear ? Math.floor(a.rear * ratio) : undefined,
  }));
}

export function optimizeArmor(current: ArmorAllocation[]): ArmorAllocation[] {
  // Stub: return as-is
  return current;
}

export function validateArmorDistribution(allocations: ArmorAllocation[], maxTotal: number): string[] {
  const errors: string[] = [];
  const total = calculateTotalArmor(allocations);
  if (total > maxTotal) {
    errors.push(`Total armor (${total}) exceeds maximum (${maxTotal})`);
  }
  return errors;
}

export interface IArmorAllocation {
  location: string;
  armor: number;
  rearArmor?: number;
  maxArmor: number;
  maxRearArmor?: number;
}

export function convertToIArmorAllocation(alloc: ArmorAllocation, maxArmor: number): IArmorAllocation {
  return {
    location: alloc.location,
    armor: alloc.front,
    rearArmor: alloc.rear,
    maxArmor,
    maxRearArmor: alloc.rear !== undefined ? Math.floor(maxArmor * 0.5) : undefined,
  };
}

export function convertFromIArmorAllocation(alloc: IArmorAllocation): ArmorAllocation {
  return {
    location: alloc.location,
    front: alloc.armor,
    rear: alloc.rearArmor,
  };
}

// Simple passthrough for record - used by component when updating armor allocation
export function convertRecordToIArmorAllocation(input: Record<string, number>): Record<string, number> {
  return input;
}


/**
 * Armor Allocation Helpers - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function distributeArmor(totalPoints: number, tonnage: number): Record<string, number> {
  // Stub: simple distribution
  return {
    'Head': Math.min(9, Math.floor(totalPoints * 0.05)),
    'Center Torso': Math.floor(totalPoints * 0.20),
    'Left Torso': Math.floor(totalPoints * 0.15),
    'Right Torso': Math.floor(totalPoints * 0.15),
    'Left Arm': Math.floor(totalPoints * 0.10),
    'Right Arm': Math.floor(totalPoints * 0.10),
    'Left Leg': Math.floor(totalPoints * 0.125),
    'Right Leg': Math.floor(totalPoints * 0.125),
  };
}

export function balanceArmor(current: Record<string, number>): Record<string, number> {
  // Stub: return as-is
  return { ...current };
}



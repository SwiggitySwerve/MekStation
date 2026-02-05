/**
 * Record Sheet Types
 *
 * Internal type definitions for record sheet service.
 */

/**
 * Unit configuration interface (simplified for service)
 */
export interface IUnitConfig {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
  configuration: string;
  engine: {
    type: string;
    rating: number;
  };
  gyro: {
    type: string;
  };
  structure: {
    type: string;
  };
  armor: {
    type: string;
    allocation: {
      head: number;
      centerTorso: number;
      centerTorsoRear: number;
      leftTorso: number;
      leftTorsoRear: number;
      rightTorso: number;
      rightTorsoRear: number;
      leftArm: number;
      rightArm: number;
      leftLeg: number;
      rightLeg: number;
      // Quad-specific locations (optional)
      frontLeftLeg?: number;
      frontRightLeg?: number;
      rearLeftLeg?: number;
      rearRightLeg?: number;
      // Tripod-specific location (optional)
      centerLeg?: number;
    };
  };
  heatSinks: {
    type: string;
    count: number;
  };
  movement: {
    walkMP: number;
    runMP: number;
    jumpMP: number;
  };
  equipment: Array<{
    id: string;
    name: string;
    location: string;
    heat?: number;
    damage?: number | string;
    ranges?: {
      minimum: number;
      short: number;
      medium: number;
      long: number;
    };
    isWeapon?: boolean;
    isAmmo?: boolean;
    ammoCount?: number;
    slots?: number[];
  }>;
  criticalSlots?: Record<
    string,
    Array<{ content: string; isSystem?: boolean; equipmentId?: string } | null>
  >;
  battleValue?: number;
  cost?: number;
  enhancements?: string[];
}

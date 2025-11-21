// Import all construction equipment
export * from './construction-equipment';

// Import all salvage equipment
export * from './salvage-equipment';

// Import all support equipment
export * from './support-equipment';

// Re-export all equipment as a single array
import { Equipment } from '../types';
import {
  BACKHOE,
  BULLDOZER,
  CHAINSAW,
  DUAL_SAW,
  MINING_DRILL,
  PILE_DRIVER,
  WRECKING_BALL
} from './construction-equipment';
import {
  SALVAGE_ARM,
  LIFT_HOIST,
  SPOT_WELDER
} from './salvage-equipment';
import {
  EXTENDED_FUEL_TANK,
  LADDER,
  LIGHT_BRIDGE_LAYER,
  MEDIUM_BRIDGE_LAYER,
  HEAVY_BRIDGE_LAYER
} from './support-equipment';

export const INDUSTRIAL_EQUIPMENT: Equipment[] = [
  // Construction Equipment
  BACKHOE,
  BULLDOZER,
  CHAINSAW,
  DUAL_SAW,
  MINING_DRILL,
  PILE_DRIVER,
  WRECKING_BALL,
  // Salvage Equipment
  SALVAGE_ARM,
  LIFT_HOIST,
  SPOT_WELDER,
  // Support Equipment
  EXTENDED_FUEL_TANK,
  LADDER,
  LIGHT_BRIDGE_LAYER,
  MEDIUM_BRIDGE_LAYER,
  HEAVY_BRIDGE_LAYER
]; 
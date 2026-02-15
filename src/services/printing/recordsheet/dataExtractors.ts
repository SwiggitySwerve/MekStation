/**
 * Data Extractors
 *
 * Functions to extract record sheet data from unit configurations.
 */

import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import {
  IRecordSheetHeader,
  IRecordSheetMovement,
  IRecordSheetHeatSinks,
  ILocationCriticals,
  IRecordSheetCriticalSlot,
  LOCATION_ABBREVIATIONS,
  LOCATION_NAMES,
} from '@/types/printing';

import {
  getFixedSlotContent,
  getEngineSlots,
  getGyroSlots,
  formatEngineName,
} from './criticalSlotUtils';
import { isUnhittableEquipmentName } from './equipmentUtils';
import { getMechType, getCriticalLocationsForMechType } from './mechTypeUtils';
import { IUnitConfig } from './types';

export { extractArmor } from './dataExtractors.armor';
export { extractStructure } from './dataExtractors.structure';
export { extractEquipment } from './dataExtractors.equipment';

/**
 * Extract header data
 */
export function extractHeader(unit: IUnitConfig): IRecordSheetHeader {
  return {
    unitName: unit.name || `${unit.chassis} ${unit.model}`,
    chassis: unit.chassis,
    model: unit.model,
    tonnage: unit.tonnage,
    techBase: unit.techBase,
    rulesLevel: unit.rulesLevel,
    era: unit.era,
    battleValue: unit.battleValue || 0,
    cost: unit.cost || 0,
  };
}

/**
 * Extract movement data
 */
export function extractMovement(unit: IUnitConfig): IRecordSheetMovement {
  const enhancements = unit.enhancements || [];
  return {
    walkMP: unit.movement.walkMP,
    runMP: unit.movement.runMP,
    jumpMP: unit.movement.jumpMP,
    hasMASC: enhancements.includes('MASC'),
    hasTSM: enhancements.includes('TSM'),
    hasSupercharger: enhancements.includes('Supercharger'),
  };
}

/**
 * Extract heat sink data
 */
export function extractHeatSinks(unit: IUnitConfig): IRecordSheetHeatSinks {
  const isDouble = unit.heatSinks.type.toLowerCase().includes('double');
  const capacity = unit.heatSinks.count * (isDouble ? 2 : 1);
  const integrated = Math.floor(unit.engine.rating / 25);

  return {
    type: unit.heatSinks.type,
    count: unit.heatSinks.count,
    capacity,
    integrated: Math.min(integrated, unit.heatSinks.count),
    external: Math.max(0, unit.heatSinks.count - integrated),
  };
}

/**
 * Extract critical slots data with fixed equipment (engine, gyro, actuators, etc.)
 * Configuration-aware: returns appropriate locations for biped, quad, tripod, etc.
 */
export function extractCriticals(
  unit: IUnitConfig,
): readonly ILocationCriticals[] {
  const mechType = getMechType(unit.configuration);

  // Get locations based on mech configuration
  const locations = getCriticalLocationsForMechType(mechType);

  // Calculate engine slot requirements
  const engineSlots = getEngineSlots(unit.engine.type, unit.engine.rating);
  const gyroSlots = getGyroSlots(unit.gyro.type);
  const engineName = formatEngineName(unit.engine.type);

  return locations.map((loc) => {
    const slotCount = LOCATION_SLOT_COUNTS[loc];
    const userSlots = unit.criticalSlots?.[loc] || [];

    // Start with empty slots array
    const slots: IRecordSheetCriticalSlot[] = [];

    // Fill slots with fixed equipment first, then user equipment
    for (let i = 0; i < slotCount; i++) {
      let fixedContent = getFixedSlotContent(loc, i, engineSlots, gyroSlots);
      if (fixedContent === 'ENGINE_PLACEHOLDER') {
        fixedContent = engineName;
      }
      const userSlot = userSlots[i];

      if (fixedContent) {
        slots.push({
          slotNumber: i + 1,
          content: fixedContent,
          isSystem: true,
          isHittable: true,
          isRollAgain: false,
        });
      } else if (userSlot?.content) {
        // Determine if this equipment is unhittable (Endo Steel, Ferro-Fibrous, TSM, etc.)
        const isUnhittable = isUnhittableEquipmentName(userSlot.content);
        slots.push({
          slotNumber: i + 1,
          content: userSlot.content,
          isSystem: userSlot.isSystem || false,
          isHittable: !isUnhittable,
          isRollAgain: false,
          equipmentId: userSlot.equipmentId,
        });
      } else {
        // Empty slot - Roll Again
        slots.push({
          slotNumber: i + 1,
          content: '',
          isSystem: false,
          isHittable: true,
          isRollAgain: true,
        });
      }
    }

    return {
      location: LOCATION_NAMES[loc],
      abbreviation: LOCATION_ABBREVIATIONS[loc],
      slots,
    };
  });
}

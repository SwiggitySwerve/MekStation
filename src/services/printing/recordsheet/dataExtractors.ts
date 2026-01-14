/**
 * Data Extractors
 * 
 * Functions to extract record sheet data from unit configurations.
 */

import {
  IRecordSheetHeader,
  IRecordSheetMovement,
  IRecordSheetArmor,
  IRecordSheetStructure,
  IRecordSheetEquipment,
  IRecordSheetHeatSinks,
  ILocationCriticals,
  IRecordSheetCriticalSlot,
  ILocationArmor,
  ILocationStructure,
  LOCATION_ABBREVIATIONS,
  LOCATION_NAMES,
} from '@/types/printing';
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction/CriticalSlotAllocation';
import { STRUCTURE_POINTS_TABLE } from '@/types/construction/InternalStructureType';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { WeaponCategory } from '@/types/equipment';
import { IUnitConfig } from './types';
import { COMBAT_EQUIPMENT } from './constants';
import { getMechType, getCriticalLocationsForMechType } from './mechTypeUtils';
import { getDamageCode, formatMissileDamage, lookupWeapon, isUnhittableEquipmentName } from './equipmentUtils';
import { getFixedSlotContent, getEngineSlots, getGyroSlots, formatEngineName } from './criticalSlotUtils';

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
 * Extract armor data (configuration-aware)
 */
export function extractArmor(unit: IUnitConfig): IRecordSheetArmor {
  const { armor, tonnage, configuration } = unit;
  const structurePoints = STRUCTURE_POINTS_TABLE[tonnage] || STRUCTURE_POINTS_TABLE[50];
  const mechType = getMechType(configuration);
  
  // Common locations for all mech types
  const baseLocations: ILocationArmor[] = [
    {
      location: LOCATION_NAMES[MechLocation.HEAD],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.HEAD],
      current: armor.allocation.head,
      maximum: 9, // Head max is always 9
    },
    {
      location: LOCATION_NAMES[MechLocation.CENTER_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_TORSO],
      current: armor.allocation.centerTorso,
      maximum: structurePoints.centerTorso * 2,
      rear: armor.allocation.centerTorsoRear,
      rearMaximum: structurePoints.centerTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.LEFT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_TORSO],
      current: armor.allocation.leftTorso,
      maximum: structurePoints.sideTorso * 2,
      rear: armor.allocation.leftTorsoRear,
      rearMaximum: structurePoints.sideTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.RIGHT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_TORSO],
      current: armor.allocation.rightTorso,
      maximum: structurePoints.sideTorso * 2,
      rear: armor.allocation.rightTorsoRear,
      rearMaximum: structurePoints.sideTorso,
    },
  ];

  // Add limb locations based on mech type
  let limbLocations: ILocationArmor[];
  
  if (mechType === 'quad') {
    limbLocations = [
      {
        location: 'Front Left Leg',
        abbreviation: 'FLL',
        current: armor.allocation.frontLeftLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Front Right Leg',
        abbreviation: 'FRL',
        current: armor.allocation.frontRightLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Rear Left Leg',
        abbreviation: 'RLL',
        current: armor.allocation.rearLeftLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
      {
        location: 'Rear Right Leg',
        abbreviation: 'RRL',
        current: armor.allocation.rearRightLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
    ];
  } else if (mechType === 'tripod') {
    // Tripod - arms + 3 legs (left, right, center)
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        current: armor.allocation.leftArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        current: armor.allocation.rightArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        current: armor.allocation.leftLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        current: armor.allocation.rightLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.CENTER_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_LEG],
        current: armor.allocation.centerLeg ?? 0,
        maximum: structurePoints.leg * 2,
      },
    ];
  } else {
    // Biped, LAM, quadvee - standard arm/leg locations
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        current: armor.allocation.leftArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        current: armor.allocation.rightArm,
        maximum: structurePoints.arm * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        current: armor.allocation.leftLeg,
        maximum: structurePoints.leg * 2,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        current: armor.allocation.rightLeg,
        maximum: structurePoints.leg * 2,
      },
    ];
  }

  const locations = [...baseLocations, ...limbLocations];

  const totalPoints = locations.reduce((sum, loc) => {
    return sum + loc.current + (loc.rear || 0);
  }, 0);

  return {
    type: armor.type,
    totalPoints,
    locations,
  };
}

/**
 * Extract structure data (configuration-aware)
 */
export function extractStructure(unit: IUnitConfig): IRecordSheetStructure {
  const structurePoints = STRUCTURE_POINTS_TABLE[unit.tonnage] || STRUCTURE_POINTS_TABLE[50];
  const mechType = getMechType(unit.configuration);
  
  // Common locations for all mech types
  const baseLocations: ILocationStructure[] = [
    {
      location: LOCATION_NAMES[MechLocation.HEAD],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.HEAD],
      points: structurePoints.head,
    },
    {
      location: LOCATION_NAMES[MechLocation.CENTER_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_TORSO],
      points: structurePoints.centerTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.LEFT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_TORSO],
      points: structurePoints.sideTorso,
    },
    {
      location: LOCATION_NAMES[MechLocation.RIGHT_TORSO],
      abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_TORSO],
      points: structurePoints.sideTorso,
    },
  ];

  // Add limb locations based on mech type
  let limbLocations: ILocationStructure[];
  
  if (mechType === 'quad') {
    limbLocations = [
      {
        location: 'Front Left Leg',
        abbreviation: 'FLL',
        points: structurePoints.leg,
      },
      {
        location: 'Front Right Leg',
        abbreviation: 'FRL',
        points: structurePoints.leg,
      },
      {
        location: 'Rear Left Leg',
        abbreviation: 'RLL',
        points: structurePoints.leg,
      },
      {
        location: 'Rear Right Leg',
        abbreviation: 'RRL',
        points: structurePoints.leg,
      },
    ];
  } else if (mechType === 'tripod') {
    // Tripod - arms + 3 legs (left, right, center)
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.CENTER_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.CENTER_LEG],
        points: structurePoints.leg,
      },
    ];
  } else {
    // Biped, LAM, quadvee - standard arm/leg locations
    limbLocations = [
      {
        location: LOCATION_NAMES[MechLocation.LEFT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_ARM],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM],
        points: structurePoints.arm,
      },
      {
        location: LOCATION_NAMES[MechLocation.LEFT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG],
        points: structurePoints.leg,
      },
      {
        location: LOCATION_NAMES[MechLocation.RIGHT_LEG],
        abbreviation: LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG],
        points: structurePoints.leg,
      },
    ];
  }

  const locations = [...baseLocations, ...limbLocations];
  const totalPoints = locations.reduce((sum, loc) => sum + loc.points, 0);

  return {
    type: unit.structure.type,
    totalPoints,
    locations,
  };
}

/**
 * Extract equipment data - weapons, ammo, and combat equipment for the inventory table
 * Looks up actual weapon stats from the equipment database
 */
export function extractEquipment(unit: IUnitConfig): readonly IRecordSheetEquipment[] {
  // Get all weapons from the database for lookups
  // Uses equipmentLookupService which provides fallback to hardcoded data if JSON not loaded
  const allWeapons = equipmentLookupService.getAllWeapons();
  
  // Only include equipment that belongs in the Weapons & Equipment Inventory
  const combatEquipment = unit.equipment.filter((eq) => {
    // Include weapons
    if (eq.isWeapon) return true;
    
    // Include ammunition
    if (eq.isAmmo) return true;
    
    // Include items that have range data (combat-relevant)
    if (eq.ranges && (eq.ranges.short || eq.ranges.medium || eq.ranges.long)) return true;
    
    // Include combat-relevant equipment
    const lowerName = eq.name.toLowerCase();
    if (COMBAT_EQUIPMENT.some(ce => lowerName.includes(ce.toLowerCase()))) return true;
    
    // Exclude structural components, enhancements, movement equipment
    return false;
  });

  return combatEquipment.map((eq) => {
    // Look up weapon data from database by name or id
    const weaponData = lookupWeapon(allWeapons, eq.name, eq.id);
    
    if (weaponData) {
      // Get damage type code based on weapon category
      const damageCode = getDamageCode(weaponData.category);
      
      // Format damage - missiles use "X/Msl" format
      const isMissile = weaponData.category === WeaponCategory.MISSILE;
      const formattedDamage = isMissile 
        ? formatMissileDamage(eq.name, weaponData.damage)
        : String(weaponData.damage);
      
      // Use database values for damage, heat, and ranges
      return {
        id: eq.id,
        name: eq.name,
        location: eq.location,
        locationAbbr: LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
        heat: weaponData.heat,
        damage: formattedDamage,
        damageCode,
        minimum: weaponData.ranges.minimum,
        short: weaponData.ranges.short,
        medium: weaponData.ranges.medium,
        long: weaponData.ranges.long,
        quantity: 1,
        isWeapon: true,
        isAmmo: false,
        ammoCount: undefined,
      };
    }
    
    // Check if this is combat equipment (non-weapon)
    const lowerName = eq.name.toLowerCase();
    const isCombatEquipment = COMBAT_EQUIPMENT.some(ce => lowerName.includes(ce.toLowerCase()));
    
    if (isCombatEquipment) {
      return {
        id: eq.id,
        name: eq.name,
        location: eq.location,
        locationAbbr: LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
        heat: '-',
        damage: '-',
        damageCode: '[E]', // Equipment
        minimum: '-',
        short: '-',
        medium: '-',
        long: '-',
        quantity: 1,
        isWeapon: false,
        isAmmo: false,
        isEquipment: true,
        ammoCount: undefined,
      };
    }
    
    // Fallback for ammo or items not in weapon database
    return {
      id: eq.id,
      name: eq.name,
      location: eq.location,
      locationAbbr: LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
      heat: eq.heat || 0,
      damage: eq.damage || '-',
      minimum: eq.ranges?.minimum || 0,
      short: eq.ranges?.short || '-',
      medium: eq.ranges?.medium || '-',
      long: eq.ranges?.long || '-',
      quantity: 1,
      isWeapon: eq.isWeapon || false,
      isAmmo: eq.isAmmo || false,
      ammoCount: eq.ammoCount,
    };
  });
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
export function extractCriticals(unit: IUnitConfig): readonly ILocationCriticals[] {
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

import { FullUnit, WeaponOrEquipmentItem } from '../types';
import { CustomizableUnit, UnitEquipmentItem, EquipmentItem } from '../types/customizer';

/**
 * Safe value extraction with validation
 */
const safeGetValue = (primary: any, fallback: any, defaultValue: any = null) => {
  if (primary !== undefined && primary !== null && primary !== '') return primary;
  if (fallback !== undefined && fallback !== null && fallback !== '') return fallback;
  return defaultValue;
};

/**
 * Safe array access with validation
 */
const safeGetArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * Converts a FullUnit from the compendium to a CustomizableUnit for display analysis
 */
export function convertFullUnitToCustomizable(fullUnit: FullUnit): CustomizableUnit {
  if (!fullUnit) {
    throw new Error('Cannot convert null or undefined unit');
  }

  const uData = fullUnit.data || {};
  
  // Safe extraction of core fields
  const chassis = safeGetValue(uData.chassis, fullUnit.chassis, 'Unknown Chassis');
  const model = safeGetValue(uData.model, fullUnit.model, 'Unknown Model');
  const mass = parseInt(String(safeGetValue(uData.mass, fullUnit.mass, 0))) || 0;
  const tech_base = safeGetValue(uData.tech_base, fullUnit.tech_base, 'Inner Sphere');
  const era = safeGetValue(uData.era, fullUnit.era, 'Unknown');
  
  // Handle role extraction safely
  let role = null;
  if (typeof uData.role === 'object' && uData.role?.name) {
    role = uData.role.name;
  } else if (typeof uData.role === 'string') {
    role = uData.role;
  } else if (typeof fullUnit.role === 'string') {
    role = fullUnit.role;
  }

  try {
    return {
      id: fullUnit.id || 'unknown',
      chassis,
      model,
      type: 'BattleMech', // Default for now, could be determined from unit data
      mass,
      data: {
        chassis,
        model,
        mass,
        tech_base,
        era,
        type: 'BattleMech',
        config: safeGetValue(uData.config, null, 'Biped'),
        
        movement: uData.movement ? {
          walk_mp: parseInt(String(uData.movement.walk_mp || 0)) || 0,
          run_mp: parseInt(String(uData.movement.run_mp || (uData.movement.walk_mp || 0) * 1.5)) || 0,
          jump_mp: parseInt(String(uData.movement.jump_mp || 0)) || 0
        } : undefined,
        
        armor: uData.armor ? {
          type: safeGetValue(uData.armor.type, null, 'Standard'),
          locations: safeGetArray(uData.armor.locations).map(loc => ({
            location: safeGetValue(loc?.location, null, 'Unknown'),
            armor_points: parseInt(String(loc?.armor_points || 0)) || 0,
            rear_armor_points: loc?.rear_armor_points ? parseInt(String(loc.rear_armor_points)) : undefined
          }))
        } : undefined,
        
        engine: uData.engine ? {
          type: safeGetValue(uData.engine.type, null, 'Fusion'),
          rating: parseInt(String(uData.engine.rating || 0)) || 0
        } : undefined,
        
        structure: uData.structure ? {
          type: safeGetValue(uData.structure.type, null, 'Standard')
        } : undefined,
        
        heat_sinks: uData.heat_sinks ? {
          type: safeGetValue(uData.heat_sinks.type, null, 'Single'),
          count: parseInt(String(uData.heat_sinks.count || 10)) || 10
        } : undefined,
        
        weapons_and_equipment: safeGetArray(uData.weapons_and_equipment).map((item, index) => ({
          item_name: safeGetValue(item?.item_name, null, `Unknown Item ${index + 1}`),
          item_type: safeGetValue(item?.item_type, null, 'equipment'),
          location: safeGetValue(item?.location, null, 'Unknown'),
          rear_facing: Boolean(item?.rear_facing),
          turret_mounted: Boolean(item?.turret_mounted)
        })),
        
        criticals: safeGetArray(uData.criticals).map(crit => ({
          location: safeGetValue(crit?.location, null, 'Unknown'),
          slots: safeGetArray(crit?.slots)
        })),
        
        // Additional fields that might be useful for analysis
        role,
        source: safeGetValue(uData.source, fullUnit.source, 'Unknown'),
        mul_id: safeGetValue(uData.mul_id, fullUnit.mul_id, null),
        quirks: safeGetArray(uData.quirks).map(quirk => 
          typeof quirk === 'string' ? quirk : (quirk?.name || 'Unknown Quirk')
        ),
        fluff_text: uData.fluff_text || {}
      }
    };
  } catch (error) {
    console.error('Error in convertFullUnitToCustomizable:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to convert unit ${chassis} ${model}: ${errorMessage}`);
  }
}

/**
 * Converts weapons and equipment from FullUnit to loadout format
 */
export function convertWeaponsToLoadout(fullUnit: FullUnit): UnitEquipmentItem[] {
  const uData = fullUnit.data || {};
  if (!uData.weapons_and_equipment) return [];
  
  return uData.weapons_and_equipment.map((item, index) => ({
    id: `${fullUnit.id}-${index}`,
    item_name: item.item_name,
    item_type: item.item_type as 'weapon' | 'ammo' | 'equipment',
    location: item.location,
    quantity: 1, // Default quantity
    rear_facing: item.rear_facing || false,
    turret_mounted: item.turret_mounted || false
  }));
}

/**
 * Creates mock available equipment based on the unit's equipped items
 * This is a simplified version - in a real implementation, you'd fetch from equipment database
 */
export function createMockAvailableEquipment(fullUnit: FullUnit): EquipmentItem[] {
  const uData = fullUnit.data || {};
  if (!uData.weapons_and_equipment) return [];
  
  // Create equipment items from the unit's weapons and equipment
  const equipmentMap = new Map<string, EquipmentItem>();
  
  uData.weapons_and_equipment.forEach((item, index) => {
    if (!equipmentMap.has(item.item_name)) {
      equipmentMap.set(item.item_name, {
        id: `eq-${index}`,
        internal_id: item.item_name,
        name: item.item_name,
        type: item.item_type,
        category: getEquipmentCategory(item),
        tonnage: parseFloat(String(item.tons || 0)),
        critical_slots: parseInt(String(item.crits || 1)),
        tech_base: item.tech_base || 'IS',
        data: item, // Store the original item data
        weapon_details: item.item_type === 'weapon' ? {
          damage: parseFloat(String(item.damage || 0)),
          heat: item.heat || 0,
          range: item.range ? {
            short: item.range.short || 0,
            medium: item.range.medium || 0,
            long: item.range.long || 0,
            extreme: item.range.extreme
          } : undefined,
          ammo_per_ton: item.ammo_per_ton ? parseInt(String(item.ammo_per_ton)) : undefined
        } : undefined
      });
    }
  });
  
  return Array.from(equipmentMap.values());
}

/**
 * Determines equipment category based on item name and type
 */
function getEquipmentCategory(item: WeaponOrEquipmentItem): string {
  const itemName = item.item_name.toLowerCase();
  
  if (item.item_type === 'weapon') {
    if (itemName.includes('laser') || itemName.includes('ppc') || itemName.includes('flamer')) {
      return 'Energy Weapons';
    } else if (itemName.includes('autocannon') || itemName.includes('ac/') || itemName.includes('gauss')) {
      return 'Ballistic Weapons';
    } else if (itemName.includes('lrm') || itemName.includes('srm') || itemName.includes('missile')) {
      return 'Missile Weapons';
    } else if (itemName.includes('hatchet') || itemName.includes('sword') || itemName.includes('claw')) {
      return 'Physical Weapons';
    }
    return 'Weapons';
  } else if (item.item_type === 'ammo') {
    return 'Ammunition';
  } else if (itemName.includes('heat sink')) {
    return 'Heat Management';
  } else if (itemName.includes('jump jet')) {
    return 'Movement';
  } else if (itemName.includes('case') || itemName.includes('artemis') || itemName.includes('targeting')) {
    return 'Fire Control';
  }
  
  return 'Equipment';
}

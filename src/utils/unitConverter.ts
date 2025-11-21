import { FullUnit, WeaponOrEquipmentItem } from '../types';
import { CustomizableUnit, UnitEquipmentItem, EquipmentItem } from '../types/customizer';
import { EditableUnit } from '../types/editor';
import { convertToIArmorAllocation } from './armorAllocation';
import { stringToTechBaseWithDefault, stringToRulesLevelWithDefault } from './typeConversion/enumConverters';
import { TechBase, RulesLevel } from '../types/core/BaseTypes';

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
 * Converts a FullUnit to EditableUnit for export or editing
 */
export function convertFullUnitToEditableUnit(unit: FullUnit): EditableUnit {
  const uData = unit.data || {};
  
  // Create basic EditableUnit structure
  // Note: This is a partial conversion focusing on fields needed for export/editing
  // A full conversion would require mapping all system components (engine, gyro, etc.)
  // to their ICompleteUnitConfiguration interfaces.
  
  // Build armor allocation map for editor
  const armorAllocation: Record<string, number> = {};
  if (uData.armor && uData.armor.locations) {
      uData.armor.locations.forEach(loc => {
          // Map location names to keys
          const keyMap: Record<string, string> = {
              'Head': 'head',
              'Center Torso': 'centerTorso',
              'Left Torso': 'leftTorso',
              'Right Torso': 'rightTorso',
              'Left Arm': 'leftArm',
              'Right Arm': 'rightArm',
              'Left Leg': 'leftLeg',
              'Right Leg': 'rightLeg'
          };
          
          const key = keyMap[loc.location];
          if (key) {
              armorAllocation[key] = loc.armor_points;
              if (loc.rear_armor_points) {
                  armorAllocation[`${key}Rear`] = loc.rear_armor_points;
              }
          }
      });
  }

  // Convert tech base and rules level with proper validation
  const techBase = stringToTechBaseWithDefault(unit.tech_base, TechBase.INNER_SPHERE);
  const rulesLevel = stringToRulesLevelWithDefault(unit.rules_level, RulesLevel.STANDARD);

  return {
      // Base identity
      id: unit.id,
      name: unit.model,
      chassis: unit.chassis,
      model: unit.model,
      techBase,
      rulesLevel,
      era: unit.era,
      tonnage: unit.mass,
      
      // Store original data
      data: uData,
      
      // Editor specific
      armorAllocation: {}, // This is the editor's map structure, distinct from IArmorAllocation
      equipmentPlacements: [],
      criticalSlots: [],
      fluffData: uData.fluff_text || {},
      selectedQuirks: [],
      unallocatedEquipment: [],
      
      // Validation state
      validationState: { isValid: true, errors: [], warnings: [] },
      
      // Metadata
      editorMetadata: {
          lastModified: new Date(),
          isDirty: false,
          version: '1.0'
      },

      // ICompleteUnitConfiguration stubs
      // These would need full hydration for a complete editor experience
      // For export purposes, we often rely on the 'data' property being present
      structure: { 
          definition: { id: 'standard', name: 'Standard', type: 'Structure', techBase: 'Inner Sphere', weightMultiplier: 1, slots: 0, cost: 0, introduction: 0 }, 
          currentPoints: { head: 3, centerTorso: 10, leftTorso: 7, rightTorso: 7, leftArm: 5, rightArm: 5, leftLeg: 7, rightLeg: 7 },
          maxPoints: { head: 3, centerTorso: 10, leftTorso: 7, rightTorso: 7, leftArm: 5, rightArm: 5, leftLeg: 7, rightLeg: 7 }
      },
      engine: { 
          definition: { id: 'standard', name: 'Standard', type: 'Engine', techBase: 'Inner Sphere', ratingMultiplier: 1, slots: 0, cost: 0, introduction: 0 }, 
          rating: 200, 
          tonnage: 8.5 
      },
      gyro: { 
          definition: { id: 'standard', name: 'Standard', type: 'Gyro', techBase: 'Inner Sphere', weightMultiplier: 1, slots: 4, cost: 0, introduction: 0 }, 
          tonnage: 3 
      },
      cockpit: { 
          definition: { id: 'standard', name: 'Standard', type: 'Cockpit', techBase: 'Inner Sphere', tonnage: 3, slots: 1, cost: 0, introduction: 0 }, 
          tonnage: 3 
      },
      armor: { 
          definition: { id: 'standard', name: 'Standard', type: 'Armor', techBase: 'Inner Sphere', pointsPerTon: 16, slots: 0, cost: 0, introduction: 0 }, 
          tonnage: 10,
          allocation: convertToIArmorAllocation(armorAllocation)
      },
      heatSinks: { 
          definition: { id: 'single', name: 'Single', type: 'Heat Sink', techBase: 'Inner Sphere', dissipation: 1, slots: 1, cost: 0, introduction: 0 }, 
          count: 10, 
          engineHeatsinks: 10 
      },
      jumpJets: { 
          definition: { id: 'standard', name: 'Standard', type: 'Jump Jet', techBase: 'Inner Sphere', weightMultiplier: 1, slots: 1, cost: 0, introduction: 0 }, 
          count: 0 
      },
      
      equipment: [],
      fixedAllocations: [],
      groups: [],
      metadata: {
          version: '1.0',
          created: new Date(),
          modified: new Date(),
          checksum: '',
          size: 0
      }
  };
  
  // Note: This is a partial conversion. Some system components (structure, engine, gyro, etc.)
  // use default/stub values. A full implementation would calculate these from unit.data.
  // For now, the 'data' property preserves the original unit data for reference.
  return editableUnit;
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

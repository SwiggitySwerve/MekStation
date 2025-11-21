/**
 * Equipment ID Mapping Service
 * Maps MegaMekLab item_type values to our equipment database IDs
 */

import { TechBase } from '../../types/componentConfiguration';

export interface EquipmentMapping {
  databaseId: string;
  category: string;
  techBase?: TechBase;
  isWeapon: boolean;
  requiresAmmo?: boolean;
}

export interface EquipmentMappingResult {
  found: boolean;
  mapping?: EquipmentMapping;
  originalId: string;
  suggestions?: string[];
}

/**
 * Comprehensive mapping from MegaMekLab item_type to our equipment database
 * Based on analysis of 3050U unit files and our equipment database structure
 */
export const EQUIPMENT_ID_MAPPING: Record<string, EquipmentMapping> = {
  
  // ===== ENERGY WEAPONS =====
  
  // PPCs  
  '1Iserppc': { databaseId: 'is_er_ppc', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'ErPpc': { databaseId: 'clan_erppc', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  '1Isppc': { databaseId: 'ppc', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'Ppc': { databaseId: 'ppc', category: 'Energy Weapons', isWeapon: true },
  'LightPpc': { databaseId: 'light_ppc', category: 'Energy Weapons', isWeapon: true },
  'HeavyPpc': { databaseId: 'heavy_ppc', category: 'Energy Weapons', isWeapon: true },
  'SnubNosePpc': { databaseId: 'snub_nose_ppc', category: 'Energy Weapons', isWeapon: true },
  
  // Medium Lasers
  '1Ismediumlaser': { databaseId: 'medium_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  '2Ismediumlaser': { databaseId: 'medium_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  '1Isermediumlaser': { databaseId: 'er_medium_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  '2Isermediumlaser': { databaseId: 'er_medium_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'ErMediumLaser': { databaseId: 'er_medium_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'MediumLaser': { databaseId: 'medium_laser', category: 'Energy Weapons', isWeapon: true },
  'HeavyMediumLaser': { databaseId: 'heavy_medium_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // Medium Pulse Lasers
  '1Ismediumpulselaser': { databaseId: 'medium_pulse_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'MediumPulseLaser': { databaseId: 'medium_pulse_laser', category: 'Energy Weapons', isWeapon: true },
  
  // Large Lasers
  '1Iserlargelaser': { databaseId: 'er_large_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'ErLargeLaser': { databaseId: 'er_large_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'LargePulseLaser': { databaseId: 'large_pulse_laser', category: 'Energy Weapons', isWeapon: true },
  '1Islargelaser': { databaseId: 'large_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  
  // Small Lasers  
  '1Issmalllaser': { databaseId: 'small_laser', category: 'Energy Weapons', techBase: 'Inner Sphere', isWeapon: true },
  'ErSmallLaser': { databaseId: 'er_small_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'SmallLaser': { databaseId: 'small_laser', category: 'Energy Weapons', isWeapon: true },
  'SmallPulseLaser': { databaseId: 'small_pulse_laser', category: 'Energy Weapons', isWeapon: true },
  'HeavySmallLaser': { databaseId: 'heavy_small_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // Large Lasers (additional)
  'LargeLaser': { databaseId: 'large_laser', category: 'Energy Weapons', isWeapon: true },
  'HeavyLargeLaser': { databaseId: 'heavy_large_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'ImprovedHeavyLargeLaser': { databaseId: 'improved_heavy_large_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // Improved Heavy Lasers  
  'ImprovedHeavyMediumLaser': { databaseId: 'improved_heavy_medium_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'ImprovedHeavySmallLaser': { databaseId: 'improved_heavy_small_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // X-Pulse Lasers
  'MediumXPulseLaser': { databaseId: 'medium_x_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'SmallXPulseLaser': { databaseId: 'small_x_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'LargeXPulseLaser': { databaseId: 'large_x_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // ER Pulse Lasers
  'ErMediumPulseLaser': { databaseId: 'er_medium_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'ErSmallPulseLaser': { databaseId: 'er_small_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'ErLargePulseLaser': { databaseId: 'er_large_pulse_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  
  // Micro Lasers
  'ErMicroLaser': { databaseId: 'er_micro_laser', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'MicroPulseLaser': { databaseId: 'micro_pulse_laser', category: 'Energy Weapons', isWeapon: true },
  
  // Flamers
  'Flamer': { databaseId: 'flamer', category: 'Energy Weapons', isWeapon: true },
  'ErFlamer': { databaseId: 'er_flamer', category: 'Energy Weapons', techBase: 'Clan', isWeapon: true },
  'HeavyFlamer': { databaseId: 'heavy_flamer', category: 'Energy Weapons', isWeapon: true },
  
  // ===== BALLISTIC WEAPONS =====
  
  // Autocannons
  '1Isac10': { databaseId: 'ac_10', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  '1Isac5': { databaseId: 'ac_5', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  '1Isac20': { databaseId: 'ac_20', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  '1Isac2': { databaseId: 'ac_2', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  '2Islac2': { databaseId: 'lac_2', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  // Generic AC forms
  'Ac2': { databaseId: 'ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Ac5': { databaseId: 'ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Ac10': { databaseId: 'ac_10', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Ac20': { databaseId: 'ac_20', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Autocannon2': { databaseId: 'ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Autocannon5': { databaseId: 'ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Autocannon10': { databaseId: 'ac_10', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Autocannon20': { databaseId: 'ac_20', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // Ultra Autocannons  
  'UltraAc2': { databaseId: 'ultra_ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'UltraAc5': { databaseId: 'ultra_ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'UltraAc10': { databaseId: 'ultra_ac_10', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'UltraAc20': { databaseId: 'ultra_ac_20', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // Light Autocannons
  'LightAc2': { databaseId: 'light_ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'LightAc5': { databaseId: 'light_ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Lac5': { databaseId: 'lac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // Rotary Autocannons
  'RotaryAc2': { databaseId: 'rotary_ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'RotaryAc5': { databaseId: 'rotary_ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // LB-X Autocannons
  '1Islbxac10': { databaseId: 'lbx_ac_10', category: 'Ballistic Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  'Lb10XAc': { databaseId: 'lbx_ac_10', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Lb2XAc': { databaseId: 'lbx_ac_2', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Lb5XAc': { databaseId: 'lbx_ac_5', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  'Lb20XAc': { databaseId: 'lbx_ac_20', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // Gauss Rifles
  'GaussRifle': { databaseId: 'gauss_rifle', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // Machine Guns
  'MachineGun': { databaseId: 'machine_gun', category: 'Ballistic Weapons', isWeapon: true, requiresAmmo: true },
  
  // ===== MISSILE WEAPONS =====
  
  // SRMs
  '1Issrm6': { databaseId: 'srm_6', category: 'Missile Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  'Srm6': { databaseId: 'srm_6', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'Srm4': { databaseId: 'srm_4', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'Srm2': { databaseId: 'srm_2', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  
  // Streak SRMs
  'StreakSrm6': { databaseId: 'streak_srm_6', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'StreakSrm4': { databaseId: 'streak_srm_4', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'StreakSrm2': { databaseId: 'streak_srm_2', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  
  // LRMs
  '1Islrm15': { databaseId: 'lrm_15', category: 'Missile Weapons', techBase: 'Inner Sphere', isWeapon: true, requiresAmmo: true },
  'Lrm20': { databaseId: 'lrm_20', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'Lrm15': { databaseId: 'lrm_15', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'Lrm10': { databaseId: 'lrm_10', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'Lrm5': { databaseId: 'lrm_5', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  
  // Enhanced LRMs
  'EnhancedLrm5': { databaseId: 'enhanced_lrm_5', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'ExtendedLrm5': { databaseId: 'extended_lrm_5', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'ExtendedLrm10': { databaseId: 'extended_lrm_10', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'ExtendedLrm15': { databaseId: 'extended_lrm_15', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  
  // Streak LRMs
  'StreakLrm5': { databaseId: 'streak_lrm_5', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'StreakLrm10': { databaseId: 'streak_lrm_10', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'StreakLrm15': { databaseId: 'streak_lrm_15', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  'StreakLrm20': { databaseId: 'streak_lrm_20', category: 'Missile Weapons', isWeapon: true, requiresAmmo: true },
  
  // ===== DEFENSIVE EQUIPMENT =====
  
  // Anti-Missile Systems
  'LaserAms': { databaseId: 'laser_ams', category: 'Defensive Equipment', isWeapon: true },
  'Ams': { databaseId: 'anti_missile_system', category: 'Defensive Equipment', isWeapon: true, requiresAmmo: true },
  'AntiMissileSystem': { databaseId: 'anti_missile_system', category: 'Defensive Equipment', isWeapon: true, requiresAmmo: true },
  
  // ===== GENERIC/EQUIPMENT =====
  
  // Generic weapon placeholder
  'Weapon': { databaseId: 'generic_weapon', category: 'Equipment', isWeapon: true },
  
  // ===== AMMUNITION (will need special handling) =====
  
  // Common ammo types - these will need to be mapped based on weapon requirements
  'AC2Ammo': { databaseId: 'ac_2_ammo', category: 'Ammunition', isWeapon: false },
  'AC5Ammo': { databaseId: 'ac_5_ammo', category: 'Ammunition', isWeapon: false },
  'AC10Ammo': { databaseId: 'ac_10_ammo', category: 'Ammunition', isWeapon: false },
  'AC20Ammo': { databaseId: 'ac_20_ammo', category: 'Ammunition', isWeapon: false },
  'GaussAmmo': { databaseId: 'gauss_ammo', category: 'Ammunition', isWeapon: false },
  'SRMAmmo': { databaseId: 'srm_ammo', category: 'Ammunition', isWeapon: false },
  'LRMAmmo': { databaseId: 'lrm_ammo', category: 'Ammunition', isWeapon: false },
  'MGAmmo': { databaseId: 'machine_gun_ammo', category: 'Ammunition', isWeapon: false }
};

/**
 * Tech base inference mapping for equipment without explicit tech base
 */
const TECH_BASE_INFERENCE_PATTERNS: Array<{ pattern: RegExp; techBase: TechBase }> = [
  { pattern: /^1Is/i, techBase: 'Inner Sphere' },
  { pattern: /^2Is/i, techBase: 'Inner Sphere' },
  { pattern: /^3Is/i, techBase: 'Inner Sphere' },
  { pattern: /^4Is/i, techBase: 'Inner Sphere' },
  { pattern: /IS/i, techBase: 'Inner Sphere' },
  { pattern: /^Er/i, techBase: 'Clan' },
  { pattern: /^Clan/i, techBase: 'Clan' },
  { pattern: /^Heavy/i, techBase: 'Clan' }
];

export class EquipmentIDMappingService {
  
  /**
   * Get equipment mapping for a MegaMekLab item_type
   */
  getMapping(itemType: string, techBaseHint?: TechBase): EquipmentMappingResult {
    // Direct mapping lookup
    const directMapping = EQUIPMENT_ID_MAPPING[itemType];
    if (directMapping) {
      return {
        found: true,
        mapping: directMapping,
        originalId: itemType
      };
    }
    
    // Try case-insensitive lookup
    const lowerItemType = itemType.toLowerCase();
    for (const [key, mapping] of Object.entries(EQUIPMENT_ID_MAPPING)) {
      if (key.toLowerCase() === lowerItemType) {
        return {
          found: true,
          mapping,
          originalId: itemType
        };
      }
    }
    
    // Generate suggestions for unmapped equipment
    const suggestions = this.generateSuggestions(itemType);
    
    return {
      found: false,
      originalId: itemType,
      suggestions
    };
  }
  
  /**
   * Infer tech base from equipment name patterns
   */
  inferTechBase(itemType: string, fallback: TechBase = 'Inner Sphere'): TechBase {
    // Check explicit mapping first
    const mapping = EQUIPMENT_ID_MAPPING[itemType];
    if (mapping?.techBase) {
      return mapping.techBase;
    }
    
    // Use pattern matching
    for (const { pattern, techBase } of TECH_BASE_INFERENCE_PATTERNS) {
      if (pattern.test(itemType)) {
        return techBase;
      }
    }
    
    return fallback;
  }
  
  /**
   * Generate suggestions for unmapped equipment
   */
  private generateSuggestions(itemType: string): string[] {
    const suggestions: string[] = [];
    const lowerItemType = itemType.toLowerCase();
    
    // Look for partial matches in existing mappings
    for (const [key, mapping] of Object.entries(EQUIPMENT_ID_MAPPING)) {
      const lowerKey = key.toLowerCase();
      
      // Check if item type contains part of the key or vice versa
      if (lowerItemType.includes(lowerKey.slice(0, 5)) || lowerKey.includes(lowerItemType.slice(0, 5))) {
        suggestions.push(mapping.databaseId);
      }
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
  
  /**
   * Get all mapped equipment types
   */
  getAllMappedTypes(): string[] {
    return Object.keys(EQUIPMENT_ID_MAPPING);
  }
  
  /**
   * Get mapping statistics
   */
  getMappingStats(): {
    totalMappings: number;
    weaponMappings: number;
    ammunitionMappings: number;
    equipmentMappings: number;
    techBaseMappings: {
      innerSphere: number;
      clan: number;
      generic: number;
    };
  } {
    const mappings = Object.values(EQUIPMENT_ID_MAPPING);
    
    return {
      totalMappings: mappings.length,
      weaponMappings: mappings.filter(m => m.isWeapon).length,
      ammunitionMappings: mappings.filter(m => m.category === 'Ammunition').length,
      equipmentMappings: mappings.filter(m => !m.isWeapon && m.category !== 'Ammunition').length,
      techBaseMappings: {
        innerSphere: mappings.filter(m => m.techBase === 'Inner Sphere').length,
        clan: mappings.filter(m => m.techBase === 'Clan').length,
        generic: mappings.filter(m => !m.techBase).length
      }
    };
  }
}

export default EquipmentIDMappingService;
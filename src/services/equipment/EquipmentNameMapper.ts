/**
 * Equipment Name Mapper
 * 
 * Maps MTF equipment names to canonical equipment IDs.
 * Handles legacy names, alternate spellings, and tech base variations.
 * 
 * @module services/equipment/EquipmentNameMapper
 */

import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentRegistry, EquipmentRegistry } from './EquipmentRegistry';

/**
 * Name mapping result
 */
export interface INameMappingResult {
  readonly success: boolean;
  readonly equipmentId: string | null;
  readonly confidence: 'exact' | 'normalized' | 'alias' | 'fuzzy' | 'unknown';
  readonly alternates?: string[];
  readonly warning?: string;
}

/**
 * Mapping statistics
 */
export interface IMappingStats {
  readonly totalMappings: number;
  readonly exactMatches: number;
  readonly aliasMatches: number;
  readonly unknownItems: string[];
}

/**
 * Static name mappings from MTF format to canonical IDs
 * 
 * These are the known mappings for equipment names as they appear
 * in MegaMek MTF files to our canonical equipment IDs.
 */
const MTF_NAME_MAPPINGS: Record<string, string> = {
  // Energy Weapons
  'Small Laser': 'small-laser',
  'Medium Laser': 'medium-laser',
  'Large Laser': 'large-laser',
  'ER Small Laser': 'er-small-laser',
  'ER Medium Laser': 'er-medium-laser',
  'ER Large Laser': 'er-large-laser',
  'Small Pulse Laser': 'small-pulse-laser',
  'Medium Pulse Laser': 'medium-pulse-laser',
  'Large Pulse Laser': 'large-pulse-laser',
  'PPC': 'ppc',
  'ER PPC': 'er-ppc',
  'Light PPC': 'light-ppc',
  'Heavy PPC': 'heavy-ppc',
  'Snub-Nose PPC': 'snub-nose-ppc',
  'Flamer': 'flamer',
  'Heavy Flamer': 'heavy-flamer',
  'Vehicle Flamer': 'vehicle-flamer',
  
  // Clan Energy Weapons
  'ER Micro Laser': 'clan-er-micro-laser',
  'Clan ER Small Laser': 'clan-er-small-laser',
  'Clan ER Medium Laser': 'clan-er-medium-laser',
  'Clan ER Large Laser': 'clan-er-large-laser',
  'Micro Pulse Laser': 'clan-micro-pulse-laser',
  'Clan Small Pulse Laser': 'clan-small-pulse-laser',
  'Clan Medium Pulse Laser': 'clan-medium-pulse-laser',
  'Clan Large Pulse Laser': 'clan-large-pulse-laser',
  'Clan ER PPC': 'clan-er-ppc',
  'Clan Flamer': 'clan-flamer',
  
  // Ballistic Weapons
  'Autocannon/2': 'ac-2',
  'AC/2': 'ac-2',
  'Autocannon/5': 'ac-5',
  'AC/5': 'ac-5',
  'Autocannon/10': 'ac-10',
  'AC/10': 'ac-10',
  'Autocannon/20': 'ac-20',
  'AC/20': 'ac-20',
  'Ultra AC/2': 'uac-2',
  'Ultra AC/5': 'uac-5',
  'Ultra AC/10': 'uac-10',
  'Ultra AC/20': 'uac-20',
  'LB 2-X AC': 'lb-2x-ac',
  'LB 5-X AC': 'lb-5x-ac',
  'LB 10-X AC': 'lb-10x-ac',
  'LB 20-X AC': 'lb-20x-ac',
  'Rotary AC/2': 'rac-2',
  'Rotary AC/5': 'rac-5',
  'Light AC/2': 'lac-2',
  'Light AC/5': 'lac-5',
  'Gauss Rifle': 'gauss-rifle',
  'Light Gauss Rifle': 'light-gauss-rifle',
  'Heavy Gauss Rifle': 'heavy-gauss-rifle',
  'Machine Gun': 'machine-gun',
  'Light Machine Gun': 'light-machine-gun',
  'Heavy Machine Gun': 'heavy-machine-gun',
  'AMS': 'ams',
  'Anti-Missile System': 'ams',
  
  // Clan Ballistic Weapons
  'Clan Ultra AC/2': 'clan-uac-2',
  'Clan Ultra AC/5': 'clan-uac-5',
  'Clan Ultra AC/10': 'clan-uac-10',
  'Clan Ultra AC/20': 'clan-uac-20',
  'Clan LB 2-X AC': 'clan-lb-2x-ac',
  'Clan LB 5-X AC': 'clan-lb-5x-ac',
  'Clan LB 10-X AC': 'clan-lb-10x-ac',
  'Clan LB 20-X AC': 'clan-lb-20x-ac',
  'Clan Gauss Rifle': 'clan-gauss-rifle',
  'Clan Machine Gun': 'clan-machine-gun',
  'Clan AMS': 'clan-ams',
  
  // Missile Weapons
  'LRM 5': 'lrm-5',
  'LRM-5': 'lrm-5',
  'LRM 10': 'lrm-10',
  'LRM-10': 'lrm-10',
  'LRM 15': 'lrm-15',
  'LRM-15': 'lrm-15',
  'LRM 20': 'lrm-20',
  'LRM-20': 'lrm-20',
  'SRM 2': 'srm-2',
  'SRM-2': 'srm-2',
  'SRM 4': 'srm-4',
  'SRM-4': 'srm-4',
  'SRM 6': 'srm-6',
  'SRM-6': 'srm-6',
  'Streak SRM 2': 'streak-srm-2',
  'Streak SRM 4': 'streak-srm-4',
  'Streak SRM 6': 'streak-srm-6',
  'MRM 10': 'mrm-10',
  'MRM 20': 'mrm-20',
  'MRM 30': 'mrm-30',
  'MRM 40': 'mrm-40',
  'NARC Missile Beacon': 'narc-beacon',
  'iNARC Launcher': 'inarc-launcher',
  
  // Clan Missile Weapons
  'Clan LRM 5': 'clan-lrm-5',
  'Clan LRM 10': 'clan-lrm-10',
  'Clan LRM 15': 'clan-lrm-15',
  'Clan LRM 20': 'clan-lrm-20',
  'Clan SRM 2': 'clan-srm-2',
  'Clan SRM 4': 'clan-srm-4',
  'Clan SRM 6': 'clan-srm-6',
  'Clan Streak SRM 2': 'clan-streak-srm-2',
  'Clan Streak SRM 4': 'clan-streak-srm-4',
  'Clan Streak SRM 6': 'clan-streak-srm-6',
  'ATM 3': 'atm-3',
  'ATM 6': 'atm-6',
  'ATM 9': 'atm-9',
  'ATM 12': 'atm-12',
  
  // Heat Sinks
  'Heat Sink': 'single-heat-sink',
  'Single Heat Sink': 'single-heat-sink',
  'Double Heat Sink': 'double-heat-sink',
  'Clan Double Heat Sink': 'clan-double-heat-sink',
  
  // Jump Jets
  'Jump Jet': 'jump-jet-medium',
  'Jump Jets': 'jump-jet-medium',
  'Improved Jump Jet': 'improved-jump-jet-medium',
  
  // Electronics
  'Guardian ECM Suite': 'guardian-ecm',
  'Guardian ECM': 'guardian-ecm',
  'Clan ECM Suite': 'clan-ecm',
  'Beagle Active Probe': 'beagle-active-probe',
  'Bloodhound Active Probe': 'bloodhound-active-probe',
  'Clan Active Probe': 'clan-active-probe',
  'Light Active Probe': 'light-active-probe',
  'TAG': 'tag',
  'Clan TAG': 'clan-tag',
  'Light TAG': 'light-tag',
  'C3 Master Computer': 'c3-master',
  'C3 Slave Unit': 'c3-slave',
  'Improved C3 Computer': 'c3i',
  'C3i': 'c3i',
  'Targeting Computer': 'targeting-computer',
  'Clan Targeting Computer': 'clan-targeting-computer',
  
  // Misc Equipment
  'MASC': 'masc',
  'Clan MASC': 'clan-masc',
  'Triple Strength Myomer': 'tsm',
  'TSM': 'tsm',
  'Supercharger': 'supercharger',
  
  // Ammo common patterns
  'IS Ammo LRM-5': 'lrm-5-ammo',
  'IS Ammo LRM-10': 'lrm-10-ammo',
  'IS Ammo LRM-15': 'lrm-15-ammo',
  'IS Ammo LRM-20': 'lrm-20-ammo',
  'IS Ammo SRM-2': 'srm-2-ammo',
  'IS Ammo SRM-4': 'srm-4-ammo',
  'IS Ammo SRM-6': 'srm-6-ammo',
  'IS Ammo AC/2': 'ac-2-ammo',
  'IS Ammo AC/5': 'ac-5-ammo',
  'IS Ammo AC/10': 'ac-10-ammo',
  'IS Ammo AC/20': 'ac-20-ammo',
  'IS Gauss Ammo': 'gauss-ammo',
  'IS Machine Gun Ammo': 'machine-gun-ammo',
  
  // Clan Ammo
  'Clan Ammo LRM-5': 'clan-lrm-5-ammo',
  'Clan Ammo LRM-10': 'clan-lrm-10-ammo',
  'Clan Ammo LRM-15': 'clan-lrm-15-ammo',
  'Clan Ammo LRM-20': 'clan-lrm-20-ammo',
  'Clan Ammo SRM-2': 'clan-srm-2-ammo',
  'Clan Ammo SRM-4': 'clan-srm-4-ammo',
  'Clan Ammo SRM-6': 'clan-srm-6-ammo',
};

/**
 * Equipment Name Mapper
 * 
 * Maps MTF equipment names to canonical equipment IDs.
 */
export class EquipmentNameMapper {
  private static instance: EquipmentNameMapper | null = null;
  
  private registry: EquipmentRegistry;
  private customMappings: Map<string, string> = new Map();
  private unknownNames: Set<string> = new Set();
  
  private constructor() {
    this.registry = getEquipmentRegistry();
    
    // Initialize static mappings
    Object.entries(MTF_NAME_MAPPINGS).forEach(([name, id]) => {
      this.customMappings.set(name.toLowerCase(), id);
    });
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): EquipmentNameMapper {
    if (!EquipmentNameMapper.instance) {
      EquipmentNameMapper.instance = new EquipmentNameMapper();
    }
    return EquipmentNameMapper.instance;
  }
  
  /**
   * Map an MTF equipment name to a canonical ID
   */
  mapName(mtfName: string, techBase?: TechBase): INameMappingResult {
    // Clean up the name
    const cleanName = this.cleanMtfName(mtfName);
    
    // Try exact match from static mappings
    const staticId = this.customMappings.get(cleanName.toLowerCase());
    if (staticId) {
      return {
        success: true,
        equipmentId: staticId,
        confidence: 'exact',
      };
    }
    
    // Try with tech base prefix
    if (techBase === TechBase.CLAN) {
      const clanId = this.customMappings.get(`clan ${cleanName}`.toLowerCase());
      if (clanId) {
        return {
          success: true,
          equipmentId: clanId,
          confidence: 'alias',
        };
      }
    } else if (techBase === TechBase.INNER_SPHERE) {
      const isId = this.customMappings.get(`is ${cleanName}`.toLowerCase());
      if (isId) {
        return {
          success: true,
          equipmentId: isId,
          confidence: 'alias',
        };
      }
    }
    
    // Try registry lookup
    const registryResult = this.registry.lookup(cleanName);
    if (registryResult.found && registryResult.equipment) {
      return {
        success: true,
        equipmentId: registryResult.equipment.id,
        confidence: 'normalized',
      };
    }
    
    // Try normalized lookup without special characters
    const normalizedName = this.normalizeName(cleanName);
    const normalizedId = this.customMappings.get(normalizedName);
    if (normalizedId) {
      return {
        success: true,
        equipmentId: normalizedId,
        confidence: 'normalized',
      };
    }
    
    // Track unknown name
    this.unknownNames.add(mtfName);
    
    return {
      success: false,
      equipmentId: null,
      confidence: 'unknown',
      alternates: registryResult.alternateIds,
      warning: `Unknown equipment: ${mtfName}`,
    };
  }
  
  /**
   * Clean an MTF equipment name
   */
  private cleanMtfName(name: string): string {
    return name
      .replace(/\s*\(R\)\s*$/i, '') // Remove rear-facing indicator
      .replace(/\s*\(Clan\)\s*$/i, '') // Remove Clan suffix (handled separately)
      .replace(/\s*\(IS\)\s*$/i, '') // Remove IS suffix
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\s+/g, ' '); // Normalize spaces
  }
  
  /**
   * Normalize a name for fuzzy matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
  
  /**
   * Add a custom name mapping
   */
  addMapping(mtfName: string, equipmentId: string): void {
    this.customMappings.set(mtfName.toLowerCase(), equipmentId);
    this.unknownNames.delete(mtfName);
  }
  
  /**
   * Load mappings from a JSON file
   */
  async loadMappings(url: string): Promise<number> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const mappings = await response.json() as Record<string, string>;
      let count = 0;
      
      Object.entries(mappings).forEach(([name, id]) => {
        this.customMappings.set(name.toLowerCase(), id);
        count++;
      });
      
      return count;
    } catch (e) {
      console.error('Failed to load name mappings:', e);
      return 0;
    }
  }
  
  /**
   * Get list of unknown equipment names
   */
  getUnknownNames(): string[] {
    return Array.from(this.unknownNames);
  }
  
  /**
   * Clear unknown names tracking
   */
  clearUnknownNames(): void {
    this.unknownNames.clear();
  }
  
  /**
   * Get mapping statistics
   */
  getStats(): IMappingStats {
    return {
      totalMappings: this.customMappings.size,
      exactMatches: Object.keys(MTF_NAME_MAPPINGS).length,
      aliasMatches: this.customMappings.size - Object.keys(MTF_NAME_MAPPINGS).length,
      unknownItems: this.getUnknownNames(),
    };
  }
  
  /**
   * Export unknown names to JSON format for manual mapping
   */
  exportUnknownNames(): string {
    const unknowns: Record<string, string> = {};
    this.unknownNames.forEach(name => {
      unknowns[name] = ''; // Empty value to be filled in manually
    });
    return JSON.stringify(unknowns, null, 2);
  }
}

/**
 * Convenience function to get the mapper instance
 */
export function getEquipmentNameMapper(): EquipmentNameMapper {
  return EquipmentNameMapper.getInstance();
}


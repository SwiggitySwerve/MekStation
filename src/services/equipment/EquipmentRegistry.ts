/**
 * Equipment Registry
 * 
 * Provides fast lookup for equipment by ID, name, or category.
 * Acts as a centralized cache for all loaded equipment.
 * 
 * @module services/equipment/EquipmentRegistry
 */

import { TechBase } from '@/types/enums/TechBase';
import { IWeapon, WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { IAmmunition, AmmoCategory } from '@/types/equipment/AmmunitionTypes';
import { IElectronics, ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { EquipmentLoaderService, getEquipmentLoader } from './EquipmentLoaderService';

/**
 * Generic equipment type union
 */
export type AnyEquipment = IWeapon | IAmmunition | IElectronics | IMiscEquipment;

/**
 * Equipment category union
 */
export type EquipmentCategoryType = 
  | WeaponCategory 
  | AmmoCategory 
  | ElectronicsCategory 
  | MiscEquipmentCategory 
  | 'Weapon' 
  | 'Ammunition' 
  | 'Electronics' 
  | 'Miscellaneous';

/**
 * Equipment registry statistics
 */
export interface IRegistryStats {
  readonly totalItems: number;
  readonly weapons: number;
  readonly ammunition: number;
  readonly electronics: number;
  readonly miscellaneous: number;
  readonly byTechBase: Record<string, number>;
  readonly byRulesLevel: Record<string, number>;
}

/**
 * Equipment lookup result
 */
export interface IEquipmentLookupResult {
  readonly found: boolean;
  readonly equipment: AnyEquipment | null;
  readonly category: EquipmentCategoryType | null;
  readonly alternateIds?: string[];
}

/**
 * Equipment Registry
 * 
 * Central registry for all equipment lookups with name aliasing support.
 */
export class EquipmentRegistry {
  private static instance: EquipmentRegistry | null = null;
  
  // Name to ID mappings (for MTF name resolution)
  private nameToIdMap: Map<string, string> = new Map();
  
  // ID to equipment type mapping
  private idToTypeMap: Map<string, EquipmentCategoryType> = new Map();
  
  private loader: EquipmentLoaderService;
  private isInitialized = false;
  
  private constructor() {
    this.loader = getEquipmentLoader();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): EquipmentRegistry {
    if (!EquipmentRegistry.instance) {
      EquipmentRegistry.instance = new EquipmentRegistry();
    }
    return EquipmentRegistry.instance;
  }
  
  /**
   * Initialize the registry with loaded equipment
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Ensure equipment is loaded
    if (!this.loader.getIsLoaded()) {
      await this.loader.loadOfficialEquipment();
    }
    
    // Build name-to-ID mappings for all equipment
    this.buildNameMappings();
    
    this.isInitialized = true;
  }
  
  /**
   * Build name-to-ID mappings for fast lookups
   */
  private buildNameMappings(): void {
    this.nameToIdMap.clear();
    this.idToTypeMap.clear();
    
    // Map weapons
    this.loader.getAllWeapons().forEach(weapon => {
      this.registerEquipment(weapon.id, weapon.name, 'Weapon');
      this.addCommonAliases(weapon.id, weapon.name, weapon);
    });
    
    // Map ammunition
    this.loader.getAllAmmunition().forEach(ammo => {
      this.registerEquipment(ammo.id, ammo.name, 'Ammunition');
      this.addAmmoAliases(ammo);
    });
    
    // Map electronics
    this.loader.getAllElectronics().forEach(electronics => {
      this.registerEquipment(electronics.id, electronics.name, 'Electronics');
    });
    
    // Map misc equipment
    this.loader.getAllMiscEquipment().forEach(equipment => {
      this.registerEquipment(equipment.id, equipment.name, 'Miscellaneous');
      this.addMiscAliases(equipment);
    });
  }
  
  /**
   * Register an equipment item
   */
  private registerEquipment(id: string, name: string, category: EquipmentCategoryType): void {
    // Map by ID
    this.idToTypeMap.set(id, category);
    
    // Map by name (normalized)
    const normalizedName = this.normalizeName(name);
    this.nameToIdMap.set(normalizedName, id);
    
    // Also map original name
    this.nameToIdMap.set(name, id);
  }
  
  /**
   * Add common aliases for weapons
   */
  private addCommonAliases(id: string, name: string, weapon: IWeapon): void {
    // Add aliases for common naming variations
    
    // Handle "PPC" variations
    if (name.includes('PPC')) {
      this.nameToIdMap.set('Particle Projector Cannon', id);
    }
    
    // Handle clan weapons with "(Clan)" suffix
    if (weapon.techBase === TechBase.CLAN && !name.includes('Clan')) {
      // Allow lookup without "(Clan)" if unique
      const baseName = name.replace(' (Clan)', '').replace('(Clan)', '');
      // Only add if no IS version exists with same base name
      const normalizedBase = this.normalizeName(baseName);
      if (!this.nameToIdMap.has(normalizedBase)) {
        this.nameToIdMap.set(normalizedBase, id);
      }
    }
    
    // Handle AC/X naming
    if (name.startsWith('AC/')) {
      const altName = name.replace('AC/', 'Autocannon/');
      this.nameToIdMap.set(altName, id);
      this.nameToIdMap.set(this.normalizeName(altName), id);
    }
    
    // Handle LRM/SRM spacing
    if (name.match(/^[LS]RM\s*\d+/)) {
      const noSpace = name.replace(/^([LS]RM)\s+/, '$1');
      const withSpace = name.replace(/^([LS]RM)(\d)/, '$1 $2');
      this.nameToIdMap.set(noSpace, id);
      this.nameToIdMap.set(withSpace, id);
    }
  }
  
  /**
   * Add aliases for ammunition
   */
  private addAmmoAliases(ammo: IAmmunition): void {
    const name = ammo.name;
    
    // Handle "IS Ammo" and "Clan Ammo" prefixes
    if (ammo.techBase === TechBase.INNER_SPHERE) {
      this.nameToIdMap.set(`IS ${name}`, ammo.id);
      this.nameToIdMap.set(`IS Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, ammo.id);
    } else if (ammo.techBase === TechBase.CLAN) {
      this.nameToIdMap.set(`Clan ${name}`, ammo.id);
      this.nameToIdMap.set(`Clan Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, ammo.id);
    }
    
    // Handle various ammo naming patterns from MTF files
    const weaponBase = name.replace(' Ammo', '').replace('Ammo ', '');
    this.nameToIdMap.set(`Ammo ${weaponBase}`, ammo.id);
    this.nameToIdMap.set(`${weaponBase} Ammo`, ammo.id);
  }
  
  /**
   * Add aliases for miscellaneous equipment
   */
  private addMiscAliases(equipment: IMiscEquipment): void {
    const name = equipment.name;
    
    // Handle heat sink variations
    if (name === 'Heat Sink' || name === 'Double Heat Sink') {
      this.nameToIdMap.set('Single Heat Sink', 'single-heat-sink');
      this.nameToIdMap.set('Single', 'single-heat-sink');
      this.nameToIdMap.set('Double', 'double-heat-sink');
      this.nameToIdMap.set('DHS', 'double-heat-sink');
    }
    
    // Handle jump jet variations
    if (name.includes('Jump Jet')) {
      this.nameToIdMap.set('Jump Jet', 'jump-jet-medium');
      this.nameToIdMap.set('Jump Jets', 'jump-jet-medium');
    }
  }
  
  /**
   * Normalize a name for lookup
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
  
  /**
   * Look up equipment by ID or name
   */
  lookup(idOrName: string): IEquipmentLookupResult {
    // Try direct ID lookup first
    const byId = this.loader.getById(idOrName);
    if (byId) {
      return {
        found: true,
        equipment: byId,
        category: this.idToTypeMap.get(idOrName) || null,
      };
    }
    
    // Try name lookup
    const id = this.nameToIdMap.get(idOrName);
    if (id) {
      const equipment = this.loader.getById(id);
      if (equipment) {
        return {
          found: true,
          equipment,
          category: this.idToTypeMap.get(id) || null,
        };
      }
    }
    
    // Try normalized name lookup
    const normalizedId = this.nameToIdMap.get(this.normalizeName(idOrName));
    if (normalizedId) {
      const equipment = this.loader.getById(normalizedId);
      if (equipment) {
        return {
          found: true,
          equipment,
          category: this.idToTypeMap.get(normalizedId) || null,
        };
      }
    }
    
    // Not found - suggest alternatives
    return {
      found: false,
      equipment: null,
      category: null,
      alternateIds: this.findSimilar(idOrName),
    };
  }
  
  /**
   * Find similar equipment IDs for a given name
   */
  private findSimilar(name: string): string[] {
    const normalized = this.normalizeName(name);
    const similar: string[] = [];
    
    // Simple substring matching
    for (const [mappedName, id] of Array.from(this.nameToIdMap.entries())) {
      const normalizedMapped = this.normalizeName(mappedName);
      if (normalizedMapped.includes(normalized) || normalized.includes(normalizedMapped)) {
        if (!similar.includes(id)) {
          similar.push(id);
        }
      }
    }
    
    return similar.slice(0, 5); // Return top 5 suggestions
  }
  
  /**
   * Get equipment by ID (type-safe version)
   */
  getWeapon(id: string): IWeapon | null {
    return this.loader.getWeaponById(id);
  }
  
  /**
   * Get ammunition by ID
   */
  getAmmunition(id: string): IAmmunition | null {
    return this.loader.getAmmunitionById(id);
  }
  
  /**
   * Get electronics by ID
   */
  getElectronics(id: string): IElectronics | null {
    return this.loader.getElectronicsById(id);
  }
  
  /**
   * Get misc equipment by ID
   */
  getMiscEquipment(id: string): IMiscEquipment | null {
    return this.loader.getMiscEquipmentById(id);
  }
  
  /**
   * Resolve an MTF equipment name to a canonical ID
   */
  resolveEquipmentName(mtfName: string): string | null {
    const result = this.lookup(mtfName);
    return result.found && result.equipment ? result.equipment.id : null;
  }
  
  /**
   * Get registry statistics
   */
  getStats(): IRegistryStats {
    const weapons = this.loader.getAllWeapons();
    const ammunition = this.loader.getAllAmmunition();
    const electronics = this.loader.getAllElectronics();
    const miscellaneous = this.loader.getAllMiscEquipment();
    
    const byTechBase: Record<string, number> = {};
    const byRulesLevel: Record<string, number> = {};
    
    const allEquipment = [...weapons, ...ammunition, ...electronics, ...miscellaneous];
    
    allEquipment.forEach(eq => {
      const tb = eq.techBase.toString();
      const rl = eq.rulesLevel.toString();
      byTechBase[tb] = (byTechBase[tb] || 0) + 1;
      byRulesLevel[rl] = (byRulesLevel[rl] || 0) + 1;
    });
    
    return {
      totalItems: allEquipment.length,
      weapons: weapons.length,
      ammunition: ammunition.length,
      electronics: electronics.length,
      miscellaneous: miscellaneous.length,
      byTechBase,
      byRulesLevel,
    };
  }
  
  /**
   * Check if registry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Reset the registry (for testing)
   */
  reset(): void {
    this.nameToIdMap.clear();
    this.idToTypeMap.clear();
    this.isInitialized = false;
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getEquipmentRegistry(): EquipmentRegistry {
  return EquipmentRegistry.getInstance();
}


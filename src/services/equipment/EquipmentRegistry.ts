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
    
    // Add static alias mappings for known variants
    this.addStaticAliasMappings();
  }
  
  /**
   * Add static alias mappings for common equipment variants
   * These map alternative IDs directly to canonical equipment IDs
   */
  private addStaticAliasMappings(): void {
    // C3 system variants
    this.nameToIdMap.set('c3-master-with-tag', 'c3-master');
    this.nameToIdMap.set('c3-computer-master', 'c3-master');
    this.nameToIdMap.set('c3-master-boosted-with-tag', 'boosted-c3-master');
    this.nameToIdMap.set('c3-boosted-system-master', 'boosted-c3-master');
    this.nameToIdMap.set('improved-c3-computer', 'improved-c3');
    
    // Light autocannons (alternate naming)
    this.nameToIdMap.set('light-auto-cannon-2', 'lac-2');
    this.nameToIdMap.set('light-auto-cannon-5', 'lac-5');
    this.nameToIdMap.set('light-autocannon-2', 'lac-2');
    this.nameToIdMap.set('light-autocannon-5', 'lac-5');
    
    // VSP lasers (short form)
    this.nameToIdMap.set('medium-vsp', 'medium-vsp-laser');
    this.nameToIdMap.set('large-vsp', 'large-vsp-laser');
    this.nameToIdMap.set('small-vsp', 'small-vsp-laser');
    
    // Blazer cannon
    this.nameToIdMap.set('blazer-cannon', 'binary-laser-blazer-cannon');
    this.nameToIdMap.set('blazer', 'binary-laser-blazer-cannon');
    
    // Particle cannon (alternate name for PPC)
    this.nameToIdMap.set('particle-cannon', 'ppc');
    
    // Arrow IV
    this.nameToIdMap.set('arrow-iv', 'arrow-iv-launcher');
    this.nameToIdMap.set('arrow-iv-system', 'arrow-iv-launcher');
    
    // Long Tom
    this.nameToIdMap.set('long-tom-cannon', 'long-tom');
    
    // Mech Mortars
    this.nameToIdMap.set('mech-mortar-1', 'mech-mortar-1');
    this.nameToIdMap.set('mech-mortar-2', 'mech-mortar-2');
    this.nameToIdMap.set('mech-mortar-4', 'mech-mortar-4');
    this.nameToIdMap.set('mech-mortar-8', 'mech-mortar-8');
    
    // TSEMP
    this.nameToIdMap.set('tsemp-cannon', 'tsemp');
    this.nameToIdMap.set('tsemp', 'tsemp');
    
    // Pods
    this.nameToIdMap.set('m-pod', 'm-pod');
    this.nameToIdMap.set('b-pod', 'b-pod');
    this.nameToIdMap.set('anti-battlearmor-pods-b-pods', 'b-pod');
    
    // iATM
    this.nameToIdMap.set('iatm-3', 'iatm-3');
    this.nameToIdMap.set('iatm-6', 'iatm-6');
    this.nameToIdMap.set('iatm-9', 'iatm-9');
    this.nameToIdMap.set('iatm-12', 'iatm-12');
    
    // Fluid Gun
    this.nameToIdMap.set('fluid-gun', 'fluid-gun');
    
    // Taser
    this.nameToIdMap.set('battlemech-taser', 'mech-taser');
    this.nameToIdMap.set('mech-taser', 'mech-taser');
    
    // Coolant Pod
    this.nameToIdMap.set('coolant-pod', 'coolant-pod');
    
    // Rocket launchers with -pp suffix (prototype/primitive)
    this.nameToIdMap.set('rocket-launcher-10-pp', 'rocket-launcher-10');
    this.nameToIdMap.set('rocket-launcher-15-pp', 'rocket-launcher-15');
    this.nameToIdMap.set('rocket-launcher-20-pp', 'rocket-launcher-20');
    
    // Vehicular weapons
    this.nameToIdMap.set('vehicular-grenade-launcher', 'vehicular-grenade-launcher');
    
    // Cargo/Industrial
    this.nameToIdMap.set('cargo-1-ton', 'cargo');
    this.nameToIdMap.set('lift-hoist', 'lift-hoist');
    
    // Chemical lasers
    this.nameToIdMap.set('medium-chem-laser', 'medium-chemical-laser');
    this.nameToIdMap.set('large-chem-laser', 'large-chemical-laser');
    this.nameToIdMap.set('small-chem-laser', 'small-chemical-laser');
    
    // Prototype weapons
    this.nameToIdMap.set('prototype-er-medium-laser', 'er-medium-laser');
    this.nameToIdMap.set('prototype-rocket-launcher-10', 'rocket-launcher-10');
    this.nameToIdMap.set('prototype-rocket-launcher-15', 'rocket-launcher-15');
    this.nameToIdMap.set('prototype-rocket-launcher-20', 'rocket-launcher-20');
    
    // RISC equipment
    this.nameToIdMap.set('risc-advanced-point-defense-system', 'risc-apds');
    
    // Additional aliases for missing patterns
    // Heavy lasers with clan prefix
    this.nameToIdMap.set('clan-heavy-medium-laser', 'medium-heavy-laser');
    this.nameToIdMap.set('clan-heavy-large-laser', 'large-heavy-laser');
    this.nameToIdMap.set('clan-heavy-small-laser', 'small-heavy-laser');
    
    // ER flamer (doesn't exist - map to regular flamer or clan flamer)
    this.nameToIdMap.set('er-flamer', 'flamer');
    this.nameToIdMap.set('clan-er-flamer', 'clan-flamer');
    
    // Improved C3 (no separate improved-c3, use c3i which is improved C3)
    this.nameToIdMap.set('improved-c3', 'c3i');
    
    // Plasma weapons
    this.nameToIdMap.set('plasma-rifle', 'plasmarifle');
    this.nameToIdMap.set('clan-plasma-cannon', 'plasmacannon');
    
    // Arrow IV variants  
    this.nameToIdMap.set('clan-arrow-iv', 'clan-arrow-iv-launcher');
    this.nameToIdMap.set('arrow-iv', 'arrow-iv-launcher');
    
    // ECM suite
    this.nameToIdMap.set('clan-ecm-suite', 'clan-ecm');
    this.nameToIdMap.set('ecm-suite', 'guardian-ecm');
    this.nameToIdMap.set('guardian-ecm-suite', 'guardian-ecm');
    
    // Sniper cannon (artillery)
    this.nameToIdMap.set('sniper', 'sniper-cannon');
    
    // VSP laser aliases (map to existing IDs)
    this.nameToIdMap.set('medium-vsp-laser', 'bamediumvsplaser');
    this.nameToIdMap.set('large-vsp-laser', 'largevsplaser');
    this.nameToIdMap.set('small-vsp-laser', 'basmallvsplaser');
    
    // Rotary AC with clan prefix
    this.nameToIdMap.set('clan-rac-2', 'clan-rac-2');
    this.nameToIdMap.set('clan-rac-5', 'clan-rac-5');
    
    // Coolant pod variant
    this.nameToIdMap.set('is-coolant-pod', 'coolant-pod');
    
    // Sword
    this.nameToIdMap.set('sword', 'sword');
    
    // ATM aliases
    this.nameToIdMap.set('clan-atm-3', 'atm-3');
    this.nameToIdMap.set('clan-atm-6', 'atm-6');
    this.nameToIdMap.set('clan-atm-9', 'atm-9');
    this.nameToIdMap.set('clan-atm-12', 'atm-12');
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
    
    // Add slug-style ID aliases for common weapon patterns
    // This handles unit JSON files that use legacy IDs like 'ultra-ac-5' instead of 'uac-5'
    this.addSlugAliases(id, name, weapon.techBase === TechBase.CLAN);
  }
  
  /**
   * Add slug-style ID aliases (e.g., 'ultra-ac-5' → 'uac-5')
   * Handles legacy ID formats commonly found in unit JSON files
   */
  private addSlugAliases(id: string, name: string, isClan: boolean): void {
    const prefix = isClan ? 'clan-' : '';
    
    // Ultra AC patterns: 'uac-5' should also match 'ultra-ac-5'
    const ultraMatch = id.match(/^(clan-)?uac-(\d+)$/);
    if (ultraMatch) {
      const num = ultraMatch[2];
      this.nameToIdMap.set(`${prefix}ultra-ac-${num}`, id);
      this.nameToIdMap.set(`ultra-ac-${num}`, id); // Also without prefix for fallback
    }
    
    // Rotary AC patterns: 'rac-5' should also match 'rotary-ac-5'
    const rotaryMatch = id.match(/^(clan-)?rac-(\d+)$/);
    if (rotaryMatch) {
      const num = rotaryMatch[2];
      this.nameToIdMap.set(`${prefix}rotary-ac-${num}`, id);
      this.nameToIdMap.set(`rotary-ac-${num}`, id);
    }
    
    // Light AC patterns: 'lac-5' should also match 'light-ac-5'
    const lightMatch = id.match(/^(clan-)?lac-(\d+)$/);
    if (lightMatch) {
      const num = lightMatch[2];
      this.nameToIdMap.set(`${prefix}light-ac-${num}`, id);
      this.nameToIdMap.set(`light-ac-${num}`, id);
    }
    
    // LB-X AC patterns: 'lb-10x-ac' should also match 'lb-10-x-ac'
    const lbxMatch = id.match(/^(clan-)?lb-(\d+)x-ac$/);
    if (lbxMatch) {
      const num = lbxMatch[2];
      this.nameToIdMap.set(`${prefix}lb-${num}-x-ac`, id);
      this.nameToIdMap.set(`lb-${num}-x-ac`, id);
    }
    
    // ER Laser patterns: 'er-medium-laser' should match 'extended-range-medium-laser'
    const erMatch = id.match(/^(clan-)?er-(.+)-laser$/);
    if (erMatch) {
      const size = erMatch[2];
      this.nameToIdMap.set(`${prefix}extended-range-${size}-laser`, id);
      this.nameToIdMap.set(`extended-range-${size}-laser`, id);
    }
    
    // Pulse laser patterns with different naming
    const pulseMatch = id.match(/^(clan-)?(.+)-pulse-laser$/);
    if (pulseMatch) {
      const size = pulseMatch[2];
      this.nameToIdMap.set(`${prefix}pulse-${size}-laser`, id);
      this.nameToIdMap.set(`pulse-${size}-laser`, id);
    }
  }
  
  /**
   * Add aliases for ammunition
   */
  private addAmmoAliases(ammo: IAmmunition): void {
    const name = ammo.name;
    const id = ammo.id;
    const isClan = ammo.techBase === TechBase.CLAN;
    
    // Handle "IS Ammo" and "Clan Ammo" prefixes
    if (ammo.techBase === TechBase.INNER_SPHERE) {
      this.nameToIdMap.set(`IS ${name}`, id);
      this.nameToIdMap.set(`IS Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, id);
    } else if (isClan) {
      this.nameToIdMap.set(`Clan ${name}`, id);
      this.nameToIdMap.set(`Clan Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, id);
    }
    
    // Handle various ammo naming patterns from MTF files
    const weaponBase = name.replace(' Ammo', '').replace('Ammo ', '');
    this.nameToIdMap.set(`Ammo ${weaponBase}`, id);
    this.nameToIdMap.set(`${weaponBase} Ammo`, id);
    
    // Add slug-style ID aliases for ammo (e.g., 'ultra-ac-5-ammo' → 'uac-5-ammo')
    this.addAmmoSlugAliases(id, isClan);
  }
  
  /**
   * Add slug-style ID aliases for ammunition
   * Handles legacy ID formats like 'ultra-ac-5-ammo' → 'uac-5-ammo'
   */
  private addAmmoSlugAliases(id: string, isClan: boolean): void {
    const prefix = isClan ? 'clan-' : '';
    
    // Ultra AC ammo: 'uac-5-ammo' should also match 'ultra-ac-5-ammo'
    const uacMatch = id.match(/^(clan-)?uac-(\d+)-ammo$/);
    if (uacMatch) {
      const num = uacMatch[2];
      this.nameToIdMap.set(`${prefix}ultra-ac-${num}-ammo`, id);
      this.nameToIdMap.set(`ultra-ac-${num}-ammo`, id);
    }
    
    // Rotary AC ammo: 'rac-5-ammo' should also match 'rotary-ac-5-ammo'
    const racMatch = id.match(/^(clan-)?rac-(\d+)-ammo$/);
    if (racMatch) {
      const num = racMatch[2];
      this.nameToIdMap.set(`${prefix}rotary-ac-${num}-ammo`, id);
      this.nameToIdMap.set(`rotary-ac-${num}-ammo`, id);
    }
    
    // Light AC ammo: 'lac-5-ammo' should also match 'light-ac-5-ammo'
    const lacMatch = id.match(/^(clan-)?lac-(\d+)-ammo$/);
    if (lacMatch) {
      const num = lacMatch[2];
      this.nameToIdMap.set(`${prefix}light-ac-${num}-ammo`, id);
      this.nameToIdMap.set(`light-ac-${num}-ammo`, id);
    }
    
    // LB-X AC ammo: 'lb-10x-ac-ammo' should also match 'lb-10-x-ac-ammo'
    const lbxMatch = id.match(/^(clan-)?lb-(\d+)x-ac-(.*ammo.*)$/);
    if (lbxMatch) {
      const num = lbxMatch[2];
      const suffix = lbxMatch[3];
      this.nameToIdMap.set(`${prefix}lb-${num}-x-ac-${suffix}`, id);
      this.nameToIdMap.set(`lb-${num}-x-ac-${suffix}`, id);
    }
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
   * Parse legacy MegaMek-style equipment IDs
   * Formats like: "1-ismediumlaser", "2-clermediumlaser", "1-islbxac10"
   * 
   * Pattern: [quantity]-[techbase][equipmentname]
   * - quantity: numeric prefix (1, 2, 3, etc.)
   * - techbase: 'is' (Inner Sphere) or 'cl' (Clan)
   * - equipmentname: concatenated equipment name
   * 
   * @returns Canonical equipment ID or null if not a legacy format
   */
  private parseLegacyMegaMekId(legacyId: string): string | null {
    // Match pattern: optional quantity prefix + techbase + equipment
    // Examples: "1-ismediumlaser", "clerlargelaser", "1-islbxac10", "1-is-coolant-pod"
    const patterns = [
      // With quantity prefix and hyphenated techbase: "1-is-coolant-pod"
      /^(\d+)-(is|cl)-(.+)$/i,
      // With quantity prefix: "1-ismediumlaser"
      /^(\d+)-?(is|cl)(.+)$/i,
      // Without quantity: "ismediumlaser", "clerlargelaser"  
      /^(is|cl)(.+)$/i,
    ];
    
    let techBase: 'is' | 'cl' | null = null;
    let equipName: string = '';
    
    for (const pattern of patterns) {
      const match = legacyId.match(pattern);
      if (match) {
        if (match.length === 4) {
          // With quantity: [full, quantity, techbase, name]
          techBase = match[2].toLowerCase() as 'is' | 'cl';
          equipName = match[3].toLowerCase();
        } else if (match.length === 3) {
          // Without quantity: [full, techbase, name]
          techBase = match[1].toLowerCase() as 'is' | 'cl';
          equipName = match[2].toLowerCase();
        }
        break;
      }
    }
    
    if (!techBase || !equipName) {
      return null;
    }
    
    // Build canonical ID by converting concatenated name to slug format
    // e.g., "mediumlaser" -> "medium-laser", "erlarge laser" -> "er-large-laser"
    const canonicalId = this.convertMegaMekNameToSlug(equipName, techBase);
    return canonicalId;
  }
  
  /**
   * Convert MegaMek concatenated equipment name to slug format
   */
  private convertMegaMekNameToSlug(name: string, techBase: 'is' | 'cl'): string {
    const prefix = techBase === 'cl' ? 'clan-' : '';
    
    // Common weapon patterns
    const weaponPatterns: [RegExp, string][] = [
      // Lasers
      [/^ersmalllaser$/, `${prefix}er-small-laser`],
      [/^ermediumlaser$/, `${prefix}er-medium-laser`],
      [/^erlargelaser$/, `${prefix}er-large-laser`],
      [/^smalllaser$/, 'small-laser'],
      [/^mediumlaser$/, 'medium-laser'],
      [/^largelaser$/, 'large-laser'],
      [/^smallpulselaser$/, `${prefix}small-pulse-laser`],
      [/^mediumpulselaser$/, `${prefix}medium-pulse-laser`],
      [/^largepulselaser$/, `${prefix}large-pulse-laser`],
      [/^smallxpulselaser$/, `${prefix}small-x-pulse-laser`],
      [/^mediumxpulselaser$/, `${prefix}medium-x-pulse-laser`],
      [/^largexpulselaser$/, `${prefix}large-x-pulse-laser`],
      [/^smallvsplaser$/, `${prefix}small-vsp-laser`],
      [/^mediumvsplaser$/, `${prefix}medium-vsp-laser`],
      [/^largevsplaser$/, `${prefix}large-vsp-laser`],
      [/^heavylargelaser$/, `large-heavy-laser`],
      [/^heavymediumlaser$/, `medium-heavy-laser`],
      [/^heavysmalllaser$/, `small-heavy-laser`],
      [/^microlaser$/, `${prefix}micro-laser`],
      [/^microlaser$/, `${prefix}micro-laser`],
      [/^rellaser$/, `${prefix}re-engineered-large-laser`],
      [/^chemicallargelaser$/, `${prefix}chemical-large-laser`],
      [/^chemicalmediumlaser$/, `${prefix}chemical-medium-laser`],
      [/^chemicalsmalllaser$/, `${prefix}chemical-small-laser`],
      [/^bombastlaser$/, `${prefix}bombast-laser`],
      
      // PPCs
      [/^ppc$/, 'ppc'],
      [/^erppc$/, `${prefix}er-ppc`],
      [/^heavyppc$/, `${prefix}heavy-ppc`],
      [/^lightppc$/, `${prefix}light-ppc`],
      [/^snppc$/, `${prefix}snub-nose-ppc`],
      [/^snubnose?ppc$/, `${prefix}snub-nose-ppc`],
      
      // Autocannons
      [/^ac(\d+)$/, 'ac-$1'],
      [/^uac(\d+)$/, `${prefix}uac-$1`],
      [/^ultraac(\d+)$/, `${prefix}uac-$1`],
      [/^lac(\d+)$/, `${prefix}lac-$1`],
      [/^lightac(\d+)$/, `${prefix}lac-$1`],
      [/^lbxac(\d+)$/, `${prefix}lb-$1-x-ac`],
      [/^lb(\d+)xac$/, `${prefix}lb-$1-x-ac`],
      [/^lb(\d+)x$/, `${prefix}lb-$1-x-ac`],
      [/^rac(\d+)$/, `${prefix}rac-$1`],
      [/^rotaryac(\d+)$/, `${prefix}rac-$1`],
      [/^hvac(\d+)$/, `${prefix}hvac-$1`],
      [/^hypervelocityac(\d+)$/, `${prefix}hvac-$1`],
      
      // Hyper Assault Gauss
      [/^hag(\d+)$/, `${prefix}hag-$1`],
      
      // Gauss
      [/^gaussrifle$/, `${prefix}gauss-rifle`],
      [/^lightgaussrifle$/, `${prefix}light-gauss-rifle`],
      [/^heavygaussrifle$/, `${prefix}heavy-gauss-rifle`],
      [/^improvedheavygaussrifle$/, `${prefix}improved-heavy-gauss-rifle`],
      [/^magshot$/, 'magshot'],
      [/^silverbulletgauss$/, 'silver-bullet-gauss'],
      
      // Missiles
      [/^srm(\d+)$/, `${prefix}srm-$1`],
      [/^lrm(\d+)$/, `${prefix}lrm-$1`],
      [/^mrm(\d+)$/, `${prefix}mrm-$1`],
      [/^mml(\d+)$/, `${prefix}mml-$1`],
      [/^streaksrm(\d+)$/, `${prefix}streak-srm-$1`],
      [/^streaklrm(\d+)$/, `${prefix}streak-lrm-$1`],
      [/^atm(\d+)$/, `${prefix}atm-$1`],
      [/^iatm(\d+)$/, `${prefix}iatm-$1`],
      [/^extendedlrm(\d+)$/, `${prefix}extended-lrm-$1`],
      [/^elrm(\d+)$/, `${prefix}extended-lrm-$1`],
      [/^rl(\d+)$/, `${prefix}rocket-launcher-$1`],
      [/^rocketlauncher(\d+)$/, `${prefix}rocket-launcher-$1`],
      [/^rocketlauncher(\d+)prototype$/, `${prefix}prototype-rocket-launcher-$1`],
      [/^narc$/, `${prefix}narc`],
      [/^narcbeacon$/, `${prefix}narc`],
      [/^inarc$/, `${prefix}inarc`],
      [/^inarcbeacon$/, `${prefix}inarc`],
      [/^thunderbolt(\d+)$/, `${prefix}thunderbolt-$1`],
      
      // Machine Guns
      [/^machinegun$/, `${prefix}machine-gun`],
      [/^mg$/, `${prefix}machine-gun`],
      [/^lightmachinegun$/, `${prefix}light-machine-gun`],
      [/^lightmg$/, `${prefix}light-machine-gun`],
      [/^heavymachinegun$/, `${prefix}heavy-machine-gun`],
      [/^heavymg$/, `${prefix}heavy-machine-gun`],
      
      // Other weapons
      [/^flamer$/, `${prefix}flamer`],
      [/^erflamer$/, `${prefix}er-flamer`],
      [/^heavyflamer$/, `${prefix}heavy-flamer`],
      [/^vehicleflamer$/, 'vehicle-flamer'],
      [/^plasmarifle$/, `${prefix}plasma-rifle`],
      [/^plasmacannon$/, `${prefix}plasma-cannon`],
      [/^tag$/, `${prefix}tag`],
      [/^lighttag$/, `${prefix}light-tag`],
      
      // Electronics
      [/^guardianecm$/, `${prefix}guardian-ecm`],
      [/^angelecm$/, `${prefix}angel-ecm`],
      [/^ecmsuite$/, `${prefix}ecm-suite`],
      [/^beagleactiveprobe$/, `${prefix}beagle-active-probe`],
      [/^bloodhoundactiveprobe$/, `${prefix}bloodhound-active-probe`],
      [/^lightactiveprobe$/, `${prefix}light-active-probe`],
      [/^c3slaveunit$/, 'c3-slave'],
      [/^c3slave$/, 'c3-slave'],
      [/^c3mastercomputer$/, 'c3-master'],
      [/^c3master$/, 'c3-master'],
      [/^c3i$/, 'c3i'],
      [/^improvedc3cpu$/, 'improved-c3'],
      [/^improvedc3computer$/, 'improved-c3'],
      [/^targetingcomputer$/, `${prefix}targeting-computer`],
      [/^watchdogcews$/, `${prefix}watchdog-cews`],
      [/^ecm$/, `${prefix}guardian-ecm`],
      [/^activeprobe$/, `${prefix}active-probe`],
      
      // Physical Weapons
      [/^sword$/, 'sword'],
      [/^hatchet$/, 'hatchet'],
      [/^mace$/, 'mace'],
      [/^claw$/, `${prefix}claw`],
      [/^talons$/, `${prefix}talons`],
      
      // Artillery
      [/^arrowiv$/, `${prefix}arrow-iv`],
      [/^arrowivmissile$/, `${prefix}arrow-iv`],
      [/^arropivsystem$/, `${prefix}arrow-iv`],
      [/^longtom$/, `${prefix}long-tom`],
      [/^sniper$/, `${prefix}sniper-cannon`],
      [/^thumper$/, `${prefix}thumper-cannon`],
      
      // Misc Equipment
      [/^coolantpod$/, `${prefix}coolant-pod`],
      [/^mpod$/, `${prefix}m-pod`],
      [/^bpod$/, `${prefix}b-pod`],
      
      // Anti-Missile
      [/^ams$/, `${prefix}ams`],
      [/^antimissilesystem$/, `${prefix}ams`],
      [/^laserantimissilesystem$/, `${prefix}laser-ams`],
      [/^laserAMS$/, `${prefix}laser-ams`],
      [/^clams$/, 'clan-ams'],
    ];
    
    // Try each pattern
    for (const [pattern, replacement] of weaponPatterns) {
      if (pattern.test(name)) {
        return name.replace(pattern, replacement);
      }
    }
    
    // Fallback: convert camelCase to slug
    // Insert hyphens before capital letters and numbers
    const slug = name
      .replace(/([a-z])(\d)/g, '$1-$2')  // letter followed by number
      .replace(/(\d)([a-z])/g, '$1-$2')  // number followed by letter
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase
      .toLowerCase();
    
    return prefix + slug;
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
    
    // Try legacy MegaMek ID parsing
    const legacyId = this.parseLegacyMegaMekId(idOrName);
    if (legacyId) {
      // Try direct lookup with parsed ID
      const byLegacyId = this.loader.getById(legacyId);
      if (byLegacyId) {
        return {
          found: true,
          equipment: byLegacyId,
          category: this.idToTypeMap.get(legacyId) || null,
        };
      }
      
      // Try name map lookup with parsed ID
      const mappedId = this.nameToIdMap.get(legacyId);
      if (mappedId) {
        const equipment = this.loader.getById(mappedId);
        if (equipment) {
          return {
            found: true,
            equipment,
            category: this.idToTypeMap.get(mappedId) || null,
          };
        }
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


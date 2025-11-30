/**
 * Equipment Name Resolver for Unit Conversion
 * 
 * Maps MegaMekLab equipment names and item_type values to internal equipment IDs.
 * 
 * @spec unit-json.plan.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { getAllEquipmentItems, IEquipmentItem } from '@/types/equipment';

// ============================================================================
// MEGAMEKLAB ITEM TYPE MAPPINGS
// ============================================================================

/**
 * Direct mapping from MegaMekLab item_type to our equipment ID
 * 
 * Format: MegaMekLab uses PascalCase like "MediumLaser", "Lrm20"
 * Our format uses kebab-case like "medium-laser", "lrm-20"
 */
const MEGAMEKLAB_TYPE_MAP: Record<string, string> = {
  // ============ ENERGY WEAPONS ============
  // Standard Lasers
  'SmallLaser': 'small-laser',
  'MediumLaser': 'medium-laser',
  'LargeLaser': 'large-laser',
  
  // ER Lasers (IS)
  'ISERSmallLaser': 'er-small-laser',
  'ISERMediumLaser': 'er-medium-laser',
  'ISERLargeLaser': 'er-large-laser',
  
  // ER Lasers (Clan) - both prefixed and un-prefixed variants
  'CLERSmallLaser': 'clan-er-small-laser',
  'CLERMediumLaser': 'clan-er-medium-laser',
  'CLERLargeLaser': 'clan-er-large-laser',
  'CLERMicroLaser': 'clan-er-micro-laser',
  'ErSmallLaser': 'clan-er-small-laser',
  'ErMediumLaser': 'clan-er-medium-laser',
  'ErLargeLaser': 'clan-er-large-laser',
  'ErMicroLaser': 'clan-er-micro-laser',
  
  // Pulse Lasers (IS)
  'SmallPulseLaser': 'small-pulse-laser',
  'MediumPulseLaser': 'medium-pulse-laser',
  'LargePulseLaser': 'large-pulse-laser',
  'ISSmallPulseLaser': 'small-pulse-laser',
  'ISMediumPulseLaser': 'medium-pulse-laser',
  'ISLargePulseLaser': 'large-pulse-laser',
  
  // Pulse Lasers (Clan)
  'CLSmallPulseLaser': 'clan-small-pulse-laser',
  'CLMediumPulseLaser': 'clan-medium-pulse-laser',
  'CLLargePulseLaser': 'clan-large-pulse-laser',
  'CLMicroPulseLaser': 'clan-micro-pulse-laser',
  
  // Heavy Lasers (Clan)
  'CLHeavySmallLaser': 'clan-heavy-small-laser',
  'CLHeavyMediumLaser': 'clan-heavy-medium-laser',
  'CLHeavyLargeLaser': 'clan-heavy-large-laser',
  
  // X-Pulse Lasers - prefixed and un-prefixed
  'ISSmallXPulseLaser': 'small-x-pulse-laser',
  'ISMediumXPulseLaser': 'medium-x-pulse-laser',
  'ISLargeXPulseLaser': 'large-x-pulse-laser',
  'SmallXPulseLaser': 'small-x-pulse-laser',
  'MediumXPulseLaser': 'medium-x-pulse-laser',
  'LargeXPulseLaser': 'large-x-pulse-laser',
  
  // Heavy Lasers (IS)
  'HeavySmallLaser': 'heavy-small-laser',
  'HeavyMediumLaser': 'heavy-medium-laser',
  'HeavyLargeLaser': 'heavy-large-laser',
  'ImprovedHeavySmallLaser': 'improved-heavy-small-laser',
  'ImprovedHeavyMediumLaser': 'improved-heavy-medium-laser',
  'ImprovedHeavyLargeLaser': 'improved-heavy-large-laser',
  
  // Variable Speed Pulse Lasers
  'SmallVspLaser': 'small-vsp-laser',
  'MediumVspLaser': 'medium-vsp-laser',
  'LargeVspLaser': 'large-vsp-laser',
  
  // Re-engineered Lasers
  'MediumReEngineeredLaser': 'medium-re-engineered-laser',
  'LargeReEngineeredLaser': 'large-re-engineered-laser',
  
  // ER Pulse Lasers (Clan)
  'ErSmallPulseLaser': 'clan-er-small-pulse-laser',
  'ErMediumPulseLaser': 'clan-er-medium-pulse-laser',
  'ErLargePulseLaser': 'clan-er-large-pulse-laser',
  
  // PPCs - all variants
  'PPC': 'ppc',
  'Ppc': 'ppc',
  'ISPPC': 'ppc',
  'ISERPPC': 'er-ppc',
  'CLERPPC': 'clan-er-ppc',
  'ErPpc': 'clan-er-ppc',
  'HeavyPPC': 'heavy-ppc',
  'HeavyPpc': 'heavy-ppc',
  'LightPPC': 'light-ppc',
  'LightPpc': 'light-ppc',
  'ISSNPPC': 'snub-nose-ppc',
  'SnubNosePPC': 'snub-nose-ppc',
  'SnubNosePpc': 'snub-nose-ppc',
  'EnhancedPpc': 'enhanced-ppc',
  
  // Flamers
  'Flamer': 'flamer',
  'ISFlamer': 'flamer',
  'CLFlamer': 'clan-flamer',
  'ERFlamer': 'er-flamer',
  'VehicleFlamer': 'vehicle-flamer',
  'HeavyFlamer': 'heavy-flamer',
  
  // Plasma Weapons
  'ISPlasmaRifle': 'plasma-rifle',
  'CLPlasmaRifle': 'clan-plasma-cannon',
  
  // ============ BALLISTIC WEAPONS ============
  // Standard ACs
  'Ac2': 'ac-2',
  'Ac5': 'ac-5',
  'Ac10': 'ac-10',
  'Ac20': 'ac-20',
  'AC2': 'ac-2',
  'AC5': 'ac-5',
  'AC10': 'ac-10',
  'AC20': 'ac-20',
  'ISAC2': 'ac-2',
  'ISAC5': 'ac-5',
  'ISAC10': 'ac-10',
  'ISAC20': 'ac-20',
  
  // Ultra ACs (IS)
  'ISUltraAC2': 'uac-2',
  'ISUltraAC5': 'uac-5',
  'ISUltraAC10': 'uac-10',
  'ISUltraAC20': 'uac-20',
  
  // Ultra ACs (Clan) - both prefixed and un-prefixed
  'CLUltraAC2': 'clan-uac-2',
  'CLUltraAC5': 'clan-uac-5',
  'CLUltraAC10': 'clan-uac-10',
  'CLUltraAC20': 'clan-uac-20',
  'UltraAc2': 'clan-uac-2',
  'UltraAc5': 'clan-uac-5',
  'UltraAc10': 'clan-uac-10',
  'UltraAc20': 'clan-uac-20',
  
  // Autocannon variants (long-form names)
  'Autocannon2': 'ac-2',
  'Autocannon5': 'ac-5',
  'Autocannon10': 'ac-10',
  'Autocannon20': 'ac-20',
  
  // LB-X ACs (IS)
  'ISLBXAC2': 'lb-2x-ac',
  'ISLBXAC5': 'lb-5x-ac',
  'ISLBXAC10': 'lb-10x-ac',
  'ISLBXAC20': 'lb-20x-ac',
  'LB2XAC': 'lb-2x-ac',
  'LB5XAC': 'lb-5x-ac',
  'LB10XAC': 'lb-10x-ac',
  'LB20XAC': 'lb-20x-ac',
  
  // LB-X ACs (Clan) - both prefixed and un-prefixed
  'CLLBXAC2': 'clan-lb-2x-ac',
  'CLLBXAC5': 'clan-lb-5x-ac',
  'CLLBXAC10': 'clan-lb-10x-ac',
  'CLLBXAC20': 'clan-lb-20x-ac',
  'Lb2XAc': 'clan-lb-2x-ac',
  'Lb5XAc': 'clan-lb-5x-ac',
  'Lb10XAc': 'clan-lb-10x-ac',
  'Lb20XAc': 'clan-lb-20x-ac',
  
  // Light ACs - additional variants
  'Lac2': 'lac-2',
  'Lac5': 'lac-5',
  'LightAc2': 'lac-2',
  'LightAc5': 'lac-5',
  
  // Rotary ACs - additional variants
  'RotaryAc2': 'rac-2',
  'RotaryAc5': 'rac-5',
  
  // Rotary ACs
  'ISRotaryAC2': 'rac-2',
  'ISRotaryAC5': 'rac-5',
  
  // Light ACs
  'ISLightAC2': 'lac-2',
  'ISLightAC5': 'lac-5',
  'LAC2': 'lac-2',
  'LAC5': 'lac-5',
  
  // Gauss Rifles (IS)
  'GaussRifle': 'gauss-rifle',
  'ISGaussRifle': 'gauss-rifle',
  'ISLightGaussRifle': 'light-gauss-rifle',
  'ISHeavyGaussRifle': 'heavy-gauss-rifle',
  
  // Gauss Rifles (Clan)
  'CLGaussRifle': 'clan-gauss-rifle',
  'CLAPGaussRifle': 'clan-ap-gauss-rifle',
  'CLHyperAssaultGauss8': 'clan-hag-20', // HAG mappings may vary
  'CLHyperAssaultGauss20': 'clan-hag-20',
  'CLHyperAssaultGauss30': 'clan-hag-30',
  'CLHyperAssaultGauss40': 'clan-hag-40',
  
  // Machine Guns
  'MachineGun': 'machine-gun',
  'ISMachineGun': 'machine-gun',
  'CLMachineGun': 'clan-machine-gun',
  'ISLightMachineGun': 'light-machine-gun',
  'ISHeavyMachineGun': 'heavy-machine-gun',
  'CLLightMachineGun': 'clan-light-machine-gun',
  'CLHeavyMachineGun': 'clan-heavy-machine-gun',
  
  // ============ MISSILE WEAPONS ============
  // LRMs (IS)
  'Lrm5': 'lrm-5',
  'Lrm10': 'lrm-10',
  'Lrm15': 'lrm-15',
  'Lrm20': 'lrm-20',
  'LRM5': 'lrm-5',
  'LRM10': 'lrm-10',
  'LRM15': 'lrm-15',
  'LRM20': 'lrm-20',
  'ISLRM5': 'lrm-5',
  'ISLRM10': 'lrm-10',
  'ISLRM15': 'lrm-15',
  'ISLRM20': 'lrm-20',
  
  // LRMs (Clan) - prefixed and un-prefixed
  'CLLRM5': 'clan-lrm-5',
  'CLLRM10': 'clan-lrm-10',
  'CLLRM15': 'clan-lrm-15',
  'CLLRM20': 'clan-lrm-20',
  
  // Extended LRMs
  'ExtendedLrm5': 'extended-lrm-5',
  'ExtendedLrm10': 'extended-lrm-10',
  'ExtendedLrm15': 'extended-lrm-15',
  'ExtendedLrm20': 'extended-lrm-20',
  
  // Enhanced LRMs
  'EnhancedLrm5': 'enhanced-lrm-5',
  'EnhancedLrm10': 'enhanced-lrm-10',
  
  // Streak LRMs (Clan)
  'CLStreakLRM5': 'clan-streak-lrm-5',
  'CLStreakLRM10': 'clan-streak-lrm-10',
  'CLStreakLRM15': 'clan-streak-lrm-15',
  'CLStreakLRM20': 'clan-streak-lrm-20',
  
  // SRMs (IS)
  'Srm2': 'srm-2',
  'Srm4': 'srm-4',
  'Srm6': 'srm-6',
  'SRM2': 'srm-2',
  'SRM4': 'srm-4',
  'SRM6': 'srm-6',
  'ISSRM2': 'srm-2',
  'ISSRM4': 'srm-4',
  'ISSRM6': 'srm-6',
  
  // SRMs (Clan) - prefixed and un-prefixed
  'CLSRM2': 'clan-srm-2',
  'CLSRM4': 'clan-srm-4',
  'CLSRM6': 'clan-srm-6',
  
  // Streak SRMs (IS)
  'ISStreakSRM2': 'streak-srm-2',
  'ISStreakSRM4': 'streak-srm-4',
  'ISStreakSRM6': 'streak-srm-6',
  
  // Streak SRMs (Clan) - Note: StreakSrm* without prefix defaults to Clan
  'CLStreakSRM2': 'clan-streak-srm-2',
  'CLStreakSRM4': 'clan-streak-srm-4',
  'CLStreakSRM6': 'clan-streak-srm-6',
  'StreakSrm2': 'clan-streak-srm-2',
  'StreakSrm4': 'clan-streak-srm-4',
  'StreakSrm6': 'clan-streak-srm-6',
  
  // Streak LRMs (un-prefixed)
  'StreakLrm5': 'clan-streak-lrm-5',
  'StreakLrm10': 'clan-streak-lrm-10',
  'StreakLrm15': 'clan-streak-lrm-15',
  'StreakLrm20': 'clan-streak-lrm-20',
  
  // MRMs
  'ISMRM10': 'mrm-10',
  'ISMRM20': 'mrm-20',
  'ISMRM30': 'mrm-30',
  'ISMRM40': 'mrm-40',
  'MRM10': 'mrm-10',
  'MRM20': 'mrm-20',
  'MRM30': 'mrm-30',
  'MRM40': 'mrm-40',
  
  // ATMs (Clan)
  'CLATM3': 'clan-atm-3',
  'CLATM6': 'clan-atm-6',
  'CLATM9': 'clan-atm-9',
  'CLATM12': 'clan-atm-12',
  
  // Rocket Launchers
  'ISRocketLauncher10': 'rl-10',
  'ISRocketLauncher15': 'rl-15',
  'ISRocketLauncher20': 'rl-20',
  
  // Narc
  'ISNarc': 'narc',
  'NarcBeacon': 'narc',
  'CLNarc': 'clan-narc',
  'iNarc': 'inarc',
  
  // Arrow IV
  'ISArrowIV': 'arrow-iv',
  'CLArrowIV': 'clan-arrow-iv',
  
  // Thunderbolt
  'ISThunderbolt5': 'thunderbolt-5',
  'ISThunderbolt10': 'thunderbolt-10',
  'ISThunderbolt15': 'thunderbolt-15',
  'ISThunderbolt20': 'thunderbolt-20',
  
  // ============ EQUIPMENT ============
  // Anti-Missile System
  'AMS': 'ams',
  'ISAMS': 'ams',
  'CLAMS': 'clan-ams',
  'AntiMissileSystem': 'ams',
  'LaserAms': 'laser-ams',
  'CLLaserAMS': 'clan-laser-ams',
  'ISLaserAMS': 'laser-ams',
  
  // TAG
  'TAG': 'tag',
  'ISTAG': 'tag',
  'CLTAG': 'clan-tag',
  'LightTAG': 'light-tag',
  
  // C3 Systems
  'C3MasterComputer': 'c3-master',
  'ISC3MasterComputer': 'c3-master',
  'ISC3SlaveUnit': 'c3-slave',
  'C3SlaveUnit': 'c3-slave',
  'C3iUnit': 'c3i',
  
  // Targeting Computers
  'ISTargetingComputer': 'targeting-computer-is',
  'CLTargetingComputer': 'targeting-computer-clan',
  
  // ECM/BAP
  'GuardianECM': 'guardian-ecm',
  'ISGuardianECMSuite': 'guardian-ecm',
  'CLECMSuite': 'clan-ecm',
  'BeagleActiveProbe': 'beagle-active-probe',
  'ISBeagleActiveProbe': 'beagle-active-probe',
  'CLActiveProbe': 'clan-active-probe',
  'CLLightActiveProbe': 'clan-light-active-probe',
  
  // Heat Sinks
  'HeatSink': 'heat-sink-single',
  'ISDoubleHeatSink': 'heat-sink-double-is',
  'CLDoubleHeatSink': 'heat-sink-double-clan',
  'DoubleHeatSink': 'heat-sink-double-is',
  
  // Jump Jets
  'JumpJet': 'jump-jet',
  'ISJumpJet': 'jump-jet',
  'CLJumpJet': 'clan-jump-jet',
  'ImprovedJumpJet': 'improved-jump-jet',
  
  // CASE
  'CASE': 'case',
  'ISCASE': 'case',
  'CLCASE': 'clan-case',
  'ISCASEii': 'case-ii',
  'CASEII': 'case-ii',
  
  // Movement Enhancements
  'ISMASC': 'masc-is',
  'CLMASC': 'masc-clan',
  'MASC': 'masc-is',
  'ISTripleStrengthMyomer': 'tsm',
  'TSM': 'tsm',
  'Supercharger': 'supercharger',
  
  // A-Pods / B-Pods
  'ISAntiPersonnelPod': 'a-pod',
  'CLAntiPersonnelPod': 'clan-a-pod',
  'APod': 'a-pod',
  'BPod': 'b-pod',
  
  // Artemis
  'ISArtemisIV': 'artemis-iv',
  'CLArtemisIV': 'clan-artemis-iv',
  'ISArtemisV': 'artemis-v',
  'CLArtemisV': 'clan-artemis-v',
  
  // Apollo
  'Apollo': 'apollo',
  
  // Probe Types
  'BloodhoundActiveProbe': 'bloodhound-active-probe',
  
  // Small Equipment
  'Sword': 'sword',
  'Hatchet': 'hatchet',
  'Mace': 'mace',
  'Retractable Blade': 'retractable-blade',
  'Claws': 'claws',
  'Talons': 'talons',
};

/**
 * Name normalization patterns for fuzzy matching
 */
const NAME_NORMALIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Remove tech base prefixes
  { pattern: /^(IS|Clan|CL)/i, replacement: '' },
  // Remove spaces and special characters
  { pattern: /[\s\-_\/]/g, replacement: '' },
  // Standardize abbreviations
  { pattern: /Autocannon/i, replacement: 'AC' },
  { pattern: /MachinGun/i, replacement: 'MG' },
];

/**
 * Strip numbered quantity prefixes from item types
 * e.g., "1Ismediumlaser" -> "ISMediumLaser", "2Clerppc" -> "CLErPpc"
 */
function stripQuantityPrefix(itemType: string): { count: number; cleanType: string } {
  // Pattern: optional digits, then optional IS/CL/Clan prefix, then the actual type
  const match = itemType.match(/^(\d+)?(IS|CL|Clan)?(.+)$/i);
  
  if (!match) {
    return { count: 1, cleanType: itemType };
  }
  
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const prefix = match[2] || '';
  const rest = match[3] || '';
  
  // Reconstruct with proper casing
  let cleanType = prefix.toUpperCase() + rest;
  
  // Try to capitalize first letter of rest if it's lowercase
  if (rest && rest[0] === rest[0].toLowerCase()) {
    cleanType = prefix.toUpperCase() + rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  
  return { count, cleanType };
}

/**
 * Normalize a name for fuzzy matching
 */
function normalizeName(name: string): string {
  let result = name;
  for (const { pattern, replacement } of NAME_NORMALIZATION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result.toLowerCase();
}

// ============================================================================
// EQUIPMENT RESOLVER CLASS
// ============================================================================

/**
 * Equipment resolution result
 */
export interface EquipmentResolution {
  readonly found: boolean;
  readonly equipmentId: string | null;
  readonly equipment: IEquipmentItem | null;
  readonly confidence: 'exact' | 'fuzzy' | 'none';
  readonly originalName: string;
  readonly originalType: string;
}

/**
 * Equipment Name Resolver
 * 
 * Resolves MegaMekLab equipment names to internal equipment IDs.
 */
export class EquipmentNameResolver {
  private equipmentByName: Map<string, IEquipmentItem> = new Map();
  private equipmentById: Map<string, IEquipmentItem> = new Map();
  private normalizedNameMap: Map<string, IEquipmentItem> = new Map();
  private initialized = false;
  
  /**
   * Initialize the resolver with equipment data
   */
  initialize(): void {
    if (this.initialized) return;
    
    const allEquipment = getAllEquipmentItems();
    
    for (const item of allEquipment) {
      // Index by ID
      this.equipmentById.set(item.id, item);
      
      // Index by name (case-insensitive)
      this.equipmentByName.set(item.name.toLowerCase(), item);
      
      // Index by normalized name
      this.normalizedNameMap.set(normalizeName(item.name), item);
    }
    
    this.initialized = true;
  }
  
  /**
   * Resolve an equipment item by MegaMekLab item_type and item_name
   */
  resolve(itemType: string, itemName: string, techBase?: TechBase): EquipmentResolution {
    this.initialize();
    
    // 0. Strip quantity prefix (e.g., "1Ismediumlaser" -> "ISMediumLaser")
    const { cleanType } = stripQuantityPrefix(itemType);
    const typeToLookup = cleanType || itemType;
    
    // 1. Try direct mapping from item_type (original)
    let directId = MEGAMEKLAB_TYPE_MAP[itemType];
    if (!directId && typeToLookup !== itemType) {
      // Try with cleaned type
      directId = MEGAMEKLAB_TYPE_MAP[typeToLookup];
    }
    
    if (directId) {
      const equipment = this.equipmentById.get(directId);
      if (equipment) {
        return {
          found: true,
          equipmentId: directId,
          equipment,
          confidence: 'exact',
          originalName: itemName,
          originalType: itemType,
        };
      }
    }
    
    // 2. Try by name (case-insensitive)
    const byName = this.equipmentByName.get(itemName.toLowerCase());
    if (byName) {
      return {
        found: true,
        equipmentId: byName.id,
        equipment: byName,
        confidence: 'exact',
        originalName: itemName,
        originalType: itemType,
      };
    }
    
    // 3. Try normalized name matching with cleaned type
    const normalizedType = normalizeName(typeToLookup);
    const byNormalizedType = this.normalizedNameMap.get(normalizedType);
    if (byNormalizedType) {
      return {
        found: true,
        equipmentId: byNormalizedType.id,
        equipment: byNormalizedType,
        confidence: 'fuzzy',
        originalName: itemName,
        originalType: itemType,
      };
    }
    
    const normalizedName = normalizeName(itemName);
    const byNormalizedName = this.normalizedNameMap.get(normalizedName);
    if (byNormalizedName) {
      return {
        found: true,
        equipmentId: byNormalizedName.id,
        equipment: byNormalizedName,
        confidence: 'fuzzy',
        originalName: itemName,
        originalType: itemType,
      };
    }
    
    // 4. Try tech-base-specific lookup
    if (techBase) {
      const techPrefix = techBase === TechBase.CLAN ? 'clan-' : '';
      const techSuffixedId = techPrefix + normalizeName(itemName);
      const byTechId = this.equipmentById.get(techSuffixedId);
      if (byTechId) {
        return {
          found: true,
          equipmentId: byTechId.id,
          equipment: byTechId,
          confidence: 'fuzzy',
          originalName: itemName,
          originalType: itemType,
        };
      }
    }
    
    // 5. Not found
    return {
      found: false,
      equipmentId: null,
      equipment: null,
      confidence: 'none',
      originalName: itemName,
      originalType: itemType,
    };
  }
  
  /**
   * Get equipment by ID directly
   */
  getById(id: string): IEquipmentItem | undefined {
    this.initialize();
    return this.equipmentById.get(id);
  }
  
  /**
   * Check if an item_type is a known system component (not equipment)
   */
  isSystemComponent(itemType: string): boolean {
    const systemComponents = [
      // Fixed components
      'Life Support',
      'Sensors',
      'Cockpit',
      'Gyro',
      // Actuators
      'Shoulder',
      'Upper Arm Actuator',
      'Lower Arm Actuator',
      'Hand Actuator',
      'Hip',
      'Upper Leg Actuator',
      'Lower Leg Actuator',
      'Foot Actuator',
      // Engine components
      'Fusion Engine',
      'Engine',
      // Empty slots
      '-Empty-',
      'Empty',
    ];
    
    return systemComponents.some(comp => 
      itemType.toLowerCase().includes(comp.toLowerCase())
    );
  }
  
  /**
   * Check if an item is a heat sink (integrated or external)
   */
  isHeatSink(itemType: string): boolean {
    return itemType.toLowerCase().includes('heat sink') ||
           itemType.toLowerCase().includes('heatsink');
  }
  
  /**
   * Get all registered MegaMekLab type mappings for diagnostics
   */
  getMappings(): Record<string, string> {
    return { ...MEGAMEKLAB_TYPE_MAP };
  }
}

// Singleton instance
export const equipmentNameResolver = new EquipmentNameResolver();


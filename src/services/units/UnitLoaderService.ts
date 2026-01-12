/**
 * Unit Loader Service
 * 
 * Fetches full unit data from canonical JSON files or SQLite custom units
 * and maps them to the UnitState format for the customizer.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { canonicalUnitService, IFullUnit } from './CanonicalUnitService';
import { customUnitApiService } from './CustomUnitApiService';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import {
  UnitState,
  IArmorAllocation,
  IMountedEquipmentInstance,
  createEmptyArmorAllocation,
  createEmptySelectionMemory,
} from '@/stores/unitState';
import {
  TechBaseMode,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { JumpJetType } from '@/utils/construction/movementCalculations';

// =============================================================================
// Types
// =============================================================================

/**
 * Source of a unit (canonical or custom)
 */
export type UnitSource = 'canonical' | 'custom';

/**
 * Serialized unit JSON format (from canonical JSON files)
 */
export interface ISerializedUnit {
  readonly id: string;
  readonly chassis: string;
  readonly model?: string;
  readonly variant?: string;
  readonly unitType?: string;
  readonly configuration?: string;
  readonly techBase: string;
  readonly rulesLevel?: string;
  readonly era?: string;
  readonly year?: number;
  readonly tonnage: number;
  readonly engine?: {
    readonly type: string;
    readonly rating: number;
  };
  readonly gyro?: {
    readonly type: string;
  };
  readonly cockpit?: string;
  readonly structure?: {
    readonly type: string;
  };
  readonly armor?: {
    readonly type: string;
    readonly allocation?: Record<string, number | { front: number; rear: number }>;
  };
  readonly heatSinks?: {
    readonly type: string;
    readonly count: number;
  };
  readonly movement?: {
    readonly walk: number;
    readonly jump?: number;
  };
  readonly equipment?: ReadonlyArray<{
    readonly id: string;
    readonly location: string;
  }>;
  /**
   * Optional critical slot grid from import sources (e.g., MegaMek).
   * Used as a hint for tech-base variant resolution (Clan vs Inner Sphere) in mixed-tech units.
   */
  readonly criticalSlots?: Readonly<Record<string, ReadonlyArray<string | null>>>;
  readonly mulId?: number;
  readonly [key: string]: unknown;
}

/**
 * Result of loading a unit
 */
export interface ILoadUnitResult {
  readonly success: boolean;
  readonly state?: UnitState;
  readonly error?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if IFullUnit has the structure of ISerializedUnit
 * Since IFullUnit has [key: string]: unknown, we can check if it matches ISerializedUnit structure
 */
function hasSerializedUnitStructure(data: IFullUnit): boolean {
  // Check required fields for ISerializedUnit
  return (
    typeof data.id === 'string' &&
    typeof data.chassis === 'string' &&
    typeof data.techBase === 'string' &&
    typeof data.tonnage === 'number'
  );
}

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Map engine type string to EngineType enum
 */
function mapEngineType(typeStr: string, techBase: TechBase): EngineType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  // Standard fusion engine variations
  if (normalized === 'FUSION' || normalized === 'STANDARD' || normalized === 'STANDARDFUSION') {
    return EngineType.STANDARD;
  }
  
  // XL engine - depends on tech base
  if (normalized === 'XL' || normalized === 'XLENGINE') {
    return techBase === TechBase.CLAN ? EngineType.XL_CLAN : EngineType.XL_IS;
  }
  if (normalized === 'XLIS' || normalized === 'XLENGINEIS') {
    return EngineType.XL_IS;
  }
  if (normalized === 'XLCLAN' || normalized === 'XLENGINECLAN') {
    return EngineType.XL_CLAN;
  }
  
  // Other engine types
  if (normalized === 'LIGHT' || normalized === 'LIGHTENGINE') {
    return EngineType.LIGHT;
  }
  if (normalized === 'XXL' || normalized === 'XXLENGINE') {
    return EngineType.XXL;
  }
  if (normalized === 'COMPACT' || normalized === 'COMPACTENGINE') {
    return EngineType.COMPACT;
  }
  if (normalized === 'ICE' || normalized === 'INTERNALCOMBUSTION') {
    return EngineType.ICE;
  }
  if (normalized === 'FUELCELL') {
    return EngineType.FUEL_CELL;
  }
  if (normalized === 'FISSION') {
    return EngineType.FISSION;
  }
  
  // Default to standard
  return EngineType.STANDARD;
}

/**
 * Map gyro type string to GyroType enum
 */
function mapGyroType(typeStr: string): GyroType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'XL' || normalized === 'XLGYRO') {
    return GyroType.XL;
  }
  if (normalized === 'COMPACT' || normalized === 'COMPACTGYRO') {
    return GyroType.COMPACT;
  }
  if (normalized === 'HEAVYDUTY' || normalized === 'HEAVYDUTYGYRO' || normalized === 'HD') {
    return GyroType.HEAVY_DUTY;
  }
  
  return GyroType.STANDARD;
}

/**
 * Map structure type string to InternalStructureType enum
 */
function mapStructureType(typeStr: string, techBase: TechBase): InternalStructureType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'ENDOSTEEL' || normalized === 'ENDO') {
    return techBase === TechBase.CLAN 
      ? InternalStructureType.ENDO_STEEL_CLAN 
      : InternalStructureType.ENDO_STEEL_IS;
  }
  if (normalized === 'ENDOSTEELIS') {
    return InternalStructureType.ENDO_STEEL_IS;
  }
  if (normalized === 'ENDOSTEELCLAN') {
    return InternalStructureType.ENDO_STEEL_CLAN;
  }
  if (normalized === 'ENDOCOMPOSITE') {
    return InternalStructureType.ENDO_COMPOSITE;
  }
  if (normalized === 'REINFORCED') {
    return InternalStructureType.REINFORCED;
  }
  if (normalized === 'COMPOSITE') {
    return InternalStructureType.COMPOSITE;
  }
  if (normalized === 'INDUSTRIAL') {
    return InternalStructureType.INDUSTRIAL;
  }
  
  return InternalStructureType.STANDARD;
}

/**
 * Map cockpit type string to CockpitType enum
 */
function mapCockpitType(typeStr: string): CockpitType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'SMALL' || normalized === 'SMALLCOCKPIT') {
    return CockpitType.SMALL;
  }
  if (normalized === 'COMMAND' || normalized === 'COMMANDCONSOLE') {
    return CockpitType.COMMAND_CONSOLE;
  }
  if (normalized === 'TORSO' || normalized === 'TORSOMOUNTED' || normalized === 'TORSOMOUNTEDCOCKPIT') {
    return CockpitType.TORSO_MOUNTED;
  }
  if (normalized === 'PRIMITIVE' || normalized === 'PRIMITIVECOCKPIT') {
    return CockpitType.PRIMITIVE;
  }
  if (normalized === 'INDUSTRIAL' || normalized === 'INDUSTRIALCOCKPIT') {
    return CockpitType.INDUSTRIAL;
  }
  if (normalized === 'SUPERHEAVY' || normalized === 'SUPERHEAVYCOCKPIT') {
    return CockpitType.SUPER_HEAVY;
  }
  
  return CockpitType.STANDARD;
}

/**
 * Map heat sink type string to HeatSinkType enum
 */
function mapHeatSinkType(typeStr: string): HeatSinkType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'DOUBLE' || normalized === 'DOUBLEIS' || normalized === 'DHS') {
    return HeatSinkType.DOUBLE_IS;
  }
  if (normalized === 'DOUBLECLAN') {
    return HeatSinkType.DOUBLE_CLAN;
  }
  if (normalized === 'LASER') {
    return HeatSinkType.LASER;
  }
  if (normalized === 'COMPACT') {
    return HeatSinkType.COMPACT;
  }
  
  return HeatSinkType.SINGLE;
}

/**
 * Map armor type string to ArmorTypeEnum
 */
function mapArmorType(typeStr: string, techBase: TechBase): ArmorTypeEnum {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'FERROFIBROUS' || normalized === 'FERRO') {
    return techBase === TechBase.CLAN 
      ? ArmorTypeEnum.FERRO_FIBROUS_CLAN 
      : ArmorTypeEnum.FERRO_FIBROUS_IS;
  }
  if (normalized === 'FERROFIBROUSIS') {
    return ArmorTypeEnum.FERRO_FIBROUS_IS;
  }
  if (normalized === 'FERROFIBROUSCLAN') {
    return ArmorTypeEnum.FERRO_FIBROUS_CLAN;
  }
  if (normalized === 'LIGHTFERRO' || normalized === 'LIGHTFERROFIBROUS') {
    return ArmorTypeEnum.LIGHT_FERRO;
  }
  if (normalized === 'HEAVYFERRO' || normalized === 'HEAVYFERROFIBROUS') {
    return ArmorTypeEnum.HEAVY_FERRO;
  }
  if (normalized === 'STEALTH') {
    return ArmorTypeEnum.STEALTH;
  }
  if (normalized === 'REACTIVE') {
    return ArmorTypeEnum.REACTIVE;
  }
  if (normalized === 'REFLECTIVE' || normalized === 'LASERREFLECTIVE') {
    return ArmorTypeEnum.REFLECTIVE;
  }
  if (normalized === 'HARDENED') {
    return ArmorTypeEnum.HARDENED;
  }
  // INDUSTRIAL, HEAVY_INDUSTRIAL, PRIMITIVE armor types map to STANDARD for now
  // These can be added to the enum when needed
  
  return ArmorTypeEnum.STANDARD;
}

/**
 * Map tech base string to TechBase enum
 */
function mapTechBase(techBaseStr: string): TechBase {
  const normalized = techBaseStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'CLAN') {
    return TechBase.CLAN;
  }
  if (normalized === 'MIXED') {
    return TechBase.INNER_SPHERE; // Mixed defaults to IS base
  }
  
  return TechBase.INNER_SPHERE;
}

/**
 * Map unit tech base string to TechBaseMode.
 * Mixed tech applies at the unit level (TechBaseMode), while components remain binary (TechBase).
 */
function mapTechBaseMode(techBaseStr: string): TechBaseMode {
  const normalized = techBaseStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'CLAN') {
    return TechBaseMode.CLAN;
  }
  if (normalized === 'MIXED') {
    return TechBaseMode.MIXED;
  }
  
  return TechBaseMode.INNER_SPHERE;
}

/**
 * Map rules level string to RulesLevel enum
 */
function mapRulesLevel(levelStr: string): RulesLevel {
  const normalized = levelStr.toUpperCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'INTRODUCTORY' || normalized === 'INTRO') {
    return RulesLevel.INTRODUCTORY;
  }
  if (normalized === 'ADVANCED') {
    return RulesLevel.ADVANCED;
  }
  if (normalized === 'EXPERIMENTAL') {
    return RulesLevel.EXPERIMENTAL;
  }
  // ERA is mapped to ADVANCED for now
  
  return RulesLevel.STANDARD;
}

/**
 * Map MechLocation string to MechLocation enum
 */
function mapMechLocation(locationStr: string): MechLocation | undefined {
  const normalized = locationStr.toUpperCase().replace(/[_\s-]/g, '');
  
  const locationMap: Record<string, MechLocation> = {
    'HEAD': MechLocation.HEAD,
    'HD': MechLocation.HEAD,
    'CENTERTORSO': MechLocation.CENTER_TORSO,
    'CT': MechLocation.CENTER_TORSO,
    'LEFTTORSO': MechLocation.LEFT_TORSO,
    'LT': MechLocation.LEFT_TORSO,
    'RIGHTTORSO': MechLocation.RIGHT_TORSO,
    'RT': MechLocation.RIGHT_TORSO,
    'LEFTARM': MechLocation.LEFT_ARM,
    'LA': MechLocation.LEFT_ARM,
    'RIGHTARM': MechLocation.RIGHT_ARM,
    'RA': MechLocation.RIGHT_ARM,
    'LEFTLEG': MechLocation.LEFT_LEG,
    'LL': MechLocation.LEFT_LEG,
    'RIGHTLEG': MechLocation.RIGHT_LEG,
    'RL': MechLocation.RIGHT_LEG,
  };
  
  return locationMap[normalized];
}

/**
 * Set armor value for a specific location in IArmorAllocation
 */
function setArmorValue(
  result: IArmorAllocation,
  location: MechLocation,
  value: number
): void {
  switch (location) {
    case MechLocation.HEAD:
      result[MechLocation.HEAD] = value;
      break;
    case MechLocation.CENTER_TORSO:
      result[MechLocation.CENTER_TORSO] = value;
      break;
    case MechLocation.LEFT_TORSO:
      result[MechLocation.LEFT_TORSO] = value;
      break;
    case MechLocation.RIGHT_TORSO:
      result[MechLocation.RIGHT_TORSO] = value;
      break;
    case MechLocation.LEFT_ARM:
      result[MechLocation.LEFT_ARM] = value;
      break;
    case MechLocation.RIGHT_ARM:
      result[MechLocation.RIGHT_ARM] = value;
      break;
    case MechLocation.LEFT_LEG:
      result[MechLocation.LEFT_LEG] = value;
      break;
    case MechLocation.RIGHT_LEG:
      result[MechLocation.RIGHT_LEG] = value;
      break;
  }
}

/**
 * Map armor allocation from JSON format to IArmorAllocation
 */
function mapArmorAllocation(
  allocation: Record<string, number | { front: number; rear: number }> | undefined
): IArmorAllocation {
  if (!allocation) {
    return createEmptyArmorAllocation();
  }

  const result = createEmptyArmorAllocation();
  
  for (const [locationKey, value] of Object.entries(allocation)) {
    const location = mapMechLocation(locationKey);
    
    if (location === undefined) {
      continue;
    }
    
    if (typeof value === 'number') {
      // Simple number - direct armor value
      setArmorValue(result, location, value);
    } else if (typeof value === 'object' && value !== null && 'front' in value && 'rear' in value) {
      // Object with front/rear
      setArmorValue(result, location, value.front);
      
      // Map rear armor
      if (location === MechLocation.CENTER_TORSO) {
        result.centerTorsoRear = value.rear;
      } else if (location === MechLocation.LEFT_TORSO) {
        result.leftTorsoRear = value.rear;
      } else if (location === MechLocation.RIGHT_TORSO) {
        result.rightTorsoRear = value.rear;
      }
    }
  }
  
  return result;
}

// =============================================================================
// Equipment ID + Variant Resolution Helpers
// =============================================================================

type UnitCriticalSlots = Readonly<Record<string, ReadonlyArray<string | null>>>;
type TechHint = 'clan' | 'is';

const CRITICAL_SLOTS_LOCATION_KEYS: Partial<Readonly<Record<MechLocation, string>>> = {
  [MechLocation.HEAD]: 'HEAD',
  [MechLocation.CENTER_TORSO]: 'CENTER_TORSO',
  [MechLocation.LEFT_TORSO]: 'LEFT_TORSO',
  [MechLocation.RIGHT_TORSO]: 'RIGHT_TORSO',
  [MechLocation.LEFT_ARM]: 'LEFT_ARM',
  [MechLocation.RIGHT_ARM]: 'RIGHT_ARM',
  [MechLocation.LEFT_LEG]: 'LEFT_LEG',
  [MechLocation.RIGHT_LEG]: 'RIGHT_LEG',
};

function normalizeMatchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function stripTechMarkersFromName(name: string): string {
  return name
    .replace(/\s*\(Clan\)\s*$/i, '')
    .replace(/\s*\(IS\)\s*$/i, '')
    .replace(/\s*\[IS\]\s*$/i, '')
    .replace(/^Clan\s+/i, '')
    .replace(/^IS\s+/i, '')
    .trim();
}

function getTechHintFromToken(token: string): TechHint | null {
  const trimmed = token.trim();
  
  // Clan markers commonly found in MegaMek exports
  if (/^CL[A-Za-z0-9]/.test(trimmed) || /^Clan\s+/i.test(trimmed) || /\(Clan\)/i.test(trimmed)) {
    return 'clan';
  }
  
  // Inner Sphere markers commonly found in import sources
  if (/^IS[A-Za-z0-9]/.test(trimmed) || /^IS\s+/i.test(trimmed) || /\(IS\)/i.test(trimmed) || /\[IS\]/i.test(trimmed)) {
    return 'is';
  }
  
  return null;
}

function stripTechPrefixFromNormalizedKey(normalized: string, hint: TechHint): string {
  if (hint === 'clan') {
    if (normalized.startsWith('clan')) return normalized.slice(4);
    if (normalized.startsWith('cl')) return normalized.slice(2);
    return normalized;
  }
  
  if (hint === 'is') {
    if (normalized.startsWith('is')) return normalized.slice(2);
    return normalized;
  }
  
  return normalized;
}

function inferPreferredTechBaseFromCriticalSlots(
  locationSlots: ReadonlyArray<string | null> | undefined,
  equipmentNameKey: string
): TechBase | null {
  if (!locationSlots || locationSlots.length === 0) {
    return null;
  }
  
  for (const entry of locationSlots) {
    if (typeof entry !== 'string') {
      continue;
    }
    
    const hint = getTechHintFromToken(entry);
    if (!hint) {
      continue;
    }
    
    const normalizedToken = normalizeMatchKey(entry);
    const strippedToken = stripTechPrefixFromNormalizedKey(normalizedToken, hint);
    
    if (strippedToken === equipmentNameKey) {
      return hint === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
    }
  }
  
  return null;
}

/**
 * Normalize an equipment ID by converting legacy formats to canonical IDs.
 * Handles patterns like:
 * - 'ultra-ac-5' → 'uac-5'
 * - 'clan-ultra-ac-5' → 'clan-uac-5'
 * - 'lb-10-x-ac' → 'lb-10x-ac'
 * - 'rotary-ac-5' → 'rac-5'
 */
function normalizeEquipmentId(id: string, _unitTechBase: TechBase): string {
  let normalized = id.toLowerCase().trim();
  
  // Check for Clan prefix
  const isClanPrefix = normalized.startsWith('clan-');
  if (isClanPrefix) {
    normalized = normalized.slice(5); // Remove 'clan-' prefix
  }
  
  // Ultra AC/x patterns: 'ultra-ac-5' → 'uac-5'
  if (/^ultra-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `uac-${num}`;
  }
  
  // Rotary AC patterns: 'rotary-ac-5' → 'rac-5'
  if (/^rotary-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `rac-${num}`;
  }
  
  // Light AC patterns: 'light-ac-5' → 'lac-5'
  if (/^light-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `lac-${num}`;
  }
  
  // LB X AC patterns: 'lb-10-x-ac' → 'lb-10x-ac'
  normalized = normalized.replace(/^lb-(\d+)-x-ac$/, 'lb-$1x-ac');
  
  // ER laser patterns
  normalized = normalized.replace(/^extended-range-(.*)$/, 'er-$1');
  
  // Handle ammo patterns
  if (normalized.endsWith('-ammo') || normalized.includes('-ammo-')) {
    // 'ultra-ac-5-ammo' → 'uac-5-ammo'
    normalized = normalized.replace(/ultra-ac-(\d+)/, 'uac-$1');
    normalized = normalized.replace(/rotary-ac-(\d+)/, 'rac-$1');
    normalized = normalized.replace(/light-ac-(\d+)/, 'lac-$1');
    normalized = normalized.replace(/lb-(\d+)-x-ac/, 'lb-$1x-ac');
  }
  
  // Re-add clan prefix if it was explicitly present in the source ID
  if (isClanPrefix) {
    normalized = `clan-${normalized}`;
  }
  
  return normalized;
}

/**
 * Attempt to resolve an equipment ID using multiple strategies.
 * Returns the equipment definition if found, or null.
 */
function resolveEquipmentId(
  id: string,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  locationCriticalSlots: ReadonlyArray<string | null> | undefined
): { equipmentDef: IEquipmentItem | undefined; resolvedId: string } {
  const normalizedId = normalizeEquipmentId(id, unitTechBase);
  const baseId = normalizedId.startsWith('clan-') ? normalizedId.slice(5) : normalizedId;
  
  // Canonical IDs in our catalog generally follow the pattern:
  // - Inner Sphere: <id>
  // - Clan: clan-<id>
  const isId = baseId;
  const clanId = `clan-${baseId}`;
  
  const isDef = equipmentLookupService.getById(isId);
  const clanDef = equipmentLookupService.getById(clanId);
  
  // For mixed-tech units, use critical slot tokens as a per-item hint for Clan vs IS variants.
  if (unitTechBaseMode === TechBaseMode.MIXED && (isDef || clanDef)) {
    const candidateName = (isDef ?? clanDef)?.name;
    const equipmentNameKey = candidateName
      ? normalizeMatchKey(stripTechMarkersFromName(candidateName))
      : normalizeMatchKey(baseId);
    
    const hintedTechBase = inferPreferredTechBaseFromCriticalSlots(locationCriticalSlots, equipmentNameKey);
    
    if (hintedTechBase === TechBase.CLAN && clanDef) {
      return { equipmentDef: clanDef, resolvedId: clanId };
    }
    if (hintedTechBase === TechBase.INNER_SPHERE && isDef) {
      return { equipmentDef: isDef, resolvedId: isId };
    }
  }
  
  // Unit-level preference: Clan units prefer clan-* variants when available.
  const preferredTechBase: TechBase =
    unitTechBaseMode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
  
  if (preferredTechBase === TechBase.CLAN && clanDef) {
    return { equipmentDef: clanDef, resolvedId: clanId };
  }
  if (preferredTechBase === TechBase.INNER_SPHERE && isDef) {
    return { equipmentDef: isDef, resolvedId: isId };
  }
  
  // Fallback: return whichever variant exists.
  if (isDef) {
    return { equipmentDef: isDef, resolvedId: isId };
  }
  if (clanDef) {
    return { equipmentDef: clanDef, resolvedId: clanId };
  }
  
  // Final fallback: EquipmentRegistry name-based alias resolution
  const registry = getEquipmentRegistry();
  if (registry.isReady()) {
    const lookupResult = registry.lookup(id);
    if (lookupResult.found && lookupResult.equipment) {
      const resolvedEquipment = equipmentLookupService.getById(lookupResult.equipment.id);
      if (resolvedEquipment) {
        return { equipmentDef: resolvedEquipment, resolvedId: lookupResult.equipment.id };
      }
    }
    
    if (normalizedId !== id) {
      const normalizedLookup = registry.lookup(normalizedId);
      if (normalizedLookup.found && normalizedLookup.equipment) {
        const resolvedEquipment = equipmentLookupService.getById(normalizedLookup.equipment.id);
        if (resolvedEquipment) {
          return { equipmentDef: resolvedEquipment, resolvedId: normalizedLookup.equipment.id };
        }
      }
    }
  }
  
  // Not found
  return { equipmentDef: undefined, resolvedId: normalizedId };
}

/**
 * Map equipment array to IMountedEquipmentInstance array
 * Looks up equipment from the equipment database to get full properties.
 * Uses multiple resolution strategies including ID normalization and aliasing.
 */
function mapEquipment(
  equipment: ReadonlyArray<{ id: string; location: string }> | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  unitCriticalSlots: UnitCriticalSlots | undefined
): IMountedEquipmentInstance[] {
  if (!equipment || equipment.length === 0) {
    return [];
  }
  
  return equipment.map((item) => {
    const location = mapMechLocation(item.location);
    const locationCriticalSlots = unitCriticalSlots
      ? (location ? unitCriticalSlots[CRITICAL_SLOTS_LOCATION_KEYS[location] ?? ''] : unitCriticalSlots[item.location])
      : undefined;
    
    // Look up equipment using multiple resolution strategies
    const { equipmentDef, resolvedId } = resolveEquipmentId(
      item.id,
      unitTechBase,
      unitTechBaseMode,
      locationCriticalSlots
    );
    
    if (equipmentDef) {
      // Found in database - use full properties
      const heat = 'heat' in equipmentDef ? (equipmentDef as { heat: number }).heat : 0;
      
      // Log if we resolved through normalization/aliasing
      if (resolvedId !== item.id) {
        console.debug(`Equipment ID resolved: "${item.id}" → "${resolvedId}"`);
      }
      
      return {
        instanceId: uuidv4(),
        equipmentId: equipmentDef.id,
        name: equipmentDef.name,
        category: equipmentDef.category,
        weight: equipmentDef.weight,
        criticalSlots: equipmentDef.criticalSlots,
        heat,
        techBase: equipmentDef.techBase,
        location,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: true, // User-added equipment is removable
      };
    } else {
      // Not found - create placeholder with unknown equipment
      console.warn(`Equipment not found in database: ${item.id} (tried: ${resolvedId})`);
      return {
        instanceId: uuidv4(),
        equipmentId: item.id,
        name: item.id, // Use ID as name fallback
        category: EquipmentCategory.MISC_EQUIPMENT, // Default to misc
        weight: 0, // Unknown weight
        criticalSlots: 1, // Assume 1 slot minimum
        heat: 0,
        techBase: unitTechBase, // Use unit's tech base
        location,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: true, // User-added equipment is removable
      };
    }
  });
}

/**
 * Calculate total armor tonnage from allocation
 */
function calculateArmorTonnage(allocation: IArmorAllocation, armorType: ArmorTypeEnum): number {
  // Sum all armor points
  const totalPoints = 
    allocation[MechLocation.HEAD] +
    allocation[MechLocation.CENTER_TORSO] +
    allocation.centerTorsoRear +
    allocation[MechLocation.LEFT_TORSO] +
    allocation.leftTorsoRear +
    allocation[MechLocation.RIGHT_TORSO] +
    allocation.rightTorsoRear +
    allocation[MechLocation.LEFT_ARM] +
    allocation[MechLocation.RIGHT_ARM] +
    allocation[MechLocation.LEFT_LEG] +
    allocation[MechLocation.RIGHT_LEG];
  
  // Points per ton varies by armor type
  // Standard: 16 points per ton
  // Ferro-Fibrous IS: 17.92 points per ton (12% bonus)
  // Ferro-Fibrous Clan: 19.2 points per ton (20% bonus)
  // etc.
  let pointsPerTon = 16;
  
  if (armorType === ArmorTypeEnum.FERRO_FIBROUS_IS) {
    pointsPerTon = 17.92;
  } else if (armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN) {
    pointsPerTon = 19.2;
  } else if (armorType === ArmorTypeEnum.LIGHT_FERRO) {
    pointsPerTon = 16.96; // 6% bonus
  } else if (armorType === ArmorTypeEnum.HEAVY_FERRO) {
    pointsPerTon = 19.52; // 22% bonus
  } else if (armorType === ArmorTypeEnum.HARDENED) {
    pointsPerTon = 8; // 2x weight
  }
  
  return Math.ceil((totalPoints / pointsPerTon) * 2) / 2; // Round to nearest half ton
}

// =============================================================================
// Main Service
// =============================================================================

/**
 * Unit Loader Service
 */
export class UnitLoaderService {
  /**
   * Ensure equipment services are initialized for ID resolution
   */
  private async ensureEquipmentInitialized(): Promise<void> {
    // Initialize equipment lookup service (loads JSON equipment data)
    await equipmentLookupService.initialize();
    
    // Initialize equipment registry (builds name-to-ID mappings)
    const registry = getEquipmentRegistry();
    await registry.initialize();
  }
  
  /**
   * Load a canonical unit by ID
   */
  async loadCanonicalUnit(id: string): Promise<ILoadUnitResult> {
    try {
      // Ensure equipment is loaded before mapping
      await this.ensureEquipmentInitialized();
      
      const fullUnit = await canonicalUnitService.getById(id);
      
      if (!fullUnit) {
        return { success: false, error: `Canonical unit "${id}" not found` };
      }
      
      const state = this.mapToUnitState(fullUnit as ISerializedUnit, true);
      return { success: true, state };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load canonical unit';
      return { success: false, error: message };
    }
  }
  
  /**
   * Load a custom unit by ID
   */
  async loadCustomUnit(id: string): Promise<ILoadUnitResult> {
    try {
      // Ensure equipment is loaded before mapping
      await this.ensureEquipmentInitialized();
      
      const fullUnit = await customUnitApiService.getById(id);
      
      if (!fullUnit) {
        return { success: false, error: `Custom unit "${id}" not found` };
      }
      
      // Custom units may already be in UnitState format (saved from customizer)
      // or in serialized format (imported)
      // IFullUnit has [key: string]: unknown, so we can use it as ISerializedUnit if it has the right structure
      if (!hasSerializedUnitStructure(fullUnit)) {
        return { success: false, error: 'Custom unit data is not in serialized format' };
      }
      // Type assertion is safe here because we've verified the structure matches ISerializedUnit
      // and IFullUnit's index signature [key: string]: unknown makes it compatible
      const state = this.mapToUnitState(fullUnit as ISerializedUnit, false);
      return { success: true, state };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load custom unit';
      return { success: false, error: message };
    }
  }
  
  /**
   * Load a unit from either source
   */
  async loadUnit(id: string, source: UnitSource): Promise<ILoadUnitResult> {
    if (source === 'canonical') {
      return this.loadCanonicalUnit(id);
    } else {
      return this.loadCustomUnit(id);
    }
  }
  
  /**
   * Map serialized unit JSON to UnitState
   */
  mapToUnitState(serialized: ISerializedUnit, _isCanonical: boolean): UnitState {
    // Determine unit tech base mode first (mixed tech applies at unit level)
    const techBaseMode = mapTechBaseMode(serialized.techBase);
    // Determine binary tech base for component mappings (per spec, components are binary)
    const techBase = mapTechBase(serialized.techBase);
    
    // Map engine
    const engineType = serialized.engine?.type 
      ? mapEngineType(serialized.engine.type, techBase)
      : EngineType.STANDARD;
    const engineRating = serialized.engine?.rating ?? 
      (serialized.movement?.walk ?? 4) * serialized.tonnage;
    
    // Map gyro
    const gyroType = serialized.gyro?.type 
      ? mapGyroType(serialized.gyro.type) 
      : GyroType.STANDARD;
    
    // Map structure
    const internalStructureType = serialized.structure?.type 
      ? mapStructureType(serialized.structure.type, techBase)
      : InternalStructureType.STANDARD;
    
    // Map cockpit
    const cockpitType = serialized.cockpit 
      ? mapCockpitType(serialized.cockpit)
      : CockpitType.STANDARD;
    
    // Map heat sinks
    const heatSinkType = serialized.heatSinks?.type 
      ? mapHeatSinkType(serialized.heatSinks.type)
      : HeatSinkType.SINGLE;
    const heatSinkCount = serialized.heatSinks?.count ?? 10;
    
    // Map armor
    const armorType = serialized.armor?.type 
      ? mapArmorType(serialized.armor.type, techBase)
      : ArmorTypeEnum.STANDARD;
    const armorAllocation = mapArmorAllocation(serialized.armor?.allocation);
    const armorTonnage = calculateArmorTonnage(armorAllocation, armorType);
    
    // Map equipment (uses tech base mode + criticalSlots hints for mixed-tech variants)
    const equipment = mapEquipment(
      serialized.equipment,
      techBase,
      techBaseMode,
      serialized.criticalSlots
    );
    
    // Determine rules level
    const rulesLevel = serialized.rulesLevel 
      ? mapRulesLevel(serialized.rulesLevel)
      : RulesLevel.STANDARD;
    
    // Get model/variant - canonical uses 'model', custom may use 'variant'
    const model = serialized.model ?? serialized.variant ?? '';
    
    // Create the full UnitState
    const state: UnitState = {
      // Identity - use a NEW ID for loaded units (they're copies in the customizer)
      id: uuidv4(),
      name: `${serialized.chassis}${model ? ' ' + model : ''}`,
      chassis: serialized.chassis,
      clanName: '',
      model,
      mulId: String(serialized.mulId ?? -1),
      year: serialized.year ?? 3025,
      rulesLevel,
      tonnage: serialized.tonnage,
      techBase,
      
      // Configuration
      unitType: (serialized.unitType as UnitType) || 'BattleMech',
      configuration: (serialized.configuration as MechConfiguration) || 'Biped',
      isOmni: false, // TODO: detect from unit data
      techBaseMode,
      componentTechBases: createDefaultComponentTechBases(techBase),
      selectionMemory: createEmptySelectionMemory(),
      
      // Components
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      armorTonnage,
      armorAllocation,
      enhancement: null,
      jumpMP: 0, // TODO: Parse from unit data
      jumpJetType: JumpJetType.STANDARD,
      
      // Equipment
      equipment,
      
      // Metadata
      isModified: false,
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
    };
    
    return state;
  }
}

// Singleton instance
export const unitLoaderService = new UnitLoaderService();


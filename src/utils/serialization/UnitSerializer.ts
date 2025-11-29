/**
 * Unit Serialization Utilities
 * 
 * Implements JSON save/load for unit data.
 * 
 * @spec openspec/changes/implement-phase5-data-models/specs/serialization-formats/spec.md
 */

import {
  ISerializedUnitEnvelope,
  ISerializedUnit,
  ISerializationResult,
  IDeserializationResult,
  IUnitSerializer,
  CURRENT_FORMAT_VERSION,
} from '../../types/unit/UnitSerialization';
import { IBattleMech } from '../../types/unit/BattleMechInterfaces';

/**
 * Application info for serialization envelope
 */
const APPLICATION_NAME = 'BattleTech Editor';
const APPLICATION_VERSION = '1.0.0';

/**
 * Serialize a BattleMech to JSON format
 */
export function serializeUnit(unit: IBattleMech): ISerializationResult {
  try {
    const serialized: ISerializedUnit = {
      id: unit.id,
      chassis: unit.metadata.chassis,
      model: unit.metadata.model,
      variant: unit.metadata.variant,
      unitType: unit.unitType,
      configuration: unit.configuration,
      techBase: unit.techBase,
      rulesLevel: unit.rulesLevel,
      era: unit.metadata.era,
      year: unit.metadata.year,
      tonnage: unit.tonnage,
      engine: {
        type: unit.engine.type,
        rating: unit.engine.rating,
      },
      gyro: {
        type: unit.gyro.type,
      },
      cockpit: unit.cockpitType,
      structure: {
        type: unit.structure.type,
      },
      armor: {
        type: unit.armorType,
        allocation: {
          head: unit.armorAllocation.head,
          centerTorso: unit.armorAllocation.centerTorso,
          centerTorsoRear: unit.armorAllocation.centerTorsoRear,
          leftTorso: unit.armorAllocation.leftTorso,
          leftTorsoRear: unit.armorAllocation.leftTorsoRear,
          rightTorso: unit.armorAllocation.rightTorso,
          rightTorsoRear: unit.armorAllocation.rightTorsoRear,
          leftArm: unit.armorAllocation.leftArm,
          rightArm: unit.armorAllocation.rightArm,
          leftLeg: unit.armorAllocation.leftLeg,
          rightLeg: unit.armorAllocation.rightLeg,
        },
      },
      heatSinks: {
        type: unit.heatSinks.type,
        count: unit.heatSinks.total,
      },
      movement: {
        walk: unit.movement.walkMP,
        jump: unit.movement.jumpMP,
        jumpJetType: unit.movement.jumpJetType,
        enhancements: [
          ...(unit.movement.hasMASC ? ['MASC'] : []),
          ...(unit.movement.hasSupercharger ? ['Supercharger'] : []),
          ...(unit.movement.hasTSM ? ['TSM'] : []),
        ],
      },
      equipment: unit.equipment.map(eq => ({
        id: eq.equipmentId,
        location: eq.location,
        slots: eq.slots,
        isRearMounted: eq.isRearMounted || undefined,
        linkedAmmo: eq.linkedAmmoId,
      })),
      criticalSlots: unit.criticalSlots.reduce((acc, cs) => {
        acc[cs.location] = cs.slots.map(slot => 
          slot.content ? slot.content.name : null
        );
        return acc;
      }, {} as Record<string, (string | null)[]>),
      quirks: unit.quirks ? [...unit.quirks] : undefined,
    };

    const envelope: ISerializedUnitEnvelope = {
      formatVersion: CURRENT_FORMAT_VERSION,
      savedAt: new Date().toISOString(),
      application: APPLICATION_NAME,
      applicationVersion: APPLICATION_VERSION,
      unit: serialized,
    };

    return {
      success: true,
      data: JSON.stringify(envelope, null, 2),
      errors: [],
      warnings: [],
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Validate JSON format before deserialization
 */
export function validateSerializedFormat(data: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(data);

    if (!parsed.formatVersion) {
      errors.push('Missing formatVersion field');
    }

    if (!parsed.unit) {
      errors.push('Missing unit field');
    } else {
      const unit = parsed.unit;
      
      if (!unit.chassis) errors.push('Missing unit.chassis');
      if (!unit.model) errors.push('Missing unit.model');
      if (!unit.unitType) errors.push('Missing unit.unitType');
      if (!unit.tonnage) errors.push('Missing unit.tonnage');
      if (!unit.engine) errors.push('Missing unit.engine');
      if (!unit.armor) errors.push('Missing unit.armor');
    }
  } catch (e) {
    errors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get format version from serialized data
 */
export function getSerializedFormatVersion(data: string): string | null {
  try {
    const parsed = JSON.parse(data);
    return parsed.formatVersion ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if format version is supported
 */
export function isFormatVersionSupported(version: string): boolean {
  const [major] = version.split('.').map(Number);
  const [currentMajor] = CURRENT_FORMAT_VERSION.split('.').map(Number);
  
  // Support same major version
  return major === currentMajor;
}

/**
 * Create a unit serializer instance
 */
export function createUnitSerializer(): IUnitSerializer {
  return {
    serialize: serializeUnit,
    
    deserialize(data: string): IDeserializationResult {
      const validation = validateSerializedFormat(data);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: [],
          migrations: [],
        };
      }

      const version = getSerializedFormatVersion(data);
      if (version && !isFormatVersionSupported(version)) {
        return {
          success: false,
          errors: [`Unsupported format version: ${version}`],
          warnings: [],
          migrations: [],
        };
      }

      // Note: Full deserialization requires building the IBattleMech object
      // This is a stub that would need the full implementation
      return {
        success: false,
        errors: ['Deserialization not yet implemented'],
        warnings: [],
        migrations: [],
      };
    },

    validateFormat: validateSerializedFormat,
    getFormatVersion: getSerializedFormatVersion,
  };
}


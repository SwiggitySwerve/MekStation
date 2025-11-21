/**
 * Unit Conversion Service Implementation
 * 
 * Provides centralized, type-safe conversion between different unit representations
 * with comprehensive validation and error handling.
 * 
 * Uses:
 * - Property mappers for snake_case ↔ camelCase conversion
 * - Enum converters for type-safe enum conversion
 * - Validators for input validation
 * - Result types for error handling
 */

import {
  IUnitConversionService,
  ConversionError,
  ConversionMetadata
} from './IUnitConversionService';
import { Result, success, failure } from '../../types/core/BaseTypes';
import { FullUnit } from '../../types';
import { EditableUnit } from '../../types/editor';
import { CustomizableUnit } from '../../types/customizer';
import { ICompleteUnitConfiguration } from '../../types/core/UnitInterfaces';
import { validateFullUnit } from '../../utils/typeConversion/validators';
import {
  stringToTechBase,
  stringToRulesLevel,
  stringToTechBaseWithDefault,
  stringToRulesLevelWithDefault,
  techBaseToString,
  rulesLevelToString
} from '../../utils/typeConversion/enumConverters';
import { TechBase, RulesLevel } from '../../types/core/BaseTypes';
import { convertApiToInternal, convertInternalToApi } from '../../utils/typeConversion/propertyMappers';
import { convertFullUnitToCustomizable, convertFullUnitToEditableUnit } from '../../utils/unitConverter';
import { unitApiAdapter } from '../../utils/typeConversion/apiAdapters/unitAdapter';

/**
 * Unit Conversion Service
 */
export class UnitConversionService implements IUnitConversionService {
  /**
   * Convert FullUnit to EditableUnit
   */
  toEditableUnit(fullUnit: FullUnit): Result<EditableUnit, ConversionError> {
    try {
      // 1. Validate input
      const validation = validateFullUnit(fullUnit);
      if (!validation.isValid) {
        return failure({
          message: 'Invalid FullUnit: ' + validation.errors.join(', '),
          code: 'INVALID_SOURCE',
          source: 'FullUnit',
          target: 'EditableUnit',
          details: {
            errors: validation.errors,
            warnings: validation.warnings
          }
        });
      }

      // 2. Use existing converter (which handles most of the logic)
      const editableUnit = convertFullUnitToEditableUnit(fullUnit);

      return success(editableUnit);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: 'FullUnit',
        target: 'EditableUnit',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Convert EditableUnit to FullUnit
   */
  toFullUnit(editableUnit: EditableUnit): Result<FullUnit, ConversionError> {
    try {
      // 1. Validate input
      if (!editableUnit.id || !editableUnit.chassis || !editableUnit.model) {
        return failure({
          message: 'EditableUnit missing required fields: id, chassis, or model',
          code: 'INVALID_SOURCE',
          source: 'EditableUnit',
          target: 'FullUnit'
        });
      }

      // 2. Convert enums to strings
      const techBaseString = techBaseToString(editableUnit.techBase);
      const rulesLevelString = rulesLevelToString(editableUnit.rulesLevel);

      // 3. Convert armor allocation to locations format
      const armorLocations = this.convertArmorAllocationToLocations(editableUnit);

      // 4. Convert equipment to weapons_and_equipment format
      const weaponsAndEquipment = this.convertEquipmentToWeaponsAndEquipment(editableUnit);

      // 5. Build FullUnit
      const fullUnit: FullUnit = {
        id: editableUnit.id,
        chassis: editableUnit.chassis,
        model: editableUnit.model,
        mass: editableUnit.tonnage,
        era: editableUnit.era,
        tech_base: techBaseString,
        rules_level: rulesLevelString,
        source: editableUnit.metadata?.source || 'Unknown',
        mul_id: editableUnit.metadata?.mulId,
        role: editableUnit.metadata?.role,
        data: {
          chassis: editableUnit.chassis,
          model: editableUnit.model,
          mass: editableUnit.tonnage,
          tech_base: techBaseString,
          rules_level: rulesLevelString,
          era: editableUnit.era,
          armor: armorLocations.length > 0 ? {
            type: editableUnit.armor?.definition?.name || 'Standard',
            locations: armorLocations
          } : undefined,
          weapons_and_equipment: weaponsAndEquipment,
          // Preserve original data if present
          ...(editableUnit.data || {})
        }
      };

      return success(fullUnit);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: 'EditableUnit',
        target: 'FullUnit',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Convert to CustomizableUnit
   */
  toCustomizableUnit(
    unit: FullUnit | EditableUnit
  ): Result<CustomizableUnit, ConversionError> {
    try {
      // If it's already a FullUnit, use existing converter
      if ('tech_base' in unit || 'mass' in unit) {
        const fullUnit = unit as FullUnit;
        const validation = validateFullUnit(fullUnit);
        if (!validation.isValid) {
          return failure({
            message: 'Invalid FullUnit: ' + validation.errors.join(', '),
            code: 'INVALID_SOURCE',
            source: 'FullUnit',
            target: 'CustomizableUnit',
            details: { errors: validation.errors }
          });
        }
        const customizable = convertFullUnitToCustomizable(fullUnit);
        return success(customizable);
      }

      // If it's an EditableUnit, convert to FullUnit first
      const fullUnitResult = this.toFullUnit(unit as EditableUnit);
      if (!fullUnitResult.success) {
        return failure({
          message: 'Failed to convert EditableUnit to FullUnit: ' + fullUnitResult.error.message,
          code: 'CONVERSION_ERROR',
          source: 'EditableUnit',
          target: 'CustomizableUnit',
          details: { conversionError: fullUnitResult.error }
        });
      }

      const customizable = convertFullUnitToCustomizable(fullUnitResult.data);
      return success(customizable);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: unit.constructor.name,
        target: 'CustomizableUnit',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Convert from CustomizableUnit to FullUnit
   */
  fromCustomizableUnit(
    customizableUnit: CustomizableUnit
  ): Result<FullUnit, ConversionError> {
    try {
      // Validate input
      if (!customizableUnit.id || !customizableUnit.chassis || !customizableUnit.model) {
        return failure({
          message: 'CustomizableUnit missing required fields: id, chassis, or model',
          code: 'INVALID_SOURCE',
          source: 'CustomizableUnit',
          target: 'FullUnit'
        });
      }

      const data = customizableUnit.data || {};

      // Build FullUnit from CustomizableUnit
      const fullUnit: FullUnit = {
        id: String(customizableUnit.id),
        chassis: customizableUnit.chassis,
        model: customizableUnit.model,
        mass: customizableUnit.mass,
        era: data.era || 'Unknown',
        tech_base: data.tech_base || 'Inner Sphere',
        rules_level: data.rules_level || 'Standard',
        source: data.source || 'Unknown',
        mul_id: data.mul_id,
        role: data.role,
        data: {
          ...data,
          chassis: customizableUnit.chassis,
          model: customizableUnit.model,
          mass: customizableUnit.mass
        }
      };

      // Validate the resulting FullUnit
      const validation = validateFullUnit(fullUnit);
      if (!validation.isValid) {
        return failure({
          message: 'Invalid FullUnit after conversion: ' + validation.errors.join(', '),
          code: 'INVALID_TARGET',
          source: 'CustomizableUnit',
          target: 'FullUnit',
          details: { errors: validation.errors }
        });
      }

      return success(fullUnit);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: 'CustomizableUnit',
        target: 'FullUnit',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Convert FullUnit to ICompleteUnitConfiguration
   */
  toCompleteConfiguration(
    fullUnit: FullUnit
  ): Result<ICompleteUnitConfiguration, ConversionError> {
    try {
      // Validate input
      const validation = validateFullUnit(fullUnit);
      if (!validation.isValid) {
        return failure({
          message: 'Invalid FullUnit: ' + validation.errors.join(', '),
          code: 'INVALID_SOURCE',
          source: 'FullUnit',
          target: 'ICompleteUnitConfiguration',
          details: { errors: validation.errors }
        });
      }

      // Use the API adapter which handles this conversion
      const config = unitApiAdapter.fromApiResponse(fullUnit);
      return success(config);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: 'FullUnit',
        target: 'ICompleteUnitConfiguration',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Convert ICompleteUnitConfiguration to FullUnit
   */
  fromCompleteConfiguration(
    config: ICompleteUnitConfiguration
  ): Result<FullUnit, ConversionError> {
    try {
      // Use the API adapter which handles this conversion
      const fullUnit = unitApiAdapter.toApiRequest(config);
      return success(fullUnit);
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        code: 'CONVERSION_ERROR',
        source: 'ICompleteUnitConfiguration',
        target: 'FullUnit',
        details: { error: String(error) }
      });
    }
  }

  /**
   * Validate conversion source
   */
  validateSource(
    source: unknown,
    sourceType: 'FullUnit' | 'EditableUnit' | 'CustomizableUnit' | 'ICompleteUnitConfiguration'
  ): Result<boolean, ConversionError> {
    try {
      switch (sourceType) {
        case 'FullUnit':
          if (!source || typeof source !== 'object') {
            return failure({
              message: 'Source is not an object',
              code: 'INVALID_SOURCE_TYPE',
              source: sourceType
            });
          }
          const fullUnit = source as FullUnit;
          const validation = validateFullUnit(fullUnit);
          return validation.isValid
            ? success(true)
            : failure({
                message: 'Invalid FullUnit: ' + validation.errors.join(', '),
                code: 'INVALID_SOURCE',
                source: sourceType,
                details: { errors: validation.errors }
              });

        case 'EditableUnit':
          if (!source || typeof source !== 'object') {
            return failure({
              message: 'Source is not an object',
              code: 'INVALID_SOURCE_TYPE',
              source: sourceType
            });
          }
          const editableUnit = source as EditableUnit;
          if (!editableUnit.id || !editableUnit.chassis || !editableUnit.model) {
            return failure({
              message: 'EditableUnit missing required fields',
              code: 'INVALID_SOURCE',
              source: sourceType
            });
          }
          return success(true);

        case 'CustomizableUnit':
          if (!source || typeof source !== 'object') {
            return failure({
              message: 'Source is not an object',
              code: 'INVALID_SOURCE_TYPE',
              source: sourceType
            });
          }
          const customizableUnit = source as CustomizableUnit;
          if (!customizableUnit.id || !customizableUnit.chassis || !customizableUnit.model) {
            return failure({
              message: 'CustomizableUnit missing required fields',
              code: 'INVALID_SOURCE',
              source: sourceType
            });
          }
          return success(true);

        case 'ICompleteUnitConfiguration':
          if (!source || typeof source !== 'object') {
            return failure({
              message: 'Source is not an object',
              code: 'INVALID_SOURCE_TYPE',
              source: sourceType
            });
          }
          const config = source as ICompleteUnitConfiguration;
          if (!config.id || !config.chassis || !config.model) {
            return failure({
              message: 'ICompleteUnitConfiguration missing required fields',
              code: 'INVALID_SOURCE',
              source: sourceType
            });
          }
          return success(true);

        default:
          return failure({
            message: `Unknown source type: ${sourceType}`,
            code: 'UNKNOWN_SOURCE_TYPE',
            source: sourceType
          });
      }
    } catch (error) {
      return failure({
        message: error instanceof Error ? error.message : 'Validation error',
        code: 'VALIDATION_ERROR',
        source: sourceType,
        details: { error: String(error) }
      });
    }
  }

  /**
   * Get conversion metadata
   */
  getConversionMetadata(
    sourceType: string,
    targetType: string
  ): ConversionMetadata {
    const metadata: ConversionMetadata = {
      sourceType,
      targetType,
      requiredFields: [],
      optionalFields: [],
      warnings: [],
      canConvert: true
    };

    // Define field requirements for each conversion
    if (sourceType === 'FullUnit' && targetType === 'EditableUnit') {
      metadata.requiredFields = ['id', 'chassis', 'model', 'mass', 'tech_base'];
      metadata.optionalFields = ['era', 'rules_level', 'data'];
      metadata.warnings.push('System components will use default values if not in data');
    } else if (sourceType === 'EditableUnit' && targetType === 'FullUnit') {
      metadata.requiredFields = ['id', 'chassis', 'model', 'tonnage', 'techBase'];
      metadata.optionalFields = ['era', 'rulesLevel', 'data'];
    } else if (targetType === 'CustomizableUnit') {
      metadata.requiredFields = ['id', 'chassis', 'model', 'mass'];
      metadata.optionalFields = ['data'];
    } else if (sourceType === 'FullUnit' && targetType === 'ICompleteUnitConfiguration') {
      metadata.requiredFields = ['id', 'chassis', 'model', 'mass', 'tech_base'];
      metadata.optionalFields = ['era', 'rules_level', 'data'];
      metadata.warnings.push('Full conversion requires complete unit data');
    }

    return metadata;
  }

  // Helper methods

  /**
   * Convert armor allocation to locations format
   */
  private convertArmorAllocationToLocations(editableUnit: EditableUnit): Array<{
    location: string;
    armor_points: number;
    rear_armor_points?: number;
  }> {
    const locations: Array<{
      location: string;
      armor_points: number;
      rear_armor_points?: number;
    }> = [];

    if (editableUnit.armor?.allocation) {
      const allocation = editableUnit.armor.allocation;
      const locationMap: Record<string, string> = {
        head: 'Head',
        centerTorso: 'Center Torso',
        leftTorso: 'Left Torso',
        rightTorso: 'Right Torso',
        leftArm: 'Left Arm',
        rightArm: 'Right Arm',
        leftLeg: 'Left Leg',
        rightLeg: 'Right Leg'
      };

      for (const [key, value] of Object.entries(allocation)) {
        const locationName = locationMap[key] || key;
        if (typeof value === 'number') {
          locations.push({
            location: locationName,
            armor_points: value
          });
        } else if (value && typeof value === 'object') {
          locations.push({
            location: locationName,
            armor_points: (value as any).front || 0,
            rear_armor_points: (value as any).rear
          });
        }
      }
    }

    return locations;
  }

  /**
   * Convert equipment to weapons_and_equipment format
   */
  private convertEquipmentToWeaponsAndEquipment(
    editableUnit: EditableUnit
  ): Array<{
    item_name: string;
    item_type: string;
    location: string;
    tech_base?: string;
    rear_facing?: boolean;
    turret_mounted?: boolean;
  }> {
    if (!editableUnit.equipment || editableUnit.equipment.length === 0) {
      return [];
    }

    return editableUnit.equipment.map(eq => ({
      item_name: eq.equipment.name || 'Unknown',
      item_type: eq.equipment.category || 'equipment',
      location: eq.location,
      tech_base: (eq.equipment as any).techBase || 'IS',
      rear_facing: eq.facing === 'rear',
      turret_mounted: false // Would need to be determined from equipment data
    }));
  }
}

/**
 * Default conversion service instance
 */
export const unitConversionService = new UnitConversionService();

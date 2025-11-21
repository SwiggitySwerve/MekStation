/**
 * Unit Conversion Service Interface
 * 
 * Provides centralized, type-safe conversion between different unit representations:
 * - FullUnit (API format, snake_case)
 * - EditableUnit (Editor format, camelCase)
 * - CustomizableUnit (Customizer format, mixed)
 * - ICompleteUnitConfiguration (Core format, camelCase)
 * 
 * All conversions include validation and error handling.
 */

import { Result } from '../../types/core/BaseTypes';
import { FullUnit } from '../../types';
import { EditableUnit } from '../../types/editor';
import { CustomizableUnit } from '../../types/customizer';
import { ICompleteUnitConfiguration } from '../../types/core/UnitInterfaces';

/**
 * Conversion error details
 */
export interface ConversionError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  source?: string;
  target?: string;
}

/**
 * Conversion metadata
 */
export interface ConversionMetadata {
  sourceType: string;
  targetType: string;
  requiredFields: string[];
  optionalFields: string[];
  warnings: string[];
  canConvert: boolean;
}

/**
 * Unit Conversion Service Interface
 */
export interface IUnitConversionService {
  /**
   * Convert FullUnit (API format) to EditableUnit (Editor format)
   * 
   * @param fullUnit - FullUnit from API
   * @returns Result containing EditableUnit or ConversionError
   */
  toEditableUnit(fullUnit: FullUnit): Result<EditableUnit, ConversionError>;
  
  /**
   * Convert EditableUnit (Editor format) to FullUnit (API format)
   * 
   * @param editableUnit - EditableUnit from editor
   * @returns Result containing FullUnit or ConversionError
   */
  toFullUnit(editableUnit: EditableUnit): Result<FullUnit, ConversionError>;
  
  /**
   * Convert to CustomizableUnit (Customizer format)
   * 
   * @param unit - FullUnit or EditableUnit to convert
   * @returns Result containing CustomizableUnit or ConversionError
   */
  toCustomizableUnit(
    unit: FullUnit | EditableUnit
  ): Result<CustomizableUnit, ConversionError>;
  
  /**
   * Convert from CustomizableUnit (Customizer format) to FullUnit
   * 
   * @param customizableUnit - CustomizableUnit from customizer
   * @returns Result containing FullUnit or ConversionError
   */
  fromCustomizableUnit(
    customizableUnit: CustomizableUnit
  ): Result<FullUnit, ConversionError>;
  
  /**
   * Convert FullUnit to ICompleteUnitConfiguration (Core format)
   * 
   * @param fullUnit - FullUnit from API
   * @returns Result containing ICompleteUnitConfiguration or ConversionError
   */
  toCompleteConfiguration(
    fullUnit: FullUnit
  ): Result<ICompleteUnitConfiguration, ConversionError>;
  
  /**
   * Convert ICompleteUnitConfiguration to FullUnit
   * 
   * @param config - ICompleteUnitConfiguration
   * @returns Result containing FullUnit or ConversionError
   */
  fromCompleteConfiguration(
    config: ICompleteUnitConfiguration
  ): Result<FullUnit, ConversionError>;
  
  /**
   * Validate conversion source
   * 
   * @param source - Source object to validate
   * @param sourceType - Expected source type
   * @returns Result indicating if source is valid
   */
  validateSource(
    source: unknown,
    sourceType: 'FullUnit' | 'EditableUnit' | 'CustomizableUnit' | 'ICompleteUnitConfiguration'
  ): Result<boolean, ConversionError>;
  
  /**
   * Get conversion metadata
   * 
   * @param sourceType - Source type
   * @param targetType - Target type
   * @returns ConversionMetadata with field requirements
   */
  getConversionMetadata(
    sourceType: string,
    targetType: string
  ): ConversionMetadata;
}

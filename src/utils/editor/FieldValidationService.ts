/**
 * FieldValidationService - Individual field validation logic
 * 
 * Extracted from UnitValidationService as part of large file refactoring.
 * Handles validation of individual form fields with context-aware rules.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for service architecture patterns
 */

import { ValidationError } from '../../types/editor';
import { ValidationContext } from './UnitValidationService';

export interface FieldValidationResult {
  isValid: boolean;
  error?: ValidationError;
  suggestions?: string[];
}

export class FieldValidationService {
  
  /**
   * Validate chassis field
   */
  static validateChassisField(value: string, context: ValidationContext): FieldValidationResult {
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: {
          id: 'invalid-chassis',
          category: 'error',
          message: 'Chassis name is required',
          field: 'chassis',
        }
      };
    }

    if (value.length > 50) {
      return {
        isValid: false,
        error: {
          id: 'chassis-too-long',
          category: 'error',
          message: 'Chassis name should not exceed 50 characters',
          field: 'chassis',
        }
      };
    }

    // Check for invalid characters in strict mode
    if (context.strictMode) {
      const invalidChars = /[^a-zA-Z0-9\s\-_.]/;
      if (invalidChars.test(value)) {
        return {
          isValid: false,
          error: {
            id: 'chassis-invalid-characters',
            category: 'error',
            message: 'Chassis name contains invalid characters',
            field: 'chassis',
          },
          suggestions: ['Use only letters, numbers, spaces, hyphens, underscores, and periods']
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate model field
   */
  static validateModelField(value: string, context: ValidationContext): FieldValidationResult {
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: {
          id: 'invalid-model',
          category: 'error',
          message: 'Model designation is required',
          field: 'model',
        }
      };
    }

    if (value.length > 30) {
      return {
        isValid: false,
        error: {
          id: 'model-too-long',
          category: 'error',
          message: 'Model designation should not exceed 30 characters',
          field: 'model',
        }
      };
    }

    // Check for common model designation patterns
    if (context.strictMode) {
      const validModelPattern = /^[A-Z0-9\-]+$/;
      if (!validModelPattern.test(value)) {
        return {
          isValid: false,
          error: {
            id: 'model-invalid-format',
            category: 'error',
            message: 'Model designation should follow standard format',
            field: 'model',
          },
          suggestions: ['Use uppercase letters, numbers, and hyphens (e.g., "BLR-1G", "AWS-8Q")']
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate mass field
   */
  static validateMassField(value: number, context: ValidationContext): FieldValidationResult {
    if (!value || value <= 0) {
      return {
        isValid: false,
        error: {
          id: 'invalid-mass',
          category: 'error',
          message: 'Unit mass must be greater than 0',
          field: 'mass',
        }
      };
    }

    if (value % 5 !== 0 && context.strictMode) {
      return {
        isValid: false,
        error: {
          id: 'invalid-tonnage-increment',
          category: 'error',
          message: 'Unit mass must be in 5-ton increments',
          field: 'mass',
        },
        suggestions: ['Use standard tonnage increments: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100']
      };
    }

    // Check for reasonable mass ranges
    if (value < 10) {
      return {
        isValid: false,
        error: {
          id: 'mass-too-low',
          category: 'error',
          message: 'Unit mass is unreasonably low',
          field: 'mass',
        },
        suggestions: ['Minimum practical BattleMech mass is typically 20 tons']
      };
    }

    if (value > 200) {
      return {
        isValid: false,
        error: {
          id: 'mass-too-high',
          category: 'error',
          message: 'Unit mass exceeds practical limits',
          field: 'mass',
        },
        suggestions: ['Standard BattleMech mass limit is 100 tons, superheavy limit is 200 tons']
      };
    }

    // Warning for non-standard tonnages
    if (value % 5 !== 0) {
      return {
        isValid: true,
        suggestions: ['Consider using standard 5-ton increments for compatibility']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate tech base field
   */
  static validateTechBaseField(value: string, context: ValidationContext): FieldValidationResult {
    const validTechBases = ['Inner Sphere', 'Clan', 'Mixed (IS Chassis)', 'Mixed (Clan Chassis)'];
    
    if (!validTechBases.includes(value)) {
      return {
        isValid: false,
        error: {
          id: 'invalid-tech-base',
          category: 'error',
          message: 'Invalid tech base selection',
          field: 'tech_base',
        },
        suggestions: validTechBases
      };
    }

    // Warning for mixed tech in strict mode
    if (context.strictMode && value.includes('Mixed')) {
      return {
        isValid: true,
        suggestions: ['Mixed tech requires special rules and may not be allowed in all game settings']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate era field
   */
  static validateEraField(value: string, context: ValidationContext): FieldValidationResult {
    const validEras = [
      'Age of War',
      'Star League',
      'Succession Wars',
      'Clan Invasion',
      'FedCom Civil War',
      'Jihad',
      'Dark Age',
      'ilClan Era'
    ];

    if (!value && context.validateOptionalFields) {
      return {
        isValid: true,
        suggestions: ['Specifying an era helps with tech availability validation']
      };
    }

    if (value && !validEras.includes(value)) {
      return {
        isValid: false,
        error: {
          id: 'invalid-era',
          category: 'error',
          message: 'Invalid era selection',
          field: 'era',
        },
        suggestions: validEras
      };
    }

    return { isValid: true };
  }

  /**
   * Validate walk speed field
   */
  static validateWalkSpeedField(value: number, context: ValidationContext): FieldValidationResult {
    if (value < 1) {
      return {
        isValid: false,
        error: {
          id: 'invalid-walk-speed',
          category: 'error',
          message: 'Walk speed must be at least 1',
          field: 'walkSpeed',
        }
      };
    }

    if (value > 8) {
      if (context.strictMode) {
        return {
          isValid: false,
          error: {
            id: 'excessive-walk-speed',
            category: 'error',
            message: 'Walk speed exceeds practical limits',
            field: 'walkSpeed',
          },
          suggestions: ['Standard BattleMech walk speed is typically 1-8']
        };
      } else {
        return {
          isValid: true,
          suggestions: ['Walk speed above 8 is unusual for standard BattleMechs']
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate engine rating field
   */
  static validateEngineRatingField(value: number, mass: number, walkSpeed: number, context: ValidationContext): FieldValidationResult {
    const expectedRating = mass * walkSpeed;

    if (value <= 0) {
      return {
        isValid: false,
        error: {
          id: 'invalid-engine-rating',
          category: 'error',
          message: 'Engine rating must be greater than 0',
          field: 'engineRating',
        }
      };
    }

    if (value !== expectedRating) {
      return {
        isValid: false,
        error: {
          id: 'engine-rating-mismatch',
          category: 'error',
          message: `Engine rating should be ${expectedRating} (${mass} tons × ${walkSpeed} walk speed)`,
          field: 'engineRating',
        },
        suggestions: [`Use engine rating ${expectedRating} for correct movement profile`]
      };
    }

    // Check for standard engine ratings
    const standardRatings = [
      10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
      100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175,
      180, 185, 190, 195, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300,
      320, 340, 360, 380, 400
    ];

    if (!standardRatings.includes(value)) {
      if (context.strictMode) {
        return {
          isValid: false,
          error: {
            id: 'non-standard-engine-rating',
            category: 'error',
            message: 'Engine rating is not a standard value',
            field: 'engineRating',
          },
          suggestions: ['Use a standard engine rating from the official tables']
        };
      } else {
        return {
          isValid: true,
          suggestions: ['Non-standard engine ratings may not be available in all game settings']
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate multiple fields with cross-field validation
   */
  static validateFieldsCrossReference(
    fields: Record<string, any>,
    context: ValidationContext
  ): { isValid: boolean; errors: ValidationError[]; suggestions: string[] } {
    const errors: ValidationError[] = [];
    const suggestions: string[] = [];

    // Cross-validate mass and walk speed for engine rating
    if (fields.mass && fields.walkSpeed && fields.engineRating) {
      const expectedEngineRating = fields.mass * fields.walkSpeed;
      if (fields.engineRating !== expectedEngineRating) {
        errors.push({
          id: 'engine-mass-speed-mismatch',
          category: 'error',
          message: `Engine rating ${fields.engineRating} does not match mass ${fields.mass} × walk speed ${fields.walkSpeed} = ${expectedEngineRating}`,
          field: 'engineRating',
        });
      }
    }

    // Validate tech base compatibility with era
    if (fields.techBase && fields.era) {
      const clanTechEras = ['Clan Invasion', 'FedCom Civil War', 'Jihad', 'Dark Age', 'ilClan Era'];
      
      if (fields.techBase.includes('Clan') && !clanTechEras.includes(fields.era)) {
        if (context.strictMode) {
          errors.push({
            id: 'clan-tech-era-mismatch',
            category: 'error',
            message: 'Clan technology not available in selected era',
            field: 'techBase',
          });
        } else {
          suggestions.push('Clan technology is typically not available before the Clan Invasion era');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Get field validation rules for UI display
   */
  static getFieldValidationRules(): Record<string, Array<{
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>> {
    return {
      chassis: [
        { name: 'Required', description: 'Chassis name must be specified', severity: 'error' },
        { name: 'Length Limit', description: 'Maximum 50 characters', severity: 'error' },
        { name: 'Valid Characters', description: 'Letters, numbers, spaces, hyphens, underscores, periods only', severity: 'warning' }
      ],
      model: [
        { name: 'Required', description: 'Model designation must be specified', severity: 'error' },
        { name: 'Length Limit', description: 'Maximum 30 characters', severity: 'error' },
        { name: 'Standard Format', description: 'Uppercase letters, numbers, and hyphens recommended', severity: 'warning' }
      ],
      mass: [
        { name: 'Positive Value', description: 'Mass must be greater than 0', severity: 'error' },
        { name: 'Minimum Mass', description: 'Minimum practical mass is 10 tons', severity: 'error' },
        { name: 'Maximum Mass', description: 'Maximum practical mass is 200 tons', severity: 'error' },
        { name: 'Standard Increments', description: '5-ton increments recommended', severity: 'warning' }
      ],
      techBase: [
        { name: 'Valid Selection', description: 'Must be a recognized tech base', severity: 'error' },
        { name: 'Era Compatibility', description: 'Should match available technology for era', severity: 'warning' }
      ],
      era: [
        { name: 'Valid Selection', description: 'Must be a recognized historical era', severity: 'error' },
        { name: 'Tech Compatibility', description: 'Should support selected technologies', severity: 'info' }
      ],
      walkSpeed: [
        { name: 'Minimum Speed', description: 'Walk speed must be at least 1', severity: 'error' },
        { name: 'Practical Limit', description: 'Walk speed above 8 is unusual', severity: 'warning' }
      ],
      engineRating: [
        { name: 'Positive Value', description: 'Engine rating must be greater than 0', severity: 'error' },
        { name: 'Correct Calculation', description: 'Must equal mass × walk speed', severity: 'error' },
        { name: 'Standard Rating', description: 'Should use standard engine rating values', severity: 'warning' }
      ]
    };
  }
}

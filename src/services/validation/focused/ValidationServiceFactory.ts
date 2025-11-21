/**
 * ValidationServiceFactory - Demonstrates SOLID principles through dependency injection
 * 
 * This factory creates properly configured validation services that follow all SOLID principles:
 * - SRP: Each validator has a single responsibility
 * - OCP: New validators can be added without modifying existing code
 * - LSP: All validators implement their interfaces correctly
 * - ISP: Interfaces are focused and specific
 * - DIP: High-level orchestrator depends on abstractions, not concretions
 */

import { IValidationOrchestrator } from './IValidationOrchestrator';
import { IWeightValidator } from './IWeightValidator';
import { IHeatValidator } from './IHeatValidator';
import { WeightValidator } from './WeightValidator';
import { ValidationOrchestrator } from './ValidationOrchestrator';

/**
 * Factory interface for creating validation services (OCP compliance)
 */
export interface IValidationServiceFactory {
  createValidationOrchestrator(): IValidationOrchestrator;
  createWeightValidator(): IWeightValidator;
  createHeatValidator(): IHeatValidator;
}

/**
 * Default factory implementation demonstrating dependency injection
 */
export class ValidationServiceFactory implements IValidationServiceFactory {

  /**
   * Creates a fully configured validation orchestrator with all dependencies injected
   * Demonstrates Dependency Inversion Principle (DIP)
   */
  createValidationOrchestrator(): IValidationOrchestrator {
    // Create all focused validators (SRP compliant)
    const weightValidator = this.createWeightValidator();
    const heatValidator = this.createHeatValidator();
    // TODO: Add more validators as they are created
    
    // Inject dependencies into orchestrator (DIP compliant)
    return new ValidationOrchestrator(
      weightValidator,
      heatValidator
      // TODO: Inject additional validators
    );
  }

  /**
   * Creates weight validator (SRP compliant)
   */
  createWeightValidator(): IWeightValidator {
    return new WeightValidator();
  }

  /**
   * Creates heat validator (SRP compliant)
   */
  createHeatValidator(): IHeatValidator {
    // TODO: Implement HeatValidator class
    throw new Error('HeatValidator not yet implemented');
  }
}

/**
 * Test factory for creating mock validators (LSP compliance)
 * Demonstrates how different implementations can be substituted
 */
export class TestValidationServiceFactory implements IValidationServiceFactory {

  createValidationOrchestrator(): IValidationOrchestrator {
    const weightValidator = this.createWeightValidator();
    const heatValidator = this.createHeatValidator();
    
    return new ValidationOrchestrator(
      weightValidator,
      heatValidator
    );
  }

  createWeightValidator(): IWeightValidator {
    return new MockWeightValidator();
  }

  createHeatValidator(): IHeatValidator {
    return new MockHeatValidator();
  }
}

/**
 * Mock weight validator for testing (LSP compliance)
 */
class MockWeightValidator implements IWeightValidator {
  validateWeight() {
    return {
      isValid: true,
      totalWeight: 50,
      maxWeight: 100,
      overweight: 0,
      underweight: 0,
      distribution: {
        structure: 10,
        armor: 15,
        engine: 20,
        equipment: 5,
        ammunition: 0,
        systems: 0,
        jumpJets: 0,
        heatSinks: 0,
        weapons: 0,
        total: 50
      },
      violations: [],
      recommendations: [],
      efficiency: 95
    };
  }

  validateMinimumWeight() {
    return this.validateWeight();
  }

  validateWeightDistribution() {
    return {
      structure: 10,
      armor: 15,
      engine: 20,
      equipment: 5,
      ammunition: 0,
      systems: 0,
      jumpJets: 0,
      heatSinks: 0,
      weapons: 0,
      total: 50
    };
  }

  calculateTotalWeight() {
    return 50;
  }

  calculateWeightBreakdown() {
    return {
      components: {
        structure: { weight: 10, percentage: 20, items: [] },
        armor: { weight: 15, percentage: 30, items: [] },
        engine: { weight: 20, percentage: 40, items: [] },
        equipment: { weight: 5, percentage: 10, items: [] }
      },
      summary: {
        totalWeight: 50,
        utilizationPercentage: 50,
        remainingCapacity: 50
      }
    };
  }
}

/**
 * Mock heat validator for testing (LSP compliance)
 */
class MockHeatValidator implements IHeatValidator {
  validateHeat() {
    return {
      isValid: true,
      heatGeneration: 20,
      heatDissipation: 30,
      heatDeficit: 0,
      minimumHeatSinks: 10, // This is minimum TOTAL heat sinks for the mech, not engine heat sinks
      actualHeatSinks: 15,
      engineHeatSinks: 10,
      externalHeatSinks: 5,
      violations: [],
      recommendations: [],
      efficiency: 95
    };
  }

  validateMinimumHeatSinks() {
    return this.validateHeat();
  }

  validateHeatSinkCompatibility() {
    return {
      isValid: true,
      engineType: 'Standard Fusion',
      heatSinkType: 'Double Heat Sink',
      compatible: true,
      restrictions: [],
      violations: [],
      alternatives: []
    };
  }

  calculateHeatGeneration() {
    return 20;
  }

  calculateHeatDissipation() {
    return {
      total: 30,
      engine: 20,
      external: 10,
      byType: {
        single: 0,
        double: 30,
        clan: 0,
        compact: 0,
        laser: 0
      }
    };
  }

  analyzeHeatBalance() {
    return {
      balance: 10,
      sustainedFireCapacity: 30,
      alphaStrikeCapacity: 50,
      heatScale: {
        shutdown: 30,
        ammoExplosion: 28,
        movementPenalty: 25
      },
      firingPatterns: [],
      recommendations: []
    };
  }
}

/**
 * Singleton factory instance for application use
 */
export const ValidationServiceFactoryInstance = new ValidationServiceFactory();

/**
 * Convenience method to create validation orchestrator
 */
export function createValidationOrchestrator(): IValidationOrchestrator {
  return ValidationServiceFactoryInstance.createValidationOrchestrator();
}

/**
 * Convenience method to create weight validator
 */
export function createWeightValidator(): IWeightValidator {
  return ValidationServiceFactoryInstance.createWeightValidator();
}

/**
 * Convenience method to create heat validator (when implemented)
 */
export function createHeatValidator(): IHeatValidator {
  return ValidationServiceFactoryInstance.createHeatValidator();
}





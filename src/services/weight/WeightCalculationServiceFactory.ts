/**
 * WeightCalculationServiceFactory - Factory for creating weight calculation services
 * 
 * Implements Factory pattern to support dependency injection and testing
 * Follows SOLID principles for service creation and configuration
 */

import { IWeightCalculationService } from './IWeightCalculationService';
import { WeightCalculationService } from './WeightCalculationService';

/**
 * Factory interface for creating weight calculation services
 */
export interface IWeightCalculationServiceFactory {
  /**
   * Create a new weight calculation service instance
   */
  createWeightCalculationService(): IWeightCalculationService;
  
  /**
   * Create a mock weight calculation service for testing
   */
  createMockWeightCalculationService(): IWeightCalculationService;
}

/**
 * Default implementation of weight calculation service factory
 */
export class WeightCalculationServiceFactory implements IWeightCalculationServiceFactory {
  
  createWeightCalculationService(): IWeightCalculationService {
    return new WeightCalculationService();
  }
  
  createMockWeightCalculationService(): IWeightCalculationService {
    return new MockWeightCalculationService();
  }
}

/**
 * Mock implementation for testing
 */
export class MockWeightCalculationService implements IWeightCalculationService {
  calculateTotalWeight(): any {
    return {
      totalWeight: 50,
      maxTonnage: 100,
      remainingTonnage: 50,
      percentageUsed: 50,
      isOverweight: false,
      breakdown: {
        structure: 10,
        engine: 20,
        gyro: 3,
        heatSinks: 2,
        armor: 10,
        equipment: 5,
        ammunition: 0,
        jumpJets: 0
      }
    };
  }
  
  calculateComponentWeights(): any {
    return {
      structure: { weight: 10, type: 'Standard', efficiency: 1.0 },
      engine: { weight: 20, type: 'Standard', rating: 200, efficiency: 1.0 },
      gyro: { weight: 3, type: 'Standard', efficiency: 1.0 },
      heatSinks: { internal: 0, external: 2, total: 2, type: 'Single', efficiency: 1.0 },
      armor: { weight: 10, type: 'Standard', points: 320, efficiency: 1.0 },
      jumpJets: { weight: 0, count: 0, type: 'None', efficiency: 0 }
    };
  }
  
  calculateEquipmentWeight(): number {
    return 5;
  }
  
  validateTonnageLimit(): any {
    return {
      isValid: true,
      currentWeight: 50,
      maxTonnage: 100,
      overweight: 0,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }
  
  calculateRemainingTonnage(): number {
    return 50;
  }
  
  isWithinTonnageLimit(): boolean {
    return true;
  }
  
  calculateJumpJetWeight(): number {
    return 0;
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: IWeightCalculationServiceFactory | null = null;

/**
 * Get the singleton factory instance
 */
export function getWeightCalculationServiceFactory(): IWeightCalculationServiceFactory {
  if (!factoryInstance) {
    factoryInstance = new WeightCalculationServiceFactory();
  }
  return factoryInstance;
}

/**
 * Set a custom factory instance (useful for testing)
 */
export function setWeightCalculationServiceFactory(factory: IWeightCalculationServiceFactory): void {
  factoryInstance = factory;
}

/**
 * Reset factory to default (useful for testing cleanup)
 */
export function resetWeightCalculationServiceFactory(): void {
  factoryInstance = null;
}

/**
 * Convenience function to create a weight calculation service
 */
export function createWeightCalculationService(): IWeightCalculationService {
  const factory = getWeightCalculationServiceFactory();
  return factory.createWeightCalculationService();
}





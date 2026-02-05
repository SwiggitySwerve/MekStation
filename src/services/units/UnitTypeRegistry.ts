/**
 * Unit Type Registry
 *
 * Central registry for unit type handlers. Provides polymorphic dispatch
 * to the appropriate handler based on unit type.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.3
 */

import { IBlkDocument } from '../../types/formats/BlkFormat';
import { IBaseUnit } from '../../types/unit/BaseUnitInterfaces';
import { UnitType } from '../../types/unit/BattleMechInterfaces';
import {
  IUnitTypeHandler,
  IUnitTypeRegistry,
  UnitCategory,
  getUnitCategory,
} from '../../types/unit/UnitTypeHandler';
import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

/**
 * Unit Type Registry Singleton
 *
 * Manages registration and lookup of unit type handlers.
 * Use getUnitTypeRegistry() to access the singleton instance.
 */
class UnitTypeRegistry implements IUnitTypeRegistry {
  private readonly handlers: Map<UnitType, IUnitTypeHandler> = new Map();

  constructor() {}

  /**
   * Register a handler for a unit type
   */
  register<T extends IBaseUnit>(handler: IUnitTypeHandler<T>): void {
    if (this.handlers.has(handler.unitType)) {
      console.warn(
        `[UnitTypeRegistry] Replacing existing handler for ${handler.unitType}`,
      );
    }
    this.handlers.set(handler.unitType, handler as IUnitTypeHandler);
  }

  /**
   * Get handler for a unit type
   */
  getHandler(unitType: UnitType): IUnitTypeHandler | undefined {
    return this.handlers.get(unitType);
  }

  /**
   * Get handler for a BLK document based on unit type tag
   */
  getHandlerForDocument(document: IBlkDocument): IUnitTypeHandler | undefined {
    // First try the mapped unit type
    const handler = this.handlers.get(document.mappedUnitType);
    if (handler) {
      return handler;
    }

    // Fall back to checking each handler's canHandle method
    const handlers = Array.from(this.handlers.values());
    for (const h of handlers) {
      if (h.canHandle(document)) {
        return h;
      }
    }

    return undefined;
  }

  /**
   * Check if a unit type is registered
   */
  isRegistered(unitType: UnitType): boolean {
    return this.handlers.has(unitType);
  }

  /**
   * Get all registered unit types
   */
  getRegisteredTypes(): readonly UnitType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all handlers for a category
   */
  getHandlersByCategory(category: UnitCategory): readonly IUnitTypeHandler[] {
    const result: IUnitTypeHandler[] = [];
    const handlers = Array.from(this.handlers.values());
    for (const handler of handlers) {
      if (getUnitCategory(handler.unitType) === category) {
        result.push(handler);
      }
    }
    return result;
  }

  /**
   * Clear all registered handlers (for testing)
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get count of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<UnitCategory, number>;
    registeredTypes: UnitType[];
  } {
    const byCategory: Record<UnitCategory, number> = {
      [UnitCategory.MECH]: 0,
      [UnitCategory.VEHICLE]: 0,
      [UnitCategory.AEROSPACE]: 0,
      [UnitCategory.PERSONNEL]: 0,
    };

    const handlers = Array.from(this.handlers.values());
    for (const handler of handlers) {
      const category = getUnitCategory(handler.unitType);
      byCategory[category]++;
    }

    return {
      total: this.handlers.size,
      byCategory,
      registeredTypes: Array.from(this.handlers.keys()),
    };
  }
}

const unitTypeRegistryFactory: SingletonFactory<UnitTypeRegistry> =
  createSingleton((): UnitTypeRegistry => new UnitTypeRegistry());

/**
 * Get the singleton unit type registry instance
 */
export function getUnitTypeRegistry(): IUnitTypeRegistry {
  return unitTypeRegistryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetUnitTypeRegistry(): void {
  unitTypeRegistryFactory.reset();
}

/**
 * Helper to register a handler
 */
export function registerUnitTypeHandler<T extends IBaseUnit>(
  handler: IUnitTypeHandler<T>,
): void {
  getUnitTypeRegistry().register(handler);
}

/**
 * Helper to get a handler
 */
export function getUnitTypeHandler(
  unitType: UnitType,
): IUnitTypeHandler | undefined {
  return getUnitTypeRegistry().getHandler(unitType);
}

/**
 * Helper to check if a unit type is supported
 */
export function isUnitTypeSupported(unitType: UnitType): boolean {
  return getUnitTypeRegistry().isRegistered(unitType);
}

// Export the internal class for testing
export { UnitTypeRegistry };

/**
 * Handler Registration Module
 *
 * Registers all unit type handlers with the UnitTypeRegistry.
 * Call initializeUnitTypeHandlers() at application startup.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { logger } from '@/utils/logger';

import { getUnitTypeRegistry } from '../UnitTypeRegistry';
import { createAerospaceHandler } from './AerospaceUnitHandler';
import { createBattleArmorHandler } from './BattleArmorUnitHandler';
import { createConventionalFighterHandler } from './ConventionalFighterUnitHandler';
import { createDropShipHandler } from './DropShipUnitHandler';
import { createInfantryHandler } from './InfantryUnitHandler';
import { createJumpShipHandler } from './JumpShipUnitHandler';
import { createProtoMechHandler } from './ProtoMechUnitHandler';
import { createSmallCraftHandler } from './SmallCraftUnitHandler';
import { createSpaceStationHandler } from './SpaceStationUnitHandler';
import { createSupportVehicleHandler } from './SupportVehicleUnitHandler';
import { createVehicleHandler } from './VehicleUnitHandler';
import { createVTOLHandler } from './VTOLUnitHandler';
import { createWarShipHandler } from './WarShipUnitHandler';

/**
 * Track initialization state
 */
let isInitialized = false;

/**
 * Initialize all unit type handlers
 *
 * Call this once at application startup to register all handlers
 * with the UnitTypeRegistry.
 */
export function initializeUnitTypeHandlers(): void {
  if (isInitialized) {
    logger.warn('[initializeHandlers] Handlers already initialized');
    return;
  }

  const registry = getUnitTypeRegistry();

  // Ground vehicles
  registry.register(createVehicleHandler());
  registry.register(createVTOLHandler());
  registry.register(createSupportVehicleHandler());

  // Aerospace fighters
  registry.register(createAerospaceHandler());
  registry.register(createConventionalFighterHandler());
  registry.register(createSmallCraftHandler());

  // Personnel units
  registry.register(createBattleArmorHandler());
  registry.register(createInfantryHandler());
  registry.register(createProtoMechHandler());

  // Capital ships
  registry.register(createDropShipHandler());
  registry.register(createWarShipHandler());
  registry.register(createJumpShipHandler());
  registry.register(createSpaceStationHandler());

  isInitialized = true;

  logger.debug(
    `[initializeHandlers] Registered ${registry.getRegisteredTypes().length} unit type handlers`,
  );
}

/**
 * Reset initialization state (for testing)
 */
export function resetHandlerInitialization(): void {
  isInitialized = false;
}

/**
 * Check if handlers are initialized
 */
export function areHandlersInitialized(): boolean {
  return isInitialized;
}

/**
 * Get list of supported unit types
 */
export function getSupportedUnitTypes(): string[] {
  if (!isInitialized) {
    initializeUnitTypeHandlers();
  }
  return getUnitTypeRegistry().getRegisteredTypes().map(String);
}

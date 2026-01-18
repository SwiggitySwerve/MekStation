/**
 * Handler Registration Module
 *
 * Registers all unit type handlers with the UnitTypeRegistry.
 * Call initializeUnitTypeHandlers() at application startup.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { getUnitTypeRegistry } from '../UnitTypeRegistry';
import { createVehicleHandler } from './VehicleUnitHandler';
import { createVTOLHandler } from './VTOLUnitHandler';
import { createSupportVehicleHandler } from './SupportVehicleUnitHandler';
import { createAerospaceHandler } from './AerospaceUnitHandler';
import { createConventionalFighterHandler } from './ConventionalFighterUnitHandler';
import { createSmallCraftHandler } from './SmallCraftUnitHandler';
import { createBattleArmorHandler } from './BattleArmorUnitHandler';
import { createInfantryHandler } from './InfantryUnitHandler';
import { createProtoMechHandler } from './ProtoMechUnitHandler';
import { createDropShipHandler } from './DropShipUnitHandler';
import { createWarShipHandler } from './WarShipUnitHandler';
import { createJumpShipHandler } from './JumpShipUnitHandler';
import { createSpaceStationHandler } from './SpaceStationUnitHandler';

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
    console.warn('[initializeHandlers] Handlers already initialized');
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

  console.log(
    `[initializeHandlers] Registered ${registry.getRegisteredTypes().length} unit type handlers`
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

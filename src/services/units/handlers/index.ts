/**
 * Unit Type Handlers
 *
 * Exports all unit type handlers and the abstract base class.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.3
 */

// Base handler
export {
  AbstractUnitTypeHandler,
  createSuccessResult,
  createFailureResult,
  parseNumericField,
  parseIntField,
  parseBooleanField,
  parseArrayField,
} from './AbstractUnitTypeHandler';

// Ground vehicle handlers
export { VehicleUnitHandler, createVehicleHandler } from './VehicleUnitHandler';
export { VTOLUnitHandler, createVTOLHandler } from './VTOLUnitHandler';
export { SupportVehicleUnitHandler, createSupportVehicleHandler } from './SupportVehicleUnitHandler';

// Aerospace handlers
export { AerospaceUnitHandler, createAerospaceHandler } from './AerospaceUnitHandler';
export { ConventionalFighterUnitHandler, createConventionalFighterHandler } from './ConventionalFighterUnitHandler';
export { SmallCraftUnitHandler, createSmallCraftHandler } from './SmallCraftUnitHandler';

// Personnel unit handlers
export { BattleArmorUnitHandler, createBattleArmorHandler } from './BattleArmorUnitHandler';
export { InfantryUnitHandler, createInfantryHandler } from './InfantryUnitHandler';
export { ProtoMechUnitHandler, createProtoMechHandler } from './ProtoMechUnitHandler';

// Capital ship handlers
export { DropShipUnitHandler, createDropShipHandler } from './DropShipUnitHandler';
export { WarShipUnitHandler, createWarShipHandler } from './WarShipUnitHandler';
export { JumpShipUnitHandler, createJumpShipHandler, type IJumpShip } from './JumpShipUnitHandler';
export { SpaceStationUnitHandler, createSpaceStationHandler, type ISpaceStation, SpaceStationType } from './SpaceStationUnitHandler';

// Handler initialization
export {
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
  areHandlersInitialized,
  getSupportedUnitTypes,
} from './initializeHandlers';

/**
 * TacticalActionDock — barrel for Wave 7.2 PR-D consumers.
 *
 * The dock + token menu + hex menu all dispatch through the single
 * `useCommandRegistry` (`add-tactical-action-menu-system` spec
 * invariant — context menus mirror command registry). Downstream
 * consumers reach for the dock from `GameplayLayout` and the context
 * menus from the map interaction layer.
 *
 * @see openspec/changes/add-tactical-action-menu-system/
 */

export {
  TacticalActionDock,
  type TacticalActionDockProps,
} from './TacticalActionDock';
export type {
  IGmPreviewState,
  IGmTacticalCommandPreviewRequest,
  IGmTacticalInterventionSurface,
} from './TacticalActionDock.gmIntervention';

export {
  TokenContextMenu,
  type TokenContextMenuProps,
} from './TokenContextMenu';

export { HexContextMenu, type HexContextMenuProps } from './HexContextMenu';

export {
  CommandTooltip,
  CommandDetailPane,
  type CommandTooltipProps,
} from './CommandTooltip';

export {
  useCommandRegistry,
  buildCommandRegistry,
  filterCommandsForFriendlyToken,
  filterCommandsForEnemyToken,
  filterCommandsForHex,
  groupCommandsByCategory,
} from './useCommandRegistry';

export {
  useCommandPreview,
  buildCommandPreview,
  type ICommandPreviewInputs,
} from './useCommandPreview';

export { buildMovementCommands } from './commands/movementCommands';
export { buildFacingCommands } from './commands/facingCommands';
export { buildWeaponAttackCommands } from './commands/weaponAttackCommands';
export { buildPhysicalAttackCommands } from './commands/physicalAttackCommands';
export { buildHeatEndCommands } from './commands/heatEndCommands';
export { buildUtilityCommands } from './commands/utilityCommands';
export { buildGmReferralCommands } from './commands/gmReferralCommands';

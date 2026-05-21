/**
 * Tactical Command Shell barrel — public exports for Wave 7 consumers.
 *
 * PR-A (this commit): types + slot registry hook only. The shell
 * component itself (which wraps GameplayLayout) ships in PR-B.
 *
 * @see openspec/changes/add-tactical-command-shell/
 */

export {
  useShellSlotRegistry,
  type IShellSlotRegistry,
} from './useShellSlotRegistry';

export {
  TacticalCommandShell,
  useTacticalShell,
  useShellSlotRegistryContext,
  useElectedSpotters,
  type ITacticalShellContext,
  type TacticalCommandShellProps,
} from './TacticalCommandShell';

export { ShellSlot, type ShellSlotProps } from './ShellSlot';

export type {
  ITacticalShellState,
  IShellActiveContext,
  ISlotOwner,
  ShellMode,
  SlotId,
  OpponentIntelTier,
  UnitId,
  PlayerId,
} from '@/types/gameplay/TacticalShellInterfaces';

export {
  createDefaultShellState,
  ALL_SLOT_IDS,
  ALL_SHELL_MODES,
  ALL_OPPONENT_INTEL_TIERS,
} from '@/types/gameplay/TacticalShellInterfaces';

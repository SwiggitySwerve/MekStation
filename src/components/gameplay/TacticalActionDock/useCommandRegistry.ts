/**
 * useCommandRegistry — merged phase-filtered command list for the
 * tactical action dock and context menus.
 *
 * Per the spec's "Context Menus Mirror Command Registry" requirement,
 * the dock and both context menus pull from the SAME registry. This
 * hook is the single entry point; downstream surfaces filter the
 * returned list (by category, by target-shape) but never construct
 * commands directly.
 *
 * Wave 7.0 gate 4 — command dispatch binds to `activeUnitId`, NOT
 * `selectedUnitId`. The MegaMek PR #5540 / #5573 firing-arc regression
 * happened because that upstream cross-coupled the two; here they
 * stay independent fields on the shell state.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2, §2.1
 */

import { useMemo } from 'react';

import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import {
  filterCommandsByPhase,
  type GamePhase,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';

import { buildFacingCommands } from './commands/facingCommands';
import { buildGmReferralCommands } from './commands/gmReferralCommands';
import { buildHeatEndCommands } from './commands/heatEndCommands';
import { buildMovementCommands } from './commands/movementCommands';
import { buildPhysicalAttackCommands } from './commands/physicalAttackCommands';
import { buildUtilityCommands } from './commands/utilityCommands';
import { buildWeaponAttackCommands } from './commands/weaponAttackCommands';

/**
 * Build the full command set for the given context + shell mode.
 *
 * The result is phase-filtered (commands whose `phaseConstraints` do
 * not include the current phase are excluded entirely) AND mode-
 * filtered (GM commands are excluded unless `shellMode === 'gm'`).
 * Disabled-with-reason commands stay in the result so consumers can
 * render the explanatory tooltip per the spec.
 *
 * Pure function with respect to its inputs — used by both the hook
 * and unit tests.
 */
export function buildCommandRegistry(
  ctx: ITacticalCommandContext,
  shellMode: ShellMode,
): readonly ITacticalCommand[] {
  const families: ITacticalCommand[] = [
    ...buildMovementCommands(ctx),
    ...buildFacingCommands(),
    ...buildWeaponAttackCommands(),
    ...buildPhysicalAttackCommands(ctx),
    ...buildHeatEndCommands(),
    ...buildUtilityCommands(),
  ];

  if (shellMode === 'gm') {
    families.push(...buildGmReferralCommands());
  }

  return filterCommandsByPhase(families, ctx.phase);
}

/**
 * React hook wrapper for `buildCommandRegistry`. Memoised on the
 * full context shape + shell mode so the dock/menu re-renders only
 * when one of those signals changes.
 *
 * Dispatch surfaces:
 *   - TacticalActionDock      (full registry, grouped by category)
 *   - TokenContextMenu        (filter targetsEnemy / friendly-tokens)
 *   - HexContextMenu          (filter targetsHex)
 *
 * All three call this hook with the same context — that is the
 * "context menus mirror command registry" invariant in code.
 */
export function useCommandRegistry(
  ctx: ITacticalCommandContext,
  shellMode: ShellMode,
): readonly ITacticalCommand[] {
  // ctx is intentionally exploded — the dependency array tracks the
  // value identity of each field, not the wrapping object, so callers
  // can pass a fresh ctx each render without triggering churn.
  /* eslint-disable react-hooks/exhaustive-deps */
  const memoised = useMemo(
    () => buildCommandRegistry(ctx, shellMode),
    [
      ctx.activeUnitId,
      ctx.selectedUnitId,
      ctx.targetUnitId,
      ctx.hoveredHex?.q,
      ctx.hoveredHex?.r,
      ctx.phase,
      ctx.canAct,
      ctx.activeUnitConversionMode,
      ctx.activeUnitVehicleMotionType,
      ctx.activeUnitVehicleAltitude,
      ctx.activeUnitProtoGlider,
      ctx.activeUnitProtoAltitude,
      ctx.activeUnitLamAirMekAltitude,
      ctx.activeUnitTerrain,
      ctx.activeUnitElevation,
      ctx.activeUnitInfantryMounted,
      ctx.activeUnitInfantryMountHeight,
      ctx.movementCapability?.unitHeight,
      ctx.movementCapability?.unitHeightProfile?.kind,
      ctx.movementCapability?.unitHeightProfile?.kind === 'infantry_mount'
        ? ctx.movementCapability.unitHeightProfile.mountedHeight
        : undefined,
      shellMode,
    ],
  );
  /* eslint-enable react-hooks/exhaustive-deps */
  return memoised;
}

/**
 * Filter helper — commands valid as targets of a friendly unit token
 * context menu. Includes movement / facing / utility commands that
 * apply to the player's own unit; excludes anything `targetsEnemy`.
 */
export function filterCommandsForFriendlyToken(
  commands: readonly ITacticalCommand[],
): readonly ITacticalCommand[] {
  return commands.filter((c) => !c.targetsEnemy);
}

/**
 * Filter helper — commands valid as targets of an enemy unit token
 * context menu. Includes weapon / physical / utility commands that
 * targetsEnemy.
 */
export function filterCommandsForEnemyToken(
  commands: readonly ITacticalCommand[],
): readonly ITacticalCommand[] {
  return commands.filter((c) => c.targetsEnemy === true);
}

/**
 * Filter helper — commands valid in a hex context menu. Includes
 * movement-to-hex commands and any utility commands flagged
 * `targetsHex`.
 */
export function filterCommandsForHex(
  commands: readonly ITacticalCommand[],
): readonly ITacticalCommand[] {
  return commands.filter((c) => c.targetsHex === true);
}

/**
 * Group commands by category — the action dock's render structure.
 * Returns categories in a stable order so the visual grouping is
 * predictable.
 */
export function groupCommandsByCategory(
  commands: readonly ITacticalCommand[],
): ReadonlyArray<{
  readonly category: ITacticalCommand['category'];
  readonly commands: readonly ITacticalCommand[];
}> {
  const order: ReadonlyArray<ITacticalCommand['category']> = [
    'movement',
    'facing',
    'weapon',
    'physical',
    'heat-end',
    'utility',
    'gm',
  ];
  return order
    .map((category) => ({
      category,
      commands: commands.filter((c) => c.category === category),
    }))
    .filter((g) => g.commands.length > 0);
}

/**
 * Type re-export for downstream consumers that don't want to reach
 * into the gameplay types barrel.
 */
export type { GamePhase, ITacticalCommand, ITacticalCommandContext };

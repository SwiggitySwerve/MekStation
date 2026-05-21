/**
 * useCommandPreview — derives the active command's preview payload
 * for the map overlay / inspector consumers.
 *
 * Per the spec's `Command Preview Lifecycle` requirement, irreversible
 * commands MUST preview their outcome before commit. This hook is the
 * single hand-off point — given a selected command + the live shell
 * context, it returns the typed `ICommandPreview` payload (movement
 * path / attack envelope / physical attack consequences) that the
 * existing overlay surfaces consume.
 *
 * Scope clarification (Wave 7.2 PR-D):
 *
 *   - Movement preview is the WIRED case today. The host (GameplayLayout)
 *     already forwards `highlightPath`, `hoverMpCost`, `hoverUnreachable`,
 *     and `mpLegend` to HexMapDisplay. This hook produces an
 *     `IMovementCommandPreview` that mirrors those values so dock-side
 *     callers can render a heat / MP / facing summary alongside the
 *     overlay.
 *
 *   - Weapon attack preview is PARTIAL today. The to-hit number is
 *     plumbed through `hitChance` and the attack plan ID through the
 *     gameplay store, but heat cost / ammo usage / expected damage
 *     do not yet have a clean engine accessor. The hook returns a
 *     STUBBED preview with the to-hit value populated and the other
 *     fields zeroed; the visible to-hit indicator continues to use
 *     the existing surface.
 *     // TODO(wave-7.3): wire to lens-feed-replay change for full
 *     // attack envelope (heat, ammo, expected damage band).
 *
 *   - Physical attack preview ships as a STUB with the attackType
 *     plumbed from the physical-attack plan; to-hit / damage / self-
 *     damage / PSR flags wire later.
 *     // TODO(wave-7.3): wire to physical-attack engine projection.
 *
 * Preview state is SCOPED — when the active command changes the
 * prior preview clears; when the command commits the preview clears.
 * That scoping lives at the call site (the dock + map host) since
 * this hook is a pure projection, not a stateful store.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §3.1, §3.2
 */

import { useMemo } from 'react';

import type {
  ICommandPreview,
  IHexCoordinate,
  IMovementCommandPreview,
  IPhysicalAttackCommandPreview,
  ITacticalCommand,
  ITacticalCommandContext,
  IWeaponAttackCommandPreview,
} from '@/types/gameplay';
import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

/**
 * Auxiliary inputs the preview hook needs that don't live on
 * `ITacticalCommandContext` — these are projections of the existing
 * map / gameplay state already plumbed through GameplayLayout.
 */
export interface ICommandPreviewInputs {
  /** Live movement path from useMapInteraction (start..end inclusive). */
  readonly highlightPath?: readonly IHexCoordinate[];
  /** MP cost of the previewed destination (from useMapInteraction). */
  readonly hoverMpCost?: number;
  /** True if the previewed destination is over the unit's MP envelope. */
  readonly hoverUnreachable?: boolean;
  /** Active movement mode (walk / run / jump). */
  readonly movementMode?: 'walk' | 'run' | 'jump';
  /** Final facing the previewed movement ends on (0..5). */
  readonly previewFacing?: number;
  /** To-hit number for the current weapon attack (2..12 or null). */
  readonly hitChance?: number | null;
  /** Range band for the current weapon attack. */
  readonly weaponRangeBand?: 'short' | 'medium' | 'long' | 'extreme' | 'out';
  /** Active physical attack type from the physical-attack plan. */
  readonly physicalAttackType?: PhysicalAttackType | null;
}

/**
 * Pure preview projection — same input -> same output, no store
 * reads, no engine mutation. Tests call this directly without React.
 */
export function buildCommandPreview(
  command: ITacticalCommand | null,
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): ICommandPreview | null {
  if (!command) return null;

  // If the command supplies its own preview() builder use it first —
  // adapter authors can return a more accurate preview when the
  // engine state is reachable in context.
  if (command.preview) {
    const builderResult = command.preview(ctx);
    if (builderResult) return builderResult;
  }

  switch (command.category) {
    case 'movement':
      return buildMovementPreview(inputs);
    case 'weapon':
      return buildWeaponPreview(ctx, inputs);
    case 'physical':
      return buildPhysicalPreview(ctx, inputs);
    default:
      // facing / heat-end / utility / gm have no map preview.
      return null;
  }
}

function buildMovementPreview(
  inputs: ICommandPreviewInputs,
): IMovementCommandPreview | null {
  const path = inputs.highlightPath ?? [];
  if (path.length === 0) return null;
  return {
    kind: 'movement',
    path,
    mpCost: inputs.hoverMpCost ?? 0,
    finalFacing: inputs.previewFacing ?? 0,
    mode: inputs.movementMode ?? 'walk',
    unreachable: Boolean(inputs.hoverUnreachable),
  };
}

function buildWeaponPreview(
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): IWeaponAttackCommandPreview | null {
  if (!ctx.targetUnitId) return null;
  // TODO(wave-7.3): wire to lens-feed-replay change for full attack
  // envelope. Today the to-hit number is the only fact we can pull
  // cleanly from the existing surface; heat / ammo / damage zero out
  // until the engine projection lands.
  return {
    kind: 'weapon-attack',
    targetUnitId: ctx.targetUnitId,
    toHit: inputs.hitChance ?? null,
    rangeBand: inputs.weaponRangeBand ?? 'medium',
    heatCost: 0,
    ammoUsage: {},
    expectedDamage: 0,
  };
}

function buildPhysicalPreview(
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): IPhysicalAttackCommandPreview | null {
  if (!ctx.targetUnitId) return null;
  if (!inputs.physicalAttackType) return null;
  // TODO(wave-7.3): wire to physical-attack engine projection for
  // to-hit / damage / self-damage / PSR. Today we ship the kind +
  // attack-type so the inspector can label the previewed attack.
  return {
    kind: 'physical-attack',
    targetUnitId: ctx.targetUnitId,
    attackType: inputs.physicalAttackType,
    toHit: null,
    damage: 0,
    selfDamage: 0,
    requiresPSR: false,
  };
}

/**
 * React hook wrapper. Memoised on the command id + context fields +
 * the relevant inputs so the preview only recomputes when something
 * meaningful changes. The dock host clears the active command (passes
 * null) when the user cancels — that flips the result to null and
 * the overlay subscribers unmount their preview chrome.
 */
export function useCommandPreview(
  command: ITacticalCommand | null,
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): ICommandPreview | null {
  // ctx + inputs are intentionally exploded so callers can pass
  // fresh objects each render. See useCommandRegistry for the same
  // pattern.
  /* eslint-disable react-hooks/exhaustive-deps */
  const memoised = useMemo(
    () => buildCommandPreview(command, ctx, inputs),
    [
      command,
      ctx.activeUnitId,
      ctx.selectedUnitId,
      ctx.targetUnitId,
      ctx.hoveredHex?.q,
      ctx.hoveredHex?.r,
      ctx.phase,
      ctx.canAct,
      inputs.highlightPath,
      inputs.hoverMpCost,
      inputs.hoverUnreachable,
      inputs.movementMode,
      inputs.previewFacing,
      inputs.hitChance,
      inputs.weaponRangeBand,
      inputs.physicalAttackType,
    ],
  );
  /* eslint-enable react-hooks/exhaustive-deps */
  return memoised;
}

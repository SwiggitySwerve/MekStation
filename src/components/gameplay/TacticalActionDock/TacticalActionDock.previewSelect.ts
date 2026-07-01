/**
 * Preview-command selection for the TacticalActionDock — picks which command's
 * preview the dock's CommandPreviewPanel renders for the current phase +
 * projection inputs. Extracted from `TacticalActionDock.tsx` to keep that file
 * under the max-lines cap.
 *
 * tactical-movement-intent-composer note: the Walk/Run/Jump verb commands are
 * removed from the dock; the informational movement preview keys off any
 * surviving `movement`-category command (Evade) so `buildMovementPreview` still
 * fires. Movement COMMIT is owned by the composer's Lock-In, not a dock button.
 */

import type {
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import type { ICommandPreviewInputs } from './useCommandPreview';

/** Pick the command whose preview the dock renders for the current context. */
export function previewCommandForContext({
  commands,
  ctx,
  previewInputs,
}: {
  readonly commands: readonly ITacticalCommand[];
  readonly ctx: ITacticalCommandContext;
  readonly previewInputs: ICommandPreviewInputs | undefined;
}): ITacticalCommand | null {
  if (
    ctx.phase === GamePhase.WeaponAttack &&
    (ctx.targetUnitId || previewInputs?.combatInfo)
  ) {
    return (
      commands.find((command) => command.id === 'weapon.fire-volley') ?? null
    );
  }

  const movementMode =
    previewInputs?.movementInfo?.movementType ?? previewInputs?.movementMode;
  const hasMovementPreview =
    Boolean(previewInputs?.movementInfo) ||
    Boolean(previewInputs?.highlightPath?.length);
  if (ctx.phase === GamePhase.Movement && movementMode && hasMovementPreview) {
    return commands.find((command) => command.category === 'movement') ?? null;
  }

  const physicalAttackType =
    previewInputs?.physicalAttackOption?.attackType ??
    previewInputs?.physicalAttackType;
  if (
    ctx.phase === GamePhase.PhysicalAttack &&
    physicalAttackType &&
    (ctx.targetUnitId || previewInputs?.physicalTargetUnitId)
  ) {
    return (
      commands.find(
        (command) =>
          command.id === commandIdForPhysicalAttack(physicalAttackType),
      ) ?? null
    );
  }

  return null;
}

/** Map a physical attack type to its dock command id. */
function commandIdForPhysicalAttack(
  attackType: NonNullable<ICommandPreviewInputs['physicalAttackType']>,
): string {
  switch (attackType) {
    case 'dfa':
      return 'physical.dfa';
    case 'hatchet':
    case 'sword':
    case 'mace':
    case 'lance':
      return 'physical.club';
    default:
      return `physical.${attackType}`;
  }
}

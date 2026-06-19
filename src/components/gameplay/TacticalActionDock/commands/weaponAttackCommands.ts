/**
 * Weapon attack command family — declare attack, fire volley, clear targets.
 *
 * Weapon commands are target-aware — the enemy token context menu
 * preselects the right-clicked enemy as `targetUnitId`, then the dock
 * surfaces the same fire-volley command bound to that target. Both
 * surfaces dispatch through the SAME command (spec: "Context Menus
 * Mirror Command Registry").
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import type { ITacticalCommandContext } from '@/types/gameplay';

import { GamePhase, type ITacticalCommand } from '@/types/gameplay';

import {
  activeUnitTurnAvailability,
  commitStaticAction,
} from './commandDescriptorHelpers';

export function buildWeaponAttackCommands(): readonly ITacticalCommand[] {
  return [
    WeaponDeclareAttackCommand,
    WeaponFireVolleyCommand,
    WeaponClearAttacksCommand,
  ];
}

const WeaponDeclareAttackCommand: ITacticalCommand = {
  id: 'weapon.declare-attack',
  category: 'weapon',
  label: 'Declare Attack',
  hotkey: 'F',
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: true,
  targetsEnemy: true,
  availability(ctx) {
    const unavailable = activeUnitTurnAvailability(ctx);
    if (!unavailable.available) return unavailable;
    if (!ctx.targetUnitId) {
      // Disabled-with-reason — the command stays visible so the player
      // learns the gating fact. Spec: `Disabled command explains
      // invalidity` scenario.
      return { available: false, reason: 'Select an enemy target first.' };
    }
    return { available: true };
  },
  commit: commitStaticAction('declare-attack'),
};

const WeaponFireVolleyCommand: ITacticalCommand = {
  id: 'weapon.fire-volley',
  category: 'weapon',
  label: 'Fire Volley',
  hotkey: 'Enter',
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: true, // Irreversible commit; spec requires confirm.
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    const unavailable = activeUnitTurnAvailability(ctx);
    if (!unavailable.available) return unavailable;
    if (!ctx.targetUnitId) {
      return { available: false, reason: 'No target selected.' };
    }
    const projectedBlock = projectedCombatBlockedReason(ctx);
    if (projectedBlock) {
      return { available: false, reason: projectedBlock };
    }
    return { available: true };
  },
  commit: commitStaticAction('lock', { volley: true }),
};

function projectedCombatBlockedReason(
  ctx: ITacticalCommandContext,
): string | null {
  const projection = ctx.targetCombatProjection;
  if (!ctx.targetUnitId || !projection) return null;
  if (
    projection.attackable &&
    projection.validTargetUnitIds.includes(ctx.targetUnitId)
  ) {
    return null;
  }

  return (
    projection.attackInvalidDetails ??
    projection.blockedReason ??
    projection.lineOfSightBlockerReason ??
    projection.visibilityBlockedReason ??
    projection.attackInvalidReason ??
    'Target cannot be attacked from the current projection.'
  );
}

const WeaponClearAttacksCommand: ITacticalCommand = {
  id: 'weapon.clear-attacks',
  category: 'weapon',
  label: 'Clear Attacks',
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: false,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('clear'),
};

/**
 * Utility command family — eject, withdraw, concede, request-spot.
 *
 * Utility commands are non-phase-specific abilities that the player
 * may invoke whenever the gameplay loop is active. They surface in
 * the dock's overflow group and the token context menu.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import { GamePhase, type ITacticalCommand } from '@/types/gameplay';

import {
  activeUnitTurnAvailability,
  ALL_GAME_PHASES,
  alwaysAvailable,
  commitStaticAction,
} from './commandDescriptorHelpers';

export function buildUtilityCommands(): readonly ITacticalCommand[] {
  return [
    UtilityEjectCommand,
    UtilityWithdrawCommand,
    UtilityConcedeCommand,
    UtilityRequestSpotCommand,
  ];
}

const UtilityEjectCommand: ITacticalCommand = {
  id: 'utility.eject',
  category: 'utility',
  label: 'Eject',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true, // Eject ends the unit's combat life.
  undoable: false,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('eject'),
};

const UtilityWithdrawCommand: ITacticalCommand = {
  id: 'utility.withdraw',
  category: 'utility',
  label: 'Withdraw',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('withdraw'),
};

const UtilityConcedeCommand: ITacticalCommand = {
  id: 'utility.concede',
  category: 'utility',
  label: 'Concede',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: false,
  availability: alwaysAvailable,
  // Concede is available from any side at any time — it does not
  // require activeUnit or canAct (a player can concede out of turn).
  commit: commitStaticAction('concede'),
};

const UtilityRequestSpotCommand: ITacticalCommand = {
  id: 'utility.request-spot',
  category: 'utility',
  label: 'Request Spot',
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: true,
  targetsEnemy: true,
  availability(ctx) {
    const unavailable = activeUnitTurnAvailability(ctx);
    if (!unavailable.available) return unavailable;
    if (!ctx.targetUnitId) {
      return { available: false, reason: 'Select a target to spot.' };
    }
    return { available: true };
  },
  commit(ctx) {
    return {
      actionId: 'request-spot',
      payload: {
        unitId: ctx.activeUnitId,
        targetUnitId: ctx.targetUnitId,
      },
    };
  },
};

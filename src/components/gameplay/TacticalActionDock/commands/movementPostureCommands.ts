import { getHeatMovementPenalty } from '@/constants/heat';
import {
  GamePhase,
  MovementType,
  type ITacticalCommand,
} from '@/types/gameplay';
import {
  getHullDownEntryCost,
  getMaxMP,
  getStandingCost,
  hullDownSupportDestroyedReason,
  isMekStyleHullDownExitCapability,
} from '@/utils/gameplay/movement';

import { commitStaticAction } from './commandDescriptorHelpers';
import { movementActiveTurnUnavailableReason } from './movementCommandAvailability';

const MovementStandCommand: ITacticalCommand = {
  id: 'movement.stand',
  category: 'movement',
  label: 'Stand Up',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = movementActiveTurnUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    if (ctx.activeUnitProne !== true && ctx.activeUnitHullDown !== true) {
      return { available: false, reason: 'Unit is not prone or hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (
      ctx.activeUnitProne !== true &&
      !isMekStyleHullDownExitCapability(ctx.movementCapability)
    ) {
      return {
        available: false,
        reason:
          'Hull-down stand action is only available for Mek-style movement.',
      };
    }
    if (ctx.activeUnitProne === true && ctx.activeUnitStandUpImpossibleReason) {
      return {
        available: false,
        reason: ctx.activeUnitStandUpImpossibleReason,
      };
    }
    if (ctx.movementCapability.walkMP <= 0) {
      return { available: false, reason: 'Unit cannot stand.' };
    }
    const standingCost = getStandingCost(ctx.movementCapability);
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    const effectiveRunMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Run,
      heatPenalty,
    );
    if (Math.max(effectiveWalkMP, effectiveRunMP) < standingCost) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? `Needs ${standingCost} MP to stand after heat penalty.`
            : `Needs ${standingCost} MP to stand.`,
      };
    }
    return { available: true };
  },
  commit: commitStaticAction('stand'),
};

const MovementCarefulStandCommand: ITacticalCommand = {
  id: 'movement.carefulStand',
  category: 'movement',
  label: 'Careful Stand',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const base = MovementStandCommand.availability(ctx);
    if (!base.available) return base;
    if (ctx.activeUnitHullDown === true && ctx.activeUnitProne !== true) {
      return {
        available: false,
        reason: 'Careful Stand is only available when prone.',
      };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    if (effectiveWalkMP <= 2) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? 'Careful Stand needs more than 2 walk MP after heat penalty.'
            : 'Careful Stand needs more than 2 walk MP.',
      };
    }
    return { available: true };
  },
  commit: commitStaticAction('stand-careful', { mode: 'careful' }),
};

const MovementHullDownCommand: ITacticalCommand = {
  id: 'movement.hullDown',
  category: 'movement',
  label: 'Hull Down',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = movementActiveTurnUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    if (ctx.activeUnitHullDown === true) {
      return { available: false, reason: 'Unit is already hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (!isMekStyleHullDownExitCapability(ctx.movementCapability)) {
      return {
        available: false,
        reason: 'Hull-down entry is only available for Mek-style movement.',
      };
    }
    const entryUnit = {
      componentDamage: ctx.activeUnitComponentDamage,
      destroyedLocations: ctx.activeUnitDestroyedLocations ?? [],
      hullDown: ctx.activeUnitHullDown ?? false,
      prone: ctx.activeUnitProne ?? false,
    };
    const destroyedSupportReason = hullDownSupportDestroyedReason(
      entryUnit,
      ctx.movementCapability,
    );
    if (destroyedSupportReason) {
      return { available: false, reason: `${destroyedSupportReason}.` };
    }
    const hullDownEntryCost = getHullDownEntryCost(
      entryUnit,
      ctx.movementCapability,
    );
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    if (effectiveWalkMP < hullDownEntryCost) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? `Needs ${hullDownEntryCost} MP to enter hull-down after heat penalty.`
            : `Needs ${hullDownEntryCost} MP to enter hull-down.`,
      };
    }
    return { available: true };
  },
  commit: commitStaticAction('hull-down'),
};

const MovementGoProneCommand: ITacticalCommand = {
  id: 'movement.goProne',
  category: 'movement',
  label: 'Go Prone',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = movementActiveTurnUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    if (ctx.activeUnitProne === true) {
      return { available: false, reason: 'Unit is already prone.' };
    }
    if (ctx.activeUnitHullDown !== true) {
      return { available: false, reason: 'Unit must be hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (!isMekStyleHullDownExitCapability(ctx.movementCapability)) {
      return {
        available: false,
        reason:
          'Hull-down go-prone action is only available for Mek-style movement.',
      };
    }
    return { available: true };
  },
  commit: commitStaticAction('go-prone'),
};

export const MovementPostureCommands: readonly ITacticalCommand[] = [
  MovementStandCommand,
  MovementCarefulStandCommand,
  MovementHullDownCommand,
  MovementGoProneCommand,
];

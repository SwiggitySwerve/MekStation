/**
 * Physical attack command family — punch, kick, charge, DFA, club.
 *
 * Physical attacks resolve as single irreversible actions (unlike a
 * multi-weapon volley). All variants set `requiresConfirmation: true`
 * because a charge or DFA can self-damage and a player must opt in.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import type { ITacticalCommandContext } from '@/types/gameplay';
import type {
  IPhysicalAttackOption,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { GamePhase, type ITacticalCommand } from '@/types/gameplay';

import { REASON_COPY } from '../../PhysicalAttackPanel.helpers';

export function buildPhysicalAttackCommands(): readonly ITacticalCommand[] {
  return [
    PhysicalPunchCommand,
    PhysicalKickCommand,
    PhysicalChargeCommand,
    PhysicalDeathFromAboveCommand,
    PhysicalClubCommand,
  ];
}

function requireActiveAndTarget(ctx: {
  activeUnitId: string | null;
  canAct: boolean;
  targetUnitId: string | null;
}): { available: true } | { available: false; reason: string } {
  if (!ctx.activeUnitId)
    return { available: false, reason: 'No unit is active.' };
  if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
  if (!ctx.targetUnitId) {
    return { available: false, reason: 'Select an enemy target first.' };
  }
  return { available: true };
}

function requireProjectedPhysicalAttack(
  ctx: ITacticalCommandContext,
  attackTypes: readonly PhysicalAttackType[],
): { available: true } | { available: false; reason: string } {
  const base = requireActiveAndTarget(ctx);
  if (!base.available) return base;

  const projectedOption = ctx.targetPhysicalAttackOption;
  if (projectedOption && attackTypes.includes(projectedOption.attackType)) {
    return physicalOptionAvailability(projectedOption);
  }

  const projectedOptions =
    ctx.targetPhysicalAttackOptions?.filter((option) =>
      attackTypes.includes(option.attackType),
    ) ?? [];
  if (projectedOptions.length === 0) {
    return { available: true };
  }
  if (projectedOptions.some(isPhysicalOptionAvailable)) {
    return { available: true };
  }

  const firstBlockedOption = projectedOptions[0];
  return firstBlockedOption
    ? physicalOptionAvailability(firstBlockedOption)
    : { available: true };
}

function physicalOptionAvailability(
  option: IPhysicalAttackOption,
): { available: true } | { available: false; reason: string } {
  if (isPhysicalOptionAvailable(option)) return { available: true };

  return {
    available: false,
    reason: physicalProjectionBlockedReason(option),
  };
}

function isPhysicalOptionAvailable(option: IPhysicalAttackOption): boolean {
  return option.toHit.allowed && option.restrictionsFailed.length === 0;
}

function physicalProjectionBlockedReason(
  projectedOption: IPhysicalAttackOption,
): string {
  const reasonCode =
    projectedOption.restrictionsFailed[0] ??
    projectedOption.toHit.restrictionReasonCode;

  return (
    projectedOption.toHit.restrictionReason ??
    (reasonCode ? REASON_COPY[reasonCode] : undefined) ??
    'Physical attack is blocked by the current projection.'
  );
}

const PhysicalPunchCommand: ITacticalCommand = {
  id: 'physical.punch',
  category: 'physical',
  label: 'Punch',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['punch']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'punch' } };
  },
};

const PhysicalKickCommand: ITacticalCommand = {
  id: 'physical.kick',
  category: 'physical',
  label: 'Kick',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['kick']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'kick' } };
  },
};

const PhysicalChargeCommand: ITacticalCommand = {
  id: 'physical.charge',
  category: 'physical',
  label: 'Charge',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['charge']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'charge' } };
  },
};

const PhysicalDeathFromAboveCommand: ITacticalCommand = {
  id: 'physical.dfa',
  category: 'physical',
  label: 'Death From Above',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    const base = requireProjectedPhysicalAttack(ctx, ['dfa']);
    if (!base.available) return base;
    // DFA requires jump-jet capacity. Until the context carries unit
    // capabilities, the engine refuses non-jumping units. Wave 7.3+
    // upgrades this to a `disabledReason: "No jump jets equipped."`
    return { available: true };
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'dfa' } };
  },
};

const PhysicalClubCommand: ITacticalCommand = {
  id: 'physical.club',
  category: 'physical',
  label: 'Club',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    const base = requireProjectedPhysicalAttack(ctx, [
      'hatchet',
      'sword',
      'mace',
      'lance',
    ]);
    if (!base.available) return base;
    // Club requires a held weapon (hatchet, sword, mace, etc).
    // Engine refuses the commit until that lands in context.
    return { available: true };
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'hatchet' } };
  },
};

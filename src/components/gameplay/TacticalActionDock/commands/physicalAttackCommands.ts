/**
 * Physical attack command family: punch, kick, push, charge, DFA, melee.
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

export function buildPhysicalAttackCommands(
  ctx?: ITacticalCommandContext,
): readonly ITacticalCommand[] {
  // Equipment-reality gate (battle-armor-combat "Vibroclaw Attack", per
  // `wire-vibroclaw-attack-dispatch`): the vibro-claw button is HIDDEN —
  // not merely disabled — unless the active BA squad mounts claws.
  // `undefined` (legacy contexts without the flag) keeps it hidden too:
  // only a squad context explicitly reporting claws renders it.
  const showVibroClaw = (ctx?.activeUnitVibroClawCount ?? 0) >= 1;
  return [
    PhysicalPunchCommand,
    PhysicalKickCommand,
    PhysicalPushCommand,
    PhysicalTripCommand,
    PhysicalThrashCommand,
    PhysicalJumpJetAttackCommand,
    PhysicalBrushOffCommand,
    PhysicalGrappleCommand,
    PhysicalBreakGrappleCommand,
    PhysicalChargeCommand,
    PhysicalDeathFromAboveCommand,
    PhysicalClubCommand,
    PhysicalSwordCommand,
    PhysicalMaceCommand,
    PhysicalLanceCommand,
    PhysicalRetractableBladeCommand,
    PhysicalFlailCommand,
    PhysicalWreckingBallCommand,
    ...(showVibroClaw ? [PhysicalVibroClawCommand] : []),
  ];
}

const PhysicalVibroClawCommand: ITacticalCommand = {
  id: 'physical.vibro-claw',
  category: 'physical',
  label: 'Vibro-Claw',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireActiveAndTarget(ctx);
  },
  commit(ctx) {
    return {
      actionId: 'vibro-claw-attack',
      payload: { targetUnitId: ctx.targetUnitId ?? undefined },
    };
  },
};

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

const PhysicalPushCommand: ITacticalCommand = {
  id: 'physical.push',
  category: 'physical',
  label: 'Push',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['push']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'push' } };
  },
};

const PhysicalTripCommand: ITacticalCommand = {
  id: 'physical.trip',
  category: 'physical',
  label: 'Trip',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['trip']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'trip' } };
  },
};

const PhysicalThrashCommand: ITacticalCommand = {
  id: 'physical.thrash',
  category: 'physical',
  label: 'Thrash',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['thrash']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'thrash' } };
  },
};

const PhysicalJumpJetAttackCommand: ITacticalCommand = {
  id: 'physical.jump-jet-attack',
  category: 'physical',
  label: 'Jump Jet Attack',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['jump-jet-attack']);
  },
  commit() {
    return {
      actionId: 'physical-attack',
      payload: { attackType: 'jump-jet-attack', limb: 'rightLeg' },
    };
  },
};

const PhysicalBrushOffCommand: ITacticalCommand = {
  id: 'physical.brush-off',
  category: 'physical',
  label: 'Brush Off',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['brush-off']);
  },
  commit() {
    return {
      actionId: 'physical-attack',
      payload: { attackType: 'brush-off', limb: 'rightArm' },
    };
  },
};

const PhysicalGrappleCommand: ITacticalCommand = {
  id: 'physical.grapple',
  category: 'physical',
  label: 'Grapple',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['grapple']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'grapple' } };
  },
};

const PhysicalBreakGrappleCommand: ITacticalCommand = {
  id: 'physical.break-grapple',
  category: 'physical',
  label: 'Break Grapple',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['break-grapple']);
  },
  commit() {
    return {
      actionId: 'physical-attack',
      payload: { attackType: 'break-grapple' },
    };
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

const PhysicalSwordCommand: ITacticalCommand = {
  id: 'physical.sword',
  category: 'physical',
  label: 'Sword',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['sword']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'sword' } };
  },
};

const PhysicalMaceCommand: ITacticalCommand = {
  id: 'physical.mace',
  category: 'physical',
  label: 'Mace',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['mace']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'mace' } };
  },
};

const PhysicalLanceCommand: ITacticalCommand = {
  id: 'physical.lance',
  category: 'physical',
  label: 'Lance',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['lance']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'lance' } };
  },
};

const PhysicalRetractableBladeCommand: ITacticalCommand = {
  id: 'physical.retractable-blade',
  category: 'physical',
  label: 'Retractable Blade',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['retractable-blade']);
  },
  commit() {
    return {
      actionId: 'physical-attack',
      payload: { attackType: 'retractable-blade' },
    };
  },
};

const PhysicalFlailCommand: ITacticalCommand = {
  id: 'physical.flail',
  category: 'physical',
  label: 'Flail',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['flail']);
  },
  commit() {
    return { actionId: 'physical-attack', payload: { attackType: 'flail' } };
  },
};

const PhysicalWreckingBallCommand: ITacticalCommand = {
  id: 'physical.wrecking-ball',
  category: 'physical',
  label: 'Wrecking Ball',
  phaseConstraints: [GamePhase.PhysicalAttack],
  requiresConfirmation: true,
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    return requireProjectedPhysicalAttack(ctx, ['wrecking-ball']);
  },
  commit() {
    return {
      actionId: 'physical-attack',
      payload: { attackType: 'wrecking-ball' },
    };
  },
};

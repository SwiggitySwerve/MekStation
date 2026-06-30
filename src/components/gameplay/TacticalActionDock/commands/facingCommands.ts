/**
 * Facing command family — rotate left, rotate right, torso twist.
 *
 * Facing changes share the Movement phase with positional movement but
 * are a distinct category so the dock can group them and the context
 * menu can surface them independently (right-click own token → "Face
 * this hex" without committing to walk/run/jump).
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import { GamePhase, type ITacticalCommand } from '@/types/gameplay';

import {
  activeUnitTurnAvailability,
  commitStaticAction,
} from './commandDescriptorHelpers';

export function buildFacingCommands(): readonly ITacticalCommand[] {
  return [
    FacingRotateLeftCommand,
    FacingRotateRightCommand,
    FacingTorsoTwistCommand,
  ];
}

const FacingRotateLeftCommand: ITacticalCommand = {
  id: 'facing.rotate-left',
  category: 'facing',
  label: 'Rotate Left',
  hotkey: 'Q',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('facing-left'),
};

const FacingRotateRightCommand: ITacticalCommand = {
  id: 'facing.rotate-right',
  category: 'facing',
  label: 'Rotate Right',
  hotkey: 'D',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('facing-right'),
};

const FacingTorsoTwistCommand: ITacticalCommand = {
  id: 'facing.torso-twist',
  category: 'facing',
  label: 'Torso Twist',
  hotkey: 'T',
  // Torso twist is a WeaponAttack-phase action in BattleTech — bipedal
  // mechs can re-aim their upper body without changing chassis facing.
  // The dock surfaces it during weapon attack and lets the engine
  // refuse for quadrupeds.
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: true,
  availability: activeUnitTurnAvailability,
  commit: commitStaticAction('torso-twist', { direction: 'left' }),
};

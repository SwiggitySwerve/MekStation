/**
 * Heat / End-phase command family — continue heat, end phase, next turn.
 *
 * End-phase commands implement the spec's `End phase distinguishes
 * no-op from unresolved actions` scenario — when required actions
 * remain, the UI MUST warn or cycle to the next required action
 * before the engine advances. The dock surfaces the End Phase command
 * with `requiresConfirmation: true` so the host layer (which knows
 * about unresolved attacks) can intercept the confirm step and either
 * show the warning or pass through.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import { GamePhase, type ITacticalCommand } from '@/types/gameplay';

import {
  canActAvailability,
  commitStaticAction,
} from './commandDescriptorHelpers';

export function buildHeatEndCommands(): readonly ITacticalCommand[] {
  return [HeatContinueCommand, EndPhaseCommand, NextTurnCommand];
}

const HeatContinueCommand: ITacticalCommand = {
  id: 'heat.continue',
  category: 'heat-end',
  label: 'Continue',
  hotkey: 'Enter',
  phaseConstraints: [GamePhase.Heat],
  requiresConfirmation: false,
  undoable: false,
  availability: canActAvailability,
  commit: commitStaticAction('continue'),
};

const EndPhaseCommand: ITacticalCommand = {
  id: 'heat-end.end-phase',
  category: 'heat-end',
  label: 'End Phase',
  hotkey: 'Enter',
  phaseConstraints: [
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
  ],
  // Per spec `End phase distinguishes no-op from unresolved actions` —
  // the confirm step is where the host layer surfaces the warning if
  // required actions remain.
  requiresConfirmation: true,
  undoable: false,
  availability: canActAvailability,
  commit: commitStaticAction('lock', { endPhase: true }),
};

const NextTurnCommand: ITacticalCommand = {
  id: 'heat-end.next-turn',
  category: 'heat-end',
  label: 'Next Turn',
  hotkey: 'Enter',
  phaseConstraints: [GamePhase.End],
  requiresConfirmation: false,
  undoable: false,
  availability: canActAvailability,
  commit: commitStaticAction('next-turn'),
};

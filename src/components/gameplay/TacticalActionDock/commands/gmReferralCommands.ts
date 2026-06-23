/**
 * GM / referee command family for tactical intervention previews.
 *
 * GM commands are filtered out of the registry for non-GM shellModes as an
 * ergonomic visibility rule. Every command commits a GM intervention preview
 * intent; the intervention service still owns authority, redaction, and
 * approval.
 *
 * @spec openspec/changes/wave-05-gm-combat-intervention-controls/specs/gm-tactical-command-surface/spec.md
 */

import type { CommandAvailability, ITacticalCommand } from '@/types/gameplay';

import {
  buildGmTacticalCommandIntent,
  GM_TACTICAL_PREVIEW_ACTION_ID,
  type GmTacticalCommandId,
} from '@/lib/interventions';

import { ALL_GAME_PHASES, alwaysAvailable } from './commandDescriptorHelpers';

export function buildGmReferralCommands(): readonly ITacticalCommand[] {
  return [
    GmAdvancePhaseCommand,
    GmSetPositionFacingCommand,
    GmSetDamageCommand,
    GmSetHeatAmmoCommand,
    GmSetInitiativeCommand,
    GmSetLifecycleCommand,
    GmCorrectAttackCommand,
    GmSetObjectiveCommand,
    GmReloadUnitCommand,
    GmGrantResourceCommand,
  ];
}

const GmAdvancePhaseCommand: ITacticalCommand = {
  id: 'gm.advance-phase',
  category: 'gm',
  label: 'Advance Phase (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: false,
  availability: alwaysAvailable,
  commit: commitGmPreviewIntent('gm.advance-phase'),
};

const GmSetPositionFacingCommand: ITacticalCommand = {
  id: 'gm.set-position-facing',
  category: 'gm',
  label: 'Set Position/Facing (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: selectedOrActiveUnitAvailability,
  commit: commitGmPreviewIntent('gm.set-position-facing'),
};

const GmSetDamageCommand: ITacticalCommand = {
  id: 'gm.set-damage',
  category: 'gm',
  label: 'Set Damage (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: selectedOrActiveUnitAvailability,
  commit: commitGmPreviewIntent('gm.set-damage'),
};

const GmSetHeatAmmoCommand: ITacticalCommand = {
  id: 'gm.set-heat-ammo',
  category: 'gm',
  label: 'Set Heat/Ammo (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: selectedOrActiveUnitAvailability,
  commit: commitGmPreviewIntent('gm.set-heat-ammo'),
};

const GmSetInitiativeCommand: ITacticalCommand = {
  id: 'gm.set-initiative',
  category: 'gm',
  label: 'Set Initiative (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: alwaysAvailable,
  commit: commitGmPreviewIntent('gm.set-initiative'),
};

const GmSetLifecycleCommand: ITacticalCommand = {
  id: 'gm.set-lifecycle',
  category: 'gm',
  label: 'Mark Rescued (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: selectedOrActiveUnitAvailability,
  commit: commitGmPreviewIntent('gm.set-lifecycle'),
};

const GmCorrectAttackCommand: ITacticalCommand = {
  id: 'gm.correct-attack',
  category: 'gm',
  label: 'Correct Attack (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: activeUnitAvailability,
  commit: commitGmPreviewIntent('gm.correct-attack'),
};

const GmSetObjectiveCommand: ITacticalCommand = {
  id: 'gm.set-objective',
  category: 'gm',
  label: 'Set Objective (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: alwaysAvailable,
  commit: commitGmPreviewIntent('gm.set-objective'),
};

const GmReloadUnitCommand: ITacticalCommand = {
  id: 'gm.reload-unit',
  category: 'gm',
  label: 'Reload Unit (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability: selectedOrActiveUnitAvailability,
  commit: commitGmPreviewIntent('gm.reload-unit'),
};

const GmGrantResourceCommand: ITacticalCommand = {
  id: 'gm.grant-resource',
  category: 'gm',
  label: 'Grant Resource (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: false,
  undoable: true,
  availability: alwaysAvailable,
  commit: commitGmPreviewIntent('gm.grant-resource'),
};

function selectedOrActiveUnitAvailability(
  ctx: Parameters<ITacticalCommand['availability']>[0],
): CommandAvailability {
  if (!ctx.selectedUnitId && !ctx.activeUnitId) {
    return { available: false, reason: 'Select a unit first.' };
  }
  return { available: true };
}

function activeUnitAvailability(
  ctx: Parameters<ITacticalCommand['availability']>[0],
): CommandAvailability {
  if (!ctx.activeUnitId) {
    return { available: false, reason: 'No unit is active.' };
  }
  return { available: true };
}

function commitGmPreviewIntent(commandId: GmTacticalCommandId) {
  return (ctx: Parameters<ITacticalCommand['commit']>[0]) => ({
    actionId: GM_TACTICAL_PREVIEW_ACTION_ID,
    payload: buildGmTacticalCommandIntent(commandId, ctx),
  });
}

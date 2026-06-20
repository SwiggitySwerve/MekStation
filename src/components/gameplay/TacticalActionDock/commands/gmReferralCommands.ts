/**
 * GM / referee command family — advance phase by force, set damage,
 * grant resource.
 *
 * GM commands are filtered out of the registry for non-GM shellModes as an
 * ergonomic visibility rule. Every command commits a GM intervention preview
 * intent; the intervention service still owns authority, redaction, and
 * approval.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import type { ITacticalCommand } from '@/types/gameplay';

import {
  buildGmTacticalCommandIntent,
  GM_TACTICAL_PREVIEW_ACTION_ID,
  type GmTacticalCommandId,
} from '@/lib/interventions';

import { ALL_GAME_PHASES, alwaysAvailable } from './commandDescriptorHelpers';

export function buildGmReferralCommands(): readonly ITacticalCommand[] {
  return [GmAdvancePhaseCommand, GmSetDamageCommand, GmGrantResourceCommand];
}

const GmAdvancePhaseCommand: ITacticalCommand = {
  id: 'gm.advance-phase',
  category: 'gm',
  label: 'Advance Phase (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true, // GM force-advance bypasses validation.
  undoable: false,
  availability: alwaysAvailable,
  commit: commitGmPreviewIntent('gm.advance-phase'),
};

const GmSetDamageCommand: ITacticalCommand = {
  id: 'gm.set-damage',
  category: 'gm',
  label: 'Set Damage (GM)',
  phaseConstraints: ALL_GAME_PHASES,
  requiresConfirmation: true,
  undoable: true,
  availability(ctx) {
    // GM set-damage requires SOMETHING to target. The shell exposes
    // selectedUnit (map cursor) as the natural pick — GM workflow is
    // "click the unit you want to mod, hit GM Set Damage". If nothing
    // is selected we surface the disabled-reason so the GM learns.
    if (!ctx.selectedUnitId) {
      return { available: false, reason: 'Select a unit first.' };
    }
    return { available: true };
  },
  commit: commitGmPreviewIntent('gm.set-damage'),
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

function commitGmPreviewIntent(commandId: GmTacticalCommandId) {
  return (ctx: Parameters<ITacticalCommand['commit']>[0]) => ({
    actionId: GM_TACTICAL_PREVIEW_ACTION_ID,
    payload: buildGmTacticalCommandIntent(commandId, ctx),
  });
}

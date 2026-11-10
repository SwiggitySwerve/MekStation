import type { CampaignSaveSnapshot } from '@/stores/campaign/campaignSaveState';

import { isPendingWriteConflict } from '@/stores/campaign/campaignSaveState';

export const CAMPAIGN_SAVE_CARD_ID = 'campaign-save-status';

/**
 * The ONE badge for the copy's state. Unsaved edits outrank `saved`, so a copy
 * that still owes the server work can never read Saved (the reducer holds the
 * same line: `saved` implies `!dirty`). A failed or refused save is shown as
 * failed even while edits are pending, so it is visibly not saved.
 */
export function describeSaveState(
  state: Pick<
    CampaignSaveSnapshot,
    'saveState' | 'dirty' | 'recoveredPendingWrite' | 'saveConflict'
  >,
): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'red' | 'muted';
  showInNavigation: boolean;
  unsentDetail?: string;
} {
  if (state.saveState === 'conflict')
    return {
      label: 'Conflict',
      variant: 'red',
      showInNavigation: true,
      unsentDetail: isPendingWriteConflict(state)
        ? 'Changes stay local and unsent. Saving is paused until you choose Use Server Version.'
        : undefined,
    };
  if (state.saveState === 'saving')
    return { label: 'Saving…', variant: 'info', showInNavigation: true };
  if (state.saveState === 'error') {
    return { label: 'Save failed', variant: 'warning', showInNavigation: true };
  }
  if (state.dirty) {
    return {
      label: state.recoveredPendingWrite
        ? 'Recovered unsaved changes'
        : 'Unsaved changes',
      variant: 'warning',
      showInNavigation: true,
    };
  }
  if (state.saveState === 'saved')
    return { label: 'Saved', variant: 'success', showInNavigation: false };
  return { label: 'Idle', variant: 'muted', showInNavigation: false };
}

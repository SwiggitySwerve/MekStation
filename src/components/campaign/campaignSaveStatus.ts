import type { CampaignSaveSnapshot } from '@/stores/campaign/campaignSaveState';

/**
 * The ONE badge for the copy's state. Unsaved edits outrank `saved`, so a copy
 * that still owes the server work can never read Saved (the reducer holds the
 * same line: `saved` implies `!dirty`). A failed or refused save is shown as
 * failed even while edits are pending, so it is visibly not saved.
 */
export function describeSaveState(
  state: Pick<
    CampaignSaveSnapshot,
    'saveState' | 'dirty' | 'recoveredPendingWrite'
  >,
): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'red' | 'muted';
} {
  if (state.saveState === 'conflict')
    return { label: 'Conflict', variant: 'red' };
  if (state.saveState === 'saving')
    return { label: 'Saving…', variant: 'info' };
  if (state.saveState === 'error') {
    return { label: 'Save failed', variant: 'warning' };
  }
  if (state.dirty) {
    return {
      label: state.recoveredPendingWrite
        ? 'Recovered unsaved changes'
        : 'Unsaved changes',
      variant: 'warning',
    };
  }
  if (state.saveState === 'saved')
    return { label: 'Saved', variant: 'success' };
  return { label: 'Idle', variant: 'muted' };
}

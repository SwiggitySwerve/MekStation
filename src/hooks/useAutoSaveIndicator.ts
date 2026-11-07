import { useEffect } from 'react';

import { DRAFT_LABEL } from '@/components/customizer/shared/BrowserDraftStatus';
import {
  getCustomizerDraftStorageKey,
  type CustomizerDraftTarget as AutoSaveIndicatorTarget,
} from '@/components/customizer/shared/customizerDraftStorage';
import { useToast } from '@/components/shared/Toast';
import { subscribeToStorageWriteReceipts } from '@/stores/utils/clientSafeStorage';

export { getCustomizerDraftStorageKey } from '@/components/customizer/shared/customizerDraftStorage';
export type { CustomizerDraftTarget as AutoSaveIndicatorTarget } from '@/components/customizer/shared/customizerDraftStorage';

/**
 * Reports failed browser-draft writes for the active customizer unit.
 *
 * A successful write is confirmed in the header save state ("Draft Saved"
 * brightens for a moment, see `useDraftSavePulse`) rather than in a toast, so
 * nothing floats over the page on every edit. A failure is driven by the
 * localStorage write receipt and still raises an error toast, because the
 * user's changes are at risk. The explicit library-save flow has its own API
 * result and toast, so the two destinations stay unambiguous.
 */
export function useAutoSaveIndicator(
  target: AutoSaveIndicatorTarget | null,
): void {
  const { showToast } = useToast();
  const storageKey = target ? getCustomizerDraftStorageKey(target) : null;

  useEffect(() => {
    if (!storageKey) return;
    return subscribeToStorageWriteReceipts((receipt) => {
      if (receipt.key !== storageKey || receipt.status !== 'failed') return;
      showToast({
        message: DRAFT_LABEL.failed,
        variant: 'error',
      });
    });
  }, [showToast, storageKey]);
}

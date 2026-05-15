import { useContext, useEffect, useRef } from 'react';

import { useToast } from '@/components/shared/Toast';
import { UnitStoreContext } from '@/stores/useUnitStore';

/**
 * Shows a "Saved" toast when the active unit store records a modification.
 *
 * `UnitStoreContext` is only provided on the BattleMech editor branch of the
 * customizer (see UnitStoreProvider in UnitTypeRouter). This hook is mounted by
 * CustomizerWithRouter, which sits ABOVE that provider — so on non-mech tabs
 * (Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech) the context is
 * null. Read the context directly (nullable) instead of useUnitStoreApi (which
 * throws) and no-op the subscription when there is no store — autosave
 * indication is a mech-store capability today.
 */
export function useAutoSaveIndicator(): void {
  const { showToast } = useToast();
  const storeApi = useContext(UnitStoreContext);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastModifiedRef = useRef<number>(0);

  useEffect(() => {
    if (!storeApi) return;

    const unsubscribe = storeApi.subscribe((state) => {
      if (state.lastModifiedAt !== lastModifiedRef.current) {
        lastModifiedRef.current = state.lastModifiedAt;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          showToast({
            message: 'Saved',
            variant: 'success',
            duration: 1500,
          });
          debounceTimerRef.current = null;
        }, 500);
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [storeApi, showToast]);
}

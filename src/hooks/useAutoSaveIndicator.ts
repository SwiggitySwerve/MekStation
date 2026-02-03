import { useEffect, useRef } from 'react';
import { useToast } from '@/components/shared/Toast';
import { useUnitStoreApi } from '@/stores/useUnitStore';

export function useAutoSaveIndicator(): void {
  const { showToast } = useToast();
  const storeApi = useUnitStoreApi();
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastModifiedRef = useRef<number>(0);
  
  useEffect(() => {
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

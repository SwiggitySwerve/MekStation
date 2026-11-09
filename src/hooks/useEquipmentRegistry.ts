/**
 * useEquipmentRegistry Hook
 *
 * Provides access to the equipment registry and triggers re-renders
 * when the registry becomes ready.
 */

import { useState, useEffect, useCallback } from 'react';

import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { logger } from '@/utils/logger';

/**
 * Return type for useEquipmentRegistry hook
 */
interface UseEquipmentRegistryResult {
  isReady: boolean;
  recheckReady: () => void;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook to track equipment registry initialization
 * Returns isReady state that triggers re-render when registry is initialized
 */
export function useEquipmentRegistry(): UseEquipmentRegistryResult {
  const [isReady, setIsReady] = useState(() =>
    getEquipmentRegistry().isReady(),
  );
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const registry = getEquipmentRegistry();
    if (registry.isReady()) {
      setIsReady(true);
      return;
    }
    let mounted = true;
    void registry
      .initialize()
      .then((outcome) => {
        if (!mounted) return;
        // An interrupted document load is incomplete; a surviving mount retries.
        if (outcome === 'interrupted') setAttempt((value) => value + 1);
        else setIsReady(true);
      })
      .catch((cause: unknown) => {
        if (!mounted) return;
        logger.error('Equipment registry initialization failed', cause);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);

  // Force re-check of registry status
  const recheckReady = useCallback(() => {
    const registry = getEquipmentRegistry();
    if (registry.isReady() && !isReady) {
      setIsReady(true);
      setError(null);
    }
  }, [isReady]);

  const retry = useCallback(() => {
    setError(null);
    setIsReady(false);
    setAttempt((value) => value + 1);
  }, []);
  return { isReady, recheckReady, error, retry };
}

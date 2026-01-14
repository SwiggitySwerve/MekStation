/**
 * useEquipmentRegistry Hook
 * 
 * Provides access to the equipment registry and triggers re-renders
 * when the registry becomes ready.
 */

import { useState, useEffect, useCallback } from 'react';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

/**
 * Return type for useEquipmentRegistry hook
 */
interface UseEquipmentRegistryResult {
  isReady: boolean;
  recheckReady: () => void;
}

/**
 * Hook to track equipment registry initialization
 * Returns isReady state that triggers re-render when registry is initialized
 */
export function useEquipmentRegistry(): UseEquipmentRegistryResult {
  const [isReady, setIsReady] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);

  useEffect(() => {
    const registry = getEquipmentRegistry();
    
    // Check if already ready
    if (registry.isReady()) {
      setIsReady(true);
      return;
    }

    // If not ready and we haven't attempted init, start it
    if (!initAttempted) {
      setInitAttempted(true);
      registry.initialize()
        .then(() => setIsReady(true))
        .catch(() => {
          // Initialization failed - will retry on next mount
        });
    }
  }, [initAttempted]);

  // Force re-check of registry status
  const recheckReady = useCallback(() => {
    const registry = getEquipmentRegistry();
    if (registry.isReady() && !isReady) {
      setIsReady(true);
    }
  }, [isReady]);

  return { isReady, recheckReady };
}


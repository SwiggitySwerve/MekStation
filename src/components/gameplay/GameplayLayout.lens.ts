import { useEffect } from 'react';

import { useTacticalLensState } from '@/hooks/gameplay/useTacticalLensState';

import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

export function useGameplayLayoutLensState(
  mapInteraction: MapInteractionState | null,
): ReturnType<typeof useTacticalLensState> {
  const lensState = useTacticalLensState();
  const { applyLensLayers } = lensState;
  const setMapLayerVisibility = mapInteraction?.setLayerVisibility;

  useEffect(() => {
    if (!setMapLayerVisibility) return;
    applyLensLayers(setMapLayerVisibility);
  }, [applyLensLayers, setMapLayerVisibility]);

  return lensState;
}

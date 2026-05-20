import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  IMapLayerStateById,
  MapLayerId,
  MapProjectionMode,
} from '@/types/gameplay';

import {
  DEFAULT_MAP_LAYER_STATE,
  setMapLayerVisibility,
} from '@/types/gameplay';

export interface IMapLayerInteractionState {
  projectionMode: MapProjectionMode;
  setProjectionMode: React.Dispatch<React.SetStateAction<MapProjectionMode>>;
  layerState: IMapLayerStateById;
  setLayerVisibility: (
    id: MapLayerId,
    next: React.SetStateAction<boolean>,
  ) => void;
  showMovementOverlay: boolean;
  setShowMovementOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverOverlay: boolean;
  setShowCoverOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showFiringArcOverlay: boolean;
  setShowFiringArcOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showLOSOverlay: boolean;
  setShowLOSOverlay: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMapLayerState(
  initialProjectionMode: MapProjectionMode,
): IMapLayerInteractionState {
  const [projectionMode, setProjectionMode] = useState<MapProjectionMode>(
    initialProjectionMode,
  );
  const [layerState, setLayerState] = useState<IMapLayerStateById>(
    DEFAULT_MAP_LAYER_STATE,
  );

  useEffect(() => {
    setProjectionMode(initialProjectionMode);
  }, [initialProjectionMode]);

  const setLayerVisibility = useCallback(
    (id: MapLayerId, next: React.SetStateAction<boolean>) => {
      setLayerState((prev) => {
        const current = prev[id].visible;
        const visible = typeof next === 'function' ? next(current) : next;
        return setMapLayerVisibility(prev, id, visible);
      });
    },
    [],
  );

  const setShowMovementOverlay = useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >((next) => setLayerVisibility('movement', next), [setLayerVisibility]);

  const setShowCoverOverlay = useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >((next) => setLayerVisibility('cover', next), [setLayerVisibility]);

  const setShowFiringArcOverlay = useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >((next) => setLayerVisibility('firingArcs', next), [setLayerVisibility]);

  const setShowLOSOverlay = useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >((next) => setLayerVisibility('los', next), [setLayerVisibility]);

  return useMemo(
    () => ({
      projectionMode,
      setProjectionMode,
      layerState,
      setLayerVisibility,
      showMovementOverlay: layerState.movement.visible,
      setShowMovementOverlay,
      showCoverOverlay: layerState.cover.visible,
      setShowCoverOverlay,
      showFiringArcOverlay: layerState.firingArcs.visible,
      setShowFiringArcOverlay,
      showLOSOverlay: layerState.los.visible,
      setShowLOSOverlay,
    }),
    [
      projectionMode,
      layerState,
      setLayerVisibility,
      setShowMovementOverlay,
      setShowCoverOverlay,
      setShowFiringArcOverlay,
      setShowLOSOverlay,
    ],
  );
}

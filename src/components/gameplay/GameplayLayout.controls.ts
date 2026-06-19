import { useCallback, useState } from 'react';

import type { IGameSession, IUnitGameState } from '@/types/gameplay';

import { pixelToHex } from '@/constants/hexMap';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useGameplayHotkeys } from '@/hooks/useGameplayHotkeys';

import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { noopInteraction } from './GameplayLayout.sections';

interface UseGameplayLayoutControlsParams {
  readonly currentState: IGameSession['currentState'];
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitId: string | null;
  readonly mapInteraction: MapInteractionState | null;
  readonly onUnitSelect: (unitId: string | null) => void;
  readonly onHexClick?: (hex: { q: number; r: number }) => void;
}

export interface GameplayLayoutControls {
  readonly camera: ReturnType<typeof useCameraControls>;
  readonly minimapVisible: boolean;
  readonly helpOpen: boolean;
  readonly handleTokenClick: (unitId: string) => void;
  readonly handleTokenDoubleClick: (unitId: string) => void;
  readonly handleHexClick: (hex: { q: number; r: number }) => void;
  readonly handleMinimapCenterAt: (world: { x: number; y: number }) => void;
  readonly handleMinimapDragPan: (worldDelta: { x: number; y: number }) => void;
  readonly handleCloseHelp: () => void;
}

export function useGameplayLayoutControls({
  currentState,
  selectedUnit,
  selectedUnitId,
  mapInteraction,
  onUnitSelect,
  onHexClick,
}: UseGameplayLayoutControlsParams): GameplayLayoutControls {
  const [minimapVisible, setMinimapVisible] = useState<boolean>(true);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const camera = useCameraControls(mapInteraction ?? noopInteraction);
  const toggleArcs = useCallback(() => {
    mapInteraction?.setShowFiringArcOverlay((visible) => !visible);
  }, [mapInteraction]);
  const toggleLOS = useCallback(() => {
    mapInteraction?.setShowLOSOverlay((visible) => !visible);
  }, [mapInteraction]);
  const handleToggleMinimap = useCallback(
    () => setMinimapVisible((visible) => !visible),
    [],
  );
  const handleToggleHelp = useCallback(
    () => setHelpOpen((visible) => !visible),
    [],
  );
  const handleEscape = useCallback(() => setHelpOpen(false), []);
  const handleCloseHelp = useCallback(() => setHelpOpen(false), []);

  const handleTokenClick = useCallback(
    (unitId: string) => {
      onUnitSelect(unitId === selectedUnitId ? null : unitId);
    },
    [selectedUnitId, onUnitSelect],
  );
  const handleHexClick = useCallback(
    (hex: { q: number; r: number }) => {
      onHexClick?.(hex);
    },
    [onHexClick],
  );
  const handleTokenDoubleClick = useCallback(
    (unitId: string) => {
      const unitState = currentState.units[unitId];
      if (!unitState || !unitState.position) return;
      onUnitSelect(unitId);
      mapInteraction?.centerOn(unitState.position, {
        animate: true,
        bumpLowZoom: true,
      });
    },
    [currentState.units, onUnitSelect, mapInteraction],
  );

  useGameplayHotkeys({
    camera,
    selectedUnitHex: selectedUnit?.position ?? null,
    onToggleMinimap: handleToggleMinimap,
    onToggleArcs: toggleArcs,
    onToggleLOS: toggleLOS,
    onToggleHelp: handleToggleHelp,
    onEscape: handleEscape,
    modalOpen: helpOpen,
    enabled: mapInteraction !== null,
  });

  const handleMinimapCenterAt = useCallback(
    (world: { x: number; y: number }) => {
      camera.centerOn(pixelToHex(world.x, world.y));
    },
    [camera],
  );
  const handleMinimapDragPan = useCallback(
    (worldDelta: { x: number; y: number }) => {
      camera.panBy(-worldDelta.x, -worldDelta.y);
    },
    [camera],
  );

  return {
    camera,
    minimapVisible,
    helpOpen,
    handleTokenClick,
    handleTokenDoubleClick,
    handleHexClick,
    handleMinimapCenterAt,
    handleMinimapDragPan,
    handleCloseHelp,
  };
}

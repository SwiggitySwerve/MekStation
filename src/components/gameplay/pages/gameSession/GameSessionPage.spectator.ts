import { useEffect } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';
import type { SpectatorMode } from '@/stores/useGameplayStore';

interface RecoverSpectatorModeParams {
  readonly isSpectatorRoute: boolean;
  readonly interactiveSession: InteractiveSession | null;
  readonly isSpectatorMode: boolean;
  readonly setSpectatorMode: (
    interactiveSession: InteractiveSession,
    spectatorMode: SpectatorMode,
  ) => void;
}

export function shouldBlockForSpectatorRecovery(
  isSpectatorRoute: boolean,
  interactiveSession: InteractiveSession | null,
  isSpectatorMode: boolean,
): boolean {
  return isSpectatorRoute && Boolean(interactiveSession) && !isSpectatorMode;
}

export function useRecoverSpectatorMode({
  isSpectatorRoute,
  interactiveSession,
  isSpectatorMode,
  setSpectatorMode,
}: RecoverSpectatorModeParams): void {
  useEffect(() => {
    if (!isSpectatorRoute || !interactiveSession || isSpectatorMode) {
      return;
    }

    setSpectatorMode(interactiveSession, {
      enabled: true,
      playing: true,
      speed: 1,
    });
  }, [interactiveSession, isSpectatorMode, isSpectatorRoute, setSpectatorMode]);
}

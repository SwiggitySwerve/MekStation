import { useCallback, useEffect, useRef, useState } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  runOneSpectatorTurn,
  type SpectatorSpeed,
} from './SpectatorView.logic';
import { speedToInterval } from './SpectatorViewPanels';

interface UseSpectatorPlaybackArgs {
  readonly interactiveSession: InteractiveSession | null;
  readonly initialPlaying: boolean;
  readonly initialSpeed: SpectatorSpeed;
}

export function useSpectatorPlayback({
  interactiveSession,
  initialPlaying,
  initialSpeed,
}: UseSpectatorPlaybackArgs): {
  readonly playing: boolean;
  readonly speed: SpectatorSpeed;
  readonly gameOver: boolean;
  readonly handleTogglePlay: () => void;
  readonly handleStepForward: () => void;
  readonly handleSetSpeed: (speed: SpectatorSpeed) => void;
} {
  const [playing, setPlaying] = useState(initialPlaying);
  const [speed, setSpeed] = useState<SpectatorSpeed>(initialSpeed);
  const [gameOver, setGameOver] = useState(false);
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runOneFullTurn = useCallback(() => {
    if (!interactiveSession) return false;
    return runOneSpectatorTurn(interactiveSession, () => setGameOver(true));
  }, [interactiveSession]);

  useEffect(() => {
    if (!playing || gameOver || !interactiveSession) {
      if (tickRef.current) clearTimeout(tickRef.current);
      return;
    }

    const tick = () => {
      const continuePlay = runOneFullTurn();
      if (continuePlay) {
        tickRef.current = setTimeout(tick, speedToInterval(speed));
      } else {
        setPlaying(false);
      }
    };

    tickRef.current = setTimeout(tick, speedToInterval(speed));

    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [playing, speed, gameOver, interactiveSession, runOneFullTurn]);

  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    runOneFullTurn();
  }, [runOneFullTurn]);

  const handleSetSpeed = useCallback((nextSpeed: SpectatorSpeed) => {
    setSpeed(nextSpeed);
  }, []);

  return {
    playing,
    speed,
    gameOver,
    handleTogglePlay,
    handleStepForward,
    handleSetSpeed,
  };
}

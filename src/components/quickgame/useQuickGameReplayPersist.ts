import { useEffect, useRef, useState } from 'react';

import type { IQuickGameInstance } from '@/types/quickgame/QuickGameInterfaces';

import { logger } from '@/utils/logger';

import { buildReplayLibraryPayload } from './quickGameResults.derived';

export type QuickGamePersistStatus = 'idle' | 'saving' | 'saved' | 'failed';

export function useQuickGameReplayPersist(
  game: IQuickGameInstance | null,
): QuickGamePersistStatus {
  const [persistStatus, setPersistStatus] =
    useState<QuickGamePersistStatus>('idle');
  const persistFiredRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!game?.endedAt || persistFiredRef.current) return;

    persistFiredRef.current = true;
    setPersistStatus('saving');

    void fetch('/api/replay-library/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: buildReplayLibraryPayload(game),
    })
      .then((res) => {
        if (!isMountedRef.current) return;

        if (res.ok) {
          setPersistStatus('saved');
          return;
        }

        logger.error('[quick-game] replay-library persist failed', {
          status: res.status,
        });
        setPersistStatus('failed');
      })
      .catch((err) => {
        if (!isMountedRef.current) return;

        logger.error('[quick-game] replay-library persist threw', { err });
        setPersistStatus('failed');
      });
  }, [game]);

  return persistStatus;
}

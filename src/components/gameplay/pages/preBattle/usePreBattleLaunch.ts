import type { NextRouter } from 'next/router';

import { useCallback } from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { SpectatorMode } from '@/stores/useGameplayStore';
import type { IMapConfiguration } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IGameSession } from '@/types/gameplay';
import type { IPilot } from '@/types/pilot';

import {
  buildPreparedBattleData,
  getAssignedUnitIds,
} from '@/components/gameplay/pages/preBattleSessionBuilder';
import { GameEngine } from '@/engine/GameEngine';
import { createGridFromTerrainPreset } from '@/engine/GameEngine.helpers';
import {
  matchLogStorage,
  type MatchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import { logger } from '@/utils/logger';

export type BattleMode = 'auto' | 'interactive' | 'spectator';

interface UsePreBattleLaunchOptions {
  playerForce: IForce | undefined;
  opponentForce: IForce | undefined;
  mapConfig: IMapConfiguration | undefined;
  pilots: readonly IPilot[];
  router: NextRouter;
  setSession: (session: IGameSession) => void;
  setInteractiveSession: (session: InteractiveSession) => void;
  setSpectatorMode: (session: InteractiveSession, mode: SpectatorMode) => void;
  setIsResolving: (isResolving: boolean) => void;
  showToast: (toast: { message: string; variant: 'success' | 'error' }) => void;
}

type InteractiveLaunchRecoveryStorage = Pick<
  MatchLogStorage,
  'appendEvent' | 'flushPendingWrites' | 'upsertMatchMetadata'
>;

export async function persistInteractiveLaunchRecoveryLog(
  session: IGameSession,
  storage: InteractiveLaunchRecoveryStorage = matchLogStorage,
): Promise<boolean> {
  let writes: Promise<unknown>[] = [];
  try {
    writes = session.events.map((event) =>
      storage.appendEvent(session.id, event),
    );
    await storage.flushPendingWrites();
    await Promise.all(writes);
    await storage.upsertMatchMetadata({
      matchId: session.id,
      status: 'active',
    });
    return true;
  } catch (error) {
    await Promise.allSettled(writes);
    logger.warn('Interactive match recovery seed failed', error);
    return false;
  }
}

function getLaunchErrorMessage(mode: BattleMode): string {
  switch (mode) {
    case 'auto':
      return 'Failed to resolve battle';
    case 'interactive':
      return 'Failed to start interactive mode';
    case 'spectator':
      return 'Failed to start spectator mode';
    default:
      return 'Failed to launch battle';
  }
}

function getLaunchErrorLogLabel(mode: BattleMode): string {
  switch (mode) {
    case 'auto':
      return 'Auto-resolve failed:';
    case 'interactive':
      return 'Interactive mode failed:';
    case 'spectator':
      return 'Spectator mode failed:';
    default:
      return 'Battle launch failed:';
  }
}

export function usePreBattleLaunch({
  playerForce,
  opponentForce,
  mapConfig,
  pilots,
  router,
  setSession,
  setInteractiveSession,
  setSpectatorMode,
  setIsResolving,
  showToast,
}: UsePreBattleLaunchOptions): (mode: BattleMode) => Promise<void> {
  return useCallback(
    async (mode: BattleMode) => {
      if (!playerForce || !opponentForce) {
        showToast({
          message: 'Encounter forces not configured',
          variant: 'error',
        });
        return;
      }

      setIsResolving(true);
      try {
        const playerUnitIds = getAssignedUnitIds(playerForce);
        const opponentUnitIds = getAssignedUnitIds(opponentForce);

        if (playerUnitIds.length === 0 || opponentUnitIds.length === 0) {
          showToast({
            message: 'Both forces need at least one unit assigned',
            variant: 'error',
          });
          return;
        }

        const { playerAdapted, opponentAdapted, gameUnits } =
          await buildPreparedBattleData({
            playerForce,
            opponentForce,
            pilots,
          });

        if (playerAdapted.length === 0 || opponentAdapted.length === 0) {
          showToast({
            message: 'Failed to load unit data for one or both forces',
            variant: 'error',
          });
          return;
        }

        const mapRadius = mapConfig?.radius ?? 7;
        const engine = new GameEngine({
          seed: Date.now(),
          mapRadius,
          grid: createGridFromTerrainPreset(mapRadius, mapConfig?.terrain),
        });

        if (mode === 'auto') {
          const session = engine.runToCompletion(
            playerAdapted,
            opponentAdapted,
            gameUnits,
          );

          setSession(session);
          logger.info('Auto-resolve complete', {
            sessionId: session.id,
            turns: session.currentState.turn,
            result: session.currentState.result,
          });
          showToast({
            message: 'Battle resolved! Reviewing results...',
            variant: 'success',
          });

          void router.push(`/gameplay/games/${session.id}`);
          return;
        }

        const interactiveSession = engine.createInteractiveSession(
          playerAdapted,
          opponentAdapted,
          gameUnits,
        );
        const session = interactiveSession.getSession();

        if (mode === 'interactive') {
          setInteractiveSession(interactiveSession);
          await persistInteractiveLaunchRecoveryLog(session);
          logger.info('Interactive session created', { sessionId: session.id });
          showToast({
            message: 'Launching interactive battle...',
            variant: 'success',
          });

          void router.push(`/gameplay/games/${session.id}`);
          return;
        }

        setSpectatorMode(interactiveSession, {
          enabled: true,
          playing: true,
          speed: 1,
        });
        logger.info('Spectator session created', { sessionId: session.id });
        showToast({
          message: 'Launching spectator mode...',
          variant: 'success',
        });

        void router.push(`/gameplay/games/${session.id}`);
      } catch (err) {
        logger.error(getLaunchErrorLogLabel(mode), err);
        showToast({
          message:
            err instanceof Error ? err.message : getLaunchErrorMessage(mode),
          variant: 'error',
        });
      } finally {
        setIsResolving(false);
      }
    },
    [
      playerForce,
      opponentForce,
      mapConfig,
      pilots,
      router,
      setSession,
      setInteractiveSession,
      setSpectatorMode,
      setIsResolving,
      showToast,
    ],
  );
}

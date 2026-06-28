import type { NextRouter } from 'next/router';

import { useCallback } from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IInteractiveSessionLinkage } from '@/engine/InteractiveSession.types';
import type { SpectatorMode } from '@/stores/useGameplayStore';
import type { IMapConfiguration } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IGameConfig, IGameSession } from '@/types/gameplay';
import type { IPilot } from '@/types/pilot';

import {
  buildPreparedBattleData,
  getAssignedUnitIds,
} from '@/components/gameplay/pages/preBattleSessionBuilder';
import {
  publishCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import { GameEngine } from '@/engine/GameEngine';
import { createGridFromTerrainPreset } from '@/engine/GameEngine.helpers';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
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
  gameConfig?: Pick<
    IGameConfig,
    'mapRadius' | 'turnLimit' | 'victoryConditions' | 'optionalRules'
  >;
  linkage?: IPreBattleLaunchLinkage;
  pilots: readonly IPilot[];
  router: NextRouter;
  setSession: (session: IGameSession) => void;
  setInteractiveSession: (session: InteractiveSession) => void;
  setSpectatorMode: (session: InteractiveSession, mode: SpectatorMode) => void;
  setIsResolving: (isResolving: boolean) => void;
  showToast: (toast: { message: string; variant: 'success' | 'error' }) => void;
}

export interface IPreBattleLaunchLinkage extends IInteractiveSessionLinkage {
  readonly missionId?: string | null;
}

type InteractiveLaunchRecoveryStorage = Pick<
  MatchLogStorage,
  'appendEvent' | 'flushPendingWrites' | 'upsertMatchMetadata'
>;

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function hasCampaignOutcomeLinkage(
  linkage: IPreBattleLaunchLinkage | undefined,
): linkage is IPreBattleLaunchLinkage {
  return Boolean(
    nonEmpty(linkage?.contractId) || nonEmpty(linkage?.scenarioId),
  );
}

export function buildGameSessionRoute(
  sessionId: string,
  linkage?: IPreBattleLaunchLinkage,
): string {
  const campaignId = nonEmpty(linkage?.campaignId);
  const missionId =
    nonEmpty(linkage?.missionId) ??
    nonEmpty(linkage?.contractId) ??
    nonEmpty(linkage?.scenarioId);
  if (!campaignId || !missionId) {
    return `/gameplay/games/${sessionId}`;
  }

  const params = new URLSearchParams({
    campaignId,
    missionId,
  });
  return `/gameplay/games/${sessionId}?${params.toString()}`;
}

export function publishAutoResolvedCampaignOutcome(
  session: IGameSession,
  linkage?: IPreBattleLaunchLinkage,
): boolean {
  if (!hasCampaignOutcomeLinkage(linkage)) {
    return false;
  }

  try {
    const outcome = deriveCombatOutcome(session, {
      contractId: nonEmpty(linkage.contractId) ?? undefined,
      scenarioId: nonEmpty(linkage.scenarioId) ?? undefined,
    });
    const event: ICombatOutcomeReadyEvent = {
      matchId: outcome.matchId,
      outcome,
    };
    return publishCombatOutcome(event);
  } catch (error) {
    logger.warn('Auto-resolve outcome publish failed', {
      sessionId: session.id,
      campaignId: linkage.campaignId ?? null,
      contractId: linkage.contractId ?? null,
      scenarioId: linkage.scenarioId ?? null,
      error,
    });
    return false;
  }
}

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
  gameConfig,
  linkage,
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

        const mapRadius = gameConfig?.mapRadius ?? mapConfig?.radius ?? 7;
        const engine = new GameEngine({
          seed: Date.now(),
          mapRadius,
          turnLimit: gameConfig?.turnLimit,
          victoryConditions: gameConfig?.victoryConditions,
          optionalRules: gameConfig?.optionalRules,
          grid: createGridFromTerrainPreset(mapRadius, mapConfig?.terrain),
        });

        if (mode === 'auto') {
          const session = engine.runToCompletion(
            playerAdapted,
            opponentAdapted,
            gameUnits,
            linkage,
          );
          const outcomePublished = publishAutoResolvedCampaignOutcome(
            session,
            linkage,
          );

          setSession(session);
          logger.info('Auto-resolve complete', {
            sessionId: session.id,
            turns: session.currentState.turn,
            result: session.currentState.result,
            campaignId: linkage?.campaignId ?? null,
            contractId: linkage?.contractId ?? null,
            scenarioId: linkage?.scenarioId ?? null,
            outcomePublished,
          });
          showToast({
            message: 'Battle resolved! Reviewing results...',
            variant: 'success',
          });

          void router.push(buildGameSessionRoute(session.id, linkage));
          return;
        }

        const interactiveSession = engine.createInteractiveSession(
          playerAdapted,
          opponentAdapted,
          gameUnits,
          linkage,
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

          void router.push(buildGameSessionRoute(session.id, linkage));
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

        void router.push(buildGameSessionRoute(session.id, linkage));
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
      gameConfig,
      linkage,
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

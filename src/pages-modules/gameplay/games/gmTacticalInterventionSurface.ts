import type { ParsedUrlQuery } from 'querystring';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  IGmTacticalInterventionSurface,
  IGmTacticalCommandPreviewRequest,
} from '@/components/gameplay/TacticalActionDock';
import type { IGameSession } from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';
import type {
  IGmAuthorityContext,
  IGmCascadePreview,
  IGmCombatInterventionState,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IInterventionLedgerRecord,
  IPlayerVisibleInterventionRecord,
} from '@/types/interventions';

import {
  ActionLedger,
  approveGmCascadePreview,
  cancelGmCascadePreview,
  createGmTacticalCommandPreview,
  InterventionLedger,
  projectInterventionRecordForPlayer,
  registerGmCombatInterventionImplementer,
} from '@/lib/interventions';
import { logger } from '@/utils/logger';

interface UseGmTacticalInterventionSurfaceParams {
  readonly enabled: boolean;
  readonly session: IGameSession | null;
  readonly campaignId?: string;
  readonly setSession: (session: IGameSession) => void;
}

interface TacticalGmLedgers {
  readonly interventionLedger: InterventionLedger<IGmCombatInterventionState>;
  readonly actionLedger: ActionLedger;
}

export function resolveGameSessionShellMode(query: ParsedUrlQuery): ShellMode {
  if (query.mode === 'gm' || query.gm === '1' || query.gm === 'true') {
    return 'gm';
  }
  return 'combat';
}

export function useGmTacticalInterventionSurface({
  enabled,
  session,
  campaignId,
  setSession,
}: UseGmTacticalInterventionSurfaceParams):
  | IGmTacticalInterventionSurface
  | undefined {
  const sessionLedgerKey = session?.id ?? 'no-session';
  const ledgers = useMemo<TacticalGmLedgers>(
    () => createTacticalGmLedgers(sessionLedgerKey),
    [sessionLedgerKey],
  );
  const [playerLog, setPlayerLog] = useState<
    readonly IPlayerVisibleInterventionRecord<IGmPublicEffect>[]
  >([]);

  useEffect(() => {
    setPlayerLog([]);
  }, [session?.id]);

  const preview = useCallback(
    (request: IGmTacticalCommandPreviewRequest) => {
      if (!session) {
        return buildUnavailablePreview(request);
      }

      return createGmTacticalCommandPreview({
        ledger: ledgers.interventionLedger,
        state: session.currentState as IGmCombatInterventionState,
        authority: buildTacticalGmAuthority(session, campaignId),
        commandId: request.commandId,
        ctx: request.ctx,
        visibleToPlayerIds: visiblePlayerIdsForSession(session),
      });
    },
    [campaignId, ledgers.interventionLedger, session],
  );

  const approve = useCallback(
    (previewResult: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>) => {
      if (!session) return;

      const approval = approveGmCascadePreview({
        ledger: ledgers.interventionLedger,
        actionLedger: ledgers.actionLedger,
        preview: previewResult,
        state: session.currentState as IGmCombatInterventionState,
      });

      if (approval.status === 'blocked') {
        logger.warn('[gm-intervention:approval-blocked]', {
          service: 'gm-intervention',
          event: 'approval-blocked',
          interventionId: previewResult.interventionId,
          reason: approval.reason,
        });
        return;
      }

      setSession({
        ...session,
        currentState: approval.state,
        updatedAt: new Date().toISOString(),
      });
      setPlayerLog(projectTacticalGmPlayerLog(ledgers.interventionLedger));
    },
    [ledgers.actionLedger, ledgers.interventionLedger, session, setSession],
  );

  const cancel = useCallback(
    (previewResult: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>) => {
      if (!session) return;
      cancelGmCascadePreview(
        previewResult,
        session.currentState as IGmCombatInterventionState,
      );
    },
    [session],
  );

  const manualTakeover = useCallback(
    (previewResult: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>) => {
      logger.warn('[gm-intervention:manual-takeover-requested]', {
        service: 'gm-intervention',
        event: 'manual-takeover-requested',
        interventionId: previewResult.interventionId,
        conflicts: previewResult.conflicts.map((conflict) => conflict.code),
      });
    },
    [],
  );

  return useMemo(() => {
    if (!enabled || !session) return undefined;
    return {
      preview,
      approve,
      cancel,
      manualTakeover,
      playerLog,
    };
  }, [approve, cancel, enabled, manualTakeover, playerLog, preview, session]);
}

function createTacticalGmLedgers(_sessionLedgerKey: string): TacticalGmLedgers {
  return {
    interventionLedger: registerGmCombatInterventionImplementer(
      new InterventionLedger<IGmCombatInterventionState>(),
    ),
    actionLedger: new ActionLedger(),
  };
}

function buildTacticalGmAuthority(
  session: IGameSession,
  campaignId?: string,
): IGmAuthorityContext {
  return {
    actorId: tacticalGmActorId(session.id),
    role: 'gm',
    gameId: session.id,
    campaignId,
    ownedStateRefs: [`game:${session.id}`],
  };
}

function visiblePlayerIdsForSession(session: IGameSession): readonly string[] {
  const playerIds = Object.values(session.sideOwners ?? {}).filter(
    (playerId): playerId is string => typeof playerId === 'string',
  );
  return Array.from(new Set(playerIds));
}

function projectTacticalGmPlayerLog(
  ledger: InterventionLedger<IGmCombatInterventionState>,
): readonly IPlayerVisibleInterventionRecord<IGmPublicEffect>[] {
  return ledger
    .getRecords()
    .map((record) =>
      projectInterventionRecordForPlayer(
        record as IInterventionLedgerRecord<unknown, IGmPublicEffect>,
      ),
    );
}

function buildUnavailablePreview(
  request: IGmTacticalCommandPreviewRequest,
): IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect> {
  return {
    interventionId: 'gm-tactical-unavailable',
    status: 'rejected',
    domain: 'combat',
    kind: 'fix',
    actorId: 'gm-unavailable',
    targetRefs: [],
    affectedStateRefs: [],
    projectedEvents: [],
    conflicts: [],
    reason: `Cannot preview ${request.commandId} without an active game session.`,
  };
}

function tacticalGmActorId(sessionId: string): string {
  return `gm:${sessionId}`;
}

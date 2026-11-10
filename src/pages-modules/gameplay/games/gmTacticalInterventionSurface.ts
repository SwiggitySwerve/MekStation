import type { ParsedUrlQuery } from 'querystring';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  IGmTacticalInterventionSurface,
  IGmTacticalCommandPreviewRequest,
  IGmTacticalInterventionApprovalResult,
} from '@/components/gameplay/TacticalActionDock';
import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { GmTacticalCommandId } from '@/lib/interventions';
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
  cancelGmCascadePreview,
  createGmTacticalCommandPreview,
  getGmTacticalCorrectionBlockReason,
  InterventionLedger,
  prepareGmCascadeApproval,
  projectInterventionRecordForPlayer,
  recordGmCascadeApproval,
  registerGmCombatInterventionImplementer,
} from '@/lib/interventions';
import { logger } from '@/utils/logger';

interface UseGmTacticalInterventionSurfaceParams {
  readonly enabled: boolean;
  readonly session: IGameSession | null;
  readonly interactiveSession: InteractiveSession | null;
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
  interactiveSession,
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
  const commandByPreviewId = useRef(new Map<string, GmTacticalCommandId>());

  useEffect(() => {
    setPlayerLog([]);
    commandByPreviewId.current.clear();
  }, [session?.id]);

  const preview = useCallback(
    (request: IGmTacticalCommandPreviewRequest) => {
      if (!session) {
        return buildUnavailablePreview(request);
      }

      const previewResult = createGmTacticalCommandPreview({
        ledger: ledgers.interventionLedger,
        state: session.currentState as IGmCombatInterventionState,
        authority: buildTacticalGmAuthority(session, campaignId),
        commandId: request.commandId,
        ctx: request.ctx,
        visibleToPlayerIds: visiblePlayerIdsForSession(session),
      });
      commandByPreviewId.current.set(
        previewResult.interventionId,
        request.commandId,
      );
      const correctionBlockReason = getGmTacticalCorrectionBlockReason(
        request.commandId,
      );
      return correctionBlockReason && previewResult.status !== 'rejected'
        ? {
            ...previewResult,
            status: 'blocked' as const,
            reason: correctionBlockReason,
            publicEffect: undefined,
            projectedEvents: [],
          }
        : previewResult;
    },
    [campaignId, ledgers.interventionLedger, session],
  );

  const approve = useCallback(
    (
      previewResult: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>,
    ): IGmTacticalInterventionApprovalResult => {
      if (!session) {
        return blockedApprovalResult(
          'Cannot approve a GM intervention without an active game session.',
        );
      }

      const commandId = commandByPreviewId.current.get(
        previewResult.interventionId,
      );
      if (!commandId) {
        return blockedApprovalResult(
          'Cannot approve an unrecognized GM intervention preview.',
        );
      }
      // Recheck even a formerly ready preview before preparation or ledger writes.
      const correctionBlockReason =
        getGmTacticalCorrectionBlockReason(commandId);
      if (correctionBlockReason)
        return blockedApprovalResult(correctionBlockReason);

      if (previewResult.status !== 'ready') {
        return nonReadyApprovalResult(previewResult);
      }

      const uncommittableReason = uncommittableCommandReason(commandId);
      if (uncommittableReason) {
        logger.warn('[gm-intervention:approval-unsupported]', {
          service: 'gm-intervention',
          event: 'approval-unsupported',
          interventionId: previewResult.interventionId,
          commandId,
          reason: uncommittableReason,
        });
        return {
          status: 'unsupported',
          appended: false,
          reason: uncommittableReason,
        };
      }

      if (commandId !== 'gm.advance-phase') {
        return blockedApprovalResult(
          'This GM command has no event-backed live-session commit path.',
        );
      }

      if (!interactiveSession) {
        return blockedApprovalResult(
          'Cannot approve a GM intervention without a live interactive engine session.',
        );
      }

      const logBlocked = (reason: string) => {
        logger.warn('[gm-intervention:approval-blocked]', {
          service: 'gm-intervention',
          event: 'approval-blocked',
          interventionId: previewResult.interventionId,
          reason,
        });
        return blockedApprovalResult(reason);
      };
      const prepared = prepareGmCascadeApproval({
        ledger: ledgers.interventionLedger,
        actionLedger: ledgers.actionLedger,
        preview: previewResult,
        state: session.currentState as IGmCombatInterventionState,
      });
      if (prepared.status === 'blocked') return logBlocked(prepared.reason);

      // The engine applies first; the ledgers hear of the correction only
      // once it took (S14).
      try {
        // Only Advance Phase has an event-backed live-session commit path.
        interactiveSession.advancePhase();
      } catch (error) {
        return logBlocked(
          `The live engine did not apply the GM intervention: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const approval = recordGmCascadeApproval({
        ledger: ledgers.interventionLedger,
        actionLedger: ledgers.actionLedger,
        preview: previewResult,
        prepared,
      });

      setSession(interactiveSession.getSession());
      setPlayerLog(projectTacticalGmPlayerLog(ledgers.interventionLedger));
      commandByPreviewId.current.delete(previewResult.interventionId);
      return {
        status: 'approved',
        appended: approval.appended,
      };
    },
    [
      interactiveSession,
      ledgers.actionLedger,
      ledgers.interventionLedger,
      session,
      setSession,
    ],
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

function blockedApprovalResult(
  reason = 'GM intervention approval was blocked.',
): IGmTacticalInterventionApprovalResult {
  return {
    status: 'blocked',
    appended: false,
    reason,
  };
}

function nonReadyApprovalResult(
  previewResult: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>,
): IGmTacticalInterventionApprovalResult {
  const reason =
    previewResult.reason ??
    `Cannot approve GM cascade preview with status "${previewResult.status}".`;
  if (previewResult.status === 'deferred') {
    return {
      status: 'deferred',
      appended: false,
      reason,
    };
  }
  if (previewResult.status === 'unsupported') {
    return {
      status: 'unsupported',
      appended: false,
      reason,
    };
  }
  return blockedApprovalResult(reason);
}

function uncommittableCommandReason(
  commandId: GmTacticalCommandId,
): string | undefined {
  switch (commandId) {
    case 'gm.correct-attack':
      return 'Attack-resolution corrections are not yet appliable to the live session without new resolution semantics.';
    case 'gm.reload-unit':
      return 'Unit reload corrections require session-unit replacement semantics and are deferred from the tactical live-session commit seam.';
    case 'gm.grant-resource':
      return 'Resource grants target the campaign economy domain and are deferred from the tactical live-session commit seam.';
    default:
      return undefined;
  }
}

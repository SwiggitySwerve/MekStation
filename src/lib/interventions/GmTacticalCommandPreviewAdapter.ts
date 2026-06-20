import type {
  ITacticalCommandContext,
  TacticalActionPayload,
} from '@/types/gameplay';
import type {
  IGmAuthorityContext,
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IInterventionLedgerCommand,
} from '@/types/interventions';

import { GamePhase } from '@/types/gameplay';

import type { InterventionLedger } from './InterventionLedger';

import { createGmCascadePreview } from './GmCascadePreviewPipeline';

export const GM_TACTICAL_PREVIEW_ACTION_ID = 'gm-intervention.preview';

export type GmTacticalCommandId =
  | 'gm.advance-phase'
  | 'gm.set-damage'
  | 'gm.grant-resource';

export interface IGmTacticalCommandIntent {
  readonly commandId: GmTacticalCommandId;
  readonly activeUnitId: string | null;
  readonly selectedUnitId: string | null;
  readonly targetUnitId: string | null;
  readonly phase: GamePhase;
}

export interface ICreateGmTacticalCommandPreviewInput<TState> {
  readonly ledger: InterventionLedger<TState>;
  readonly state: TState;
  readonly authority: IGmAuthorityContext;
  readonly commandId: GmTacticalCommandId;
  readonly ctx: ITacticalCommandContext;
  readonly reason?: string;
  readonly defaultOutcome?: string;
  readonly hiddenNotes?: string;
  readonly manualTakeoverNotes?: string;
  readonly publicSummary?: string;
  readonly visibleToPlayerIds?: readonly string[];
  readonly interventionId?: string;
  readonly now?: () => string;
}

const PHASE_ORDER: readonly GamePhase[] = [
  GamePhase.Initiative,
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
  GamePhase.Heat,
  GamePhase.End,
];

export function buildGmTacticalCommandIntent(
  commandId: GmTacticalCommandId,
  ctx: ITacticalCommandContext,
): TacticalActionPayload {
  return {
    commandId,
    activeUnitId: ctx.activeUnitId,
    selectedUnitId: ctx.selectedUnitId,
    targetUnitId: ctx.targetUnitId,
    phase: ctx.phase,
  };
}

export function isGmTacticalCommandId(
  commandId: string,
): commandId is GmTacticalCommandId {
  return (
    commandId === 'gm.advance-phase' ||
    commandId === 'gm.set-damage' ||
    commandId === 'gm.grant-resource'
  );
}

export function createGmTacticalCommandPreview<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect> {
  const command = buildGmTacticalLedgerCommand(input);
  return createGmCascadePreview({
    ledger: input.ledger,
    command,
    state: input.state,
    authority: input.authority,
    interventionId: input.interventionId,
    now: input.now,
  }) as IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>;
}

export function buildGmTacticalLedgerCommand<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): IInterventionLedgerCommand {
  const { authority, commandId, ctx, visibleToPlayerIds } = input;
  const privateMetadata = buildPrivateMetadata(input);

  if (commandId === 'gm.advance-phase') {
    return {
      domain: 'combat',
      kind: 'fix',
      actorId: authority.actorId,
      targetRefs: [`game:${authority.gameId}`, `phase:${ctx.phase}`],
      payload: {
        correction: {
          family: 'turn-order',
          phase: nextPhase(ctx.phase),
          activeUnitId: ctx.activeUnitId,
        },
        privateMetadata,
        publicSummary:
          input.publicSummary ??
          `GM preview requested for a combat phase correction.`,
        visibleToPlayerIds,
      },
    };
  }

  if (commandId === 'gm.set-damage') {
    const unitId = ctx.selectedUnitId ?? ctx.activeUnitId ?? 'unselected';
    return {
      domain: 'combat',
      kind: 'fix',
      actorId: authority.actorId,
      targetRefs: [`unit:${unitId}`],
      payload: {
        correction: {
          family: 'damage-critical',
          unitId,
        },
        privateMetadata,
        publicSummary:
          input.publicSummary ??
          `GM preview requested for a damage correction on ${unitId}.`,
        visibleToPlayerIds,
      },
    };
  }

  return {
    domain: 'economy',
    kind: 'add',
    actorId: authority.actorId,
    targetRefs: [
      authority.campaignId
        ? `campaign:${authority.campaignId}`
        : `game:${authority.gameId}`,
      `economy:${authority.gameId}`,
    ],
    payload: {
      privateMetadata,
      publicSummary:
        input.publicSummary ??
        'GM preview requested for a resource correction.',
      visibleToPlayerIds,
    },
  };
}

function buildPrivateMetadata<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): IGmPrivateMetadata {
  return {
    reason: input.reason ?? defaultReason(input.commandId),
    defaultOutcome: input.defaultOutcome,
    hiddenNotes: input.hiddenNotes,
    manualTakeoverNotes: input.manualTakeoverNotes,
  };
}

function defaultReason(commandId: GmTacticalCommandId): string {
  switch (commandId) {
    case 'gm.advance-phase':
      return 'GM requested a tactical phase correction.';
    case 'gm.set-damage':
      return 'GM requested a tactical damage correction.';
    case 'gm.grant-resource':
      return 'GM requested a tactical resource correction.';
  }
}

function nextPhase(phase: GamePhase): GamePhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return GamePhase.Initiative;
  }
  return PHASE_ORDER[index + 1];
}

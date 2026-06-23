import type {
  ITacticalCommandContext,
  TacticalActionPayload,
} from '@/types/gameplay';
import type {
  GmCombatInterventionCorrection,
  IGmAuthorityContext,
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IGmUnitReloadInterventionCommandPayload,
  IInterventionLedgerCommand,
} from '@/types/interventions';

import { GamePhase } from '@/types/gameplay';

import type { InterventionLedger } from './InterventionLedger';

import { createGmCascadePreview } from './GmCascadePreviewPipeline';

export const GM_TACTICAL_PREVIEW_ACTION_ID = 'gm-intervention.preview';

export const GM_TACTICAL_COMMAND_IDS = [
  'gm.advance-phase',
  'gm.set-position-facing',
  'gm.set-damage',
  'gm.set-heat-ammo',
  'gm.set-initiative',
  'gm.set-lifecycle',
  'gm.correct-attack',
  'gm.set-objective',
  'gm.reload-unit',
  'gm.grant-resource',
] as const;

export type GmTacticalCommandId = (typeof GM_TACTICAL_COMMAND_IDS)[number];

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
  readonly combatCorrection?: GmCombatInterventionCorrection;
  readonly unitReloadPayload?: Partial<IGmUnitReloadInterventionCommandPayload>;
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
  return GM_TACTICAL_COMMAND_IDS.includes(commandId as GmTacticalCommandId);
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
  const { commandId } = input;

  if (commandId === 'gm.grant-resource') {
    return buildEconomyCommand(input);
  }

  if (commandId === 'gm.reload-unit') {
    return buildUnitReloadCommand(input);
  }

  return buildCombatCommand(
    input,
    input.combatCorrection ?? buildDefaultCombatCorrection(input),
  );
}

function buildCombatCommand<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
  correction: GmCombatInterventionCorrection,
): IInterventionLedgerCommand {
  const { authority, visibleToPlayerIds } = input;
  return {
    domain: 'combat',
    kind: 'fix',
    actorId: authority.actorId,
    targetRefs: targetRefsForCombatCorrection(authority.gameId, correction),
    payload: {
      correction,
      privateMetadata: buildPrivateMetadata(input),
      publicSummary:
        input.publicSummary ??
        defaultPublicSummary(input.commandId, correction),
      visibleToPlayerIds,
    },
  };
}

function buildUnitReloadCommand<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload> {
  const { authority, ctx, unitReloadPayload, visibleToPlayerIds } = input;
  const unitId = unitReloadPayload?.unitId ?? selectedOrActiveUnitId(ctx);
  const payload: IGmUnitReloadInterventionCommandPayload = {
    unitId,
    sourceUnitsByRef: {},
    ...unitReloadPayload,
    privateMetadata:
      unitReloadPayload?.privateMetadata ?? buildPrivateMetadata(input),
    publicSummary:
      unitReloadPayload?.publicSummary ??
      input.publicSummary ??
      `GM preview requested for active-unit reload on ${unitId}.`,
    visibleToPlayerIds:
      unitReloadPayload?.visibleToPlayerIds ?? visibleToPlayerIds,
  };

  return {
    domain: 'unit-reload',
    kind: 'reload',
    actorId: authority.actorId,
    targetRefs: [`unit:${unitId}`, `game:${authority.gameId}`],
    payload,
  };
}

function buildEconomyCommand<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): IInterventionLedgerCommand {
  const { authority, visibleToPlayerIds } = input;
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
      privateMetadata: buildPrivateMetadata(input),
      publicSummary:
        input.publicSummary ??
        'GM preview requested for a resource correction.',
      visibleToPlayerIds,
    },
  };
}

function buildDefaultCombatCorrection<TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
): GmCombatInterventionCorrection {
  const { commandId, ctx } = input;
  const unitId = selectedOrActiveUnitId(ctx);

  switch (commandId) {
    case 'gm.advance-phase':
      return {
        family: 'turn-order',
        phase: nextPhase(ctx.phase),
        activeUnitId: ctx.activeUnitId,
      };
    case 'gm.set-position-facing':
      return {
        family: 'reposition-facing',
        unitId,
        position: ctx.hoveredHex ?? undefined,
      };
    case 'gm.set-damage':
      return {
        family: 'damage-critical',
        unitId,
      };
    case 'gm.set-heat-ammo':
      return {
        family: 'heat-ammo',
        unitId,
      };
    case 'gm.set-initiative':
      return {
        family: 'turn-order',
        activeUnitId: ctx.activeUnitId,
      };
    case 'gm.set-lifecycle':
      return {
        family: 'lifecycle',
        unitId,
        lifecycle: 'rescued',
      };
    case 'gm.correct-attack':
      return {
        family: 'attack-resolution',
        attackId: '',
        attackerId: ctx.activeUnitId ?? '',
        targetId: ctx.targetUnitId ?? '',
        weaponId: '',
        roll: Number.NaN,
        toHitNumber: Number.NaN,
        hit: false,
      };
    case 'gm.set-objective':
      return {
        family: 'objective-state',
      };
    case 'gm.grant-resource':
    case 'gm.reload-unit':
      throw new Error(`${commandId} does not map to a combat correction.`);
  }
}

function targetRefsForCombatCorrection(
  gameId: string,
  correction: GmCombatInterventionCorrection,
): readonly string[] {
  switch (correction.family) {
    case 'reposition-facing':
    case 'damage-critical':
    case 'heat-ammo':
    case 'lifecycle':
      return [`unit:${correction.unitId}`];
    case 'turn-order':
      return [`game:${gameId}`, `game:${gameId}:turn-order`];
    case 'attack-resolution':
      return [
        `game:${gameId}`,
        `attack-resolution:${correction.attackId || 'unresolved'}`,
        `unit:${correction.attackerId || 'unresolved-attacker'}`,
        `unit:${correction.targetId || 'unresolved-target'}`,
      ];
    case 'objective-state':
      return [
        `game:${gameId}`,
        correction.objectiveId
          ? `objective:${correction.objectiveId}`
          : `objective:${correction.hexKey ?? 'unresolved'}`,
      ];
  }
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
    case 'gm.set-position-facing':
      return 'GM requested a tactical position or facing correction.';
    case 'gm.set-damage':
      return 'GM requested a tactical damage correction.';
    case 'gm.set-heat-ammo':
      return 'GM requested a tactical heat or ammunition correction.';
    case 'gm.set-initiative':
      return 'GM requested a tactical initiative or turn-order correction.';
    case 'gm.set-lifecycle':
      return 'GM requested a tactical unit lifecycle correction.';
    case 'gm.correct-attack':
      return 'GM requested a tactical attack-resolution correction.';
    case 'gm.set-objective':
      return 'GM requested a tactical objective-state correction.';
    case 'gm.reload-unit':
      return 'GM requested an active-unit source data reload.';
    case 'gm.grant-resource':
      return 'GM requested a tactical resource correction.';
  }
}

function defaultPublicSummary(
  commandId: GmTacticalCommandId,
  correction: GmCombatInterventionCorrection,
): string {
  switch (commandId) {
    case 'gm.advance-phase':
      return 'GM preview requested for a combat phase correction.';
    case 'gm.set-position-facing':
      return `GM preview requested for a position/facing correction on ${unitIdForSummary(correction)}.`;
    case 'gm.set-damage':
      return `GM preview requested for a damage correction on ${unitIdForSummary(correction)}.`;
    case 'gm.set-heat-ammo':
      return `GM preview requested for a heat/ammo correction on ${unitIdForSummary(correction)}.`;
    case 'gm.set-initiative':
      return 'GM preview requested for an initiative or turn-order correction.';
    case 'gm.set-lifecycle':
      return `GM preview requested for a lifecycle correction on ${unitIdForSummary(correction)}.`;
    case 'gm.correct-attack':
      return 'GM preview requested for an attack-resolution correction.';
    case 'gm.set-objective':
      return 'GM preview requested for an objective-state correction.';
    case 'gm.reload-unit':
    case 'gm.grant-resource':
      return 'GM preview requested for a tactical correction.';
  }
}

function unitIdForSummary(correction: GmCombatInterventionCorrection): string {
  return 'unitId' in correction ? correction.unitId : 'the combat state';
}

function selectedOrActiveUnitId(ctx: ITacticalCommandContext): string {
  return ctx.selectedUnitId ?? ctx.activeUnitId ?? 'unselected';
}

function nextPhase(phase: GamePhase): GamePhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return GamePhase.Initiative;
  }
  return PHASE_ORDER[index + 1];
}

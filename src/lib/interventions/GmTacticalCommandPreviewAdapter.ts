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
type CombatGmTacticalCommandId = Exclude<
  GmTacticalCommandId,
  'gm.reload-unit' | 'gm.grant-resource'
>;
type CombatCorrectionBuilder = <TState>(
  input: ICreateGmTacticalCommandPreviewInput<TState>,
) => GmCombatInterventionCorrection;
type PublicSummaryBuilder = (
  correction: GmCombatInterventionCorrection,
) => string;

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
const NON_COMBAT_COMMAND_IDS = new Set<GmTacticalCommandId>([
  'gm.reload-unit',
  'gm.grant-resource',
]);
const DEFAULT_COMBAT_CORRECTION_BUILDERS: Record<
  CombatGmTacticalCommandId,
  CombatCorrectionBuilder
> = {
  'gm.advance-phase': (input) => ({
    family: 'turn-order',
    phase: nextPhase(input.ctx.phase),
    activeUnitId: input.ctx.activeUnitId,
  }),
  'gm.set-position-facing': (input) => ({
    family: 'reposition-facing',
    unitId: selectedOrActiveUnitId(input.ctx),
    position: input.ctx.hoveredHex ?? undefined,
  }),
  'gm.set-damage': (input) => ({
    family: 'damage-critical',
    unitId: selectedOrActiveUnitId(input.ctx),
  }),
  'gm.set-heat-ammo': (input) => ({
    family: 'heat-ammo',
    unitId: selectedOrActiveUnitId(input.ctx),
  }),
  'gm.set-initiative': (input) => ({
    family: 'turn-order',
    activeUnitId: input.ctx.activeUnitId,
  }),
  'gm.set-lifecycle': (input) => ({
    family: 'lifecycle',
    unitId: selectedOrActiveUnitId(input.ctx),
    lifecycle: 'rescued',
  }),
  'gm.correct-attack': (input) => ({
    family: 'attack-resolution',
    attackId: '',
    attackerId: input.ctx.activeUnitId ?? '',
    targetId: input.ctx.targetUnitId ?? '',
    weaponId: '',
    roll: Number.NaN,
    toHitNumber: Number.NaN,
    hit: false,
  }),
  'gm.set-objective': () => ({
    family: 'objective-state',
  }),
};
const DEFAULT_REASON_BY_COMMAND: Record<GmTacticalCommandId, string> = {
  'gm.advance-phase': 'GM requested a tactical phase correction.',
  'gm.set-position-facing':
    'GM requested a tactical position or facing correction.',
  'gm.set-damage': 'GM requested a tactical damage correction.',
  'gm.set-heat-ammo': 'GM requested a tactical heat or ammunition correction.',
  'gm.set-initiative':
    'GM requested a tactical initiative or turn-order correction.',
  'gm.set-lifecycle': 'GM requested a tactical unit lifecycle correction.',
  'gm.correct-attack': 'GM requested a tactical attack-resolution correction.',
  'gm.set-objective': 'GM requested a tactical objective-state correction.',
  'gm.reload-unit': 'GM requested an active-unit source data reload.',
  'gm.grant-resource': 'GM requested a tactical resource correction.',
};
const DEFAULT_PUBLIC_SUMMARY_BY_COMMAND: Record<
  GmTacticalCommandId,
  PublicSummaryBuilder
> = {
  'gm.advance-phase': () =>
    'GM preview requested for a combat phase correction.',
  'gm.set-position-facing': (correction) =>
    `GM preview requested for a position/facing correction on ${unitIdForSummary(correction)}.`,
  'gm.set-damage': (correction) =>
    `GM preview requested for a damage correction on ${unitIdForSummary(correction)}.`,
  'gm.set-heat-ammo': (correction) =>
    `GM preview requested for a heat/ammo correction on ${unitIdForSummary(correction)}.`,
  'gm.set-initiative': () =>
    'GM preview requested for an initiative or turn-order correction.',
  'gm.set-lifecycle': (correction) =>
    `GM preview requested for a lifecycle correction on ${unitIdForSummary(correction)}.`,
  'gm.correct-attack': () =>
    'GM preview requested for an attack-resolution correction.',
  'gm.set-objective': () =>
    'GM preview requested for an objective-state correction.',
  'gm.reload-unit': () => 'GM preview requested for a tactical correction.',
  'gm.grant-resource': () => 'GM preview requested for a tactical correction.',
};

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
  const { commandId } = input;
  if (isNonCombatCommandId(commandId)) {
    throw new Error(`${commandId} does not map to a combat correction.`);
  }
  return DEFAULT_COMBAT_CORRECTION_BUILDERS[commandId](input);
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
  return DEFAULT_REASON_BY_COMMAND[commandId];
}

function defaultPublicSummary(
  commandId: GmTacticalCommandId,
  correction: GmCombatInterventionCorrection,
): string {
  return DEFAULT_PUBLIC_SUMMARY_BY_COMMAND[commandId](correction);
}

function unitIdForSummary(correction: GmCombatInterventionCorrection): string {
  return 'unitId' in correction ? correction.unitId : 'the combat state';
}

function selectedOrActiveUnitId(ctx: ITacticalCommandContext): string {
  return ctx.selectedUnitId ?? ctx.activeUnitId ?? 'unselected';
}

function isNonCombatCommandId(
  commandId: GmTacticalCommandId,
): commandId is Exclude<GmTacticalCommandId, CombatGmTacticalCommandId> {
  return NON_COMBAT_COMMAND_IDS.has(commandId);
}

function nextPhase(phase: GamePhase): GamePhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return GamePhase.Initiative;
  }
  return PHASE_ORDER[index + 1];
}

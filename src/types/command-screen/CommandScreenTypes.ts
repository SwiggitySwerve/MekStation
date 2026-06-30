/**
 * Shared command-screen contract used by playable tactical, campaign,
 * starmap, readiness, customizer/refit, multiplayer, and GM surfaces.
 *
 * Domain-specific screens may keep richer local preview types. This contract
 * is the common projection layer for preview-before-commit, logging, ledger
 * references, authority, and redaction.
 *
 * @spec openspec/changes/add-playable-command-screens/specs/playable-command-screens/spec.md
 */

export type CommandScreenDomain =
  | 'combat'
  | 'campaign'
  | 'starmap'
  | 'mission-readiness'
  | 'mek-stable'
  | 'customizer-refit'
  | 'gm-ledger'
  | 'multiplayer'
  | (string & {});

export type CommandScreenAuthority =
  | 'player'
  | 'owner-gm'
  | 'host-gm'
  | 'system';

export type CommandPreviewStatus =
  | 'ready'
  | 'blocked'
  | 'requires-manual-takeover'
  | 'stale'
  | 'unsupported';

export type CommandReasonKind =
  | 'legal'
  | 'illegal'
  | 'costly'
  | 'blocked'
  | 'risky'
  | 'stale'
  | 'manual-takeover';

export type CommandReasonSeverity = 'info' | 'warning' | 'error';

export type CommandCostCategory =
  | 'movement'
  | 'heat'
  | 'funds'
  | 'time'
  | 'supplies'
  | 'ammo'
  | 'reputation'
  | 'risk'
  | (string & {});

export type CommandDiagnosticEvent =
  | 'command_preview_created'
  | 'command_preview_rejected'
  | 'command_commit_rejected'
  | 'command_commit_succeeded'
  | 'command_commit_drift_detected'
  | 'command_reload_validated'
  | 'command_gm_intervention_committed';

export interface ICommandSubjectRef {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
}

export interface ICommandReason {
  readonly code: string;
  readonly kind: CommandReasonKind;
  readonly severity: CommandReasonSeverity;
  readonly message: string;
  readonly affectedRefs?: readonly ICommandSubjectRef[];
  readonly source?: string;
}

export interface ICommandCost {
  readonly category: CommandCostCategory;
  readonly label: string;
  readonly amount: number;
  readonly unit: string;
  readonly delta?: number;
}

export interface ICommandStateSummary {
  readonly label: string;
  readonly entityRefs: readonly ICommandSubjectRef[];
  readonly fields: Readonly<Record<string, string | number | boolean | null>>;
}

export interface ICommandRedactionPolicy {
  readonly visibility: 'public' | 'gm-private';
  readonly publicSummary: string;
  readonly privateFieldKeys?: readonly string[];
}

export interface ICommandPreview {
  readonly previewId: string;
  readonly commandId: string;
  readonly domain: CommandScreenDomain;
  readonly authority: CommandScreenAuthority;
  readonly subjectRefs: readonly ICommandSubjectRef[];
  readonly status: CommandPreviewStatus;
  readonly isLegal: boolean;
  readonly reasons: readonly ICommandReason[];
  readonly before: ICommandStateSummary;
  readonly after: ICommandStateSummary;
  readonly costs: readonly ICommandCost[];
  readonly warnings: readonly string[];
  readonly redaction: ICommandRedactionPolicy;
  readonly createdAt: string;
}

export type CommandCommitStatus =
  | 'committed'
  | 'rejected'
  | 'drift'
  | 'manual-required';

export interface ICommandCommitResult<TPublic = unknown, TPrivate = unknown> {
  readonly commandId: string;
  readonly previewId?: string;
  readonly domain: CommandScreenDomain;
  readonly status: CommandCommitStatus;
  readonly authority: CommandScreenAuthority;
  readonly subjectRefs: readonly ICommandSubjectRef[];
  readonly publicEffect: TPublic;
  readonly privateMetadata?: TPrivate;
  readonly rejectionReason?: ICommandReason;
  readonly resultingState?: ICommandStateSummary;
  readonly ledgerRef?: string;
  readonly diagnosticEvent: CommandDiagnosticEvent;
  readonly committedAt: string;
}

export interface IPlayerCommandResult<TPublic = unknown> {
  readonly commandId: string;
  readonly previewId?: string;
  readonly domain: CommandScreenDomain;
  readonly status: CommandCommitStatus;
  readonly subjectRefs: readonly ICommandSubjectRef[];
  readonly publicEffect: TPublic;
  readonly rejectionReason?: ICommandReason;
  readonly resultingState?: ICommandStateSummary;
  readonly ledgerRef?: string;
  readonly diagnosticEvent: CommandDiagnosticEvent;
  readonly committedAt: string;
}

export interface ICommandDiagnosticMetadata {
  readonly domain: CommandScreenDomain;
  readonly commandId: string;
  readonly previewId?: string;
  readonly status: CommandPreviewStatus | CommandCommitStatus;
  readonly authority: CommandScreenAuthority;
  readonly subjectRefIds: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly userVisibleStateChanged: boolean;
}

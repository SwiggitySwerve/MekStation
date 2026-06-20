import React from 'react';

import type { GmTacticalCommandId } from '@/lib/interventions';
import type {
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';
import type {
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IPlayerVisibleInterventionRecord,
} from '@/types/interventions';

export interface IGmTacticalCommandPreviewRequest {
  readonly commandId: GmTacticalCommandId;
  readonly command: ITacticalCommand;
  readonly ctx: ITacticalCommandContext;
}

export interface IGmTacticalInterventionSurface {
  readonly preview: (
    request: IGmTacticalCommandPreviewRequest,
  ) => IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>;
  readonly approve?: (
    preview: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>,
  ) => void;
  readonly cancel?: (
    preview: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>,
  ) => void;
  readonly manualTakeover?: (
    preview: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>,
  ) => void;
  readonly playerLog?: readonly IPlayerVisibleInterventionRecord<IGmPublicEffect>[];
}

export interface IGmPreviewState {
  readonly commandLabel: string;
  readonly preview: IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>;
}

interface GmInterventionConfirmationPanelProps {
  readonly previewState: IGmPreviewState;
  readonly onApprove?: () => void;
  readonly onCancel: () => void;
  readonly onManualTakeover?: () => void;
}

export function GmInterventionConfirmationPanel({
  previewState,
  onApprove,
  onCancel,
  onManualTakeover,
}: GmInterventionConfirmationPanelProps): React.ReactElement {
  const { commandLabel, preview } = previewState;
  const titleId = `gm-intervention-confirm-title-${preview.interventionId}`;
  const detailId = `gm-intervention-confirm-detail-${preview.interventionId}`;
  const publicSummary =
    preview.publicEffect?.summary ??
    preview.reason ??
    'No player-visible effect is available yet.';
  const changedStateRefs = preview.publicEffect?.changedStateRefs ?? [];
  const manualTakeoverRequired =
    preview.status === 'requires-manual-takeover' ||
    preview.conflicts.some((conflict) => conflict.requiresManualTakeover);
  const approveDisabled = preview.status !== 'ready' || !onApprove;
  const manualTakeoverDisabled = !manualTakeoverRequired || !onManualTakeover;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      className="border-border-theme bg-surface-raised max-w-md rounded border p-3 text-sm shadow"
      data-testid="gm-intervention-confirmation"
      data-gm-preview-status={preview.status}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-text-theme-primary font-semibold">
            {commandLabel}
          </h3>
          <p
            id={detailId}
            className="text-text-theme-secondary text-xs"
            data-testid="gm-intervention-preview-status"
          >
            {preview.status}
          </p>
        </div>
        <button
          type="button"
          className="text-text-theme-secondary hover:text-text-theme-primary focus:ring-border-theme rounded px-2 py-1 text-xs focus:ring-2 focus:outline-none"
          onClick={onCancel}
          data-testid="gm-intervention-cancel"
          aria-label="Cancel GM intervention preview"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2">
        <section data-testid="gm-intervention-public-effect">
          <h4 className="text-text-theme-secondary text-xs font-semibold uppercase">
            Player Net Effect
          </h4>
          <p className="text-text-theme-primary">{publicSummary}</p>
          {changedStateRefs.length > 0 && (
            <p className="text-text-theme-secondary text-xs">
              {changedStateRefs.join(', ')}
            </p>
          )}
        </section>

        <section data-testid="gm-intervention-private-detail">
          <h4 className="text-text-theme-secondary text-xs font-semibold uppercase">
            GM Detail
          </h4>
          <PrivateMetadataRows privateMetadata={preview.privateMetadata} />
        </section>

        <section data-testid="gm-intervention-conflicts">
          <h4 className="text-text-theme-secondary text-xs font-semibold uppercase">
            Conflicts
          </h4>
          {preview.conflicts.length === 0 ? (
            <p className="text-text-theme-secondary">None</p>
          ) : (
            <ul className="list-disc pl-4">
              {preview.conflicts.map((conflict) => (
                <li key={`${conflict.code}:${conflict.message}`}>
                  {conflict.message}
                  {conflict.requiresManualTakeover
                    ? ' Manual takeover required.'
                    : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="bg-surface-deep text-text-theme-primary rounded px-3 py-2 font-medium disabled:opacity-50"
          onClick={onApprove}
          disabled={approveDisabled}
          data-testid="gm-intervention-approve"
        >
          Approve
        </button>
        <button
          type="button"
          className="border-border-theme text-text-theme-primary rounded border px-3 py-2 font-medium disabled:opacity-50"
          onClick={onManualTakeover}
          disabled={manualTakeoverDisabled}
          data-testid="gm-intervention-manual-takeover"
        >
          Manual Takeover
        </button>
      </div>
    </section>
  );
}

export function GmInterventionPlayerLog({
  records,
}: {
  readonly records: readonly IPlayerVisibleInterventionRecord<IGmPublicEffect>[];
}): React.ReactElement | null {
  if (records.length === 0) return null;

  return (
    <section
      aria-label="Player-visible GM intervention log"
      className="text-text-theme-secondary max-w-sm text-xs"
      data-testid="gm-intervention-player-log"
    >
      {records.map((record) => (
        <article key={record.id} data-gm-log-record-id={record.id}>
          <span>{record.publicEffect.summary}</span>
          {record.publicEffect.changedStateRefs.length > 0 && (
            <span> {record.publicEffect.changedStateRefs.join(', ')}</span>
          )}
        </article>
      ))}
    </section>
  );
}

function PrivateMetadataRows({
  privateMetadata,
}: {
  readonly privateMetadata?: IGmPrivateMetadata;
}): React.ReactElement {
  if (!privateMetadata) {
    return <p className="text-text-theme-secondary">Unavailable</p>;
  }

  const rows: Array<[string, string | undefined]> = [
    ['Reason', privateMetadata.reason],
    ['Default Outcome', privateMetadata.defaultOutcome],
    ['Hidden Notes', privateMetadata.hiddenNotes],
    ['Manual Takeover', privateMetadata.manualTakeoverNotes],
  ];
  const visibleRows = rows.filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].length > 0,
  );

  if (visibleRows.length === 0) {
    return <p className="text-text-theme-secondary">Unavailable</p>;
  }

  return (
    <dl className="space-y-1">
      {visibleRows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-text-theme-secondary text-xs">{label}</dt>
          <dd className="text-text-theme-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

import React from 'react';

import { Badge } from '@/components/ui';

import type { GmLedgerPreview } from './GmCampaignInterventionControlPlane.helpers';

import {
  findFundsEffect,
  findTimeEffect,
  formatCents,
  formatDate,
  formatSignedCents,
} from './GmCampaignInterventionControlPlane.helpers';

export interface ManualTakeoverState {
  readonly reason: string;
  readonly conflicts: readonly string[];
}

export function GmPreviewPanel({
  preview,
}: {
  readonly preview: GmLedgerPreview;
}): React.ReactElement {
  const fundsEffect = findFundsEffect(preview.projectedEvents);
  const timeEffect = findTimeEffect(preview.projectedEvents);

  return (
    <div
      className="border-border-theme bg-surface-base rounded-md border p-4"
      data-testid="gm-ledger-preview-panel"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{preview.domain}</Badge>
        <Badge>{preview.kind}</Badge>
        <Badge>{preview.status}</Badge>
      </div>
      <p
        className="text-text-theme-primary mt-3 text-sm"
        data-testid="gm-ledger-preview-summary"
      >
        {preview.publicEffect?.summary ?? preview.reason}
      </p>
      {fundsEffect ? (
        <p
          className="text-text-theme-secondary mt-2 font-mono text-sm"
          data-testid="gm-ledger-preview-net-effect"
        >
          {formatCents(fundsEffect.before.balanceCents)} -&gt;{' '}
          {formatCents(fundsEffect.after.balanceCents)} (
          {formatSignedCents(
            fundsEffect.after.balanceCents - fundsEffect.before.balanceCents,
          )}
          )
        </p>
      ) : null}
      {timeEffect ? (
        <>
          <p
            className="text-text-theme-secondary mt-2 font-mono text-sm"
            data-testid="gm-ledger-preview-time-effect"
          >
            {formatDate(timeEffect.before.currentDate)} -&gt;{' '}
            {formatDate(timeEffect.after.currentDate)} ({timeEffect.days} days)
          </p>
          {timeEffect.externalEffects.length > 0 ? (
            <ul
              className="text-text-theme-secondary mt-2 list-disc space-y-1 pl-5 text-sm"
              data-testid="gm-ledger-preview-external-effects"
            >
              {timeEffect.externalEffects.map((effect) => (
                <li key={effect.ref}>{effect.summary}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {preview.privateMetadata ? (
        <div
          className="mt-3 text-sm text-amber-200"
          data-testid="gm-ledger-preview-private"
        >
          <p>{preview.privateMetadata.reason}</p>
          {preview.privateMetadata.defaultOutcome ? (
            <p>{preview.privateMetadata.defaultOutcome}</p>
          ) : null}
        </div>
      ) : null}
      {preview.conflicts.length > 0 ? (
        <ul
          className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-300"
          data-testid="gm-ledger-preview-conflicts"
        >
          {preview.conflicts.map((conflict) => (
            <li key={conflict.code}>{conflict.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ManualTakeoverPanel({
  manualTakeover,
}: {
  readonly manualTakeover: ManualTakeoverState;
}): React.ReactElement {
  return (
    <div
      className="border-border-theme bg-surface-base rounded-md border p-4"
      data-testid="gm-ledger-manual-status"
    >
      <p className="text-text-theme-primary text-sm font-semibold">
        {manualTakeover.reason}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-300">
        {manualTakeover.conflicts.map((conflict) => (
          <li key={conflict}>{conflict}</li>
        ))}
      </ul>
    </div>
  );
}

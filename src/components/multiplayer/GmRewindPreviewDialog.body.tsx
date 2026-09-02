/**
 * The blast-radius body of the rewind dialog.
 *
 * Split from the dialog so the confirm-in-flight state can live next to
 * the buttons without pushing that file over the presentational cap.
 */

import React from 'react';

import type { GmRewindPreviewOutcome } from './gmRewindPreviewPhrasing';

import { describeRewindBlastRadius } from './gmRewindPreviewPhrasing';

export function RewindPreviewBody({
  descriptionId,
  outcome,
}: {
  readonly descriptionId: string;
  readonly outcome: Extract<GmRewindPreviewOutcome, { kind: 'preview' }>;
}): React.ReactElement {
  const radius = describeRewindBlastRadius(outcome);
  return (
    <div
      id={descriptionId}
      data-testid="gm-rewind-preview-blast-radius"
      className="mt-2 text-xs text-slate-400"
    >
      <p>{radius.summary}</p>
      {radius.artifactLines.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {radius.artifactLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-slate-500">
        Nothing has been changed yet. Looking costs nothing.
      </p>
    </div>
  );
}

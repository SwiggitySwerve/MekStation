/**
 * ReplayBlockedHistoryPanel — the truthful blocked-state surface for
 * unsupported or quarantined Replay Library history (replay-safety
 * PR 20).
 *
 * Renders when the load API answers 422 `REPLAY_HISTORY_BLOCKED`: a
 * PERSISTENT panel (never a toast) carrying the source identity, the
 * typed per-line reasons (scope-safe — reason codes, event types, and
 * line numbers only; never payload contents), and recovery guidance.
 * No partial replay is ever presented as complete — the viewer body
 * renders THIS panel instead of the player whenever the history is
 * blocked.
 *
 * Accessibility: `role="alert"` + `aria-live="assertive"` announce the
 * block; the heading receives focus on mount so keyboard/screen-reader
 * users land on the explanation, not a dead surface. The layout is a
 * single stacked column with wrapped monospace identity values, so it
 * reads identically on desktop and mobile widths.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import React, { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/** Mirror of the API's typed blocked payload (subset the UI needs). */
export interface IReplayBlockedHistoryInfo {
  readonly sourceId: string;
  readonly formatId: string;
  readonly formatVersion: number;
  readonly sourceDigest: string;
  readonly blockedLineCount: number;
  readonly blockedLines: readonly {
    readonly line: number;
    readonly reason: string;
    readonly eventType: string | null;
  }[];
}

const MAX_REASON_ROWS = 8;

export function ReplayBlockedHistoryPanel({
  blocked,
  onBack,
}: {
  readonly blocked: IReplayBlockedHistoryInfo;
  /** In-panel recovery action so Tab order reaches it AFTER the summary. */
  readonly onBack?: () => void;
}): React.ReactElement {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Card data-testid="replay-blocked-history">
      <div role="alert" aria-live="assertive" className="flex flex-col gap-3">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-text-theme-primary focus-visible:ring-accent rounded text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Replay blocked — unsupported history
        </h2>

        <p className="text-text-theme-secondary text-sm">
          This replay contains {blocked.blockedLineCount} event
          {blocked.blockedLineCount === 1 ? '' : 's'} the replay pipeline cannot
          verify, so none of it is shown — a partial replay would be misleading.
          The stored file was <strong>not</strong> modified.
        </p>

        <dl className="text-text-theme-secondary grid grid-cols-1 gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="text-text-theme-muted">Source</dt>
          <dd className="font-mono break-all">{blocked.sourceId}</dd>
          <dt className="text-text-theme-muted">Format</dt>
          <dd className="font-mono">
            {blocked.formatId}@{blocked.formatVersion}
          </dd>
          <dt className="text-text-theme-muted">Source digest</dt>
          <dd className="font-mono break-all">{blocked.sourceDigest}</dd>
        </dl>

        <div className="rounded-lg border border-red-700 bg-red-950/40 px-3 py-2">
          <p className="mb-1 text-sm font-medium text-red-300">
            Blocked events
          </p>
          <ul
            data-testid="replay-blocked-reasons"
            className="list-inside list-disc space-y-0.5 font-mono text-xs text-red-200"
          >
            {blocked.blockedLines.slice(0, MAX_REASON_ROWS).map((entry) => (
              <li key={entry.line}>
                line {entry.line}: {entry.reason}
                {entry.eventType === null ? '' : ` (${entry.eventType})`}
              </li>
            ))}
            {blocked.blockedLineCount > MAX_REASON_ROWS && (
              <li className="text-text-theme-muted">
                …and {blocked.blockedLineCount - MAX_REASON_ROWS} more
              </li>
            )}
          </ul>
        </div>

        <div className="text-text-theme-secondary text-sm">
          <p className="text-text-theme-primary mb-1 font-medium">
            What you can do
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            <li>
              Watch a different replay — recordings made by the current game
              version load normally.
            </li>
            <li>
              Keep the file as-is: older recordings may become loadable when an
              adapter for their format ships.
            </li>
            <li>
              If this replay was just recorded, report it — a current-version
              recording should never be blocked.
            </li>
          </ul>
        </div>

        {onBack !== undefined && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              data-testid="blocked-back-to-library"
            >
              Back to library
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

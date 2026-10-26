import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { SvgIcon } from '@/components/ui/SvgIcon';

import {
  BUILD_STATUS_SEPARATOR,
  type BuildState,
  type BuildStatusKind,
  type BuildStatusSummary,
} from './buildStatusSummary';

export type { BuildState } from './buildStatusSummary';

/**
 * The one look of each severity, shared by the status button, the panel,
 * the Overview readiness rows, the section-tab dots and the readouts
 * (`unitStatStatus`): errors red with a crossed circle, warnings yellow with
 * a triangle, notes sky blue with an info circle. Notes are legal, so they
 * never borrow the red or yellow of rule problems or the amber accent; a
 * readout in a legal-but-high state (running hot) shows the note hue too.
 */
export const BUILD_STATUS_KIND_TEXT_CLASS: Record<BuildStatusKind, string> = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  note: 'text-sky-300',
};

/**
 * The same hues as CSS colors, for fills that inline styles paint (budget
 * bars), so a bar always matches the text color of its severity.
 */
export const BUILD_STATUS_KIND_FILL_COLOR: Record<BuildStatusKind, string> = {
  error: 'var(--color-red-400, #f87171)',
  warning: 'var(--color-yellow-400, #facc15)',
  note: 'var(--color-sky-300, #7dd3fc)',
};

/** Border and tint of a control whose worst state is this one. */
export const BUILD_STATE_TINT_CLASS: Record<BuildState, string> = {
  error: 'border-red-400/60 bg-red-400/10',
  warning: 'border-yellow-400/50 bg-yellow-400/10',
  note: 'border-sky-300/50 bg-sky-300/10',
  ready: 'border-border-theme bg-surface-base',
};

/** One symbol per severity; decorative, the words carry the meaning. */
export function SeverityIcon({
  kind,
  className = '',
}: {
  kind: BuildStatusKind;
  className?: string;
}): React.ReactElement {
  const classes = `shrink-0 ${BUILD_STATUS_KIND_TEXT_CLASS[kind]} ${className}`;
  if (kind === 'error')
    return (
      <SvgIcon
        size="inline"
        aria-hidden="true"
        data-icon-name="error"
        data-severity-icon="error"
        className={classes}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6M9 9l6 6" />
      </SvgIcon>
    );
  return (
    <AppIcon
      name={kind === 'warning' ? 'warning' : 'info'}
      size="inline"
      aria-hidden="true"
      data-severity-icon={kind}
      className={classes}
    />
  );
}

/** Icon for a build state, in that state's color. */
export function BuildStateIcon({
  state,
}: {
  state: BuildState;
}): React.ReactElement {
  if (state === 'ready')
    return (
      <AppIcon
        name="check"
        size="inline"
        aria-hidden="true"
        className="shrink-0 text-green-400"
      />
    );
  return <SeverityIcon kind={state} />;
}

function Separator(): React.ReactElement {
  return (
    <span aria-hidden="true" className="text-text-theme-secondary">
      {BUILD_STATUS_SEPARATOR.trim()}
    </span>
  );
}

/**
 * Visible wording of the build-status button, rendered from the shared
 * summary: "1 error \u00b7 1 warning \u00b7 1 note", each group in its own
 * color after the worst group's icon. A lone note reads as itself ("Runs
 * hot +11") and truncates before its amount. Phones keep words: the worst
 * group ("1 error") over a "+2 more" count of the rest; the button's
 * accessible name keeps the full summary.
 */
export function BuildStatusLabel({
  summary,
  compact,
}: {
  summary: BuildStatusSummary;
  compact: boolean;
}): React.ReactElement {
  const { state, parts, headline, headlineNote, short } = summary;
  if (state === 'ready')
    return (
      <>
        <BuildStateIcon state="ready" />
        <span className="text-text-theme-primary">{headline}</span>
      </>
    );
  if (headlineNote)
    return (
      <>
        <BuildStateIcon state="note" />
        <span className={`contents ${BUILD_STATUS_KIND_TEXT_CLASS.note}`}>
          <span className="min-w-0 truncate">{headlineNote.label}</span>
          {headlineNote.amount && (
            <span className="shrink-0">{headlineNote.amount}</span>
          )}
        </span>
      </>
    );
  if (compact)
    return (
      <>
        <BuildStateIcon state={state} />
        <span className="flex min-w-0 flex-col items-start leading-4">
          <span
            data-build-status-part={state}
            className={`max-w-full min-w-0 truncate ${BUILD_STATUS_KIND_TEXT_CLASS[state]}`}
          >
            {short.text}
          </span>
          {short.more && (
            <span
              data-build-status-more
              className="text-text-theme-secondary text-xs font-medium tabular-nums"
            >
              {short.more}
            </span>
          )}
        </span>
      </>
    );
  return (
    <>
      <BuildStateIcon state={state} />
      {parts.map((part, index) => (
        <React.Fragment key={part.kind}>
          {index > 0 && <Separator />}
          <span
            data-build-status-part={part.kind}
            className={BUILD_STATUS_KIND_TEXT_CLASS[part.kind]}
          >
            {part.text}
          </span>
        </React.Fragment>
      ))}
    </>
  );
}

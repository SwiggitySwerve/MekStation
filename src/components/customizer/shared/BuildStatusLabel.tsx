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
 * a triangle, notes sky blue with an info circle. A readout in a
 * legal-but-high state (running hot) is a warning and shows the warning hue;
 * red stays reserved for errors.
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

/** One group as its shape and count, e.g. a red crossed circle and "1". */
function CountBadge({
  kind,
  count,
}: {
  kind: BuildStatusKind;
  count: number;
}): React.ReactElement {
  return (
    <span
      data-build-status-part={kind}
      className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${BUILD_STATUS_KIND_TEXT_CLASS[kind]}`}
    >
      <SeverityIcon kind={kind} />
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Visible wording of the build-status button, rendered from the shared
 * summary: "1 error \u00b7 1 warning \u00b7 1 note", each group in its own
 * color after the worst group's icon. A lone readout warning reads as itself
 * ("Runs hot +11") and truncates before its amount. Phones show every group
 * as its severity shape and count, so the breakdown stays visible without
 * relying on color; the button's accessible name keeps the full summary.
 */
export function BuildStatusLabel({
  summary,
  compact,
}: {
  summary: BuildStatusSummary;
  compact: boolean;
}): React.ReactElement {
  const { state, parts, headline, headlineNote } = summary;
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
        <BuildStateIcon state={state} />
        <span className={`contents ${BUILD_STATUS_KIND_TEXT_CLASS[state]}`}>
          <span className="min-w-0 truncate">{headlineNote.label}</span>
          {headlineNote.amount && (
            <span className="shrink-0">{headlineNote.amount}</span>
          )}
        </span>
      </>
    );
  if (compact)
    return (
      <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 leading-4">
        {parts.map((part) => (
          <CountBadge key={part.kind} kind={part.kind} count={part.count} />
        ))}
      </span>
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

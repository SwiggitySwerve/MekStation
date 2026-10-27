/**
 * Opaque footer hint rendered outside the scrolling list, never over its rows.
 * Rendered only while the list has hidden content below, so a list that fits
 * shows nothing. Decorative: scrolling stays available by touch, wheel and
 * keyboard, so it is hidden from assistive technology.
 */

import React from 'react';

import workbenchStyles from '../CustomizerWorkbench.module.css';

interface MoreBelowCueProps {
  visible: boolean;
  label: string;
  /** Shorter text for phones, so the footer stays on one line. */
  compactLabel?: string;
  className?: string;
}

export function MoreBelowCue({
  visible,
  label,
  compactLabel,
  className = '',
}: MoreBelowCueProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <span
      aria-hidden="true"
      data-testid="more-below-cue"
      className={`${workbenchStyles.moreBelowCue} ${className}`}
    >
      {compactLabel ? (
        <>
          <span className="sm:hidden">{compactLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}

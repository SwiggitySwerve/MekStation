/**
 * Fade plus "More below" hint pinned to the bottom edge of a scrolling list.
 * Rendered only while the list has hidden content below, so a list that fits
 * shows nothing. Decorative: scrolling stays available by touch, wheel and
 * keyboard, so it is hidden from assistive technology.
 */

import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import workbenchStyles from '../CustomizerWorkbench.module.css';

interface MoreBelowCueProps {
  visible: boolean;
  className?: string;
}

export function MoreBelowCue({
  visible,
  className = '',
}: MoreBelowCueProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <span
      aria-hidden="true"
      data-testid="more-below-cue"
      className={`${workbenchStyles.moreBelowCue} ${className}`}
    >
      <span className={workbenchStyles.moreBelowLabel}>
        More below
        <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
      </span>
    </span>
  );
}

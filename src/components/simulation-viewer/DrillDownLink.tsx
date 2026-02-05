import React from 'react';

import type { IDrillDownLinkProps } from '@/components/simulation-viewer/types';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

const ICONS: Record<string, string> = {
  'arrow-right': '→',
  'external-link': '↗',
  'chevron-right': '›',
  filter: '⚙',
  search: '🔍',
};

interface DrillDownLinkInternalProps extends IDrillDownLinkProps {
  readonly onClick?: (
    targetTab: string,
    filter?: Record<string, unknown>,
  ) => void;
}

export const DrillDownLink: React.FC<DrillDownLinkInternalProps> = ({
  label,
  targetTab,
  filter,
  icon,
  onClick,
  className = '',
}) => {
  const handleClick = () => {
    onClick?.(targetTab, filter);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const resolvedIcon = icon ? (ICONS[icon] ?? icon) : null;

  const linkClasses = [
    'inline-flex items-center gap-2',
    'text-blue-600 dark:text-blue-400',
    'hover:underline cursor-pointer',
    'py-2 px-3 min-h-[44px] md:py-0 md:px-0 md:min-h-0',
    FOCUS_RING_CLASSES,
    'rounded',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="link"
      tabIndex={0}
      className={linkClasses}
      aria-label={`Navigate to ${label}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid="drill-down-link"
      data-target-tab={targetTab}
    >
      {resolvedIcon && (
        <span
          className="inline-block"
          aria-hidden="true"
          data-testid="drill-down-icon"
        >
          {resolvedIcon}
        </span>
      )}
      <span data-testid="drill-down-label">{label}</span>
    </span>
  );
};

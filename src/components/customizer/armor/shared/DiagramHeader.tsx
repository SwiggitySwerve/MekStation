/**
 * Shared Diagram Header Component
 *
 * Provides consistent header styling across all armor diagram variants.
 */

import React from 'react';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

export interface DiagramHeaderProps {
  /** Title to display */
  title: string;
  /** Optional subtitle to display */
  subtitle?: string;
  /** Whether to show quick settings dropdown (defaults to true) */
  showQuickSettings?: boolean;
  /** Additional CSS classes for the title */
  titleClassName?: string;
  /** CSS classes for the container, including its bottom margin (default mb-4) */
  className?: string;
}

/**
 * Standard diagram header with title and optional quick settings
 */
export function DiagramHeader({
  title,
  subtitle,
  showQuickSettings = true,
  titleClassName = '',
  className = 'mb-4',
}: DiagramHeaderProps): React.ReactElement {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3
          className={`text-text-theme-primary text-lg font-semibold ${titleClassName}`}
        >
          {title}
        </h3>
        {subtitle && (
          <span className="text-text-theme-secondary text-sm">
            ({subtitle})
          </span>
        )}
        {showQuickSettings && <ArmorDiagramQuickSettings />}
      </div>
    </div>
  );
}
